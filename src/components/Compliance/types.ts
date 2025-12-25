/**
 * Shared types for SIRE Compliance components
 *
 * Used by:
 * - DocumentUpload.tsx
 * - DocumentPreview.tsx (FASE 2.4)
 * - GuestChatInterface.tsx (FASE 2.7)
 */

import type { FieldExtractionResult } from '@/lib/sire/field-extraction';

export interface DocumentExtractionResult {
  success: boolean;
  id?: string;
  file_url?: string;
  extracted_data?: FieldExtractionResult;
  validation?: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
  processing_time_ms?: number;
  error?: string;
  code?: string;
  details?: string;
}

export interface SireField {
  key: string;
  label: string;
  value: string | null;
  confidence?: number;
  isRequired: boolean;
  isComplete: boolean;
}

export interface SireProgressState {
  totalFields: number;
  completedFields: number;
  percentage: number;
  fields: SireField[];
  nextFieldToAsk: string | null;
}

export type SireFieldStatus = 'empty' | 'partial' | 'complete' | 'confirmed';

export type DocumentType = 'passport' | 'visa' | 'national_id';
