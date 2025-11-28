import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { is_active } = body;

    // Validación
    if (typeof is_active !== 'boolean') {
      return NextResponse.json(
        { error: 'is_active must be boolean' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('super_admin_users')
      .update({
        is_active,
        updated_at: new Date().toISOString()
      })
      .eq('super_admin_id', id)
      .select('super_admin_id, username, full_name, email, is_active, last_login_at, created_at, updated_at')
      .single();

    if (error) {
      console.error('[super-admin/users] Update error:', error);
      throw error;
    }

    console.log(`[super-admin/users] Updated user ${id}, is_active: ${is_active}`);

    return NextResponse.json({ success: true, user: data });

  } catch (error: any) {
    console.error('[super-admin/users] PATCH error:', error);

    // Manejar caso de usuario no encontrado
    if (error?.code === 'PGRST116') {
      return NextResponse.json(
        { error: 'Super admin user not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update super admin user' },
      { status: 500 }
    );
  }
}
