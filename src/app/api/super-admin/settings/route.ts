import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import fs from 'fs/promises';
import path from 'path';
import { superAdminMiddleware, getSuperAdminContext } from '@/lib/middleware-super-admin';
import { logSettingsUpdate } from '@/lib/audit-logger';

// Path al archivo JSON (si no existe tabla)
const SETTINGS_FILE = path.join(process.cwd(), 'public', 'config', 'settings.json');

interface Settings {
  maintenanceMode: boolean;
  globalAnnouncement: string;
  maxFileSize: number;
  defaultModel: string;
}

const DEFAULT_SETTINGS: Settings = {
  maintenanceMode: false,
  globalAnnouncement: '',
  maxFileSize: 10,
  defaultModel: 'claude-sonnet-4-5'
};

// GET: Fetch settings
export async function GET(request: NextRequest) {
  // Verify super admin authentication
  const authResult = await superAdminMiddleware(request);

  // If middleware returns a response (error), return it
  if (authResult instanceof NextResponse && authResult.status !== 200) {
    return authResult;
  }

  try {
    const supabase = createServerClient();

    // Opción 1: Intentar usar tabla platform_settings
    const { data: settingsRows, error: tableError } = await supabase
      .from('platform_settings')
      .select('*');

    if (!tableError && settingsRows && settingsRows.length > 0) {
      // Convertir rows a objeto
      const settings: any = {};
      settingsRows.forEach((row: any) => {
        settings[row.setting_key] = row.setting_value;
      });

      return NextResponse.json({ settings });
    }

    // Opción 2: Usar JSON file (fallback)
    try {
      const fileContent = await fs.readFile(SETTINGS_FILE, 'utf-8');
      const settings = JSON.parse(fileContent);

      console.log('[super-admin/settings] Using JSON file settings');
      return NextResponse.json({ settings });
    } catch (fileError) {
      // Si no existe, crear archivo con defaults
      console.log('[super-admin/settings] Creating default settings file');

      await fs.mkdir(path.dirname(SETTINGS_FILE), { recursive: true });
      await fs.writeFile(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2));

      return NextResponse.json({ settings: DEFAULT_SETTINGS });
    }

  } catch (error) {
    console.error('[super-admin/settings] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

// POST: Update settings
export async function POST(request: NextRequest) {
  // Verify super admin authentication
  const authResult = await superAdminMiddleware(request);

  // If middleware returns a response (error), return it
  if (authResult instanceof NextResponse && authResult.status !== 200) {
    return authResult;
  }

  // Extract super admin context for audit logging
  const adminContext = getSuperAdminContext(request);
  if (!adminContext) {
    return NextResponse.json(
      { error: 'Unauthorized - Missing admin context' },
      { status: 401 }
    );
  }

  try {
    const settings: Settings = await request.json();

    // Validaciones
    if (typeof settings.maintenanceMode !== 'boolean') {
      return NextResponse.json({ error: 'Invalid maintenanceMode: must be boolean' }, { status: 400 });
    }

    if (typeof settings.maxFileSize !== 'number' || settings.maxFileSize < 1 || settings.maxFileSize > 100) {
      return NextResponse.json({ error: 'maxFileSize must be between 1-100 MB' }, { status: 400 });
    }

    if (typeof settings.globalAnnouncement !== 'string') {
      return NextResponse.json({ error: 'globalAnnouncement must be string' }, { status: 400 });
    }

    if (typeof settings.defaultModel !== 'string' || !settings.defaultModel.trim()) {
      return NextResponse.json({ error: 'defaultModel must be non-empty string' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Capture current settings (before update) for audit logging
    let beforeSettings: Settings | null = null;

    // Opción 1: Intentar actualizar tabla
    const { data: existingSettingsRows, error: tableCheckError } = await supabase
      .from('platform_settings')
      .select('*');

    if (!tableCheckError && existingSettingsRows && existingSettingsRows.length > 0) {
      // Tabla existe, usar upsert
      console.log('[super-admin/settings] Updating database table');

      // Convert rows to object for before state
      beforeSettings = {} as Settings;
      existingSettingsRows.forEach((row: any) => {
        (beforeSettings as any)[row.setting_key] = row.setting_value;
      });

      const updates = Object.entries(settings).map(([key, value]) => ({
        setting_key: key,
        setting_value: value,
        updated_at: new Date().toISOString()
      }));

      for (const update of updates) {
        const { error: upsertError } = await supabase
          .from('platform_settings')
          .upsert(update, { onConflict: 'setting_key' });

        if (upsertError) {
          console.error('[super-admin/settings] Upsert error:', upsertError);
        }
      }

      // Log settings update to audit log (fire and forget - don't block response)
      logSettingsUpdate(
        adminContext.super_admin_id,
        beforeSettings,
        settings,
        request
      ).catch((error) => {
        console.error('[super-admin/settings] Failed to log audit entry:', error);
      });

      return NextResponse.json({ success: true, settings });
    }

    // Opción 2: Guardar en JSON file
    console.log('[super-admin/settings] Updating JSON file');

    // Try to read existing file for before state
    try {
      const fileContent = await fs.readFile(SETTINGS_FILE, 'utf-8');
      beforeSettings = JSON.parse(fileContent);
    } catch (error) {
      // File doesn't exist - use defaults as before state
      beforeSettings = DEFAULT_SETTINGS;
    }

    await fs.mkdir(path.dirname(SETTINGS_FILE), { recursive: true });
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2));

    // Log settings update to audit log (fire and forget - don't block response)
    logSettingsUpdate(
      adminContext.super_admin_id,
      beforeSettings,
      settings,
      request
    ).catch((error) => {
      console.error('[super-admin/settings] Failed to log audit entry:', error);
    });

    return NextResponse.json({ success: true, settings });

  } catch (error) {
    console.error('[super-admin/settings] POST error:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
