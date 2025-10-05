/**
 * Compliance Submission Status API
 *
 * GET /api/compliance/status/:submissionId
 *
 * Check status of a compliance submission.
 *
 * Returns:
 * - Submission status (submitted/failed/pending)
 * - SIRE reference number
 * - TRA reference number (if applicable)
 * - Error details (if failed)
 * - Screenshot (if available)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

interface RouteParams {
  params: Promise<{
    submissionId: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  console.log('[compliance-status-api] GET /api/compliance/status/:submissionId');

  try {
    const supabase = createServerClient();

    // Await params (Next.js 15 async params)
    const { submissionId } = await params;

    console.log('[compliance-status-api] Fetching submission:', submissionId);

    // ========================================================================
    // STEP 1: Fetch submission from database
    // ========================================================================

    const { data: submission, error: fetchError } = await supabase
      .from('compliance_submissions')
      .select(`
        id,
        conversation_id,
        tenant_id,
        conversational_data,
        sire_data,
        sire_status,
        sire_reference_number,
        sire_error,
        sire_screenshot,
        tra_status,
        tra_reference_number,
        tra_error,
        submitted_at,
        metadata,
        created_at,
        updated_at
      `)
      .eq('id', submissionId)
      .single();

    if (fetchError || !submission) {
      console.error('[compliance-status-api] Submission not found:', fetchError);

      return NextResponse.json(
        {
          error: 'Submission not found',
          details: fetchError?.message
        },
        { status: 404 }
      );
    }

    // ========================================================================
    // STEP 2: Build response
    // ========================================================================

    const response = {
      id: submission.id,
      conversation_id: submission.conversation_id,
      tenant_id: submission.tenant_id,

      // Conversational data (what user submitted)
      conversational_data: submission.conversational_data,

      // SIRE status
      sire: {
        status: submission.sire_status,
        reference_number: submission.sire_reference_number,
        error: submission.sire_error,
        screenshot_available: !!submission.sire_screenshot,
        screenshot: submission.sire_screenshot, // Base64 (can be large)
      },

      // TRA status (optional)
      tra: submission.tra_status ? {
        status: submission.tra_status,
        reference_number: submission.tra_reference_number,
        error: submission.tra_error,
      } : null,

      // Timestamps
      submitted_at: submission.submitted_at,
      created_at: submission.created_at,
      updated_at: submission.updated_at,

      // Metadata
      metadata: submission.metadata,
    };

    console.log('[compliance-status-api] Submission found:', {
      id: submission.id,
      sire_status: submission.sire_status,
      sire_reference: submission.sire_reference_number,
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('[compliance-status-api] Unexpected error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/compliance/status/:submissionId
 *
 * Update submission status (admin only)
 *
 * Use cases:
 * - Manual retry of failed submission
 * - Update reference number manually
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  console.log('[compliance-status-api] PATCH /api/compliance/status/:submissionId');

  try {
    const supabase = createServerClient();

    // Await params
    const { submissionId } = await params;

    // Parse request body
    const body = await request.json();
    const {
      sire_status,
      sire_reference_number,
      sire_error,
      tra_status,
      tra_reference_number,
      tra_error
    } = body;

    console.log('[compliance-status-api] Updating submission:', {
      submissionId,
      updates: Object.keys(body)
    });

    // Build update object
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString()
    };

    if (sire_status !== undefined) updates.sire_status = sire_status;
    if (sire_reference_number !== undefined) updates.sire_reference_number = sire_reference_number;
    if (sire_error !== undefined) updates.sire_error = sire_error;
    if (tra_status !== undefined) updates.tra_status = tra_status;
    if (tra_reference_number !== undefined) updates.tra_reference_number = tra_reference_number;
    if (tra_error !== undefined) updates.tra_error = tra_error;

    // Update submission
    const { data: submission, error: updateError } = await supabase
      .from('compliance_submissions')
      .update(updates)
      .eq('id', submissionId)
      .select()
      .single();

    if (updateError || !submission) {
      console.error('[compliance-status-api] Update failed:', updateError);

      return NextResponse.json(
        {
          error: 'Failed to update submission',
          details: updateError?.message
        },
        { status: 500 }
      );
    }

    console.log('[compliance-status-api] Submission updated:', {
      id: submission.id,
      sire_status: submission.sire_status,
    });

    return NextResponse.json({
      success: true,
      submission: {
        id: submission.id,
        sire_status: submission.sire_status,
        sire_reference_number: submission.sire_reference_number,
        tra_status: submission.tra_status,
        tra_reference_number: submission.tra_reference_number,
        updated_at: submission.updated_at,
      }
    });

  } catch (error) {
    console.error('[compliance-status-api] Unexpected error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
