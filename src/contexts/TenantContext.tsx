'use client';

import { createContext, useContext, ReactNode } from 'react';

/**
 * Tenant entity for TenantContext
 * Matches tenant_registry table schema
 */
export interface Tenant {
  tenant_id: string;
  subdomain: string;
  nombre_comercial: string;
  slug: string;
  created_at: string;
  updated_at: string;
  // Optional fields
  logo_url?: string | null;
  business_name?: string | null;
  nit?: string | null;
  razon_social?: string | null;
  schema_name?: string | null;
  tenant_type?: string | null;
  is_active?: boolean | null;
  subscription_tier?: string | null;
  features?: Record<string, unknown> | null;
  // Settings fields (FASE 4D.6)
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  social_media_links?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    tiktok?: string;
  } | null;
  seo_meta_description?: string | null;
  seo_keywords?: string[] | null;
}

interface TenantContextType {
  tenant: Tenant | null;
  isLoading: boolean;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

interface TenantProviderProps {
  children: ReactNode;
  tenant: Tenant | null;
}

/**
 * TenantProvider - Provides tenant context to client components
 *
 * Usage:
 * ```tsx
 * // Server component (layout/page)
 * const tenant = await getTenantBySubdomain(subdomain);
 *
 * return (
 *   <TenantProvider tenant={tenant}>
 *     <YourClientComponents />
 *   </TenantProvider>
 * );
 * ```
 */
export function TenantProvider({ children, tenant }: TenantProviderProps) {
  return (
    <TenantContext.Provider value={{ tenant, isLoading: false }}>
      {children}
    </TenantContext.Provider>
  );
}

/**
 * useTenant - Hook to access tenant context in client components
 *
 * @throws Error if used outside TenantProvider
 *
 * Usage:
 * ```tsx
 * function MyComponent() {
 *   const { tenant, isLoading } = useTenant();
 *   return <div>{tenant?.nombre_comercial}</div>;
 * }
 * ```
 */
export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
