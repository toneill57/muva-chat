'use client';

import { Building2, MessageSquare, Users, FileText } from 'lucide-react';
import { useSuperAdmin } from '@/contexts/SuperAdminContext';

export default function PlatformMetricsCards() {
  const { platformMetrics } = useSuperAdmin();

  const metrics = [
    {
      id: 'tenants',
      label: 'Active Tenants',
      value: platformMetrics
        ? `${platformMetrics.active_tenants} / ${platformMetrics.total_tenants}`
        : '0 / 0',
      icon: Building2,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50'
    },
    {
      id: 'conversations',
      label: 'Conversations (30 days)',
      value: platformMetrics?.total_conversations_30d.toLocaleString() || '0',
      icon: MessageSquare,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      id: 'users',
      label: 'Active Users (30 days)',
      value: platformMetrics?.active_users_30d.toLocaleString() || '0',
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      id: 'content',
      label: 'MUVA Listings',
      value: platformMetrics?.muva_content_count.toLocaleString() || '0',
      icon: FileText,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <div key={metric.id} className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
            <div className={`w-12 h-12 rounded-lg ${metric.bgColor} flex items-center justify-center mb-4`}>
              <Icon className={`w-6 h-6 ${metric.color}`} />
            </div>
            <div className="text-3xl font-bold text-slate-900 mb-1">
              {platformMetrics ? metric.value : (
                <div className="h-9 w-24 bg-slate-200 animate-pulse rounded" />
              )}
            </div>
            <div className="text-sm text-slate-500">{metric.label}</div>
          </div>
        );
      })}
    </div>
  );
}
