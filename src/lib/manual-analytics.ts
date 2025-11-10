/**
 * Manual Analytics Tracking Helper
 *
 * Client-side helper to log analytics events for accommodation manuals
 */

interface LogEventParams {
  manualId: string | null
  tenantId: string
  unitId: string
  eventType: 'upload' | 'view' | 'search_hit' | 'delete'
  metadata?: Record<string, any>
}

/**
 * Log an analytics event for a manual
 * Fires asynchronously without blocking the UI
 */
export async function logManualEvent(params: LogEventParams): Promise<void> {
  const { manualId, tenantId, unitId, eventType, metadata = {} } = params

  try {
    // Fire and forget - don't block UI
    fetch('/api/accommodation-manuals/analytics/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('staff_token')}`
      },
      body: JSON.stringify({
        manual_id: manualId,
        tenant_id: tenantId,
        accommodation_unit_id: unitId,
        event_type: eventType,
        metadata
      })
    }).catch(err => {
      // Silent fail - analytics shouldn't break app
      console.warn('[Analytics] Failed to log event:', err)
    })
  } catch (error) {
    // Silent fail
    console.warn('[Analytics] Error logging event:', error)
  }
}
