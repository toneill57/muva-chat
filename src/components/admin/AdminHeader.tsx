'use client';

import { useTenant } from '@/contexts/TenantContext';
import { LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AdminHeader() {
  const { tenant } = useTenant();

  // TODO (Task 4C.1): Get user from auth context
  const user = { name: 'Admin User', email: 'admin@example.com' }; // Placeholder

  const handleLogout = () => {
    // TODO (Task 4C.1): Implement logout
    console.log('Logout clicked');
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-20" role="banner">
      <div className="px-4 py-3 md:px-6 md:py-4 flex items-center justify-between">
        {/* Tenant badge */}
        <div className="flex items-center gap-3">
          <div className="hidden md:block">
            <p className="text-sm text-gray-500">Current Tenant</p>
            <p className="font-semibold text-gray-900">
              {tenant?.subdomain || 'loading'}.innpilot.io
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
