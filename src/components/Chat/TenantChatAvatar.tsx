'use client';

// src/components/chat/TenantChatAvatar.tsx
import { Tenant } from '@/contexts/TenantContext';

interface TenantChatAvatarProps {
  tenant: Tenant | null;
  size?: 'sm' | 'md' | 'lg';
}

export function TenantChatAvatar({ tenant, size = 'sm' }: TenantChatAvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg'
  };

  const displayName = tenant?.business_name || tenant?.nombre_comercial || 'AI';
  const initial = displayName.charAt(0).toUpperCase();

  if (tenant?.logo_url) {
    return (
      <div className="relative flex-shrink-0">
        <img
          src={tenant.logo_url}
          alt={`${displayName} assistant`}
          className={`${sizeClasses[size]} rounded-full object-cover`}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
            if (fallback) fallback.style.display = 'flex';
          }}
        />
        {/* Hidden fallback */}
        <div
          className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-blue-500 to-blue-600 items-center justify-center text-white font-semibold`}
          style={{ display: 'none' }}
        >
          {initial}
        </div>
      </div>
    );
  }

  return (
    <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold flex-shrink-0`}>
      {initial}
    </div>
  );
}
