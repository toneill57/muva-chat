'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Building, Home, AlertCircle, CheckCircle2, Clock, Eye } from 'lucide-react';

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

interface IntegrationsTableProps {
  integrations: Integration[];
  loading: boolean;
  onViewLogs: (integrationId: string) => void;
}

export function IntegrationsTable({ integrations, loading, onViewLogs }: IntegrationsTableProps) {
  const getStatusBadge = (status: string) => {
    const variants = {
      synced: { className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', label: 'Synced', icon: CheckCircle2 },
      error: { className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', label: 'Error', icon: AlertCircle },
      never_synced: { className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200', label: 'Never Synced', icon: Clock }
    };
    return variants[status as keyof typeof variants] || variants.never_synced;
  };

  const getProviderBadge = (provider: string) => {
    return provider === 'motopress'
      ? { icon: Building, label: 'MotoPress', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' }
      : { icon: Home, label: 'Airbnb', className: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200' };
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (integrations.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">No integrations found</h3>
        <p className="text-muted-foreground">No integrations match the current filters.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tenant</TableHead>
            <TableHead>Integration</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Sync</TableHead>
            <TableHead className="text-right">Records</TableHead>
            <TableHead className="text-right">Errors</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {integrations.map((integration) => {
            const statusBadge = getStatusBadge(integration.status);
            const providerBadge = getProviderBadge(integration.provider);
            const StatusIcon = statusBadge.icon;
            const ProviderIcon = providerBadge.icon;
            const hasErrors = integration.error_count > 0;

            return (
              <TableRow
                key={integration.integration_id}
                className={hasErrors ? 'bg-red-50 dark:bg-red-950/20' : ''}
              >
                <TableCell>
                  <Link
                    href={`/super-admin/tenants/${integration.tenant_id}`}
                    className="hover:underline font-medium"
                  >
                    {integration.tenant_name}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {integration.subdomain}.muva.com.co
                  </div>
                </TableCell>

                <TableCell>
                  <Badge variant="outline" className={providerBadge.className}>
                    <ProviderIcon className="mr-1 h-3 w-3" />
                    {providerBadge.label}
                  </Badge>
                </TableCell>

                <TableCell>
                  <Badge variant="outline" className={statusBadge.className}>
                    <StatusIcon className="mr-1 h-3 w-3" />
                    {statusBadge.label}
                  </Badge>
                </TableCell>

                <TableCell>
                  {integration.last_sync ? (
                    <span className="text-sm">
                      {formatDistanceToNow(new Date(integration.last_sync), { addSuffix: true })}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">Never</span>
                  )}
                </TableCell>

                <TableCell className="text-right font-mono">
                  {integration.records_synced.toLocaleString()}
                </TableCell>

                <TableCell className="text-right">
                  {hasErrors ? (
                    <Badge variant="destructive">{integration.error_count}</Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">0</span>
                  )}
                </TableCell>

                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewLogs(integration.integration_id)}
                  >
                    <Eye className="mr-1 h-3 w-3" />
                    View Logs
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
