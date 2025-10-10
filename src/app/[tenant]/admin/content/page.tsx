import { headers } from 'next/headers';
import { getTenantBySubdomain } from '@/lib/tenant-utils';
import { redirect } from 'next/navigation';
import { ContentEditor } from '@/components/admin/ContentEditor';

export default async function ContentPage() {
  const headersList = await headers();
  const subdomain = headersList.get('x-tenant-subdomain');

  if (!subdomain) {
    redirect('/');
  }

  // Tenant validation is now handled by the layout
  // If we reach here, tenant is guaranteed to exist
  const tenant = await getTenantBySubdomain(subdomain);

  // This should never be null due to layout validation, but TypeScript needs the check
  if (!tenant) {
    redirect('/');
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          Landing Page Content
        </h1>
        <p className="text-gray-600">
          Customize the content that appears on your public landing page at{' '}
          <code className="bg-gray-100 px-2 py-1 rounded text-sm">
            {subdomain}.innpilot.io
          </code>
        </p>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg">
        <p className="text-sm">
          <strong>Quick Tip:</strong> All changes are saved to your database and will be
          reflected on your public landing page. Make sure to click "Save Changes" after
          editing each section.
        </p>
      </div>

      {/* Content Editor Component */}
      <ContentEditor tenantId={tenant.tenant_id} />

      {/* Content Guidelines */}
      <div className="border-t pt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Content Best Practices
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-3">Hero Section</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Keep title short and memorable (max 60 characters)</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Use subtitle to highlight unique selling points</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>CTA should be action-oriented (e.g., "Book Now", "Learn More")</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Link to booking page or contact form</span>
              </li>
            </ul>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-3">About Section</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Tell your story in 2-3 short paragraphs</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Highlight what makes your property special</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Use bullet points for key features or amenities</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Keep it engaging and guest-focused</span>
              </li>
            </ul>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-3">Contact Section</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Provide accurate contact information</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Include international dialing codes for phone</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Use a monitored email address</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Format address consistently</span>
              </li>
            </ul>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-3">SEO Tips</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Include your location in titles and content</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Use keywords naturally in your text</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Keep content updated and relevant</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Avoid keyword stuffing or duplicate content</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
