'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SuperAdminProvider } from '@/contexts/SuperAdminContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import SuperAdminSidebar from '@/components/SuperAdmin/SuperAdminSidebar';
import { ThemeToggle } from '@/components/SuperAdmin/ThemeToggle';

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    // Verificar auth
    const token = localStorage.getItem('super_admin_token');
    if (!token) {
      router.push('/sign-in');
    }
  }, [router]);

  return (
    <ThemeProvider>
      <SuperAdminProvider>
        <div className="flex h-screen bg-background">
          <SuperAdminSidebar />
          <main className="flex-1 flex flex-col overflow-hidden lg:ml-64">
            {/* Header with ThemeToggle */}
            <div className="sticky top-0 z-10 bg-background border-b border-border px-8 py-4 flex items-center justify-end">
              <ThemeToggle />
            </div>
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 bg-muted/30">
              {children}
            </div>
          </main>
        </div>
      </SuperAdminProvider>
    </ThemeProvider>
  );
}
