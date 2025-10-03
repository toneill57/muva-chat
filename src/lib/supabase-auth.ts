'use client'

import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

// Lazy initialization for client-side Supabase client
let supabaseAuthInstance: SupabaseClient | null = null

function getSupabaseAuthClient(): SupabaseClient {
  if (!supabaseAuthInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    supabaseAuthInstance = createClient(supabaseUrl, supabaseAnonKey)
  }
  return supabaseAuthInstance
}

// Export getter function instead of direct client
export const supabaseAuth = {
  get client() {
    return getSupabaseAuthClient()
  },
  auth: {
    getUser: () => getSupabaseAuthClient().auth.getUser(),
    getSession: () => getSupabaseAuthClient().auth.getSession(),
    onAuthStateChange: (callback: any) => getSupabaseAuthClient().auth.onAuthStateChange(callback),
    signInWithPassword: (credentials: { email: string; password: string }) =>
      getSupabaseAuthClient().auth.signInWithPassword(credentials),
    signOut: () => getSupabaseAuthClient().auth.signOut(),
    signUp: (credentials: { email: string; password: string }) =>
      getSupabaseAuthClient().auth.signUp(credentials),
  },
  from: (table: string) => getSupabaseAuthClient().from(table),
}

export interface UserClient {
  id: string
  user_id: string
  client_id: string
  client_name: string
  business_name: string
  business_type: 'hotel' | 'restaurant' | 'activity' | 'spot' | 'rental' | 'nightlife' | 'museum' | 'store' | 'generic'
  has_sire_access: boolean
  has_muva_access: boolean
  is_admin: boolean
  created_at: string
  updated_at: string
}

export interface AuthUser {
  id: string
  email: string
  clients: UserClient[]
  activeClient?: UserClient
}

// Get user's client mappings from user_tenant_permissions + tenant_registry
export async function getUserClients(userId: string): Promise<UserClient[]> {
  try {
    // First, get user permissions
    const { data: permissions, error: permError } = await supabaseAuth
      .from('user_tenant_permissions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)

    if (permError) {
      const silentErrors = ['PGRST116', '42501', 'PGRST301', '42P17', '42702', '23505']
      if (silentErrors.includes(permError.code)) {
        return []
      }
      console.warn('User permissions fetch warning:', permError.code)
      return []
    }

    if (!permissions || permissions.length === 0) {
      return []
    }

    // Then get tenant registry info for each tenant
    const tenantIds = permissions.map(p => p.tenant_id)
    const { data: tenants, error: tenantError } = await supabaseAuth
      .from('tenant_registry')
      .select('*')
      .in('tenant_id', tenantIds)

    if (tenantError) {
      console.warn('Tenant registry fetch warning:', tenantError.code)
      // Continue with permissions only if tenant lookup fails
    }

    // Combine the data
    const transformedData = permissions.map(perm => {
      const tenant = tenants?.find(t => t.tenant_id === perm.tenant_id)
      return {
        id: perm.id,
        user_id: perm.user_id,
        client_id: perm.tenant_id,
        client_name: tenant?.nombre_comercial || 'Unknown Client',
        business_name: tenant?.razon_social || 'Unknown Business',
        business_type: (tenant?.tenant_type || 'generic') as any,
        has_sire_access: perm.permissions?.sire_access || false,
        has_muva_access: perm.permissions?.muva_access || false,
        is_admin: perm.role === 'admin' || perm.role === 'owner',
        created_at: perm.created_at,
        updated_at: perm.updated_at
      }
    })

    return transformedData
  } catch (err) {
    // Catch any other authentication-related errors
    console.error('Authentication error:', err)
    return []
  }
}

// Get current authenticated user with their clients
export async function getCurrentUserWithClients(): Promise<AuthUser | null> {
  console.log('📋 Getting current user with clients...')

  try {
    const { data: { user } } = await supabaseAuth.auth.getUser()
    console.log('👤 Got user from auth:', user?.email)

    if (!user) {
      console.log('❌ No user found')
      return null
    }

    console.log('🔍 Fetching user clients...')
    // Add timeout to prevent hanging
    const clientsPromise = getUserClients(user.id)
    const timeoutPromise = new Promise<UserClient[]>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), 5000)
    )

    let clients: UserClient[] = []
    try {
      clients = await Promise.race([clientsPromise, timeoutPromise])
      console.log('✅ Clients fetched successfully:', clients.length)
    } catch (err) {
      console.warn('⚠️ Failed to fetch clients, using empty array:', err)
      clients = [] // Continue with empty clients array
    }

    const authUser = {
      id: user.id,
      email: user.email!,
      clients, // This might be empty array if RLS fails, but user is still valid
      activeClient: clients[0] || null // Default to first client or null if none
    }

    console.log('🎯 Returning auth user:', authUser.email, 'with', authUser.clients.length, 'clients')
    return authUser
  } catch (error) {
    console.error('❌ Error in getCurrentUserWithClients:', error)
    return null
  }
}

// Auth state management
export async function signIn(email: string, password: string) {
  console.log('🔐 Attempting sign in for:', email)

  const { data, error } = await supabaseAuth.auth.signInWithPassword({
    email,
    password
  })

  if (error) {
    console.error('❌ Sign in error:', error)
    throw error
  }

  console.log('✅ Sign in successful:', data.user?.email)
  return data
}

export async function signOut() {
  const { error } = await supabaseAuth.auth.signOut()
  if (error) throw error
}

export async function signUp(email: string, password: string) {
  const { data, error } = await supabaseAuth.auth.signUp({
    email,
    password
  })

  if (error) throw error
  return data
}