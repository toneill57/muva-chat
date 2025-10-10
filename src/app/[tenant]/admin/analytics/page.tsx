import { headers } from 'next/headers';
import { getTenantBySubdomain } from '@/lib/tenant-utils';
import { AnalyticsCharts } from '@/components/admin/AnalyticsCharts';
import { redirect } from 'next/navigation';

async function getAnalyticsData(tenantId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const response = await fetch(
    `${baseUrl}/api/admin/analytics?tenant_id=${tenantId}`,
    { cache: 'no-store' }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch analytics data');
  }

  return response.json();
}

export default async function AnalyticsPage() {
  const headersList = await headers();
  const subdomain = headersList.get('x-tenant-subdomain');

  if (!subdomain) {
    redirect('/');
  }

  const tenant = await getTenantBySubdomain(subdomain);

  if (!tenant) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Tenant not found. Please check your subdomain configuration.
        </div>
      </div>
    );
  }

  const analyticsData = await getAnalyticsData(tenant.tenant_id);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Analytics Dashboard
        </h1>
        <p className="text-gray-600">
          Monitor chat performance and user engagement metrics
        </p>
      </div>

      {/* Mock data notice */}
      <div className="mb-6 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
        <p className="text-sm">
          <strong>Note:</strong> Currently showing mock data for UI development.
          Real analytics will be integrated in Phase 2 with conversation tracking.
        </p>
      </div>

      <AnalyticsCharts data={analyticsData} />

      {/* Future enhancements section */}
      <div className="mt-8 border-t pt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Coming Soon
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Real-time Updates</h3>
            <p className="text-sm text-gray-600">
              Live dashboard with WebSocket updates for instant metrics
            </p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Custom Date Ranges</h3>
            <p className="text-sm text-gray-600">
              Filter analytics by custom date ranges (last 7/30/90 days)
            </p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Export Reports</h3>
            <p className="text-sm text-gray-600">
              Download CSV/PDF reports of analytics data
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
