'use client';

import { useEffect } from 'react';
import { useSuperAdmin } from '@/contexts/SuperAdminContext';
import PlatformMetricsCards from '@/components/SuperAdmin/PlatformMetricsCards';
import TenantQuickTable from '@/components/SuperAdmin/TenantQuickTable';

export default function SuperAdminDashboard() {
  const { superAdmin, loadMetrics } = useSuperAdmin();

  // Initial load of metrics
  useEffect(() => {
    loadMetrics();
  }, []);

  // Auto-refresh metrics every 30 seconds (when tab is visible)
  useEffect(() => {
    const POLL_INTERVAL = 30000; // 30 seconds

    const interval = setInterval(() => {
      // Only fetch if the tab is visible
      if (document.visibilityState === 'visible') {
        loadMetrics();
      }
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [loadMetrics]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          Welcome back, {superAdmin?.full_name || superAdmin?.username}
        </h1>
        <p className="text-slate-500 mt-2">
          Platform overview and recent activity
        </p>
      </div>

      <PlatformMetricsCards />

      <TenantQuickTable />
    </div>
  );
}
