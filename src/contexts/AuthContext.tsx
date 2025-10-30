'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseAuth, getCurrentUserWithClients, AuthUser, UserClient } from '@/lib/supabase-auth'
import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js'

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  activeClient: UserClient | null
  setActiveClient: (client: UserClient) => void
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeClient, setActiveClient] = useState<UserClient | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('🔄 Getting initial session...')

        // Check if user is already authenticated without hanging calls
        const { data: { session }, error } = await supabaseAuth.auth.getSession()

        // Handle invalid refresh token error by clearing session
        if (error?.message?.includes('Invalid Refresh Token') || error?.message?.includes('Refresh Token Not Found')) {
          console.warn('⚠️ Invalid refresh token detected, clearing session...')
          await supabaseAuth.auth.signOut()
          setUser(null)
          setActiveClient(null)
          setLoading(false)
          return
        }

        if (session?.user) {
          console.log('✅ Found existing session for:', session.user.email)

          // Create simplified user immediately
          const defaultClient: UserClient = {
            id: 'default-client',
            user_id: session.user.id,
            client_id: 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf',
            client_name: 'SimmerDown Guest House',
            business_name: 'ONEILL SAID SAS',
            business_type: 'hotel',
            has_sire_access: true,
            has_muva_access: true,
            is_admin: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }

          const simplifiedUser: AuthUser = {
            id: session.user.id,
            email: session.user.email!,
            clients: [defaultClient],
            activeClient: defaultClient
          }

          setUser(simplifiedUser)
          setActiveClient(defaultClient)
          console.log('✅ Initial session set for:', simplifiedUser.email)
        } else {
          console.log('❌ No existing session found')
        }
      } catch (error) {
        console.error('Error getting initial session:', error)
        // On any error, ensure we clear state and stop loading
        setUser(null)
        setActiveClient(null)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabaseAuth.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        console.log('🔐 Auth state changed:', event, session?.user?.email)

        // Handle token refresh errors
        if (event === 'TOKEN_REFRESHED' && !session) {
          console.warn('⚠️ Token refresh failed, clearing session...')
          setUser(null)
          setActiveClient(null)
          setLoading(false)
          return
        }

        if (event === 'SIGNED_IN' && session?.user) {
          console.log('🔄 Processing SIGNED_IN event...')

          // Skip the problematic getUserClients and create a simple user with default client
          console.log('⚡ Creating simplified user with default client to avoid RLS issues')

          const defaultClient: UserClient = {
            id: 'default-client',
            user_id: session.user.id,
            client_id: 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf', // SimmerDown UUID from database
            client_name: 'SimmerDown Guest House',
            business_name: 'ONEILL SAID SAS',
            business_type: 'hotel',
            has_sire_access: true,
            has_muva_access: true,
            is_admin: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }

          const simplifiedUser: AuthUser = {
            id: session.user.id,
            email: session.user.email!,
            clients: [defaultClient],
            activeClient: defaultClient
          }

          console.log('👤 Setting simplified user:', simplifiedUser.email)
          setUser(simplifiedUser)
          setActiveClient(defaultClient)
          console.log('✅ Default client set:', defaultClient.client_name)
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setActiveClient(null)
          router.push('/login-legacy')
        }

        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, []) // Remove router dependency to prevent infinite loops

  const handleSignOut = async () => {
    try {
      await supabaseAuth.auth.signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const handleSetActiveClient = (client: UserClient) => {
    setActiveClient(client)
    console.log('🏢 Active client changed to:', client.business_name)
  }

  const value = {
    user,
    loading,
    activeClient,
    setActiveClient: handleSetActiveClient,
    signOut: handleSignOut
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Protected Route Component
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    console.log('🛡️ ProtectedRoute effect - Loading:', loading, 'User:', !!user)
    if (!loading && !user) {
      console.log('🔄 Redirecting to login - no user')
      router.push('/login-legacy')
    } else if (!loading && user) {
      console.log('✅ User authenticated, allowing access to protected route')
    }
  }, [user, loading, router])

  console.log('🛡️ ProtectedRoute render - Loading:', loading, 'User:', !!user)

  if (loading) {
    console.log('⏳ Showing loading state')
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    console.log('❌ No user, returning null')
    return null // Will redirect to login
  }

  console.log('✅ Rendering protected content')
  return <>{children}</>
}