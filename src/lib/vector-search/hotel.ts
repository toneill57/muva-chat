import { createServerClient } from '@/lib/supabase';

export interface HotelSearchResult {
  content: string;
  title: string;
  similarity: number;
  metadata: {
    tenantId: string;
  };
}

/**
 * Search hotel general information (FAQ, Arrival instructions)
 * Domain 2: Information that applies to ALL guests of the hotel
 *
 * @param queryEmbedding - 1536d balanced embedding
 * @param tenantId - Tenant ID to filter results
 * @param matchThreshold - Similarity threshold (default: 0.3)
 * @param matchCount - Number of results to return (default: 5)
 */
export async function searchHotelGeneral(
  queryEmbedding: number[],
  tenantId: string,
  matchThreshold: number = 0.3,
  matchCount: number = 5
): Promise<HotelSearchResult[]> {
  const supabase = createServerClient();

  const { data, error } = await supabase.rpc('match_hotel_general_info', {
    query_embedding: queryEmbedding,
    p_tenant_id: tenantId,
    similarity_threshold: matchThreshold,
    match_count: matchCount,
  });

  if (error) {
    console.error('[VectorSearch:Hotel] Error:', error);
    return [];
  }

  return (data || []).map((row: any) => ({
    content: row.info_content,
    title: row.info_title,
    similarity: row.similarity,
    metadata: {
      tenantId: tenantId,
    },
  }));
}
