import { createClient } from '@supabase/supabase-js'

// Function to create Supabase client for API routes
// Uses lazy initialization to avoid build-time errors
export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
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