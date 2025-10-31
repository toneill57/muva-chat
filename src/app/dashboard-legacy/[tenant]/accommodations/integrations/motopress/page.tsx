'use client'

import { useParams, useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/contexts/AuthContext'
import { MotoPresConfigurationPage } from '@/components/integrations/motopress/MotoPresConfigurationPage'

export default function MotoPresConfigPage() {
  const params = useParams()
  const router = useRouter()
  const tenant = params.tenant as string

  const handleBackToDashboard = () => {
    router.push('/dashboard')
  }

  const handleConfigurationComplete = () => {
    router.push('/dashboard')
  }

  return (
    <ProtectedRoute>
      <MotoPresConfigurationPage
        tenant={tenant}
        onBack={handleBackToDashboard}
        onComplete={handleConfigurationComplete}
      />
    </ProtectedRoute>
  )
}