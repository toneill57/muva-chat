import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();

    const { data: users, error } = await supabase
      .from('super_admin_users')
      .select('super_admin_id, username, full_name, email, is_active, last_login_at, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[super-admin/users] Query error:', error);
      throw error;
    }

    console.log(`[super-admin/users] Fetched ${users?.length || 0} super admin users`);

    // NO retornar password_hash por seguridad
    return NextResponse.json({ users: users || [] });

  } catch (error) {
    console.error('[super-admin/users] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch super admin users' },
      { status: 500 }
    );
  }
}
