'use client';

import { CheckCircle2, FileText, AlertTriangle, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface ComplianceOverviewProps {
  summary?: {
    total_tenants: number;
    compliant: number;
    warning: number;
    overdue: number;
    never_submitted: number;
    compliance_rate: number;
  };
  tenants?: Array<{ submissions_30d: number; status: string }>;
}

export default function ComplianceOverview({ summary, tenants }: ComplianceOverviewProps) {
  if (!summary || !tenants) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Calculate total submissions in last 30 days
  const totalSubmissions30d = tenants.reduce((sum, t) => sum + (t.submissions_30d || 0), 0);

  // Calculate submission success rate (all-time)
  const tenantsWithSubmissions = tenants.filter(t => t.status !== 'never_submitted').length;
  const submissionSuccessRate = summary.total_tenants > 0
    ? Math.round((tenantsWithSubmissions / summary.total_tenants) * 100)
    : 0;

  // Determine compliance badge variant
  const getComplianceBadge = () => {
    if (summary.compliance_rate > 80) {
      return {
        text: 'Excellent',
        className: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800'
      };
    } else if (summary.compliance_rate > 60) {
      return {
        text: 'Good',
        className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800'
      };
    } else {
      return {
        text: 'Needs Attention',
        className: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 border-red-200 dark:border-red-800'
      };
    }
  };

  const complianceBadge = getComplianceBadge();
  const tenantsAtRisk = summary.warning + summary.overdue;

  const metrics = [
    {
      id: 'compliant',
      label: 'Tenants Compliant',
      value: summary.compliant,
      subtitle: `${summary.compliance_rate.toFixed(1)}% compliance rate`,
      icon: CheckCircle2,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/10',
      badge: complianceBadge
    },
    {
      id: 'submissions',
      label: 'Total Submissions',
      value: totalSubmissions30d.toLocaleString(),
      subtitle: 'Last 30 days',
      icon: FileText,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/10',
      badge: null
    },
    {
      id: 'at_risk',
      label: 'Tenants At Risk',
      value: tenantsAtRisk,
      subtitle: 'Require attention',
      icon: AlertTriangle,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-900/10',
      badge: tenantsAtRisk > 0 ? {
        text: 'Action Required',
        className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400 border-orange-200 dark:border-orange-800'
      } : null
    },
    {
      id: 'success_rate',
      label: 'Submission Success Rate',
      value: `${submissionSuccessRate}%`,
      subtitle: 'All-time',
      icon: TrendingUp,
      color: 'text-teal-600 dark:text-teal-400',
      bgColor: 'bg-teal-50 dark:bg-teal-900/10',
      badge: null
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <Card key={metric.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.label}
              </CardTitle>
              <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                <Icon className={`h-5 w-5 ${metric.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground mb-1">
                {metric.value}
              </div>
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">
                  {metric.subtitle}
                </p>
                {metric.badge && (
                  <Badge variant="outline" className={metric.badge.className}>
                    {metric.badge.text}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
