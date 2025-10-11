import { headers } from 'next/headers';
import { getTenantBySubdomain } from '@/lib/tenant-utils';
import { TenantBranding } from '@/components/admin/TenantBranding';
import { redirect } from 'next/navigation';

export default async function BrandingPage() {
  const headersList = await headers();
  const subdomain = headersList.get('x-tenant-subdomain');

  if (!subdomain) {
    redirect('/');
  }

  const tenant = await getTenantBySubdomain(subdomain);

  if (!tenant) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Tenant not found. Please check your subdomain configuration.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          Branding Settings
        </h1>
        <p className="text-gray-600">
          Customize how your chat appears to visitors with your logo and business name.
        </p>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg">
        <p className="text-sm">
          <strong>Live Preview:</strong> Changes will be reflected immediately in the chat interface
          at <code className="bg-blue-100 px-2 py-1 rounded text-xs">{subdomain}.muva.chat/chat</code>
        </p>
      </div>

      {/* Branding component */}
      <TenantBranding tenant={tenant} />

      {/* Additional guidelines */}
      <div className="border-t pt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Branding Guidelines
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-3">Logo Requirements</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Format: PNG or JPG (PNG recommended for transparency)</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Size: 200x200px or larger (square format)</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>File size: Max 100KB</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Hosted publicly (Imgur, Cloudinary, your website)</span>
              </li>
            </ul>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-3">Best Practices</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Use high-contrast logos for visibility</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Keep business name short (max 30 characters)</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Test logo on both light and dark backgrounds</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Use HTTPS URLs for security</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
