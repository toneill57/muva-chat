import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { verifyStaffToken } from '@/lib/staff-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/analytics/dashboard-stats
 *
 * Returns real-time statistics for the tenant dashboard:
 * - Documents: Count of accommodation documents
 * - Chat Sessions: Total guest conversations
 * - Active Users: Unique conversations in last 7 days
 * - Growth: % change in conversations (last 7 days vs previous 7 days)
 *
 * Requires: Authorization header with Bearer token (staff JWT)
 */
export async function GET(request: NextRequest) {
  try {
    // Extract Bearer token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing authentication' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify staff token
    const session = await verifyStaffToken(token);
    if (!session) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const tenantId = session.tenant_id;
    const supabase = await createServerClient();

    // Parallel queries for better performance
    const [
      documentsResult,
      totalConversationsResult,
      recentConversationsResult,
      previousConversationsResult
    ] = await Promise.all([
      // 1. Documents count
      supabase
        .from('accommodation_documents')
        .select('document_id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId),

      // 2. Total chat sessions (all time)
      supabase
        .from('guest_conversations')
        .select('conversation_id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId),

      // 3. Active users (last 7 days) - unique conversations
      supabase
        .from('guest_conversations')
        .select('conversation_id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),

      // 4. Previous period (7-14 days ago) for growth calculation
      supabase
        .from('guest_conversations')
        .select('conversation_id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
        .lt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    ]);

    // Calculate growth percentage
    const recentCount = recentConversationsResult.count || 0;
    const previousCount = previousConversationsResult.count || 0;

    let growthPercentage = 0;
    if (previousCount > 0) {
      growthPercentage = Math.round(((recentCount - previousCount) / previousCount) * 100);
    } else if (recentCount > 0) {
      growthPercentage = 100; // First week with data = 100% growth
    }

    const stats = {
      documents: documentsResult.count || 0,
      total_conversations: totalConversationsResult.count || 0,
      active_users: recentConversationsResult.count || 0,
      growth_percentage: growthPercentage,
      growth_direction: growthPercentage >= 0 ? 'up' : 'down'
    };

    return NextResponse.json({
      success: true,
      stats,
      period: {
        active_users: 'last_7_days',
        growth_comparison: 'last_7_days_vs_previous_7_days'
      }
    });

  } catch (error: any) {
    console.error('[dashboard-stats] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch dashboard statistics',
        message: error.message
      },
      { status: 500 }
    );
  }
}
