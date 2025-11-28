'use client';

import { Card, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

interface TopTenant {
  tenant_id: string;
  nombre_comercial: string;
  subdomain: string;
  conversation_count: number;
}

interface TopTenantsChartProps {
  data: TopTenant[];
  loading: boolean;
}

export function TopTenantsChart({ data, loading }: TopTenantsChartProps) {
  if (loading) {
    return <Skeleton className="h-[400px] w-full" />;
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="text-center text-muted-foreground">
          <p>No tenant activity for the selected period</p>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ left: 20, right: 20, top: 10, bottom: 10 }}
      >
        <XAxis type="number" className="text-xs" />
        <YAxis
          type="category"
          dataKey="nombre_comercial"
          width={150}
          className="text-xs"
          tickFormatter={(value) => value.length > 20 ? value.substring(0, 20) + '...' : value}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px'
          }}
          formatter={(value: number, name: string, props: any) => [
            `${value} conversations`,
            `${props.payload.nombre_comercial} (${props.payload.subdomain})`
          ]}
        />
        <Bar dataKey="conversation_count" radius={[0, 4, 4, 0]}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={index < 3 ? '#0d9488' : '#14b8a6'}
              className="cursor-pointer hover:opacity-80 transition-opacity"
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
