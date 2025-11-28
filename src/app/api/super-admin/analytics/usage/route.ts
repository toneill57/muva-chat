import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    // Validate days parameter
    if (![7, 30, 90].includes(days)) {
      return NextResponse.json(
        { error: 'Invalid days parameter. Must be 7, 30, or 90' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Calculate start date
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // Query conversations from last N days
    const { data: conversationsData, error: convError } = await supabase
      .from('chat_conversations')
      .select('created_at, user_id')
      .gte('created_at', startDate)
      .order('created_at');

    if (convError) {
      console.error('[analytics/usage] Query error:', convError);
      throw convError;
    }

    // Group by day
    const usageByDay: Record<string, { date: string; conversations: number; users: Set<string> }> = {};

    conversationsData?.forEach(conv => {
      const date = new Date(conv.created_at).toISOString().split('T')[0];
      if (!usageByDay[date]) {
        usageByDay[date] = { date, conversations: 0, users: new Set() };
      }
      usageByDay[date].conversations++;
      if (conv.user_id) {
        usageByDay[date].users.add(conv.user_id);
      }
    });

    // Fill in missing dates with zero values
    const endDate = new Date();
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      if (!usageByDay[dateKey]) {
        usageByDay[dateKey] = { date: dateKey, conversations: 0, users: new Set() };
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Format for Recharts
    const chartData = Object.values(usageByDay)
      .map(day => ({
        date: day.date,
        conversations: day.conversations,
        activeUsers: day.users.size
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    console.log(`[analytics/usage] Returning ${chartData.length} days of data`);

    return NextResponse.json({ data: chartData });

  } catch (error) {
    console.error('[analytics/usage] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}
