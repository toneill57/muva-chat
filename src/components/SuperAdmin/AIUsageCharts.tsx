'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import type { AIUsageStat, AIModelDistribution } from '@/types/super-admin';

interface AIUsageChartsProps {
  stats: AIUsageStat[];
  modelDistribution: AIModelDistribution[];
  loading?: boolean;
}

const CHART_COLORS = {
  primary: '#0d9488', // teal-600
  secondary: '#8b5cf6', // purple-600
  tertiary: '#f59e0b', // amber-500
  quaternary: '#3b82f6', // blue-500
  quinary: '#ec4899', // pink-500
};

const PIE_COLORS = [
  '#0d9488', // teal-600
  '#8b5cf6', // purple-600
  '#f59e0b', // amber-500
  '#3b82f6', // blue-500
  '#ec4899', // pink-500
  '#10b981', // green-500
];

const formatNumber = (value: number) => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
};

const formatCost = (value: number) => {
  return `$${value.toFixed(2)}`;
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const LoadingCard = () => (
  <Card>
    <CardHeader>
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-32 mt-2" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-[300px] w-full" />
    </CardContent>
  </Card>
);

export function AIUsageCharts({ stats, modelDistribution, loading = false }: AIUsageChartsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LoadingCard />
        <LoadingCard />
        <LoadingCard />
        <LoadingCard />
      </div>
    );
  }

  if (!stats || stats.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-[300px]">
          <div className="text-center text-muted-foreground">
            <p>No AI usage data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate cumulative cost
  const statsWithCumulative = stats.map((stat, index) => {
    const previousCost = index > 0 ? (stats[index - 1] as any).cumulative_cost || stats[index - 1].total_cost : 0;
    return {
      ...stat,
      cumulative_cost: previousCost + stat.total_cost
    };
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Line Chart: Tokens per day */}
      <Card>
        <CardHeader>
          <CardTitle>Token Usage Trend</CardTitle>
          <CardDescription>Daily token consumption over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                className="text-xs"
                tickFormatter={formatDate}
              />
              <YAxis
                className="text-xs"
                tickFormatter={formatNumber}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                labelFormatter={(value) => formatDate(value as string)}
                formatter={(value: number) => [formatNumber(value), 'Tokens']}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="total_tokens"
                stroke={CHART_COLORS.primary}
                strokeWidth={2}
                dot={{ fill: CHART_COLORS.primary, r: 4 }}
                activeDot={{ r: 6 }}
                name="Total Tokens"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Area Chart: Cumulative cost */}
      <Card>
        <CardHeader>
          <CardTitle>Cumulative Cost</CardTitle>
          <CardDescription>Total spending over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={statsWithCumulative}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                className="text-xs"
                tickFormatter={formatDate}
              />
              <YAxis
                className="text-xs"
                tickFormatter={formatCost}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                labelFormatter={(value) => formatDate(value as string)}
                formatter={(value: number) => [formatCost(value), 'Cost']}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="cumulative_cost"
                stroke={CHART_COLORS.tertiary}
                fill={CHART_COLORS.tertiary}
                fillOpacity={0.3}
                name="Cumulative Cost"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Bar Chart: Average latency */}
      <Card>
        <CardHeader>
          <CardTitle>Response Latency</CardTitle>
          <CardDescription>Average response time per day</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                className="text-xs"
                tickFormatter={formatDate}
              />
              <YAxis
                className="text-xs"
                label={{ value: 'ms', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                labelFormatter={(value) => formatDate(value as string)}
                formatter={(value: number) => [`${value.toFixed(0)}ms`, 'Latency']}
              />
              <Legend />
              <Bar
                dataKey="avg_latency"
                fill={CHART_COLORS.secondary}
                name="Avg Latency"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Pie Chart: Model distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Model Distribution</CardTitle>
          <CardDescription>Request count by AI model</CardDescription>
        </CardHeader>
        <CardContent>
          {modelDistribution && modelDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={modelDistribution as any}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ model, percentage }: any) => `${model}: ${percentage.toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="request_count"
                >
                  {modelDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number, name, props) => [
                    `${value} requests (${props.payload.percentage.toFixed(1)}%)`,
                    props.payload.model
                  ]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              <p>No model distribution data available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
