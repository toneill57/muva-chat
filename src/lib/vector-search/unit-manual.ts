import { createServerClient } from '@/lib/supabase';

export interface UnitManualSearchResult {
  content: string;
  title: string;
  similarity: number;
  metadata: {
    unitId: string;
    unitName: string;
    chunkIndex?: number;
    section?: string;
  };
}

/**
 * Search unit manual chunks (WiFi, safe code, appliances)
 * Domain 3: Private information ONLY for the guest's assigned unit
 * Uses chunked content for improved vector search precision
 *
 * @param queryEmbedding - 1536d balanced embedding
 * @param unitId - Accommodation unit ID
 * @param unitName - Optional unit name for labeling
 * @param matchThreshold - Similarity threshold (default: 0.25)
 * @param matchCount - Number of results to return (default: 5)
 */
export async function searchUnitManuals(
  queryEmbedding: number[],
  unitId: string,
  unitName?: string,
  matchThreshold: number = 0.25,
  matchCount: number = 5
): Promise<UnitManualSearchResult[]> {
  const supabase = createServerClient();

  const { data, error } = await supabase.rpc('match_unit_manual_chunks', {
    query_embedding: queryEmbedding,
    p_accommodation_unit_id: unitId,
    match_threshold: matchThreshold,
    match_count: matchCount,
  });

  if (error) {
    console.error(`[VectorSearch:UnitManual] Error for unit ${unitId}:`, error);
    return [];
  }

  return (data || []).map((row: any) => ({
    content: row.chunk_content || '',
    title: row.section_title || `Manual - Chunk ${row.chunk_index}`,
    similarity: row.similarity,
    metadata: {
      unitId: unitId,
      unitName: unitName || row.section_title?.split(':')[0] || 'Unknown',
      chunkIndex: row.chunk_index,
      section: row.section_title,
    },
  }));
}

/**
 * Search unit manuals for multiple accommodation units
 * Executes searches in parallel and combines results
 *
 * @param queryEmbedding - 1536d balanced embedding
 * @param units - Array of {id, name} objects
 * @param matchThreshold - Similarity threshold (default: 0.25)
 * @param matchCount - Number of results PER UNIT (default: 5)
 */
export async function searchMultipleUnitManuals(
  queryEmbedding: number[],
  units: Array<{ id: string; name: string }>,
  matchThreshold: number = 0.25,
  matchCount: number = 5
): Promise<UnitManualSearchResult[]> {
  if (!units || units.length === 0) {
    return [];
  }

  // Execute searches in parallel for all units
  const searches = units.map(unit =>
    searchUnitManuals(queryEmbedding, unit.id, unit.name, matchThreshold, matchCount)
  );

  const results = await Promise.all(searches);

  // Flatten and sort by similarity
  const allResults = results.flat();
  return allResults.sort((a, b) => b.similarity - a.similarity).slice(0, matchCount);
}
