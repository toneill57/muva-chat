import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getTenantBySubdomain, getSubdomain } from '@/lib/tenant-utils';
import { TenantProvider } from '@/contexts/TenantContext';

interface TenantLayoutProps {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}

export default async function TenantLayout({ children }: TenantLayoutProps) {
  console.log('[TENANT_LAYOUT] === EXECUTING [tenant]/layout.tsx ===');

  // Get tenant subdomain from Nginx header (production) or hostname (dev)
  const headersList = await headers();
  const nginxSubdomain = headersList.get('x-tenant-subdomain');
  const hostname = headersList.get('host') || '';

  console.log('[TENANT_LAYOUT] hostname:', hostname);
  console.log('[TENANT_LAYOUT] x-tenant-subdomain header:', nginxSubdomain);

  // Use Nginx header if available (production), otherwise extract from hostname (dev)
  const subdomain = nginxSubdomain || getSubdomain(hostname);
  console.log('[TENANT_LAYOUT] Resolved subdomain:', subdomain || 'null');

  // Fetch tenant from database
  console.log('[TENANT_LAYOUT] Calling getTenantBySubdomain...');
  const tenant = await getTenantBySubdomain(subdomain);
  console.log('[TENANT_LAYOUT] Tenant fetch result:', tenant ? `Found: ${tenant.business_name || tenant.nombre_comercial}` : 'NULL - will call notFound()');

  // If tenant not found, show 404 page
  if (!tenant) {
    console.error('[TENANT_LAYOUT] ❌ TENANT NOT FOUND - calling notFound()');
    notFound();
  }

  console.log('[TENANT_LAYOUT] ✅ Tenant found, rendering children');
  // Wrap children with TenantProvider to provide tenant context to client components
  return (
    <TenantProvider tenant={tenant}>
      {children}
    </TenantProvider>
  );
}
