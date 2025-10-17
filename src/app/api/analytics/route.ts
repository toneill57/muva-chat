import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get('tenant_id');

  if (!tenantId) {
    return NextResponse.json({ error: 'tenant_id required' }, { status: 400 });
  }

  // TODO: Replace with real DB queries in Phase 2
  // For now, return mock data for UI development
  const mockData = {
    summary: {
      total_chats: 1247,
      total_messages: 8934,
      avg_response_time_ms: 1850,
      engagement_score: 87.5 // percentage
    },
    conversations_over_time: [
      { date: '2025-10-01', count: 42 },
      { date: '2025-10-02', count: 38 },
      { date: '2025-10-03', count: 51 },
      { date: '2025-10-04', count: 47 },
      { date: '2025-10-05', count: 55 },
      { date: '2025-10-06', count: 62 },
      { date: '2025-10-07', count: 58 },
      { date: '2025-10-08', count: 64 },
      { date: '2025-10-09', count: 71 },
      { date: '2025-10-10', count: 68 }
    ],
    top_queries: [
      { query: 'What are your room rates?', count: 187 },
      { query: 'Do you offer surfing lessons?', count: 143 },
      { query: 'What time is check-in?', count: 129 },
      { query: 'Is breakfast included?', count: 98 },
      { query: 'Can I book for next week?', count: 76 }
    ]
  };

  return NextResponse.json(mockData);
}
