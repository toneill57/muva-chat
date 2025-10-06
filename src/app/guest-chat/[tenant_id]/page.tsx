'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { GuestLogin } from '@/components/Chat/GuestLogin'
import { GuestChatInterface } from '@/components/Chat/GuestChatInterface'
import type { GuestSession } from '@/lib/guest-auth'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Guest Chat Page Component
 *
 * Dynamic route for tenant-specific guest chat with error boundary and session management
 * Note: This is a client component for state management (localStorage, session)
 */
export default function GuestChatPage({ params }: { params: Promise<{ tenant_id: string }> }) {
  // Unwrap params Promise (Next.js 15)
  const { tenant_id: tenantSlugOrUuid } = use(params)

  const [tenantId, setTenantId] = useState<string | null>(null)
  const [session, setSession] = useState<GuestSession | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Step 0: Check for active session BEFORE resolving tenant (auto-redirect)
  useEffect(() => {
    const checkActiveSession = async () => {
      const storedToken = localStorage.getItem('guest_token')
      if (!storedToken) return // No session, proceed with normal flow

      try {
        // Verify token
        const response = await fetch('/api/guest/verify-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: storedToken })
        })

        if (response.ok) {
          const { session: verifiedSession } = await response.json()

          // Check if we're on the wrong tenant URL
          if (verifiedSession.tenant_id !== tenantSlugOrUuid) {
            console.log(`[GuestChatPage] Active session detected for different tenant`)
            console.log(`  Current URL: /guest-chat/${tenantSlugOrUuid}`)
            console.log(`  Session tenant: ${verifiedSession.tenant_id}`)
            console.log(`  ➡️  Redirecting to correct tenant...`)

            // Redirect to correct tenant URL
            router.push(`/guest-chat/${verifiedSession.tenant_id}`)
            return
          }

          // Already on correct URL, set session directly (skip tenant resolution)
          console.log(`[GuestChatPage] Active session matches URL tenant - loading directly`)
          setSession(verifiedSession)
          setToken(storedToken)
          setTenantId(verifiedSession.tenant_id)
          setLoading(false)
        } else {
          // Invalid token, clear and continue with normal flow
          console.log(`[GuestChatPage] Invalid token found, clearing`)
          localStorage.removeItem('guest_token')
        }
      } catch (err) {
        console.error('[GuestChatPage] Session check error:', err)
        localStorage.removeItem('guest_token')
      }
    }

    checkActiveSession()
  }, [tenantSlugOrUuid, router])

  // Step 1: Resolve tenant slug/UUID on mount (only if no active session)
  useEffect(() => {
    // Skip if session already loaded in Step 0
    if (session) return
    const resolveTenant = async () => {
      try {
        // Validate tenantSlugOrUuid format
        if (!tenantSlugOrUuid || tenantSlugOrUuid.trim() === '') {
          throw new Error('Invalid tenant identifier in URL')
        }

        const response = await fetch('/api/tenant/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slugOrUuid: tenantSlugOrUuid }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Tenant not found')
        }

        const { tenant_id } = await response.json()
        setTenantId(tenant_id)
      } catch (err) {
        console.error('[GuestChatPage] Failed to resolve tenant:', err)
        setError(`Hotel "${tenantSlugOrUuid}" no encontrado. Verifica la URL.`)
        setLoading(false)
      }
    }

    resolveTenant()
  }, [tenantSlugOrUuid, session])

  // Step 2: Session persistence - Load JWT from localStorage (only if not loaded in Step 0)
  useEffect(() => {
    if (!tenantId) return // Wait for tenant resolution
    if (session) return // Already loaded in Step 0

    const loadSession = async () => {
      try {
        const storedToken = localStorage.getItem('guest_token')
        if (storedToken) {
          // Verify token via server-side API (where JWT_SECRET is available)
          const response = await fetch('/api/guest/verify-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: storedToken })
          })

          if (response.ok) {
            const { session: verifiedSession } = await response.json()

            // Check if session tenant matches URL tenant
            if (verifiedSession.tenant_id !== tenantId) {
              console.warn('[GuestChatPage] Session tenant mismatch - clearing old session')
              console.log(`  URL tenant: ${tenantId}`)
              console.log(`  Session tenant: ${verifiedSession.tenant_id}`)

              // Clear old session and show login for new tenant
              localStorage.removeItem('guest_token')
              await fetch('/api/guest/logout', {
                method: 'POST',
                credentials: 'include',
              }).catch(() => {}) // Ignore logout errors
            } else {
              // Session matches - restore it
              setSession(verifiedSession)
              setToken(storedToken)
            }
          } else {
            // Token invalid or expired, clear it
            localStorage.removeItem('guest_token')
          }
        }
      } catch (err) {
        console.error('Failed to load session:', err)
        localStorage.removeItem('guest_token')
        setError('Error al cargar la sesión. Por favor, inicia sesión nuevamente.')
      } finally {
        setLoading(false)
      }
    }

    loadSession()
  }, [tenantId, session])

  const handleLoginSuccess = (newSession: GuestSession, newToken: string) => {
    localStorage.setItem('guest_token', newToken)
    setSession(newSession)
    setToken(newToken)
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
      setSession(null)
      setToken(null)
      setError(null)
      router.push(`/guest-chat/${tenantId}`)
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
  return <GuestChatInterface session={session} token={token} onLogout={handleLogout} />
}
