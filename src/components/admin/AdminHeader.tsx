'use client';

import { useTenant } from '@/contexts/TenantContext';
import { useRouter } from 'next/navigation';
import { LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AdminHeader() {
  const { tenant } = useTenant();
  const router = useRouter();

  // Get user info from localStorage
  const getUserInfo = () => {
    if (typeof window === 'undefined') return { name: 'Admin User', email: 'admin@example.com' };
    const staffInfo = localStorage.getItem('staff_info');
    if (staffInfo) {
      try {
        const parsed = JSON.parse(staffInfo);
        return {
          name: parsed.full_name || parsed.username || 'Admin User',
          email: parsed.email || parsed.username || 'admin@example.com'
        };
      } catch {
        return { name: 'Admin User', email: 'admin@example.com' };
      }
    }
    return { name: 'Admin User', email: 'admin@example.com' };
  };

  const user = getUserInfo();

  const handleLogout = () => {
    // Clear authentication data from localStorage
    localStorage.removeItem('staff_token');
    localStorage.removeItem('staff_info');

    // Redirect to multi-tenant login page (use window.location to preserve subdomain)
    window.location.href = '/login';
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-20" role="banner">
      <div className="px-4 py-3 md:px-6 md:py-4 flex items-center justify-between">
        {/* Tenant badge */}
        <div className="flex items-center gap-3">
          <div className="hidden md:block">
            <p className="text-sm text-gray-500">Current Tenant</p>
            <p className="font-semibold text-gray-900">
              {tenant?.subdomain || 'loading'}.muva.chat
            </p>
          </div>
        </div>

        {/* User menu */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>

          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
            <User className="w-5 h-5 text-gray-600" />
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            title="Logout"
            aria-label="Logout"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
