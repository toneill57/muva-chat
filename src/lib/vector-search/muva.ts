import { createServerClient } from '@/lib/supabase';

export interface MuvaSearchResult {
  content: string;
  similarity: number;
  metadata: {
    source: string;
    section?: string;
  };
}

/**
 * Search MUVA tourism content (San Andrés)
 *
 * @param queryEmbedding - 3072d embedding for tourism search
 * @param matchThreshold - Similarity threshold (default: 0.15)
 * @param matchCount - Number of results to return (default: 5)
 */
export async function searchMuvaContent(
  queryEmbedding: number[],
  matchThreshold: number = 0.15,
  matchCount: number = 5
): Promise<MuvaSearchResult[]> {
  const supabase = createServerClient();

  const { data, error } = await supabase.rpc('match_muva_documents', {
    query_embedding: queryEmbedding,
    match_threshold: matchThreshold,
    match_count: matchCount,
  });

  if (error) {
    console.error('[VectorSearch:MUVA] Error:', error);
    return [];
  }

  return (data || []).map((row: any) => ({
    content: row.content,
    similarity: row.similarity,
    metadata: {
      source: row.source_file || 'unknown',
      section: row.section_title,
    },
  }));
}
