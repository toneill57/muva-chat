/**
 * SIRE Document OCR - Claude Vision Integration
 *
 * Extracts structured data from passport, visa, and ID card images
 * using Claude Sonnet 4 Vision API.
 *
 * Features:
 * - Passport data extraction (9 fields)
 * - Visa data extraction (7 fields)
 * - Auto document type detection
 * - Retry logic with exponential backoff
 * - Confidence scoring (0.00-1.00)
 * - Robust error handling
 *
 * @module document-ocr
 * @created December 23, 2025
 * @context SIRE Auto-Submission FASE 2, Tarea 2.2
 */

import Anthropic from '@anthropic-ai/sdk';

// ============================================================================
// INITIALIZATION
// ============================================================================

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Claude Vision model (latest Sonnet 4)
const VISION_MODEL = 'claude-sonnet-4-20250514';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface OCRResult {
  success: boolean;
  extractedText: string;
  structuredData: PassportData | VisaData | null;
  confidence: number;
  processingTimeMs: number;
  error?: string;
}

export interface PassportData {
  fullName: string | null;
  passportNumber: string | null;
  nationality: string | null;
  birthDate: string | null;
  expiryDate: string | null;
  sex: string | null;
  placeOfBirth: string | null;
  issueDate: string | null;
  issuingAuthority: string | null;
}

export interface VisaData {
  visaType: string | null;
  visaNumber: string | null;
  nationality: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  entriesAllowed: string | null; // 'Single', 'Multiple', etc.
  issuingCountry: string | null;
}

export type DocumentType = 'passport' | 'visa' | 'id_card';

// ============================================================================
// ERROR HANDLING
// ============================================================================

export class OCRError extends Error {
  constructor(
    message: string,
    public code: 'API_ERROR' | 'PARSE_ERROR' | 'INVALID_IMAGE' | 'RATE_LIMIT',
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'OCRError';
  }
}

// ============================================================================
// RETRY LOGIC
// ============================================================================

/**
 * Executes a function with exponential backoff retry logic
 *
 * @param fn - Function to execute
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param backoffMs - Initial backoff delay in milliseconds (default: 1000)
 * @returns Result of the function
 * @throws Last error encountered if all retries fail
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  backoffMs: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry non-retryable errors
      if (error instanceof OCRError && !error.retryable) {
        throw error;
      }

      // Log retry attempt
      if (attempt < maxRetries - 1) {
        const delay = backoffMs * Math.pow(2, attempt);
        console.log(`[document-ocr] Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}

// ============================================================================
// OCR PROMPTS
// ============================================================================

const PASSPORT_OCR_PROMPT = `
Analyze this passport/ID document image and extract the following fields in JSON format:

{
  "fullName": "Full name as it appears (SURNAME, Given Names)",
  "passportNumber": "Passport/document number",
  "nationality": "Nationality (country name in English)",
  "birthDate": "Date of birth (DD/MM/YYYY)",
  "expiryDate": "Expiry date (DD/MM/YYYY)",
  "sex": "Sex (M/F/X)",
  "placeOfBirth": "Place of birth (if visible)",
  "issueDate": "Issue date (DD/MM/YYYY if visible)",
  "issuingAuthority": "Issuing authority/country"
}

IMPORTANT EXTRACTION RULES:
- Extract text EXACTLY as printed, preserving original format
- For dates, convert to DD/MM/YYYY format (e.g., "15 JUL 2025" → "15/07/2025")
- For names, extract in SURNAME, Given Names format (e.g., "SMITH, JOHN ROBERT")
- For nationality, use full country name in English (e.g., "United States" not "USA")
- For sex, use single letter: M, F, or X
- If a field is not visible, unclear, or cannot be read, set it to null
- Return ONLY valid JSON, no additional text or explanation
- Do not include markdown code blocks, just raw JSON

EXAMPLE OUTPUT:
{
  "fullName": "GARCIA, MARIA ELENA",
  "passportNumber": "AB1234567",
  "nationality": "Colombia",
  "birthDate": "15/03/1990",
  "expiryDate": "15/03/2030",
  "sex": "F",
  "placeOfBirth": "Bogotá",
  "issueDate": "16/03/2020",
  "issuingAuthority": "Colombia"
}
`;

const VISA_OCR_PROMPT = `
Analyze this visa document image and extract the following fields in JSON format:

{
  "visaType": "Type of visa (e.g., Tourist, Business, Student)",
  "visaNumber": "Visa number/control number",
  "nationality": "Nationality of visa holder (country name)",
  "issueDate": "Issue date (DD/MM/YYYY)",
  "expiryDate": "Expiry date (DD/MM/YYYY)",
  "entriesAllowed": "Number of entries allowed (Single/Multiple/Double)",
  "issuingCountry": "Country that issued the visa"
}

IMPORTANT EXTRACTION RULES:
- Extract text EXACTLY as printed
- For dates, convert to DD/MM/YYYY format
- For entriesAllowed, standardize to: "Single", "Multiple", "Double", or specific number
- For nationality and issuingCountry, use full country names in English
- If a field is not visible or unclear, set it to null
- Return ONLY valid JSON, no additional text
- Do not include markdown code blocks, just raw JSON

EXAMPLE OUTPUT:
{
  "visaType": "Tourist",
  "visaNumber": "20250312ABC",
  "nationality": "United States",
  "issueDate": "12/03/2025",
  "expiryDate": "12/03/2026",
  "entriesAllowed": "Multiple",
  "issuingCountry": "Colombia"
}
`;

const DOCUMENT_TYPE_DETECTION_PROMPT = `
Analyze this document image and determine what type of travel/identity document it is.

Respond with ONLY ONE of these exact words:
- passport
- visa
- id_card

No additional text, just the document type.
`;

// ============================================================================
// CORE OCR FUNCTIONS
// ============================================================================

/**
 * Extracts structured data from a passport image
 *
 * @param imageBuffer - Image buffer (JPEG, PNG, WebP, or GIF)
 * @param mimeType - MIME type of the image
 * @returns OCR result with extracted passport data
 */
export async function extractPassportData(
  imageBuffer: Buffer,
  mimeType: string
): Promise<OCRResult> {
  const startTime = Date.now();

  try {
    // Validate MIME type
    const validMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validMimeTypes.includes(mimeType)) {
      throw new OCRError(
        `Invalid image format: ${mimeType}. Supported formats: JPEG, PNG, GIF, WebP`,
        'INVALID_IMAGE',
        false
      );
    }

    // Convert buffer to base64
    const base64Image = imageBuffer.toString('base64');

    // Call Claude Vision API with retry logic
    const response = await withRetry(async () => {
      try {
        return await anthropic.messages.create({
          model: VISION_MODEL,
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                  data: base64Image
                }
              },
              {
                type: 'text',
                text: PASSPORT_OCR_PROMPT
              }
            ]
          }]
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Check for rate limiting
        if (errorMessage.includes('rate_limit') || errorMessage.includes('429')) {
          throw new OCRError('API rate limit exceeded', 'RATE_LIMIT', true);
        }

        // Check for API errors
        if (errorMessage.includes('api_error') || errorMessage.includes('500')) {
          throw new OCRError('Claude API error', 'API_ERROR', true);
        }

        throw new OCRError(
          `API request failed: ${errorMessage}`,
          'API_ERROR',
          false
        );
      }
    }, 3, 1000);

    // Extract text from response
    const extractedText = response.content[0].type === 'text'
      ? response.content[0].text
      : '';

    // Parse JSON response
    let structuredData: PassportData | null = null;
    let confidence = 0;

    try {
      // Extract JSON from response (handle markdown code blocks and raw JSON)
      let jsonStr = extractedText.trim();

      // Remove markdown code blocks if present
      const codeBlockMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1].trim();
      } else {
        // Try to extract JSON object
        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonStr = jsonMatch[0];
        }
      }

      // Parse JSON
      const parsed = JSON.parse(jsonStr) as PassportData;
      structuredData = parsed;

      // Calculate confidence based on filled fields
      const totalFields = 9; // All fields in PassportData
      const filledFields = Object.values(structuredData).filter(v => v !== null && v !== '').length;
      confidence = filledFields / totalFields;

      console.log(`[document-ocr] Passport extraction: ${filledFields}/${totalFields} fields (${(confidence * 100).toFixed(0)}% confidence)`);

    } catch (parseError) {
      console.error('[document-ocr] JSON parsing error:', parseError);
      throw new OCRError(
        `Failed to parse OCR response: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`,
        'PARSE_ERROR',
        false
      );
    }

    const processingTimeMs = Date.now() - startTime;

    return {
      success: structuredData !== null,
      extractedText,
      structuredData,
      confidence,
      processingTimeMs
    };

  } catch (error) {
    const processingTimeMs = Date.now() - startTime;

    // Re-throw OCRError instances
    if (error instanceof OCRError) {
      throw error;
    }

    // Wrap unknown errors
    return {
      success: false,
      extractedText: '',
      structuredData: null,
      confidence: 0,
      processingTimeMs,
      error: error instanceof Error ? error.message : 'Unknown OCR error'
    };
  }
}

/**
 * Extracts structured data from a visa image
 *
 * @param imageBuffer - Image buffer (JPEG, PNG, WebP, or GIF)
 * @param mimeType - MIME type of the image
 * @returns OCR result with extracted visa data
 */
export async function extractVisaData(
  imageBuffer: Buffer,
  mimeType: string
): Promise<OCRResult> {
  const startTime = Date.now();

  try {
    // Validate MIME type
    const validMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validMimeTypes.includes(mimeType)) {
      throw new OCRError(
        `Invalid image format: ${mimeType}. Supported formats: JPEG, PNG, GIF, WebP`,
        'INVALID_IMAGE',
        false
      );
    }

    // Convert buffer to base64
    const base64Image = imageBuffer.toString('base64');

    // Call Claude Vision API with retry logic
    const response = await withRetry(async () => {
      try {
        return await anthropic.messages.create({
          model: VISION_MODEL,
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                  data: base64Image
                }
              },
              {
                type: 'text',
                text: VISA_OCR_PROMPT
              }
            ]
          }]
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        if (errorMessage.includes('rate_limit') || errorMessage.includes('429')) {
          throw new OCRError('API rate limit exceeded', 'RATE_LIMIT', true);
        }

        if (errorMessage.includes('api_error') || errorMessage.includes('500')) {
          throw new OCRError('Claude API error', 'API_ERROR', true);
        }

        throw new OCRError(
          `API request failed: ${errorMessage}`,
          'API_ERROR',
          false
        );
      }
    }, 3, 1000);

    // Extract text from response
    const extractedText = response.content[0].type === 'text'
      ? response.content[0].text
      : '';

    // Parse JSON response
    let structuredData: VisaData | null = null;
    let confidence = 0;

    try {
      // Extract JSON from response
      let jsonStr = extractedText.trim();

      const codeBlockMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1].trim();
      } else {
        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonStr = jsonMatch[0];
        }
      }

      const parsed = JSON.parse(jsonStr) as VisaData;
      structuredData = parsed;

      // Calculate confidence
      const totalFields = 7;
      const filledFields = Object.values(structuredData).filter(v => v !== null && v !== '').length;
      confidence = filledFields / totalFields;

      console.log(`[document-ocr] Visa extraction: ${filledFields}/${totalFields} fields (${(confidence * 100).toFixed(0)}% confidence)`);

    } catch (parseError) {
      console.error('[document-ocr] JSON parsing error:', parseError);
      throw new OCRError(
        `Failed to parse OCR response: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`,
        'PARSE_ERROR',
        false
      );
    }

    const processingTimeMs = Date.now() - startTime;

    return {
      success: structuredData !== null,
      extractedText,
      structuredData,
      confidence,
      processingTimeMs
    };

  } catch (error) {
    const processingTimeMs = Date.now() - startTime;

    if (error instanceof OCRError) {
      throw error;
    }

    return {
      success: false,
      extractedText: '',
      structuredData: null,
      confidence: 0,
      processingTimeMs,
      error: error instanceof Error ? error.message : 'Unknown OCR error'
    };
  }
}

/**
 * Auto-detects document type and extracts appropriate structured data
 *
 * @param imageBuffer - Image buffer (JPEG, PNG, WebP, or GIF)
 * @param mimeType - MIME type of the image
 * @param documentType - Optional: specify document type to skip detection
 * @returns OCR result with extracted document data
 */
export async function extractDocumentData(
  imageBuffer: Buffer,
  mimeType: string,
  documentType?: DocumentType
): Promise<OCRResult> {
  try {
    let detectedType = documentType;

    // Auto-detect document type if not provided
    if (!detectedType) {
      console.log('[document-ocr] Auto-detecting document type...');

      const base64Image = imageBuffer.toString('base64');

      const response = await withRetry(async () => {
        return await anthropic.messages.create({
          model: VISION_MODEL,
          max_tokens: 50,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                  data: base64Image
                }
              },
              {
                type: 'text',
                text: DOCUMENT_TYPE_DETECTION_PROMPT
              }
            ]
          }]
        });
      }, 3, 1000);

      const detectionResult = response.content[0].type === 'text'
        ? response.content[0].text.trim().toLowerCase()
        : '';

      if (detectionResult.includes('passport')) {
        detectedType = 'passport';
      } else if (detectionResult.includes('visa')) {
        detectedType = 'visa';
      } else if (detectionResult.includes('id_card')) {
        detectedType = 'id_card';
      } else {
        // Default to passport if unclear
        detectedType = 'passport';
        console.log('[document-ocr] Could not detect type, defaulting to passport');
      }

      console.log(`[document-ocr] Detected document type: ${detectedType}`);
    }

    // Extract data based on document type
    switch (detectedType) {
      case 'passport':
      case 'id_card': // Treat ID cards like passports
        return await extractPassportData(imageBuffer, mimeType);

      case 'visa':
        return await extractVisaData(imageBuffer, mimeType);

      default:
        throw new OCRError(
          `Unknown document type: ${detectedType}`,
          'INVALID_IMAGE',
          false
        );
    }

  } catch (error) {
    if (error instanceof OCRError) {
      throw error;
    }

    return {
      success: false,
      extractedText: '',
      structuredData: null,
      confidence: 0,
      processingTimeMs: 0,
      error: error instanceof Error ? error.message : 'Document extraction failed'
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  extractPassportData,
  extractVisaData,
  extractDocumentData,
  OCRError
};
