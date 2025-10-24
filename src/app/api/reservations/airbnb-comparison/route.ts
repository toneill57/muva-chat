/**
 * Airbnb Comparison API Endpoint
 *
 * Compares Airbnb reservations from two sources:
 * 1. Direct ICS sync (calendar_events with source='airbnb')
 * 2. MotoPress-synced Airbnb (airbnb_motopress_comparison)
 *
 * Purpose: Double-check data integrity and detect discrepancies
 *
 * GET /api/reservations/airbnb-comparison
 * - Compares both sources and returns matches/discrepancies
 * - Updates matched_with_ics flag when matches are found
 * - Calculates confidence scores for matches
 * - Detects differences in prices, dates, capacity
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { verifyStaffToken, extractTokenFromHeader } from '@/lib/staff-auth'

// ============================================================================
// Types
// ============================================================================

interface CalendarEvent {
  id: string
  accommodation_unit_id: string
  start_date: string
  end_date: string
  summary: string
  adults?: number
  children?: number
  total_price?: number
  currency?: string
  guest_name?: string
  external_uid?: string
}

interface MotoPressComparison {
  id: string
  motopress_booking_id: string
  accommodation_unit_id: string
  check_in_date: string
  check_out_date: string
  adults: number
  children: number
  total_price?: number
  currency: string
  matched_with_ics: boolean
  ics_event_id?: string
}

interface Match {
  ics_event_id: string
  motopress_comparison_id: string
  confidence: number
  discrepancies: Discrepancy[]
  matched_on: string[]  // ['dates', 'unit', 'capacity']
}

interface Discrepancy {
  field: string
  ics_value: any
  motopress_value: any
  severity: 'minor' | 'major'
}

interface ComparisonResult {
  success: boolean
  tenant: {
    id: string
    name: string
  }
  stats: {
    total_ics_events: number
    total_motopress_comparisons: number
    matches_found: number
    unmatched_ics: number
    unmatched_motopress: number
    high_confidence_matches: number
    discrepancies_detected: number
  }
  matches: Match[]
  unmatched_ics: CalendarEvent[]
  unmatched_motopress: MotoPressComparison[]
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate match confidence score based on field similarities
 */
function calculateConfidence(
  icsEvent: CalendarEvent,
  mpComparison: MotoPressComparison
): { confidence: number; matchedOn: string[]; discrepancies: Discrepancy[] } {
  let score = 0
  const maxScore = 100
  const matchedOn: string[] = []
  const discrepancies: Discrepancy[] = []

  // Dates match (40 points - most important)
  if (icsEvent.start_date === mpComparison.check_in_date &&
      icsEvent.end_date === mpComparison.check_out_date) {
    score += 40
    matchedOn.push('dates')
  } else {
    discrepancies.push({
      field: 'dates',
      ics_value: `${icsEvent.start_date} to ${icsEvent.end_date}`,
      motopress_value: `${mpComparison.check_in_date} to ${mpComparison.check_out_date}`,
      severity: 'major'
    })
  }

  // Unit matches (30 points)
  if (icsEvent.accommodation_unit_id === mpComparison.accommodation_unit_id) {
    score += 30
    matchedOn.push('unit')
  } else {
    discrepancies.push({
      field: 'accommodation_unit',
      ics_value: icsEvent.accommodation_unit_id,
      motopress_value: mpComparison.accommodation_unit_id,
      severity: 'major'
    })
  }

  // Capacity matches (15 points)
  const icsAdults = icsEvent.adults || 0
  const icsChildren = icsEvent.children || 0
  const mpAdults = mpComparison.adults || 0
  const mpChildren = mpComparison.children || 0

  if (icsAdults === mpAdults && icsChildren === mpChildren) {
    score += 15
    matchedOn.push('capacity')
  } else if (icsAdults + icsChildren === mpAdults + mpChildren) {
    score += 10  // Total guests match but not breakdown
    matchedOn.push('total_guests')
    discrepancies.push({
      field: 'capacity_breakdown',
      ics_value: `${icsAdults} adults, ${icsChildren} children`,
      motopress_value: `${mpAdults} adults, ${mpChildren} children`,
      severity: 'minor'
    })
  } else {
    discrepancies.push({
      field: 'capacity',
      ics_value: `${icsAdults} adults, ${icsChildren} children`,
      motopress_value: `${mpAdults} adults, ${mpChildren} children`,
      severity: 'major'
    })
  }

  // Price matches (15 points)
  if (icsEvent.total_price && mpComparison.total_price) {
    const priceDiff = Math.abs(icsEvent.total_price - mpComparison.total_price)
    const pricePercent = priceDiff / icsEvent.total_price

    if (priceDiff < 1) {
      score += 15
      matchedOn.push('price')
    } else if (pricePercent < 0.05) {
      score += 12  // Within 5%
      matchedOn.push('price_approximate')
      discrepancies.push({
        field: 'price',
        ics_value: icsEvent.total_price,
        motopress_value: mpComparison.total_price,
        severity: 'minor'
      })
    } else {
      discrepancies.push({
        field: 'price',
        ics_value: icsEvent.total_price,
        motopress_value: mpComparison.total_price,
        severity: 'major'
      })
    }
  }

  const confidence = score / maxScore

  return { confidence, matchedOn, discrepancies }
}

/**
 * Find best match for an ICS event from MotoPress comparisons
 */
function findBestMatch(
  icsEvent: CalendarEvent,
  mpComparisons: MotoPressComparison[]
): { match: MotoPressComparison | null; confidence: number; matchedOn: string[]; discrepancies: Discrepancy[] } {
  let bestMatch: MotoPressComparison | null = null
  let bestConfidence = 0
  let bestMatchedOn: string[] = []
  let bestDiscrepancies: Discrepancy[] = []

  for (const mpComp of mpComparisons) {
    const { confidence, matchedOn, discrepancies } = calculateConfidence(icsEvent, mpComp)

    if (confidence > bestConfidence) {
      bestMatch = mpComp
      bestConfidence = confidence
      bestMatchedOn = matchedOn
      bestDiscrepancies = discrepancies
    }
  }

  return {
    match: bestMatch,
    confidence: bestConfidence,
    matchedOn: bestMatchedOn,
    discrepancies: bestDiscrepancies
  }
}

// ============================================================================
// GET Handler
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()

    // Staff authentication
    const authHeader = request.headers.get('Authorization')
    const token = extractTokenFromHeader(authHeader)

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized - Missing token' }, { status: 401 })
    }

    const staffSession = await verifyStaffToken(token)

    if (!staffSession) {
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 })
    }

    const tenantId = staffSession.tenant_id

    console.log('[airbnb-comparison] Starting comparison for tenant:', tenantId)

    // Get tenant info
    const { data: tenant, error: tenantError } = await supabase
      .from('tenant_registry')
      .select('tenant_id, nombre_comercial')
      .eq('tenant_id', tenantId)
      .single()

    if (tenantError || !tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Fetch Airbnb events from ICS sync (calendar_events)
    const { data: icsEvents, error: icsError } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('source', 'airbnb')
      .eq('is_deleted', false)
      .gte('end_date', new Date().toISOString().split('T')[0])  // Future/current only
      .order('start_date', { ascending: true })

    if (icsError) {
      console.error('[airbnb-comparison] Error fetching ICS events:', icsError)
      return NextResponse.json({ error: 'Failed to fetch ICS events' }, { status: 500 })
    }

    // Fetch MotoPress-synced Airbnb reservations
    const { data: mpComparisons, error: mpError } = await supabase
      .from('airbnb_motopress_comparison')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('check_out_date', new Date().toISOString().split('T')[0])  // Future/current only
      .order('check_in_date', { ascending: true })

    if (mpError) {
      console.error('[airbnb-comparison] Error fetching MotoPress comparisons:', mpError)
      return NextResponse.json({ error: 'Failed to fetch MotoPress data' }, { status: 500 })
    }

    console.log(`[airbnb-comparison] Found ${icsEvents?.length || 0} ICS events, ${mpComparisons?.length || 0} MotoPress comparisons`)

    // Perform matching
    const matches: Match[] = []
    const unmatchedIcs: CalendarEvent[] = []
    const unmatchedMotoPress: MotoPressComparison[] = [...(mpComparisons || [])]

    for (const icsEvent of icsEvents || []) {
      const { match, confidence, matchedOn, discrepancies } = findBestMatch(
        icsEvent,
        unmatchedMotoPress
      )

      if (match && confidence >= 0.7) {  // 70% confidence threshold
        matches.push({
          ics_event_id: icsEvent.id,
          motopress_comparison_id: match.id,
          confidence,
          discrepancies,
          matched_on: matchedOn
        })

        // Remove matched MotoPress comparison from unmatched list
        const index = unmatchedMotoPress.findIndex(mp => mp.id === match.id)
        if (index > -1) {
          unmatchedMotoPress.splice(index, 1)
        }

        // Update matched_with_ics flag in database
        await supabase
          .from('airbnb_motopress_comparison')
          .update({
            matched_with_ics: true,
            ics_event_id: icsEvent.id,
            match_confidence: confidence,
            data_differences: discrepancies.length > 0 ? discrepancies : null
          })
          .eq('id', match.id)

      } else {
        unmatchedIcs.push(icsEvent)
      }
    }

    // Calculate statistics
    const highConfidenceMatches = matches.filter(m => m.confidence >= 0.9).length
    const totalDiscrepancies = matches.reduce((sum, m) => sum + m.discrepancies.length, 0)

    const result: ComparisonResult = {
      success: true,
      tenant: {
        id: tenant.tenant_id,
        name: tenant.nombre_comercial
      },
      stats: {
        total_ics_events: icsEvents?.length || 0,
        total_motopress_comparisons: mpComparisons?.length || 0,
        matches_found: matches.length,
        unmatched_ics: unmatchedIcs.length,
        unmatched_motopress: unmatchedMotoPress.length,
        high_confidence_matches: highConfidenceMatches,
        discrepancies_detected: totalDiscrepancies
      },
      matches,
      unmatched_ics: unmatchedIcs,
      unmatched_motopress: unmatchedMotoPress
    }

    console.log('[airbnb-comparison] Comparison complete:', {
      matches: matches.length,
      unmatched_ics: unmatchedIcs.length,
      unmatched_motopress: unmatchedMotoPress.length
    })

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('[airbnb-comparison] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}
