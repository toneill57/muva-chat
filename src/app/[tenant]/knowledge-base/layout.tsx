'use client';

export const dynamic = 'force-dynamic';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { AdminBreadcrumbs } from '@/components/admin/AdminBreadcrumbs';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      // TODO: Check staff token in localStorage
      const token = localStorage.getItem('staff_token');

      if (!token) {
        // Redirect to login if no token
        router.push('/login');
        return;
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
