'use client';

import { useEffect, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import StaffChatInterface from '@/components/Staff/StaffChatInterface';
import TenantChatPage from '@/components/Tenant/TenantChatPage';

export default function ChatPage() {
  const { tenant } = useTenant();
  const [isStaff, setIsStaff] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check if user is authenticated staff
  useEffect(() => {
    const checkStaffAuth = async () => {
      const token = localStorage.getItem('staff_token');

      if (!token) {
        setIsCheckingAuth(false);
        return;
      }

      try {
        const response = await fetch('/api/staff/verify-token', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          setIsStaff(true);
        }
      } catch (err) {
        console.error('Staff auth check failed:', err);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkStaffAuth();
  }, []);

  // Show loading while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If staff is authenticated, show staff interface
  if (isStaff) {
    return <StaffChatInterface />;
  }

  // Otherwise, show public landing page chat (same as / route)
  if (!tenant) {
    return <div>Loading tenant data...</div>;
  }

  return (
    <TenantChatPage
      subdomain={tenant.slug || ''}
      tenant={{
        tenant_id: tenant.tenant_id,
        business_name: tenant.business_name || tenant.nombre_comercial || 'MUVA',
        logo_url: tenant.logo_url || null,
        primary_color: tenant.primary_color || '#3B82F6'
      }}
    />
  );
}
