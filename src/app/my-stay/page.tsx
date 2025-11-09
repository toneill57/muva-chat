'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { GuestLogin } from '@/components/Chat/GuestLogin'
import { GuestChatInterface } from '@/components/Chat/GuestChatInterface'
import type { GuestSession } from '@/lib/guest-auth'
import type { Tenant } from '@/contexts/TenantContext'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * My Stay Page Component (Subdomain-based Multi-tenant)
 *
 * Authenticated guest portal for hotel guests with active reservations.
 * URL: simmerdown.muva.chat/my-stay
 *
 * Authentication: Check-in date + last 4 digits of phone number
 *
 * Tenant resolution flow:
 * 1. Middleware detects subdomain → sets x-tenant-subdomain header
 * 2. Client reads tenant_subdomain cookie (set by middleware)
 * 3. Resolves tenant_id from tenant slug via API
 */
export default function MyStayPage() {
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [session, setSession] = useState<GuestSession | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sessionKey, setSessionKey] = useState<string>('')  // Unique key for component remount
  const router = useRouter()

  // Step 0: Resolve tenant from subdomain cookie (set by middleware)
  useEffect(() => {
    const resolveTenantFromSubdomain = async () => {
      try {
        // Read subdomain from cookie (set by middleware)
        const cookies = document.cookie.split(';')
        const tenantCookie = cookies.find(c => c.trim().startsWith('tenant_subdomain='))
        const subdomain = tenantCookie?.split('=')[1]?.trim()

        if (!subdomain) {
          throw new Error('No se detectó subdominio. Accede desde tu URL de hotel (ej: simmerdown.muva.chat)')
        }

        console.log(`[MyStayPage] Subdomain detected: ${subdomain}`)

        // Resolve tenant_id from slug
        const response = await fetch('/api/tenant/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slugOrUuid: subdomain }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Hotel no encontrado')
        }

        const { tenant_id, tenant_name, tenant_slug, logo_url } = await response.json()
        console.log(`[MyStayPage] Resolved tenant_id: ${tenant_id}`)
        setTenantId(tenant_id)
        setTenant({
          tenant_id,
          nombre_comercial: tenant_name || 'Hotel',
          slug: tenant_slug,
          subdomain: subdomain,
          logo_url: logo_url || null,
          created_at: '',
          updated_at: '',
        })
      } catch (err: any) {
        console.error('[MyStayPage] Failed to resolve tenant from subdomain:', err)
        setError(err.message || 'Error al identificar el hotel. Verifica la URL.')
        setLoading(false)
      }
    }

    resolveTenantFromSubdomain()
  }, [])

  // Step 1: Check for active session AFTER tenant resolution
  useEffect(() => {
    if (!tenantId) return // Wait for tenant resolution

    const checkActiveSession = async () => {
      const storedToken = localStorage.getItem('guest_token')
      if (!storedToken) {
        setLoading(false)
        return // No session, show login
      }

      try {
        // Verify token
        const response = await fetch('/api/guest/verify-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: storedToken })
        })

        if (response.ok) {
          const { session: verifiedSession } = await response.json()

          // Check if session tenant matches current subdomain tenant
          if (verifiedSession.tenant_id !== tenantId) {
            console.warn(`[GuestChatPage] Session tenant mismatch - clearing old session`)
            console.log(`  Subdomain tenant: ${tenantId}`)
            console.log(`  Session tenant: ${verifiedSession.tenant_id}`)

            // Clear old session and show login for new tenant
            localStorage.removeItem('guest_token')
            await fetch('/api/guest/logout', {
              method: 'POST',
              credentials: 'include',
            }).catch(() => {}) // Ignore logout errors

            setLoading(false)
          } else {
            // Session matches - restore it
            console.log(`[GuestChatPage] Valid session restored`)
            setSession(verifiedSession)
            setToken(storedToken)
            // Generate unique key for component remount
            setSessionKey(`${verifiedSession.reservation_id}_${Date.now()}`)
            setLoading(false)
          }
        } else {
          // Invalid token, clear and show login
          console.log(`[GuestChatPage] Invalid token found, clearing`)
          localStorage.removeItem('guest_token')
          setLoading(false)
        }
      } catch (err) {
        console.error('[GuestChatPage] Session check error:', err)
        localStorage.removeItem('guest_token')
        setLoading(false)
      }
    }

    checkActiveSession()
  }, [tenantId])

  const handleLoginSuccess = (newSession: GuestSession, newToken: string) => {
    localStorage.setItem('guest_token', newToken)
    setSession(newSession)
    setToken(newToken)
    // Generate unique key for component remount
    setSessionKey(`${newSession.reservation_id}_${Date.now()}`)
  }

  const handleLogout = async () => {
    try {
      // Clear HTTP-only cookie via API
      await fetch('/api/guest/logout', {
        method: 'POST',
        credentials: 'include', // Send cookie so API can identify and delete it
      })
    } catch (error) {
      console.error('[Logout] Failed to clear cookie:', error)
    } finally {
      // Always clear client-side state
      localStorage.removeItem('guest_token')

      // Clear any cached data that might persist
      localStorage.removeItem('compliance_reminder_dismissed')

      // Clear session state
      setSession(null)
      setToken(null)
      setSessionKey('')
      setError(null)

      // Force full page reload to clear all cache
      window.location.href = window.location.pathname
    }
  }

  const handleRetry = () => {
    setError(null)
    setLoading(true)
    window.location.reload()
  }

  // Error state
  if (error && !loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 p-4">
        <div className="max-w-md w-full bg-white border border-red-200 rounded-lg shadow-lg p-6 text-center">
          <div className="mb-4">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button
            onClick={handleRetry}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  // Not logged in - show login screen
  if (!session || !token) {
    // Wait for tenant resolution before showing login
    if (!tenantId) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando...</p>
          </div>
        </div>
      )
    }

    return <GuestLogin tenantId={tenantId} onLoginSuccess={handleLoginSuccess} />
  }

  // Logged in - show chat interface
  return <GuestChatInterface
    key={sessionKey}  // Unique key guarantees fresh mount on every login
    session={session}
    token={token}
    tenant={tenant}
    onLogout={handleLogout}
  />
}
