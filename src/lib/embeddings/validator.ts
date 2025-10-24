import { EmbeddingDimensions } from './generator';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate embedding dimensions
 */
export function validateEmbeddingDimensions(
  embeddings: EmbeddingDimensions
): ValidationResult {
  const errors: string[] = [];

  if (embeddings.balanced.length !== 1024) {
    errors.push(`Invalid balanced dimension: ${embeddings.balanced.length} (expected 1024)`);
  }

  if (embeddings.standard.length !== 1536) {
    errors.push(`Invalid standard dimension: ${embeddings.standard.length} (expected 1536)`);
  }

  if (embeddings.full.length !== 3072) {
    errors.push(`Invalid full dimension: ${embeddings.full.length} (expected 3072)`);
  }

  // Verify balanced is subset of standard
  const balancedMatchesStandard = embeddings.balanced.every(
    (val, idx) => Math.abs(val - embeddings.standard[idx]) < 0.0001
  );

  if (!balancedMatchesStandard) {
    errors.push('Balanced embedding is not a subset of standard');
  }

  // Verify standard is subset of full
  const standardMatchesFull = embeddings.standard.every(
    (val, idx) => Math.abs(val - embeddings.full[idx]) < 0.0001
  );

  if (!standardMatchesFull) {
    errors.push('Standard embedding is not a subset of full');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate embedding values (no NaN, Infinity, etc.)
 */
export function validateEmbeddingValues(embedding: number[]): ValidationResult {
  const errors: string[] = [];

  for (let i = 0; i < embedding.length; i++) {
    const val = embedding[i];

    if (isNaN(val)) {
      errors.push(`NaN found at index ${i}`);
      break;
    }

    if (!isFinite(val)) {
      errors.push(`Infinite value found at index ${i}`);
      break;
    }

    if (Math.abs(val) > 1) {
      errors.push(`Value out of range at index ${i}: ${val} (expected -1 to 1)`);
      break;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Comprehensive validation
 */
export function validateEmbedding(embeddings: EmbeddingDimensions): ValidationResult {
  const dimResult = validateEmbeddingDimensions(embeddings);
  if (!dimResult.valid) return dimResult;

  const balancedResult = validateEmbeddingValues(embeddings.balanced);
  if (!balancedResult.valid) return balancedResult;

  const standardResult = validateEmbeddingValues(embeddings.standard);
  if (!standardResult.valid) return standardResult;

  const fullResult = validateEmbeddingValues(embeddings.full);
  if (!fullResult.valid) return fullResult;

  return { valid: true, errors: [] };
}
