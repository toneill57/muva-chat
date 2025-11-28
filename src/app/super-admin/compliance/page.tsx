'use client';

import { useEffect, useState } from 'react';
import ComplianceOverview from '@/components/SuperAdmin/ComplianceOverview';
import ComplianceAlerts from '@/components/SuperAdmin/ComplianceAlerts';
import ComplianceTable from '@/components/SuperAdmin/ComplianceTable';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface ComplianceTenant {
  tenant_id: string;
  subdomain: string;
  nombre_comercial: string;
  last_submission: string | null;
  submissions_30d: number;
  total_reservations: number;
  status: 'compliant' | 'warning' | 'overdue' | 'never_submitted';
  days_since_last: number | null;
}

interface ComplianceSummary {
  total_tenants: number;
  compliant: number;
  warning: number;
  overdue: number;
  never_submitted: number;
  compliance_rate: number;
}

interface ComplianceData {
  tenants: ComplianceTenant[];
  summary: ComplianceSummary;
}

export default function CompliancePage() {
  const [complianceData, setComplianceData] = useState<ComplianceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCompliance();
  }, []);

  const fetchCompliance = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('super_admin_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/super-admin/compliance', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch compliance data: ${response.statusText}`);
      }

      const data = await response.json();
      setComplianceData(data);
    } catch (error) {
      console.error('Error fetching compliance:', error);
      setError(error instanceof Error ? error.message : 'Failed to load compliance data');
    } finally {
      setLoading(false);
    }
  };

  const atRiskTenants = complianceData?.tenants.filter(
    t => t.status === 'warning' || t.status === 'overdue'
  ) || [];

  const handleViewAllAlerts = () => {
    // Scroll to table and apply filter
    const table = document.querySelector('[data-compliance-table]');
    if (table) {
      table.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // TODO: Set filter to 'warning' or 'overdue' - will need to expose setFilter from ComplianceTable
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Compliance Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Monitor SIRE compliance status for all tenants
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

      {/* Overview Cards */}
      <ComplianceOverview
        summary={complianceData?.summary}
        tenants={complianceData?.tenants}
      />

      {/* Alerts for At-Risk Tenants */}
      {!loading && atRiskTenants.length > 0 && (
        <ComplianceAlerts
          tenants={atRiskTenants}
          maxDisplay={5}
          onViewAll={handleViewAllAlerts}
        />
      )}

      {/* Compliance Table */}
      <div data-compliance-table>
        <ComplianceTable
          tenants={complianceData?.tenants || []}
          loading={loading}
        />
      </div>
    </div>
  );
}
