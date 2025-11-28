'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

interface Tenant {
  tenant_id: string;
  nombre_comercial: string;
  subdomain: string;
  subscription_tier: 'free' | 'basic' | 'premium' | 'enterprise';
  last_activity: string | null;
}

const tierStyles = {
  free: 'bg-gray-100 text-gray-700 border-gray-300',
  basic: 'bg-blue-100 text-blue-700 border-blue-300',
  premium: 'bg-teal-100 text-teal-700 border-teal-300',
  enterprise: 'bg-purple-100 text-purple-700 border-purple-300'
};

export default function TenantQuickTable() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('super_admin_token');
      const response = await fetch('/api/super-admin/tenants?limit=5&sortBy=last_activity&sortOrder=desc', {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tenants');
      }

      const data = await response.json();
      setTenants(data.tenants || []);
    } catch (err) {
      console.error('Error fetching tenants:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch on mount
  useEffect(() => {
    fetchTenants();
  }, []);

  // Auto-refresh every 30 seconds (when tab is visible)
  useEffect(() => {
    const POLL_INTERVAL = 30000; // 30 seconds

    const interval = setInterval(() => {
      // Only fetch if the tab is visible
      if (document.visibilityState === 'visible') {
        fetchTenants();
      }
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  const formatLastActivity = (lastActivity: string | null) => {
    if (!lastActivity) return 'No activity';
    try {
      return formatDistanceToNow(new Date(lastActivity), { addSuffix: true });
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Recent Activity</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/super-admin/tenants" className="text-teal-600 hover:text-teal-700">
              View All Tenants
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-slate-500">
            Loading tenants...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">
            Error: {error}
          </div>
        ) : tenants.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No tenants found
          </div>
        ) : (
          <table className="table-auto w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Tenant
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Subdomain
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Plan
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Last Activity
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {tenants.map((tenant) => (
                <tr key={tenant.tenant_id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                        {tenant.nombre_comercial?.charAt(0) || '?'}
                      </div>
                      <span className="font-medium text-slate-900">{tenant.nombre_comercial}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <code className="text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded">
                      {tenant.subdomain}
                    </code>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${tierStyles[tenant.subscription_tier as keyof typeof tierStyles]}`}>
                      {tenant.subscription_tier.charAt(0).toUpperCase() + tenant.subscription_tier.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {formatLastActivity(tenant.last_activity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
