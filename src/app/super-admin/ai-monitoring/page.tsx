'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AIUsageCharts } from '@/components/SuperAdmin/AIUsageCharts';
import { AITopConsumers } from '@/components/SuperAdmin/AITopConsumers';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Bot,
  Zap,
  DollarSign,
  Clock,
  Activity,
  AlertCircle
} from 'lucide-react';
import type { AIMonitoringResponse } from '@/types/super-admin';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  loading?: boolean;
}

function MetricCard({ title, value, subtitle, icon, loading = false }: MetricCardProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-12 w-12 rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-2">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          </div>
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AIMonitoringPage() {
  const [data, setData] = useState<AIMonitoringResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAIMonitoring();
  }, []);

  const fetchAIMonitoring = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('super_admin_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/super-admin/ai-monitoring', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch AI monitoring data: ${response.statusText}`);
      }

      const result = await response.json();

      // Transform API response to match component props
      const transformedData: AIMonitoringResponse = {
        metrics: {
          totalTokens: result.metrics.totalTokens,
          totalCost: parseFloat(result.metrics.totalCost),
          avgLatency: result.metrics.avgLatency,
          totalRequests: result.metrics.totalRequests
        },
        stats: result.dailyStats.map((stat: any) => ({
          date: stat.date,
          total_tokens: stat.totalTokens,
          total_cost: parseFloat(stat.totalCost),
          avg_latency: stat.avgLatency,
          request_count: stat.requests
        })),
        topConsumers: result.topConsumers.map((consumer: any) => ({
          tenant_id: consumer.tenantId,
          subdomain: consumer.subdomain,
          business_name: consumer.nombreComercial,
          total_tokens: consumer.totalTokens,
          total_cost: parseFloat(consumer.totalCost),
          avg_latency: consumer.avgLatency,
          request_count: consumer.requests
        })),
        modelDistribution: result.modelStats.map((model: any, index: number) => ({
          model: model.model,
          request_count: model.requests,
          percentage: (model.requests / result.metrics.totalRequests) * 100,
          total_tokens: model.totalTokens,
          total_cost: parseFloat(model.totalCost)
        }))
      };

      setData(transformedData);
    } catch (error) {
      console.error('Error fetching AI monitoring data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load AI monitoring data');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (value: number) => {
    return value.toLocaleString('en-US');
  };

  const formatCost = (value: number) => {
    return value.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Bot className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            AI Model Monitoring
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Track token usage, costs, and performance metrics across all tenants
        </p>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Tokens"
          value={data ? formatNumber(data.metrics.totalTokens) : '0'}
          subtitle="This period"
          icon={<Zap className="h-6 w-6" />}
          loading={loading}
        />
        <MetricCard
          title="Total Cost"
          value={data ? formatCost(data.metrics.totalCost) : '$0.00'}
          subtitle="This period"
          icon={<DollarSign className="h-6 w-6" />}
          loading={loading}
        />
        <MetricCard
          title="Avg Latency"
          value={data ? `${data.metrics.avgLatency.toFixed(0)}ms` : '0ms'}
          subtitle="Response time"
          icon={<Clock className="h-6 w-6" />}
          loading={loading}
        />
        <MetricCard
          title="Total Requests"
          value={data ? formatNumber(data.metrics.totalRequests) : '0'}
          subtitle="This period"
          icon={<Activity className="h-6 w-6" />}
          loading={loading}
        />
      </div>

      {/* Charts */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Usage Analytics</h2>
        <AIUsageCharts
          stats={data?.stats || []}
          modelDistribution={data?.modelDistribution || []}
          loading={loading}
        />
      </div>

      {/* Top Consumers */}
      <div>
        <AITopConsumers
          consumers={data?.topConsumers || []}
          loading={loading}
        />
      </div>
    </div>
  );
}
