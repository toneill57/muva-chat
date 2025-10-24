import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Hardcoded model (per stabilization decision)
const EMBEDDING_MODEL = 'text-embedding-3-large' as const;

export interface EmbeddingDimensions {
  balanced: number[]; // 1024d
  standard: number[]; // 1536d
  full: number[]; // 3072d
}

/**
 * Generate Matryoshka embeddings for a text
 *
 * @param text - Input text to embed
 * @returns Object with 3 embedding tiers (1024d, 1536d, 3072d)
 * @throws Error if OpenAI API fails or model is incorrect
 */
export async function generateEmbedding(text: string): Promise<EmbeddingDimensions> {
  if (!text || text.trim().length === 0) {
    throw new Error('Cannot generate embedding for empty text');
  }

  try {
    // Generate full 3072d embedding
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text.trim(),
      dimensions: 3072,
    });

    const fullEmbedding = response.data[0].embedding;

    if (fullEmbedding.length !== 3072) {
      throw new Error(
        `Unexpected embedding dimension: ${fullEmbedding.length} (expected 3072)`
      );
    }

    return {
      balanced: fullEmbedding.slice(0, 1024),
      standard: fullEmbedding.slice(0, 1536),
      full: fullEmbedding,
    };
  } catch (error: any) {
    console.error('[EmbeddingGenerator] Error:', error);
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
}

/**
 * Generate query embedding (balanced tier only)
 *
 * @param query - User query text
 * @returns 1024d embedding for vector search
 */
export async function generateQueryEmbedding(query: string): Promise<number[]> {
  const embeddings = await generateEmbedding(query);
  return embeddings.balanced;
}

/**
 * Generate embedding with specific dimension (for backward compatibility)
 *
 * @param text - Input text to embed
 * @param dimensions - Desired dimension (1024, 1536, or 3072)
 * @returns Embedding array of specified dimension
 */
export async function generateEmbeddingWithDimension(
  text: string,
  dimensions: 1024 | 1536 | 3072
): Promise<number[]> {
  const embeddings = await generateEmbedding(text);

  switch (dimensions) {
    case 1024:
      return embeddings.balanced;
    case 1536:
      return embeddings.standard;
    case 3072:
      return embeddings.full;
    default:
      throw new Error(`Unsupported dimension: ${dimensions}. Must be 1024, 1536, or 3072`);
  }
}

/**
 * Validate embedding configuration
 */
export function validateEmbeddingConfig(): void {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set in environment');
  }

  if (EMBEDDING_MODEL !== 'text-embedding-3-large') {
    throw new Error('Embedding model must be text-embedding-3-large (hardcoded per ADR)');
  }
}
