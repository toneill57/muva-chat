// src/components/chat/TenantChatHeader.tsx
interface Tenant {
  id: string;
  name: string;
  business_name: string | null;
  logo_url: string | null;
  subdomain: string;
}

interface TenantChatHeaderProps {
  tenant: Tenant | null;
}

export function TenantChatHeader({ tenant }: TenantChatHeaderProps) {
  if (!tenant) {
    return (
      <header className="sticky top-0 bg-white border-b p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-300" />
          <div>
            <h1 className="font-semibold text-lg">Chat</h1>
            <p className="text-sm text-gray-500">Powered by InnPilot</p>
          </div>
        </div>
      </header>
    );
  }

  const displayName = tenant.business_name || tenant.name || tenant.subdomain || 'Chat';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 bg-white border-b p-4 shadow-sm z-10">
      <div className="max-w-4xl mx-auto flex items-center gap-3">
        {tenant.logo_url ? (
          <img
            src={tenant.logo_url}
            alt={`${displayName} logo`}
            className="w-10 h-10 rounded-full object-cover"
            onError={(e) => {
              // Fallback to initials if image fails to load
              e.currentTarget.style.display = 'none';
              const fallback = e.currentTarget.nextElementSibling as HTMLElement;
              if (fallback) fallback.style.display = 'flex';
            }}
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-lg">
            {initial}
          </div>
        )}

        {/* Hidden fallback for image load errors */}
        {tenant.logo_url && (
          <div
            className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 items-center justify-center text-white font-semibold text-lg"
            style={{ display: 'none' }}
          >
            {initial}
          </div>
        )}

        <div className="flex-1">
          <h1 className="font-semibold text-lg leading-tight">{displayName}</h1>
          <p className="text-sm text-gray-500">Powered by InnPilot</p>
        </div>
      </div>
    </header>
  );
}
