'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSuperAdmin } from '@/contexts/SuperAdminContext';
import {
  LayoutDashboard,
  Building2,
  FileText,
  BarChart,
  Settings,
  Menu,
  X,
  LogOut,
  Plug,
  CheckCircle2,
  Shield,
  Bot
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const menuItems = [
  { name: 'Dashboard', href: '/super-admin/dashboard', icon: LayoutDashboard },
  { name: 'Tenants', href: '/super-admin/tenants', icon: Building2 },
  { name: 'Content', href: '/super-admin/content', icon: FileText },
  { name: 'Analytics', href: '/super-admin/analytics', icon: BarChart },
  { name: 'Compliance', href: '/super-admin/compliance', icon: CheckCircle2 },
  { name: 'Integrations', href: '/super-admin/integrations', icon: Plug },
  { name: 'Audit Log', href: '/super-admin/audit-log', icon: Shield },
  { name: 'AI Monitoring', href: '/super-admin/ai-monitoring', icon: Bot },
  { name: 'Settings', href: '/super-admin/settings', icon: Settings },
];

export default function SuperAdminSidebar() {
  const pathname = usePathname();
  const { superAdmin, logout } = useSuperAdmin();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Open menu"
          className="bg-white"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
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
            className="text-slate-100 hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* MUVA branding */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-lg">
              M
            </div>
            <div>
              <p className="font-semibold text-slate-100 text-lg">MUVA</p>
              <p className="text-xs text-slate-400">Platform Admin</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1 flex-1 overflow-y-auto" role="navigation" aria-label="Super Admin navigation">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href ||
                           (item.href !== '/super-admin/dashboard' && pathname?.startsWith(item.href));

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-teal-600 text-white font-medium'
                    : 'text-slate-100 hover:bg-slate-800'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User info & logout */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-slate-700">
          <div className="p-4">
            <div className="mb-3">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white font-semibold text-sm">
                  {superAdmin?.username?.charAt(0).toUpperCase() || 'S'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-100 truncate">
                    {superAdmin?.full_name || superAdmin?.username}
                  </p>
                  <p className="text-xs text-slate-400">Super Admin</p>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="w-full justify-start text-slate-100 hover:bg-slate-800 hover:text-white"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
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
