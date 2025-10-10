'use client';

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AnalyticsData {
  summary: {
    total_chats: number;
    total_messages: number;
    avg_response_time_ms: number;
    engagement_score: number;
  };
  conversations_over_time: Array<{ date: string; count: number }>;
  top_queries: Array<{ query: string; count: number }>;
}

export function AnalyticsCharts({ data }: { data: AnalyticsData }) {
  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Chats</CardDescription>
            <CardTitle className="text-3xl">{data.summary.total_chats.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">Since launch</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Messages</CardDescription>
            <CardTitle className="text-3xl">{data.summary.total_messages.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">All conversations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Response Time</CardDescription>
            <CardTitle className="text-3xl">{(data.summary.avg_response_time_ms / 1000).toFixed(2)}s</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">Per message</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Engagement Score</CardDescription>
            <CardTitle className="text-3xl">{data.summary.engagement_score}%</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">User satisfaction</p>
          </CardContent>
        </Card>
      </div>

      {/* Conversations over time (Line chart) */}
      <Card>
        <CardHeader>
          <CardTitle>Conversations Over Time</CardTitle>
          <CardDescription>Daily chat volume for the last 10 days</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.conversations_over_time}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return `${date.getMonth() + 1}/${date.getDate()}`;
                }}
              />
              <YAxis />
              <Tooltip
                labelFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString();
                }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top queries (Bar chart) */}
      <Card>
        <CardHeader>
          <CardTitle>Top 5 User Queries</CardTitle>
          <CardDescription>Most frequently asked questions</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.top_queries} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis
                type="category"
                dataKey="query"
                width={200}
                tick={{ fontSize: 12 }}
              />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
