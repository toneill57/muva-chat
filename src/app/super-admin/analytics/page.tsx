'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UsageCharts } from '@/components/SuperAdmin/UsageCharts';
import { TopTenantsChart } from '@/components/SuperAdmin/TopTenantsChart';
import { TrendingUp, Users, MessageSquare, Building2 } from 'lucide-react';

interface UsageDataItem {
  date: string;
  conversations: number;
  activeUsers: number;
}

interface TopTenant {
  tenant_id: string;
  nombre_comercial: string;
  subdomain: string;
  conversation_count: number;
}

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<'7' | '30' | '90'>('30');
  const [usageData, setUsageData] = useState<UsageDataItem[]>([]);
  const [topTenants, setTopTenants] = useState<TopTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalConversations: 0,
    totalUsers: 0,
    activeTenantsCount: 0,
    avgConversationsPerDay: 0
  });

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('super_admin_token');
      const [usageRes, tenantsRes] = await Promise.all([
        fetch(`/api/super-admin/analytics/usage?days=${dateRange}`, {
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }),
        fetch(`/api/super-admin/analytics/top-tenants?days=${dateRange}`, {
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        })
      ]);

      const usageResult = await usageRes.json();
      const tenantsResult = await tenantsRes.json();

      setUsageData(usageResult.data || []);
      setTopTenants(tenantsResult.data || []);

      // Calcular métricas agregadas
      const totalConv = usageResult.data?.reduce((sum: number, day: UsageDataItem) => sum + day.conversations, 0) || 0;
      const totalUsers = usageResult.data?.reduce((sum: number, day: UsageDataItem) => sum + day.activeUsers, 0) || 0;
      const avgConv = usageResult.data?.length > 0 ? Math.round(totalConv / usageResult.data.length) : 0;

      setMetrics({
        totalConversations: totalConv,
        totalUsers: totalUsers,
        activeTenantsCount: tenantsResult.data?.length || 0,
        avgConversationsPerDay: avgConv
      });

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Platform Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Monitor usage trends and performance metrics
          </p>
        </div>

        {/* Date Range Selector */}
        <Select value={dateRange} onValueChange={(val) => setDateRange(val as '7' | '30' | '90')}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalConversations.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Last {dateRange} days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Cumulative active users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Tenants</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeTenantsCount}</div>
            <p className="text-xs text-muted-foreground">
              With activity
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg. Daily Conversations</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgConversationsPerDay}</div>
            <p className="text-xs text-muted-foreground">
              Per day average
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Usage Charts */}
      <UsageCharts data={usageData} loading={loading} />

      {/* Top Tenants */}
      <Card>
        <CardHeader>
          <CardTitle>Top Tenants by Activity</CardTitle>
          <CardDescription>
            Most active hotels in the last {dateRange} days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TopTenantsChart data={topTenants} loading={loading} />
        </CardContent>
      </Card>
    </div>
  );
}
