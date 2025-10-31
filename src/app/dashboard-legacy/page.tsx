'use client'

import { ProtectedRoute } from '@/contexts/AuthContext'
import { AuthenticatedDashboard } from '@/components/Dashboard/AuthenticatedDashboard'

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <AuthenticatedDashboard />
    </ProtectedRoute>
  )
}