'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { IntegrationsTable } from '@/components/SuperAdmin/IntegrationsTable';
import { SyncLogsModal } from '@/components/SuperAdmin/SyncLogsModal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle2, AlertCircle, Clock } from 'lucide-react';

interface Integration {
  integration_id: string;
  tenant_id: string;
  tenant_name: string;
  subdomain: string;
  provider: 'motopress' | 'airbnb';
  status: 'synced' | 'error' | 'never_synced';
  last_sync: string | null;
  last_sync_status: string | null;
  records_synced: number;
  error_count: number;
  error_message: string | null;
  is_active: boolean;
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [stats, setStats] = useState({
    totalIntegrations: 0,
    syncedToday: 0,
    errorRate: 0
  });

  useEffect(() => {
    fetchIntegrations();
  }, [filterType, filterStatus]);

  const fetchIntegrations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        ...(filterType !== 'all' && { type: filterType }),
        ...(filterStatus !== 'all' && { status: filterStatus })
      });

      const token = localStorage.getItem('super_admin_token');
      const response = await fetch(`/api/super-admin/integrations?${params}`, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      const data = await response.json();

      setIntegrations(data.integrations || []);

      // Calcular stats
      const total = data.integrations?.length || 0;
      const synced = data.integrations?.filter((i: Integration) =>
        i.last_sync && new Date(i.last_sync).toDateString() === new Date().toDateString()
      ).length || 0;
      const errors = data.integrations?.filter((i: Integration) => i.status === 'error').length || 0;

      setStats({
        totalIntegrations: total,
        syncedToday: synced,
        errorRate: total > 0 ? Math.round((errors / total) * 100) : 0
      });

    } catch (error) {
      console.error('Error fetching integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewLogs = (integrationId: string) => {
    setSelectedIntegration(integrationId);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Integrations Monitor</h1>
        <p className="text-muted-foreground mt-1">
          Monitor MotoPress and Airbnb synchronization status across all tenants
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Integrations</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalIntegrations}</div>
            <p className="text-xs text-muted-foreground">Active connections</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Synced Today</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.syncedToday}</div>
            <p className="text-xs text-muted-foreground">Successful syncs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.errorRate}%</div>
            <p className="text-xs text-muted-foreground">Failed syncs</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="motopress">MotoPress</SelectItem>
            <SelectItem value="airbnb">Airbnb</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="error">Errors Only</SelectItem>
            <SelectItem value="synced">Synced</SelectItem>
            <SelectItem value="never_synced">Never Synced</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Integrations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Status</CardTitle>
          <CardDescription>
            All MotoPress and Airbnb integrations with synchronization details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <IntegrationsTable
            integrations={integrations}
            loading={loading}
            onViewLogs={handleViewLogs}
          />
        </CardContent>
      </Card>

      {/* Sync Logs Modal */}
      <SyncLogsModal
        integrationId={selectedIntegration}
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedIntegration(null);
        }}
      />
    </div>
  );
}
