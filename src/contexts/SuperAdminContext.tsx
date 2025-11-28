'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface SuperAdmin {
  super_admin_id: string;
  username: string;
  full_name: string;
  role: 'super_admin';
}

interface PlatformMetrics {
  total_tenants: number;
  active_tenants: number;
  total_conversations_30d: number;
  active_users_30d: number;
  muva_content_count: number;
}

interface SuperAdminContextType {
  superAdmin: SuperAdmin | null;
  platformMetrics: PlatformMetrics | null;
  loading: boolean;
  loadMetrics: () => Promise<void>;
  logout: () => void;
}

const SuperAdminContext = createContext<SuperAdminContextType | undefined>(undefined);

export function SuperAdminProvider({ children }: { children: ReactNode }) {
  const [superAdmin, setSuperAdmin] = useState<SuperAdmin | null>(null);
  const [platformMetrics, setPlatformMetrics] = useState<PlatformMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Verificar token al montar
    const token = localStorage.getItem('super_admin_token');
    if (token) {
      // Decodificar JWT para obtener super admin data
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setSuperAdmin({
          super_admin_id: payload.super_admin_id,
          username: payload.username,
          full_name: payload.full_name || payload.username,
          role: 'super_admin'
        });
      } catch (error) {
        console.error('Invalid token:', error);
        logout();
      }
    }
    setLoading(false);
  }, []);

  const loadMetrics = async () => {
    try {
      const token = localStorage.getItem('super_admin_token');
      const response = await fetch('/api/super-admin/metrics', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPlatformMetrics(data);
      }
    } catch (error) {
      console.error('Error loading metrics:', error);
    }
  };

  const logout = () => {
    localStorage.removeItem('super_admin_token');
    setSuperAdmin(null);
    setPlatformMetrics(null);
    router.push('/sign-in');
  };

  return (
    <SuperAdminContext.Provider value={{
      superAdmin,
      platformMetrics,
      loading,
      loadMetrics,
      logout
    }}>
      {children}
    </SuperAdminContext.Provider>
  );
}

export function useSuperAdmin() {
  const context = useContext(SuperAdminContext);
  if (!context) {
    throw new Error('useSuperAdmin must be used within SuperAdminProvider');
  }
  return context;
}
