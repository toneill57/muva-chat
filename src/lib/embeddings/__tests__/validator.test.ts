import { describe, it, expect } from 'vitest';
import { validateEmbeddingDimensions, validateEmbeddingValues, validateEmbedding } from '../validator';

describe('Embedding Validator', () => {
  describe('validateEmbeddingDimensions', () => {
    it('should validate correct dimensions', () => {
      const embeddings = {
        balanced: new Array(1024).fill(0.5),
        standard: new Array(1536).fill(0.5),
        full: new Array(3072).fill(0.5),
      };

      const result = validateEmbeddingDimensions(embeddings);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid balanced dimension', () => {
      const embeddings = {
        balanced: new Array(512).fill(0.5), // WRONG
        standard: new Array(1536).fill(0.5),
        full: new Array(3072).fill(0.5),
      };

      const result = validateEmbeddingDimensions(embeddings);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Invalid balanced dimension: 512');
    });

    it('should reject invalid standard dimension', () => {
      const embeddings = {
        balanced: new Array(1024).fill(0.5),
        standard: new Array(1000).fill(0.5), // WRONG
        full: new Array(3072).fill(0.5),
      };

      const result = validateEmbeddingDimensions(embeddings);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Invalid standard dimension: 1000');
    });

    it('should reject invalid full dimension', () => {
      const embeddings = {
        balanced: new Array(1024).fill(0.5),
        standard: new Array(1536).fill(0.5),
        full: new Array(2048).fill(0.5), // WRONG
      };

      const result = validateEmbeddingDimensions(embeddings);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Invalid full dimension: 2048');
    });

    it('should verify balanced is subset of standard', () => {
      const embeddings = {
        balanced: new Array(1024).fill(0.5),
        standard: new Array(1536).fill(0.3), // Different values
        full: new Array(3072).fill(0.5),
      };

      const result = validateEmbeddingDimensions(embeddings);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Balanced embedding is not a subset of standard');
    });

    it('should verify standard is subset of full', () => {
      const balanced = new Array(1024).fill(0.5);
      const standard = [...balanced, ...new Array(512).fill(0.5)];
      const full = new Array(3072).fill(0.3); // Different values

      const embeddings = { balanced, standard, full };

      const result = validateEmbeddingDimensions(embeddings);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Standard embedding is not a subset of full');
    });
  });

  describe('validateEmbeddingValues', () => {
    it('should validate correct values', () => {
      const embedding = [0.1, 0.2, -0.3, 0.4, -0.5];
      const result = validateEmbeddingValues(embedding);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject NaN values', () => {
      const embedding = [0.1, 0.2, NaN, 0.4];
      const result = validateEmbeddingValues(embedding);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('NaN found');
    });

    it('should reject Infinity', () => {
      const embedding = [0.1, 0.2, Infinity, 0.4];
      const result = validateEmbeddingValues(embedding);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Infinite value found');
    });

    it('should reject negative Infinity', () => {
      const embedding = [0.1, 0.2, -Infinity, 0.4];
      const result = validateEmbeddingValues(embedding);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Infinite value found');
    });

    it('should reject values > 1', () => {
      const embedding = [0.1, 0.2, 1.5, 0.4];
      const result = validateEmbeddingValues(embedding);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Value out of range');
    });

    it('should reject values < -1', () => {
      const embedding = [0.1, 0.2, -1.5, 0.4];
      const result = validateEmbeddingValues(embedding);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Value out of range');
    });

    it('should accept boundary values', () => {
      const embedding = [1, -1, 0, 0.999, -0.999];
      const result = validateEmbeddingValues(embedding);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateEmbedding', () => {
    it('should validate correct embeddings', () => {
      const balanced = new Array(1024).fill(0.5);
      const standard = [...balanced, ...new Array(512).fill(0.5)];
      const full = [...standard, ...new Array(1536).fill(0.5)];

      const embeddings = { balanced, standard, full };

      const result = validateEmbedding(embeddings);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail on dimension errors first', () => {
      const embeddings = {
        balanced: new Array(512).fill(0.5), // Wrong dimension
        standard: new Array(1536).fill(NaN), // Invalid values
        full: new Array(3072).fill(0.5),
      };

      const result = validateEmbedding(embeddings);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Invalid balanced dimension');
    });

    it('should fail on value errors after dimension check', () => {
      const balanced = new Array(1024).fill(NaN);
      const standard = [...balanced, ...new Array(512).fill(0.5)];
      const full = [...standard, ...new Array(1536).fill(0.5)];

      const embeddings = { balanced, standard, full };

      const result = validateEmbedding(embeddings);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('NaN found');
    });
  });
});
