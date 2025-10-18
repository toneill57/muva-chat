'use client';

export const dynamic = 'force-dynamic';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { AdminBreadcrumbs } from '@/components/admin/AdminBreadcrumbs';
import { getSubdomainFromClient } from '@/lib/subdomain-detector';

// Decode JWT payload without verification (client-side only)
function decodeJWT(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return null;
  }
}

interface AdminLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: AdminLayoutProps) {
  console.log('[dashboard-layout] 🚀 COMPONENT RENDERING - Client-side code executing');

  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('[dashboard-layout] 🔍 useEffect FIRED - Starting auth check');

    const checkAuth = async () => {
      const token = localStorage.getItem('staff_token');
      console.log('[dashboard-layout] Token exists:', !!token);

      if (!token) {
        console.log('[dashboard-layout] No token found, redirecting to login');
        router.push('/login');
        return;
      }

      // Decode JWT to get tenant_id
      const payload = decodeJWT(token);

      if (!payload || !payload.tenant_id) {
        console.warn('[dashboard-layout] Invalid token payload, clearing session');
        localStorage.removeItem('staff_token');
        localStorage.removeItem('staff_info');
        router.push('/login');
        return;
      }

      // Get current subdomain
      const currentSubdomain = getSubdomainFromClient();
      console.log('[dashboard-layout] Current subdomain:', currentSubdomain);
      console.log('[dashboard-layout] Token tenant_id:', payload.tenant_id);

      if (currentSubdomain) {
        // Resolve subdomain to tenant_id
        try {
          const response = await fetch(`/api/tenant/resolve?subdomain=${encodeURIComponent(currentSubdomain)}`);

          if (!response.ok) {
            console.error('[dashboard-layout] Failed to resolve subdomain');
            router.push('/login');
            return;
          }

          const { tenant_id: currentTenantId } = await response.json();

          // Validate that token tenant_id matches current subdomain tenant_id
          if (payload.tenant_id !== currentTenantId) {
            console.warn('[dashboard-layout] 🚫 Cross-tenant access attempt detected');
            console.warn('Token tenant:', payload.tenant_id);
            console.warn('Current tenant:', currentTenantId);

            // Clear session and redirect to login of CURRENT tenant
            localStorage.removeItem('staff_token');
            localStorage.removeItem('staff_info');
            router.push('/login');
            return;
          }

          console.log('[dashboard-layout] ✅ Tenant validation passed:', currentSubdomain);
        } catch (error) {
          console.error('[dashboard-layout] Error validating tenant:', error);
          localStorage.removeItem('staff_token');
          localStorage.removeItem('staff_info');
          router.push('/login');
          return;
        }
      }

      setIsAuthenticated(true);
      setIsLoading(false);
    };

    checkAuth();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main content area */}
      <div className="lg:pl-64">
        {/* Header */}
        <AdminHeader />

        {/* Breadcrumbs */}
        <AdminBreadcrumbs />

        {/* Page content */}
        <main className="p-4 md:p-6 lg:p-8" role="main">
          {children}
        </main>
      </div>
    </div>
  );
}
