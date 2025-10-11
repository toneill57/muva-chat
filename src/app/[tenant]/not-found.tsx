import Link from 'next/link';
import { AlertCircle, Home, ArrowLeft } from 'lucide-react';

/**
 * Custom 404 page for tenant routes
 * Shown when a user tries to access a subdomain that doesn't exist in the database
 */
export default function TenantNotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        {/* Main content card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="rounded-full bg-red-100 p-4">
              <AlertCircle className="h-12 w-12 text-red-600" />
            </div>
          </div>

          {/* Heading */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              404
            </h1>
            <h2 className="text-xl md:text-2xl font-semibold text-gray-800 mb-2">
              Tenant Not Found
            </h2>
            <p className="text-gray-600 text-lg">
              The subdomain you're trying to access doesn't exist in our system.
            </p>
          </div>

          {/* Details */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h3 className="font-semibold text-blue-900 mb-3 flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              Possible Reasons
            </h3>
            <ul className="space-y-2 text-blue-800">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>The subdomain might be misspelled or incorrect</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>The tenant account may have been deactivated or removed</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>You might not have the correct URL from your property manager</span>
              </li>
            </ul>
          </div>

          {/* Valid tenants info */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
            <h3 className="font-semibold text-gray-900 mb-3">Valid Subdomain Format</h3>
            <p className="text-gray-700 mb-2">
              MUVA tenant URLs follow this format:
            </p>
            <code className="block bg-white border border-gray-300 rounded px-4 py-2 text-sm text-gray-800 font-mono">
              https://[tenant-name].muva.chat
            </code>
            <p className="text-gray-600 text-sm mt-3">
              Example: <span className="font-mono">https://simmerdown.muva.chat</span>
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/"
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              <Home className="h-5 w-5" />
              Go to Home
            </Link>
            <button
              onClick={() => window.history.back()}
              className="flex-1 flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 px-6 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              Go Back
            </button>
          </div>

          {/* Support info */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <p className="text-gray-600 text-sm">
              Need help? Contact your property administrator or{' '}
              <a
                href="mailto:support@muva.chat"
                className="text-blue-600 hover:text-blue-700 font-medium underline"
              >
                MUVA Support
              </a>
            </p>
          </div>
        </div>

        {/* Footer branding */}
        <div className="text-center mt-6">
          <p className="text-gray-500 text-sm">
            Powered by <span className="font-semibold">MUVA</span> – Multi-Tenant Hospitality Platform
          </p>
        </div>
      </div>
    </div>
  );
}
