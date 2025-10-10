'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export function AdminBreadcrumbs() {
  const pathname = usePathname();

  if (!pathname) return null;

  // Parse pathname to breadcrumbs (e.g., /admin/settings)
  const segments = pathname.split('/').filter(Boolean);

  // Skip if only showing /admin
  if (segments.length <= 1) return null;

  // Build breadcrumbs (pathname is /admin/settings, so slice(1) gives us segments after /admin)
  const breadcrumbs = segments.slice(1).map((segment, index) => {
    // Build href without tenant prefix (subdomain rewrite handles it)
    const pathSegments = segments.slice(0, index + 2);
    const href = `/${pathSegments.join('/')}`;
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
          <Link href="/admin" className="text-gray-600 hover:text-gray-900">
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
