import type { GuestSession } from '@/lib/guest-auth';
import type { SearchContext } from './search-strategy';
import type { VectorSearchResult } from '@/lib/conversational-chat-engine';
import { createServerClient } from '@/lib/supabase';

/**
 * Enhanced accommodation search (public + manual) - FASE C
 *
 * Searches:
 * - accommodation_units_public: ALL units (for re-booking/comparison)
 * - accommodation_units_manual: ONLY guest's unit (private info)
 */
export async function searchAccommodationEnhanced(
  queryEmbeddingFast: number[],
  queryEmbeddingBalanced: number[],
  guestInfo: GuestSession
): Promise<VectorSearchResult[]> {
  const client = createServerClient();
  const guestUnitId = guestInfo.accommodation_unit?.id;

  if (!guestUnitId) {
    console.warn('[Chat Engine] No accommodation assigned to guest');
    return [];
  }

  const { data, error } = await client.rpc('match_guest_accommodations', {
    query_embedding_fast: queryEmbeddingFast,
    query_embedding_balanced: queryEmbeddingBalanced,
    p_guest_unit_id: guestUnitId,
    p_tenant_id: guestInfo.tenant_id,
    match_threshold: 0.15,
    match_count: 10,
  });

  if (error) {
    console.error('[Chat Engine] Enhanced accommodation search error:', error);
    return [];
  }

  console.log('[Chat Engine] Enhanced accommodation results:', {
    total: data?.length || 0,
    public_units: data?.filter((r: any) => r.source_table === 'accommodation_units_public').length || 0,
    manual_old_deprecated: data?.filter((r: any) => r.source_table === 'accommodation_units_manual').length || 0,
    guest_unit_results: data?.filter((r: any) => r.is_guest_unit).length || 0,
  });

  return (data || []).map((item: any) => ({
    id: item.id,
    name: item.name || 'Alojamiento',
    content: item.content,
    similarity: item.similarity,
    source_file: '',
    table: item.source_table,
    metadata: {
      is_guest_unit: item.is_guest_unit,
      is_public_info: item.source_table === 'accommodation_units_public',
      is_private_info: item.source_table.includes('accommodation_units_manual'),
    },
  }));
}

/**
 * Search MUVA tourism content
 */
export async function searchTourism(embedding: number[]): Promise<VectorSearchResult[]> {
  const client = createServerClient();
  const { data, error } = await client.rpc('match_muva_documents', {
    query_embedding: embedding,
    match_threshold: 0.15,
    match_count: 5,
  });

  if (error) {
    console.error('[Chat Engine] Tourism search error:', error);
    return [];
  }

  return (data || []).map((item: any) => ({
    ...item,
    table: 'muva_content',
  }));
}

/**
 * Search HOTEL GENERAL information (FAQ, Arrival instructions)
 * Domain 2: Information that applies to ALL guests of the hotel
 */
export async function searchHotelGeneralInfo(
  embedding: number[],
  tenantId: string
): Promise<VectorSearchResult[]> {
  const client = createServerClient();
  const { data, error } = await client.rpc('match_hotel_general_info', {
    query_embedding: embedding,
    p_tenant_id: tenantId,
    similarity_threshold: 0.3,
    match_count: 5,
  });

  if (error) {
    console.error('[Chat Engine] Hotel general info search error:', error);
    return [];
  }

  console.log('[Chat Engine] Hotel general info results:', {
    total_found: data?.length || 0,
    tenant: tenantId,
  });

  return (data || []).map((item: any) => ({
    ...item,
    table: 'guest_information',
    content: item.info_content,
    title: item.info_title,
    name: item.info_title,
  }));
}

/**
 * Search UNIT MANUAL CHUNKS (WiFi, safe code, appliances)
 * Domain 3: Private information ONLY for the guest's assigned unit
 */
export async function searchUnitManual(
  embedding: number[],
  unitId: string,
  unitName?: string
): Promise<VectorSearchResult[]> {
  const client = createServerClient();
  const { data, error } = await client.rpc('match_unit_manual_chunks', {
    query_embedding: embedding,
    p_accommodation_unit_id: unitId,
    match_threshold: 0.25,
    match_count: 5,
  });

  if (error) {
    console.error('[Chat Engine] Unit manual chunks search error:', error);
    return [];
  }

  console.log('[Chat Engine] Unit manual chunks results:', {
    total_found: data?.length || 0,
    unit_id: unitId,
    unit_name: unitName || 'N/A',
    chunks: data?.map((item: any) => ({
      chunk_index: item.chunk_index,
      similarity: item.similarity?.toFixed(3),
      section: item.section_title?.substring(0, 50),
    })),
  });

  return (data || []).map((item: any) => ({
    ...item,
    table: 'accommodation_units_manual_chunks',
    content: item.chunk_content || '',
    title: item.section_title || `Manual - Chunk ${item.chunk_index}`,
    name: `Manual ${item.section_title || ''}`,
    metadata: {
      ...item.metadata,
      chunk_index: item.chunk_index,
      section_title: item.section_title,
      unit_name: unitName,
    },
  }));
}

/**
 * Execute all vector searches in parallel based on search context
 *
 * @param queryEmbeddingFast - 1024d embedding for accommodation public search
 * @param queryEmbeddingStandard - 1536d embedding (ACTUAL dimension of embedding_balanced in DB!)
 * @param queryEmbeddingFull - 3072d embedding for tourism search
 * @param searchContext - Context with permissions and guest info
 * @returns Array of search results from all domains
 */
export async function executeParallelSearch(
  queryEmbeddingFast: number[],
  queryEmbeddingStandard: number[],
  queryEmbeddingFull: number[],
  searchContext: SearchContext
): Promise<VectorSearchResult[]> {
  const startTime = Date.now();
  const searches: Promise<VectorSearchResult[]>[] = [];

  // CRITICAL: Column "embedding_balanced" contains 1536d data (verified in DB), NOT 1024d!
  // The naming is misleading but we must match the actual stored dimension.

  // 1. Accommodation search (ENHANCED) - public (ALL) + manual (guest's only)
  searches.push(searchAccommodationEnhanced(queryEmbeddingFast, queryEmbeddingStandard, searchContext.guestInfo));

  // 2. Hotel General Info search (ALWAYS) - FAQ, Arrival instructions (Domain 2)
  searches.push(searchHotelGeneralInfo(queryEmbeddingStandard, searchContext.tenantId));

  // 3. Unit Manual search (CONDITIONAL) - Guest's private unit manuals (Domain 3)
  const accommodationUnits = searchContext.guestInfo.accommodation_units ||
    (searchContext.guestInfo.accommodation_unit ? [searchContext.guestInfo.accommodation_unit] : []);

  if (accommodationUnits.length > 0) {
    console.log(`[Chat Engine] Searching manuals for ${accommodationUnits.length} accommodations:`,
      accommodationUnits.map(u => u.name).join(', '));

    const unitManualSearches = accommodationUnits.map(unit =>
      searchUnitManual(queryEmbeddingStandard, unit.id, unit.name)
    );

    const allUnitManuals = await Promise.all(unitManualSearches);
    searches.push(Promise.resolve(allUnitManuals.flat()));
  } else {
    searches.push(Promise.resolve([]));
    console.log('[Chat Engine] ⚠️ No accommodations assigned - skipping unit manual search');
  }

  // 4. MUVA search (CONDITIONAL) - only if permission granted
  if (searchContext.hasMuvaAccess) {
    console.log('[Chat Engine] ✅ MUVA access granted');
    searches.push(searchTourism(queryEmbeddingFull));
  } else {
    console.log('[Chat Engine] ⛔ MUVA access denied');
    searches.push(Promise.resolve([]));
  }

  // Execute searches in parallel
  const results = await Promise.all(searches);
  const accommodationResults = results[0] || [];
  const hotelGeneralResults = results[1] || [];
  const unitManualResults = results[2] || [];
  const tourismResults = results[3] || [];

  console.log(`[Chat Engine] Vector search completed in ${Date.now() - startTime}ms`, {
    total: accommodationResults.length + hotelGeneralResults.length + unitManualResults.length + tourismResults.length,
    accommodation: accommodationResults.length,
    hotel_general: hotelGeneralResults.length,
    unit_manual: unitManualResults.length,
    muva: tourismResults.length,
  });

  return {
    accommodationResults,
    hotelGeneralResults,
    unitManualResults,
    tourismResults,
  } as any; // TypeScript workaround - caller will handle
}
