import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getTenantBySubdomain, getSubdomain } from '@/lib/tenant-utils';
import { TenantProvider } from '@/contexts/TenantContext';

interface TenantLayoutProps {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}

export default async function TenantLayout({ children }: TenantLayoutProps) {
  // Get tenant subdomain from Nginx header (production) or hostname (dev)
  const headersList = await headers();
  const nginxSubdomain = headersList.get('x-tenant-subdomain');
  const hostname = headersList.get('host') || '';

  // Use Nginx header if available (production), otherwise extract from hostname (dev)
  const subdomain = nginxSubdomain || getSubdomain(hostname);

  // Fetch tenant from database
  const tenant = await getTenantBySubdomain(subdomain);

  // If tenant not found, show 404 page
  if (!tenant) {
    notFound();
  }

  // Wrap children with TenantProvider to provide tenant context to client components
  return (
    <TenantProvider tenant={tenant}>
      {children}
    </TenantProvider>
  );
}
