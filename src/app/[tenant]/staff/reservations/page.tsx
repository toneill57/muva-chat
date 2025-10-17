'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ReservationsList from '@/components/Staff/ReservationsList'

export default function StaffReservationsPage() {
  const router = useRouter()
  const [isVerifying, setIsVerifying] = useState(true)

  useEffect(() => {
    verifyAuth()
  }, [])

  const verifyAuth = async () => {
    const token = localStorage.getItem('staff_token')

    if (!token) {
      router.push('/staff/login')
      return
    }

    try {
      // Verify token with backend
      const response = await fetch('/api/staff/verify-token', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        // Token invalid or expired
        localStorage.removeItem('staff_token')
        localStorage.removeItem('staff_info')
        router.push('/staff/login')
        return
      }

      // Token is valid
      setIsVerifying(false)
    } catch (err) {
      console.error('Token verification error:', err)
      // On network error, allow access but token will be verified on API calls
      setIsVerifying(false)
    }
  }

  if (isVerifying) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Verifying access...</p>
        </div>
      </div>
    )
  }

  return <ReservationsList />
}
