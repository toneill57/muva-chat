'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export function AdminBreadcrumbs() {
  const pathname = usePathname();

  if (!pathname) return null;

  // Parse pathname to breadcrumbs (e.g., /simmerdown/admin/settings)
  const segments = pathname.split('/').filter(Boolean);

  // Skip if only showing /{tenant}/admin or less
  if (segments.length <= 2) return null;

  // Extract tenant slug
  const tenantSlug = segments[0];

  // Build breadcrumbs starting from /admin
  const breadcrumbs = segments.slice(2).map((segment, index) => {
    const href = '/' + segments.slice(0, index + 3).join('/');
    const label = segment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    return { label, href };
  });

  return (
    <nav className="px-4 py-3 md:px-6 md:py-4 bg-gray-50 border-b border-gray-200" aria-label="Breadcrumb">
      <ol className="flex items-center gap-2 text-sm">
        <li>
          <Link href={`/${tenantSlug}/admin`} className="text-gray-600 hover:text-gray-900">
            Dashboard
          </Link>
        </li>
        {breadcrumbs.map((crumb, index) => (
          <li key={crumb.href} className="flex items-center gap-2">
            <ChevronRight className="w-4 h-4 text-gray-400" aria-hidden="true" />
            {index === breadcrumbs.length - 1 ? (
              <span className="text-gray-900 font-medium" aria-current="page">{crumb.label}</span>
            ) : (
              <Link href={crumb.href} className="text-gray-600 hover:text-gray-900">
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
