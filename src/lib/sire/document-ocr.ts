/**
 * SIRE Document OCR Integration
 *
 * Specialized OCR module for extracting data from identity documents
 * (passports, visas, cédulas) for SIRE compliance reporting.
 *
 * Uses Claude Vision API with optimized prompts for SIRE field extraction.
 *
 * Key Features:
 * - Passport, Visa, and Cédula extraction
 * - Confidence scoring per field
 * - Retry logic with exponential backoff
 * - Rate limiting support
 * - Structured JSON output mapped to SIRE fields
 *
 * @see docs/sire-auto-submission/PLAN.md - SIRE Auto-Submission project plan
 * @see src/lib/sire/field-mappers.ts - SIRE field mapping utilities
 */

import Anthropic from '@anthropic-ai/sdk';

// ============================================================================
// RATE LIMITING (In-Memory)
// ============================================================================

/**
 * Simple in-memory rate limiter using sliding window algorithm
 * For production, consider using @upstash/ratelimit with Redis
 */
class InMemoryRateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 10) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  /**
   * Check if request is allowed under rate limit
   * @param identifier - Unique identifier (e.g., tenant_id, IP)
   * @returns Object with success status and remaining requests
   */
  check(identifier: string): { success: boolean; remaining: number; resetMs: number } {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get existing requests for this identifier
    let timestamps = this.requests.get(identifier) || [];

    // Remove expired timestamps
    timestamps = timestamps.filter((ts) => ts > windowStart);

    // Check if under limit
    if (timestamps.length >= this.maxRequests) {
      const oldestTimestamp = timestamps[0];
      const resetMs = oldestTimestamp + this.windowMs - now;
      return {
        success: false,
        remaining: 0,
        resetMs: Math.max(0, resetMs),
      };
    }

    // Add current request
    timestamps.push(now);
    this.requests.set(identifier, timestamps);

    return {
      success: true,
      remaining: this.maxRequests - timestamps.length,
      resetMs: this.windowMs,
    };
  }

  /**
   * Clear rate limit data for an identifier
   */
  reset(identifier: string): void {
    this.requests.delete(identifier);
  }

  /**
   * Clear all rate limit data (useful for testing)
   */
  clear(): void {
    this.requests.clear();
  }
}

// Global rate limiter instance
// 10 requests per minute per identifier (tenant)
const rateLimiter = new InMemoryRateLimiter(60000, 10);

/**
 * Check rate limit for OCR requests
 * @param identifier - Tenant ID or other unique identifier
 * @returns Rate limit check result
 */
export function checkOCRRateLimit(identifier: string): {
  success: boolean;
  remaining: number;
  resetMs: number;
} {
  return rateLimiter.check(identifier);
}

/**
 * Reset rate limit for an identifier (for testing)
 */
export function resetOCRRateLimit(identifier: string): void {
  rateLimiter.reset(identifier);
}

// ============================================================================
// TYPES
// ============================================================================

/**
 * Supported document types for OCR extraction
 */
export type DocumentType = 'passport' | 'visa' | 'cedula' | 'unknown';

/**
 * Supported MIME types for image uploads
 */
export type SupportedMimeType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

/**
 * Extracted passport data structure
 * Maps to SIRE fields after processing
 */
export interface PassportData {
  /** Full name as printed (SURNAME, Given Names) */
  fullName: string | null;
  /** Passport/document number */
  passportNumber: string | null;
  /** Nationality (country name in original language) */
  nationality: string | null;
  /** Date of birth (extracted format, will be normalized) */
  birthDate: string | null;
  /** Document expiry date */
  expiryDate: string | null;
  /** Sex (M/F) */
  sex: string | null;
  /** Place of birth (if visible) */
  placeOfBirth: string | null;
  /** Document issue date */
  issueDate: string | null;
  /** Issuing authority/country */
  issuingAuthority: string | null;
  /** MRZ (Machine Readable Zone) lines if visible */
  mrz?: string[];
}

/**
 * Extracted visa data structure
 */
export interface VisaData {
  /** Visa type (e.g., TOURIST, BUSINESS, STUDENT) */
  visaType: string | null;
  /** Visa number */
  visaNumber: string | null;
  /** Issue date */
  issueDate: string | null;
  /** Expiry date */
  expiryDate: string | null;
  /** Number of entries (SINGLE, MULTIPLE) */
  entries: string | null;
  /** Duration of stay */
  duration: string | null;
  /** Issuing country/authority */
  issuingAuthority: string | null;
}

/**
 * Extracted cédula (Colombian ID) data structure
 */
export interface CedulaData {
  /** Full name */
  fullName: string | null;
  /** Cédula number */
  cedulaNumber: string | null;
  /** Date of birth */
  birthDate: string | null;
  /** Place of birth */
  placeOfBirth: string | null;
  /** Blood type (RH) */
  bloodType: string | null;
  /** Sex (M/F) */
  sex: string | null;
  /** Issue date */
  issueDate: string | null;
  /** Expiry date */
  expiryDate: string | null;
}

/**
 * Field-level confidence information
 */
export interface FieldConfidence {
  field: string;
  value: string | null;
  confidence: number;
  source: 'mrz' | 'visual' | 'inferred';
}

/**
 * OCR extraction result
 */
export interface OCRResult {
  /** Whether extraction was successful */
  success: boolean;
  /** Detected document type */
  documentType: DocumentType;
  /** Raw extracted text from Claude */
  extractedText: string;
  /** Structured passport data (if document is passport) */
  passportData: PassportData | null;
  /** Structured visa data (if document is visa) */
  visaData: VisaData | null;
  /** Structured cédula data (if document is cédula) */
  cedulaData: CedulaData | null;
  /** Overall confidence score (0.0 - 1.0) */
  confidence: number;
  /** Per-field confidence scores */
  fieldConfidences: FieldConfidence[];
  /** Processing time in milliseconds */
  processingTimeMs: number;
  /** Error message if extraction failed */
  error?: string;
  /** Error code for programmatic handling */
  errorCode?: OCRErrorCode;
}

/**
 * Error codes for OCR failures
 */
export type OCRErrorCode =
  | 'API_ERROR'
  | 'PARSE_ERROR'
  | 'INVALID_IMAGE'
  | 'RATE_LIMIT'
  | 'TIMEOUT'
  | 'UNSUPPORTED_FORMAT'
  | 'LOW_QUALITY'
  | 'NO_DOCUMENT_DETECTED';

// ============================================================================
// PROMPTS
// ============================================================================

/**
 * Specialized prompt for passport extraction
 * Optimized for SIRE compliance fields
 */
const PASSPORT_OCR_PROMPT = `You are an expert document OCR system specialized in passport data extraction for Colombian SIRE compliance reporting.

Analyze this passport image and extract ALL visible information. Pay special attention to:
1. The Machine Readable Zone (MRZ) at the bottom - this is the most reliable source
2. The Visual Inspection Zone (VIZ) - the human-readable text above the MRZ
3. Any security features or stamps that might contain dates

Extract the following fields and return as JSON:

{
  "fullName": "Full name exactly as printed (format: SURNAME(S), Given Name(s))",
  "passportNumber": "Passport number from MRZ or VIZ",
  "nationality": "Nationality/Citizenship (country name)",
  "birthDate": "Date of birth (preserve original format)",
  "expiryDate": "Expiry/expiration date (preserve original format)",
  "sex": "Sex (M or F)",
  "placeOfBirth": "Place of birth if visible",
  "issueDate": "Issue date if visible",
  "issuingAuthority": "Issuing country/authority",
  "mrz": ["First MRZ line", "Second MRZ line"] // if visible
}

CRITICAL INSTRUCTIONS:
- Extract EXACTLY as printed, do not correct spelling
- For dates, preserve the original format (DD/MM/YYYY, YYYY-MM-DD, etc.)
- For names, maintain original order (usually SURNAME(S) first, then Given Names)
- If a field is not visible or unreadable, set to null
- MRZ takes priority over VIZ if there's a conflict
- Return ONLY valid JSON, no additional text or markdown`;

/**
 * Specialized prompt for visa extraction
 */
const VISA_OCR_PROMPT = `You are an expert document OCR system specialized in visa data extraction.

Analyze this visa image (sticker or full-page) and extract ALL visible information.

Extract the following fields and return as JSON:

{
  "visaType": "Type of visa (TOURIST, BUSINESS, STUDENT, WORK, etc.)",
  "visaNumber": "Visa number/control number",
  "issueDate": "Issue date (preserve original format)",
  "expiryDate": "Expiry/valid until date (preserve original format)",
  "entries": "Number of entries (SINGLE, MULTIPLE, or specific number)",
  "duration": "Duration of stay if specified",
  "issuingAuthority": "Issuing country/embassy/consulate"
}

CRITICAL INSTRUCTIONS:
- Extract EXACTLY as printed
- For dates, preserve the original format
- If a field is not visible, set to null
- Return ONLY valid JSON, no additional text`;

/**
 * Specialized prompt for Colombian cédula extraction
 */
const CEDULA_OCR_PROMPT = `You are an expert document OCR system specialized in Colombian cédula de ciudadanía extraction.

Analyze this cédula image and extract ALL visible information from both sides if available.

Extract the following fields and return as JSON:

{
  "fullName": "Full name (APELLIDOS NOMBRES)",
  "cedulaNumber": "Cédula number (10-digit number)",
  "birthDate": "Fecha de nacimiento (preserve format)",
  "placeOfBirth": "Lugar de nacimiento (Municipio, Departamento)",
  "bloodType": "Grupo sanguíneo (RH+ or RH-)",
  "sex": "Sexo (M or F)",
  "issueDate": "Fecha de expedición",
  "expiryDate": "Fecha de vencimiento if applicable"
}

CRITICAL INSTRUCTIONS:
- Extract EXACTLY as printed
- Cédula numbers are 10 digits, no spaces
- For dates, preserve the original format
- If a field is not visible, set to null
- Return ONLY valid JSON, no additional text`;

/**
 * Prompt to detect document type
 */
const DOCUMENT_TYPE_PROMPT = `Analyze this document image and determine what type of identity document it is.

Respond with ONLY ONE of these words:
- passport (if it's a passport)
- visa (if it's a visa sticker or visa page)
- cedula (if it's a Colombian cédula de ciudadanía)
- unknown (if you cannot determine the document type)

Return ONLY the single word, nothing else.`;

// ============================================================================
// ANTHROPIC CLIENT
// ============================================================================

let anthropicClient: Anthropic | null = null;

/**
 * Get or create Anthropic client (lazy initialization)
 */
function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new OCRError(
        'ANTHROPIC_API_KEY environment variable is not set',
        'API_ERROR',
        false
      );
    }
    anthropicClient = new Anthropic({ apiKey });
  }
  return anthropicClient;
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Custom error class for OCR operations
 */
export class OCRError extends Error {
  constructor(
    message: string,
    public code: OCRErrorCode,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'OCRError';
  }
}

/**
 * Execute function with retry logic and exponential backoff
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialBackoffMs?: number;
    maxBackoffMs?: number;
    onRetry?: (attempt: number, error: Error) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialBackoffMs = 1000,
    maxBackoffMs = 10000,
    onRetry,
  } = options;

  let lastError: Error = new Error('Unknown error');

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry if error is not retryable
      if (error instanceof OCRError && !error.retryable) {
        throw error;
      }

      // Check if it's a rate limit error (retryable)
      if (error instanceof Error && error.message.includes('rate_limit')) {
        lastError = new OCRError(error.message, 'RATE_LIMIT', true);
      }

      // Last attempt - throw
      if (attempt >= maxRetries - 1) {
        break;
      }

      // Calculate backoff with jitter
      const backoff = Math.min(
        initialBackoffMs * Math.pow(2, attempt) + Math.random() * 1000,
        maxBackoffMs
      );

      if (onRetry) {
        onRetry(attempt + 1, lastError);
      }

      console.log(
        `[document-ocr] Retry ${attempt + 1}/${maxRetries} after ${backoff}ms:`,
        lastError.message
      );

      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }

  throw lastError;
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Detect document type from image
 */
export async function detectDocumentType(
  imageBuffer: Buffer,
  mimeType: SupportedMimeType
): Promise<DocumentType> {
  const anthropic = getAnthropicClient();
  const base64Image = imageBuffer.toString('base64');

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 50,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType,
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: DOCUMENT_TYPE_PROMPT,
            },
          ],
        },
      ],
    });

    const responseText =
      response.content[0].type === 'text'
        ? response.content[0].text.trim().toLowerCase()
        : 'unknown';

    if (['passport', 'visa', 'cedula'].includes(responseText)) {
      return responseText as DocumentType;
    }

    return 'unknown';
  } catch (error) {
    console.error('[document-ocr] Document type detection failed:', error);
    return 'unknown';
  }
}

/**
 * Extract data from passport image
 *
 * @param imageBuffer - Image file as Buffer
 * @param mimeType - MIME type of the image
 * @returns OCRResult with extracted passport data
 */
export async function extractPassportData(
  imageBuffer: Buffer,
  mimeType: SupportedMimeType
): Promise<OCRResult> {
  const startTime = Date.now();

  try {
    const anthropic = getAnthropicClient();
    const base64Image = imageBuffer.toString('base64');

    // Call Claude Vision API with retry
    const response = await withRetry(
      async () => {
        return anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          temperature: 0, // Deterministic for OCR
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: mimeType,
                    data: base64Image,
                  },
                },
                {
                  type: 'text',
                  text: PASSPORT_OCR_PROMPT,
                },
              ],
            },
          ],
        });
      },
      {
        maxRetries: 3,
        onRetry: (attempt, error) => {
          console.log(`[document-ocr] Passport OCR retry ${attempt}:`, error.message);
        },
      }
    );

    const extractedText =
      response.content[0].type === 'text' ? response.content[0].text : '';

    // Parse JSON response
    const { data, confidence, fieldConfidences } = parsePassportJSON(extractedText);

    const processingTimeMs = Date.now() - startTime;

    console.log('[document-ocr] Passport extraction complete:', {
      success: data !== null,
      confidence,
      processingTimeMs,
      fieldsExtracted: fieldConfidences.filter((f) => f.value !== null).length,
    });

    return {
      success: data !== null,
      documentType: 'passport',
      extractedText,
      passportData: data,
      visaData: null,
      cedulaData: null,
      confidence,
      fieldConfidences,
      processingTimeMs,
    };
  } catch (error) {
    const processingTimeMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown OCR error';
    const errorCode =
      error instanceof OCRError ? error.code : 'API_ERROR';

    console.error('[document-ocr] Passport extraction failed:', {
      error: errorMessage,
      processingTimeMs,
    });

    return {
      success: false,
      documentType: 'passport',
      extractedText: '',
      passportData: null,
      visaData: null,
      cedulaData: null,
      confidence: 0,
      fieldConfidences: [],
      processingTimeMs,
      error: errorMessage,
      errorCode,
    };
  }
}

/**
 * Extract data from visa image
 */
export async function extractVisaData(
  imageBuffer: Buffer,
  mimeType: SupportedMimeType
): Promise<OCRResult> {
  const startTime = Date.now();

  try {
    const anthropic = getAnthropicClient();
    const base64Image = imageBuffer.toString('base64');

    const response = await withRetry(async () => {
      return anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        temperature: 0,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimeType,
                  data: base64Image,
                },
              },
              {
                type: 'text',
                text: VISA_OCR_PROMPT,
              },
            ],
          },
        ],
      });
    });

    const extractedText =
      response.content[0].type === 'text' ? response.content[0].text : '';

    const { data, confidence, fieldConfidences } = parseVisaJSON(extractedText);

    const processingTimeMs = Date.now() - startTime;

    return {
      success: data !== null,
      documentType: 'visa',
      extractedText,
      passportData: null,
      visaData: data,
      cedulaData: null,
      confidence,
      fieldConfidences,
      processingTimeMs,
    };
  } catch (error) {
    const processingTimeMs = Date.now() - startTime;

    return {
      success: false,
      documentType: 'visa',
      extractedText: '',
      passportData: null,
      visaData: null,
      cedulaData: null,
      confidence: 0,
      fieldConfidences: [],
      processingTimeMs,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorCode: error instanceof OCRError ? error.code : 'API_ERROR',
    };
  }
}

/**
 * Extract data from Colombian cédula image
 */
export async function extractCedulaData(
  imageBuffer: Buffer,
  mimeType: SupportedMimeType
): Promise<OCRResult> {
  const startTime = Date.now();

  try {
    const anthropic = getAnthropicClient();
    const base64Image = imageBuffer.toString('base64');

    const response = await withRetry(async () => {
      return anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        temperature: 0,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimeType,
                  data: base64Image,
                },
              },
              {
                type: 'text',
                text: CEDULA_OCR_PROMPT,
              },
            ],
          },
        ],
      });
    });

    const extractedText =
      response.content[0].type === 'text' ? response.content[0].text : '';

    const { data, confidence, fieldConfidences } = parseCedulaJSON(extractedText);

    const processingTimeMs = Date.now() - startTime;

    return {
      success: data !== null,
      documentType: 'cedula',
      extractedText,
      passportData: null,
      visaData: null,
      cedulaData: data,
      confidence,
      fieldConfidences,
      processingTimeMs,
    };
  } catch (error) {
    const processingTimeMs = Date.now() - startTime;

    return {
      success: false,
      documentType: 'cedula',
      extractedText: '',
      passportData: null,
      visaData: null,
      cedulaData: null,
      confidence: 0,
      fieldConfidences: [],
      processingTimeMs,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorCode: error instanceof OCRError ? error.code : 'API_ERROR',
    };
  }
}

/**
 * Auto-detect document type and extract data
 *
 * @param imageBuffer - Image file as Buffer
 * @param mimeType - MIME type of the image
 * @returns OCRResult with extracted data based on detected document type
 */
export async function extractDocumentData(
  imageBuffer: Buffer,
  mimeType: SupportedMimeType
): Promise<OCRResult> {
  // First, detect document type
  const documentType = await detectDocumentType(imageBuffer, mimeType);

  console.log('[document-ocr] Detected document type:', documentType);

  // Extract based on type
  switch (documentType) {
    case 'passport':
      return extractPassportData(imageBuffer, mimeType);
    case 'visa':
      return extractVisaData(imageBuffer, mimeType);
    case 'cedula':
      return extractCedulaData(imageBuffer, mimeType);
    default:
      // Try passport extraction as fallback
      console.log('[document-ocr] Unknown document type, attempting passport extraction');
      return extractPassportData(imageBuffer, mimeType);
  }
}

// ============================================================================
// JSON PARSING HELPERS
// ============================================================================

/**
 * Parse passport JSON from Claude response
 */
function parsePassportJSON(text: string): {
  data: PassportData | null;
  confidence: number;
  fieldConfidences: FieldConfidence[];
} {
  const fieldConfidences: FieldConfidence[] = [];

  try {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch =
      text.match(/```json\n?([\s\S]*?)\n?```/) ||
      text.match(/```\n?([\s\S]*?)\n?```/) ||
      text.match(/(\{[\s\S]*\})/);

    if (!jsonMatch) {
      console.error('[document-ocr] No JSON found in response');
      return { data: null, confidence: 0, fieldConfidences: [] };
    }

    const jsonStr = jsonMatch[1] || jsonMatch[0];
    const parsed = JSON.parse(jsonStr);

    // Build PassportData with field confidences
    const data: PassportData = {
      fullName: parsed.fullName || null,
      passportNumber: parsed.passportNumber || null,
      nationality: parsed.nationality || null,
      birthDate: parsed.birthDate || null,
      expiryDate: parsed.expiryDate || null,
      sex: parsed.sex || null,
      placeOfBirth: parsed.placeOfBirth || null,
      issueDate: parsed.issueDate || null,
      issuingAuthority: parsed.issuingAuthority || null,
      mrz: parsed.mrz || undefined,
    };

    // Calculate field confidences
    const fields = [
      'fullName',
      'passportNumber',
      'nationality',
      'birthDate',
      'expiryDate',
      'sex',
      'placeOfBirth',
      'issueDate',
      'issuingAuthority',
    ] as const;

    for (const field of fields) {
      const value = data[field];
      const hasMRZ = data.mrz && data.mrz.length > 0;

      // Higher confidence if MRZ is present (MRZ data is more reliable)
      const baseConfidence = value !== null ? (hasMRZ ? 0.95 : 0.85) : 0;

      fieldConfidences.push({
        field,
        value: value as string | null,
        confidence: baseConfidence,
        source: hasMRZ ? 'mrz' : 'visual',
      });
    }

    // Calculate overall confidence
    const filledFields = fieldConfidences.filter((f) => f.value !== null).length;
    const totalFields = fields.length;
    const confidence = filledFields / totalFields;

    return { data, confidence, fieldConfidences };
  } catch (error) {
    console.error('[document-ocr] JSON parse error:', error);
    return { data: null, confidence: 0, fieldConfidences: [] };
  }
}

/**
 * Parse visa JSON from Claude response
 */
function parseVisaJSON(text: string): {
  data: VisaData | null;
  confidence: number;
  fieldConfidences: FieldConfidence[];
} {
  const fieldConfidences: FieldConfidence[] = [];

  try {
    const jsonMatch =
      text.match(/```json\n?([\s\S]*?)\n?```/) ||
      text.match(/```\n?([\s\S]*?)\n?```/) ||
      text.match(/(\{[\s\S]*\})/);

    if (!jsonMatch) {
      return { data: null, confidence: 0, fieldConfidences: [] };
    }

    const jsonStr = jsonMatch[1] || jsonMatch[0];
    const parsed = JSON.parse(jsonStr);

    const data: VisaData = {
      visaType: parsed.visaType || null,
      visaNumber: parsed.visaNumber || null,
      issueDate: parsed.issueDate || null,
      expiryDate: parsed.expiryDate || null,
      entries: parsed.entries || null,
      duration: parsed.duration || null,
      issuingAuthority: parsed.issuingAuthority || null,
    };

    const fields = [
      'visaType',
      'visaNumber',
      'issueDate',
      'expiryDate',
      'entries',
      'duration',
      'issuingAuthority',
    ] as const;

    for (const field of fields) {
      const value = data[field];
      fieldConfidences.push({
        field,
        value,
        confidence: value !== null ? 0.85 : 0,
        source: 'visual',
      });
    }

    const filledFields = fieldConfidences.filter((f) => f.value !== null).length;
    const confidence = filledFields / fields.length;

    return { data, confidence, fieldConfidences };
  } catch (error) {
    console.error('[document-ocr] Visa JSON parse error:', error);
    return { data: null, confidence: 0, fieldConfidences: [] };
  }
}

/**
 * Parse cédula JSON from Claude response
 */
function parseCedulaJSON(text: string): {
  data: CedulaData | null;
  confidence: number;
  fieldConfidences: FieldConfidence[];
} {
  const fieldConfidences: FieldConfidence[] = [];

  try {
    const jsonMatch =
      text.match(/```json\n?([\s\S]*?)\n?```/) ||
      text.match(/```\n?([\s\S]*?)\n?```/) ||
      text.match(/(\{[\s\S]*\})/);

    if (!jsonMatch) {
      return { data: null, confidence: 0, fieldConfidences: [] };
    }

    const jsonStr = jsonMatch[1] || jsonMatch[0];
    const parsed = JSON.parse(jsonStr);

    const data: CedulaData = {
      fullName: parsed.fullName || null,
      cedulaNumber: parsed.cedulaNumber || null,
      birthDate: parsed.birthDate || null,
      placeOfBirth: parsed.placeOfBirth || null,
      bloodType: parsed.bloodType || null,
      sex: parsed.sex || null,
      issueDate: parsed.issueDate || null,
      expiryDate: parsed.expiryDate || null,
    };

    const fields = [
      'fullName',
      'cedulaNumber',
      'birthDate',
      'placeOfBirth',
      'bloodType',
      'sex',
      'issueDate',
      'expiryDate',
    ] as const;

    for (const field of fields) {
      const value = data[field];
      fieldConfidences.push({
        field,
        value,
        confidence: value !== null ? 0.85 : 0,
        source: 'visual',
      });
    }

    const filledFields = fieldConfidences.filter((f) => f.value !== null).length;
    const confidence = filledFields / fields.length;

    return { data, confidence, fieldConfidences };
  } catch (error) {
    console.error('[document-ocr] Cédula JSON parse error:', error);
    return { data: null, confidence: 0, fieldConfidences: [] };
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Validate MIME type is supported for OCR
 */
export function isValidMimeType(mimeType: string): mimeType is SupportedMimeType {
  const supportedTypes: SupportedMimeType[] = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
  ];
  return supportedTypes.includes(mimeType as SupportedMimeType);
}

/**
 * Get MIME type from file extension
 */
export function getMimeTypeFromExtension(filename: string): SupportedMimeType | null {
  const ext = filename.toLowerCase().split('.').pop();
  const mimeMap: Record<string, SupportedMimeType> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
  };
  return mimeMap[ext || ''] || null;
}

/**
 * Validate image buffer size
 * Claude Vision API has limits on image size
 */
export function validateImageSize(
  buffer: Buffer,
  maxSizeMB: number = 20
): { valid: boolean; error?: string } {
  const sizeMB = buffer.length / (1024 * 1024);

  if (sizeMB > maxSizeMB) {
    return {
      valid: false,
      error: `Image size ${sizeMB.toFixed(1)}MB exceeds maximum ${maxSizeMB}MB`,
    };
  }

  if (buffer.length < 1000) {
    return {
      valid: false,
      error: 'Image file appears to be empty or corrupted',
    };
  }

  return { valid: true };
}
