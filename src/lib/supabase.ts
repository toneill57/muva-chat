import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

// ============================================================================
// Singleton Supabase Client (Connection Pooling)
// ============================================================================

/**
 * Singleton Supabase client to avoid connection overhead.
 *
 * Benefits:
 * - Reduces connection setup time (30-50ms per request)
 * - Reuses existing connection pool
 * - Maintains persistent connection to Supabase
 *
 * Performance impact: 160ms → 100-120ms for vector search
 */
let supabaseInstance: SupabaseClient | null = null

function getSupabaseSingleton(): SupabaseClient {
  if (!supabaseInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    supabaseInstance = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    console.log('[supabase] Singleton client created (connection pooling enabled)')
  }

  return supabaseInstance
}

// Function to create Supabase client for API routes
// Uses lazy initialization to avoid build-time errors
export function createServerClient() {
  return getSupabaseSingleton()
}

// Alias for createServerClient - used in newer code
export async function createSupabaseServerClient() {
  return createServerClient()
}

export interface DocumentEmbedding {
  id: string
  content: string
  embedding: number[]
  source_file: string
  document_type: string
  chunk_index: number
  total_chunks: number
  metadata?: Record<string, unknown>
  created_at: string
}

// Legacy function removed - now using metadata-driven unified search

// METADATA-DRIVEN ROUTING: No keyword detection
// Domains are now explicit via schema/table routing defined in metadata

/**
 * ⚠️ DEPRECATED FUNCTION - DO NOT USE ⚠️
 *
 * This function is hardcoded for SimmerDown and violates multi-tenant security.
 * It searches SimmerDown-specific content regardless of the actual tenant.
 *
 * @deprecated Use proper multi-tenant functions instead:
 * - For SIRE: supabase.rpc('match_sire_documents', {...})
 * - For MUVA: supabase.rpc('match_muva_documents', {...})
 * - For tenant-specific: use tenant-aware functions with proper filtering
 *
 * @security CRITICAL: This function exposes SimmerDown data to all users
 */
export async function searchDocuments(
  queryEmbedding: number[],
  matchThreshold: number = 0.0,
  matchCount: number = 4
): Promise<{ results: DocumentEmbedding[], detectedDomain: string }> {
  throw new Error('🚨 DEPRECATED: searchDocuments is hardcoded for SimmerDown and violates multi-tenant security. Use proper tenant-aware functions instead.');
}