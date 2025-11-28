import DatabaseWipeButton from '@/components/admin/DatabaseWipeButton'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default function ClearDbPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-50 flex items-center justify-center p-4">
      <div className="text-center max-w-2xl">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">
          MUVA Chat
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Descubre alojamientos únicos en San Andrés
        </p>
        <p className="text-gray-500 mb-4">
          Database Management (Staging Only)
        </p>
        <div className="mt-8 space-y-2 text-sm text-gray-400">
          <p>Para probar el sistema, visita:</p>
          <ul className="space-y-1">
            <li><a href="http://simmerdown.localhost:3000/with-me" className="text-teal-600 hover:underline">http://simmerdown.localhost:3000/with-me</a></li>
            <li><a href="http://hotel-boutique.localhost:3000/with-me" className="text-teal-600 hover:underline">http://hotel-boutique.localhost:3000/with-me</a></li>
          </ul>
        </div>

        {/* Database Wipe Button (Staging Only) */}
        <DatabaseWipeButton />
      </div>
    </div>
  )
}

export async function generateMetadata() {
  return {
    title: 'Clear Database - MUVA Chat',
    description: 'Database management for staging environment'
  }
}
