/**
 * Tests for SIRE Document OCR module
 *
 * Note: Full integration tests require ANTHROPIC_API_KEY
 * These tests focus on parsing logic and rate limiting
 */

// Jest is the test runner for this project
import {
  checkOCRRateLimit,
  resetOCRRateLimit,
  isValidMimeType,
  getMimeTypeFromExtension,
  validateImageSize,
  OCRError,
} from '../document-ocr';

describe('document-ocr', () => {
  describe('Rate Limiting', () => {
    beforeEach(() => {
      // Reset rate limiter before each test
      resetOCRRateLimit('test-tenant');
    });

    it('should allow requests under rate limit', () => {
      const result = checkOCRRateLimit('test-tenant');

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(9); // 10 max - 1 used
    });

    it('should track remaining requests correctly', () => {
      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        checkOCRRateLimit('test-tenant');
      }

      const result = checkOCRRateLimit('test-tenant');

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(4); // 10 - 6 = 4
    });

    it('should block requests over rate limit', () => {
      // Make 10 requests to hit limit
      for (let i = 0; i < 10; i++) {
        checkOCRRateLimit('test-tenant');
      }

      const result = checkOCRRateLimit('test-tenant');

      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.resetMs).toBeGreaterThan(0);
    });

    it('should track different tenants separately', () => {
      // Hit limit for tenant-1
      for (let i = 0; i < 10; i++) {
        checkOCRRateLimit('tenant-1');
      }

      // tenant-2 should still be allowed
      const result = checkOCRRateLimit('tenant-2');

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(9);
    });

    it('should reset rate limit for specific identifier', () => {
      // Make some requests
      for (let i = 0; i < 5; i++) {
        checkOCRRateLimit('test-tenant');
      }

      // Reset
      resetOCRRateLimit('test-tenant');

      // Should be back to full limit
      const result = checkOCRRateLimit('test-tenant');
      expect(result.remaining).toBe(9);
    });
  });

  describe('MIME Type Validation', () => {
    it('should accept valid image MIME types', () => {
      expect(isValidMimeType('image/jpeg')).toBe(true);
      expect(isValidMimeType('image/png')).toBe(true);
      expect(isValidMimeType('image/gif')).toBe(true);
      expect(isValidMimeType('image/webp')).toBe(true);
    });

    it('should reject invalid MIME types', () => {
      expect(isValidMimeType('application/pdf')).toBe(false);
      expect(isValidMimeType('text/plain')).toBe(false);
      expect(isValidMimeType('video/mp4')).toBe(false);
      expect(isValidMimeType('')).toBe(false);
    });
  });

  describe('getMimeTypeFromExtension', () => {
    it('should return correct MIME type for valid extensions', () => {
      expect(getMimeTypeFromExtension('photo.jpg')).toBe('image/jpeg');
      expect(getMimeTypeFromExtension('photo.jpeg')).toBe('image/jpeg');
      expect(getMimeTypeFromExtension('photo.png')).toBe('image/png');
      expect(getMimeTypeFromExtension('photo.gif')).toBe('image/gif');
      expect(getMimeTypeFromExtension('photo.webp')).toBe('image/webp');
    });

    it('should handle uppercase extensions', () => {
      expect(getMimeTypeFromExtension('PHOTO.JPG')).toBe('image/jpeg');
      expect(getMimeTypeFromExtension('PHOTO.PNG')).toBe('image/png');
    });

    it('should return null for unsupported extensions', () => {
      expect(getMimeTypeFromExtension('document.pdf')).toBe(null);
      expect(getMimeTypeFromExtension('document.txt')).toBe(null);
      expect(getMimeTypeFromExtension('noextension')).toBe(null);
    });
  });

  describe('Image Size Validation', () => {
    it('should accept valid image size', () => {
      // Create a 1MB buffer
      const buffer = Buffer.alloc(1024 * 1024);
      const result = validateImageSize(buffer);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject oversized images', () => {
      // Create a 25MB buffer (over 20MB limit)
      const buffer = Buffer.alloc(25 * 1024 * 1024);
      const result = validateImageSize(buffer);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds maximum');
    });

    it('should accept custom max size', () => {
      // Create a 15MB buffer
      const buffer = Buffer.alloc(15 * 1024 * 1024);

      // Should fail with 10MB limit
      const result1 = validateImageSize(buffer, 10);
      expect(result1.valid).toBe(false);

      // Should pass with 20MB limit
      const result2 = validateImageSize(buffer, 20);
      expect(result2.valid).toBe(true);
    });

    it('should reject empty/corrupted images', () => {
      const buffer = Buffer.alloc(100); // Very small
      const result = validateImageSize(buffer);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('empty or corrupted');
    });
  });

  describe('OCRError', () => {
    it('should create error with correct properties', () => {
      const error = new OCRError('Test error', 'API_ERROR', true);

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('API_ERROR');
      expect(error.retryable).toBe(true);
      expect(error.name).toBe('OCRError');
    });

    it('should default retryable to false', () => {
      const error = new OCRError('Test error', 'PARSE_ERROR');

      expect(error.retryable).toBe(false);
    });
  });
});
