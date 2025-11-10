import Link from 'next/link'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Custom 404 page for unit detail routes
 * Triggered by notFound() in page.tsx when unit doesn't exist
 */
export default function UnitNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          <div className="bg-red-50 rounded-full p-6">
            <AlertCircle className="h-16 w-16 text-red-500" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Unit Not Found
        </h1>

        <p className="text-gray-600 mb-8">
          The accommodation unit you're looking for doesn't exist or has been removed.
          Please check the URL or return to the units list.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/accommodations/units">
            <Button variant="default" className="w-full sm:w-auto flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Units
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" className="w-full sm:w-auto">
              Go to Dashboard
            </Button>
          </Link>
        </div>

        <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-600">
            <strong>Tip:</strong> Unit URLs are generated from the unit name.
            For example: "Kaya Room" becomes "/units/kaya-room"
          </p>
        </div>
      </div>
    </div>
  )
}
