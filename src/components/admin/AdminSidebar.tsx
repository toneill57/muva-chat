'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTenant } from '@/contexts/TenantContext';
import {
  LayoutDashboard,
  BookOpen,
  Palette,
  FileText,
  BarChart,
  Settings,
  Menu,
  X,
  Hotel,
  MessageSquare,
  FileCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const menuItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'owner', 'staff'] },
  { name: 'Accommodations', href: '/accommodations', icon: Hotel, roles: ['admin', 'owner', 'staff'] },
  { name: 'Knowledge Base', href: '/knowledge-base', icon: BookOpen, roles: ['admin', 'owner', 'staff'] },
  { name: 'Branding', href: '/branding', icon: Palette, roles: ['admin', 'owner'] },
  { name: 'Content', href: '/content', icon: FileText, roles: ['admin', 'owner'] },
  { name: 'Analytics', href: '/analytics', icon: BarChart, roles: ['admin', 'owner'] },
  { name: 'SIRE', href: '/sire', icon: FileCheck, roles: ['admin', 'owner', 'staff'] },
  { name: 'Chat', href: '/chat', icon: MessageSquare, roles: ['admin', 'owner', 'staff'] },
  { name: 'Settings', href: '/settings', icon: Settings, roles: ['admin', 'owner'] },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { tenant } = useTenant();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // TODO (Task 4C.4): Get user role from auth context
  const userRole = 'admin'; // Placeholder

  const filteredMenuItems = menuItems.filter(item =>
    item.roles.includes(userRole)
  );

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Close button (mobile) */}
        <div className="lg:hidden absolute top-4 right-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Tenant branding */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            {tenant?.logo_url ? (
              <img
                src={tenant.logo_url}
                alt={tenant.nombre_comercial}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                {tenant?.nombre_comercial?.charAt(0) || 'I'}
              </div>
            )}
            <div>
              <p className="font-semibold text-gray-900">{tenant?.nombre_comercial || 'MUVA'}</p>
              <p className="text-xs text-gray-500">Admin Dashboard</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1" role="navigation" aria-label="Main navigation">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            // Use item.href directly (no tenant prefix needed - subdomain rewrite handles it)
            const itemPath = item.href;
            const isActive = pathname === itemPath ||
                           (item.href !== '/dashboard' && pathname?.startsWith(itemPath));

            return (
              <Link
                key={item.name}
                href={itemPath}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Powered by <span className="font-semibold">MUVA</span>
          </p>
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
}
