'use client';

import { useTenant } from '@/contexts/TenantContext';

/**
 * TenantDisplay - Test component to verify TenantContext functionality
 *
 * Displays all tenant information from context in a styled card.
 * Used for testing multi-tenant subdomain routing and context distribution.
 */
export function TenantDisplay() {
  const { tenant, isLoading } = useTenant();

  if (isLoading) {
    return <div className="p-4 bg-gray-100 rounded">Loading tenant...</div>;
  }

  if (!tenant) {
    return <div className="p-4 bg-red-100 rounded">No tenant found</div>;
  }

  return (
    <div className="p-4 bg-green-100 rounded space-y-2">
      <h2 className="font-bold text-lg">Tenant Context Test</h2>
      <p><strong>Tenant ID:</strong> {tenant.tenant_id}</p>
      <p><strong>Business Name:</strong> {tenant.nombre_comercial}</p>
      <p><strong>Subdomain:</strong> {tenant.subdomain}</p>
      <p><strong>Slug:</strong> {tenant.slug}</p>
      {tenant.razon_social && (
        <p><strong>Legal Name:</strong> {tenant.razon_social}</p>
      )}
      {tenant.logo_url && (
        <p><strong>Logo URL:</strong> {tenant.logo_url}</p>
      )}
      {tenant.tenant_type && (
        <p><strong>Type:</strong> {tenant.tenant_type}</p>
      )}
      {tenant.subscription_tier && (
        <p><strong>Tier:</strong> {tenant.subscription_tier}</p>
      )}
      <p><strong>Active:</strong> {tenant.is_active ? 'Yes' : 'No'}</p>
    </div>
  );
}
