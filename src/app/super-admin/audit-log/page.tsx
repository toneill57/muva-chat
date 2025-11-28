'use client';

import { useState, useEffect } from 'react';
import { Shield } from 'lucide-react';
import { AuditLogFilters } from '@/components/SuperAdmin/AuditLogFilters';
import { AuditLogTable } from '@/components/SuperAdmin/AuditLogTable';
import type { AuditLog, AuditLogFilters as AuditLogFiltersType } from '@/types/super-admin';

export default function AuditLogPage() {
  // State
  const [filters, setFilters] = useState<AuditLogFiltersType>({});
  const [page, setPage] = useState(1);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Fetch logs when filters or page change
  useEffect(() => {
    fetchLogs();
  }, [filters, page]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        ...(filters.action && { action: filters.action }),
        ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
        ...(filters.dateTo && { dateTo: filters.dateTo }),
        ...(filters.search && { search: filters.search }),
      });

      const token = localStorage.getItem('super_admin_token');
      const response = await fetch(`/api/super-admin/audit-log?${params}`, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch audit logs');
      }

      const data = await response.json();

      setLogs(data.logs || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      setLogs([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters: AuditLogFiltersType) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page when filters change
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({
        format: 'csv',
        ...(filters.action && { action: filters.action }),
        ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
        ...(filters.dateTo && { dateTo: filters.dateTo }),
        ...(filters.search && { search: filters.search }),
      });

      const token = localStorage.getItem('super_admin_token');
      const response = await fetch(`/api/super-admin/audit-log?${params}`, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to export audit logs');
      }

      // Get the CSV blob
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Generate filename with date range if applicable
      let filename = 'audit-log';
      if (filters.dateFrom || filters.dateTo) {
        filename += `_${filters.dateFrom || 'start'}_to_${filters.dateTo || 'end'}`;
      }
      filename += `_${new Date().toISOString().split('T')[0]}.csv`;

      a.download = filename;
      document.body.appendChild(a);
      a.click();

      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      alert('Failed to export audit logs. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Track all administrative actions and system changes
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="hidden sm:block">
            Retention: 90 days
          </div>
        </div>
      </div>

      {/* Filters */}
      <AuditLogFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onExport={handleExport}
        exporting={exporting}
      />

      {/* Table */}
      <AuditLogTable
        logs={logs}
        loading={loading}
        totalPages={totalPages}
        currentPage={page}
        onPageChange={setPage}
      />
    </div>
  );
}
