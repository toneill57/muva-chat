import { headers } from 'next/headers';
import { getTenantBySubdomain, getSubdomain } from '@/lib/tenant-utils';
import { TenantProvider } from '@/contexts/TenantContext';

interface TenantLayoutProps {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}

export default async function TenantLayout({ children }: TenantLayoutProps) {
  // Get hostname from headers (set by middleware)
  const headersList = await headers();
  const hostname = headersList.get('host') || '';

  // Extract subdomain from hostname
  const subdomain = getSubdomain(hostname);

  // Fetch tenant from database
  const tenant = await getTenantBySubdomain(subdomain);

  // Wrap children with TenantProvider to provide tenant context to client components
  return (
    <TenantProvider tenant={tenant}>
      {children}
    </TenantProvider>
  );
}
