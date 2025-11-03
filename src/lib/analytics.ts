/**
 * Analytics Tracking Library
 *
 * Centralized analytics tracking for MuvaChat Public Chat.
 * Uses Plausible Analytics for privacy-friendly, lightweight tracking.
 *
 * @see https://plausible.io/docs/custom-event-goals
 */

type EventProps = Record<string, string | number | boolean | undefined>

/**
 * Check if window.plausible is available
 */
const isPlausibleAvailable = (): boolean => {
  return typeof window !== 'undefined' && typeof window.plausible === 'function'
}

/**
 * Generic event tracker
 * @param eventName - Name of the event (snake_case recommended)
 * @param props - Optional event properties
 */
export const trackEvent = (eventName: string, props?: EventProps): void => {
  if (!isPlausibleAvailable()) {
    console.log('[Analytics] Event:', eventName, props)
    return
  }

  try {
    window.plausible?.(eventName, { props })
  } catch (error) {
    console.error('[Analytics] Error tracking event:', error)
  }
}

/**
 * Track when user opens the chat bubble
 */
export const trackChatOpened = (): void => {
  trackEvent('chat_bubble_clicked')
}

/**
 * Track when user minimizes the chat
 */
export const trackChatMinimized = (): void => {
  trackEvent('chat_minimized')
}

/**
 * Track when user closes the chat
 */
export const trackChatClosed = (): void => {
  trackEvent('chat_closed')
}

/**
 * Track when user sends a message
 * @param sessionId - Current session ID
 * @param messageCount - Total messages sent in session
 */
export const trackMessageSent = (
  sessionId: string | null,
  messageCount: number
): void => {
  trackEvent('message_sent', {
    session_id: sessionId || 'no_session',
    message_count: messageCount,
  })
}

/**
 * Track when system captures travel intent
 * @param intent - Captured travel intent object
 */
export const trackIntentCaptured = (intent: {
  check_in_date?: string
  check_out_date?: string
  num_guests?: number
  accommodation_type?: string
}): void => {
  trackEvent('intent_captured', {
    has_dates: !!(intent.check_in_date && intent.check_out_date),
    has_guests: !!intent.num_guests,
    has_type: !!intent.accommodation_type,
    guests: intent.num_guests,
  })
}

/**
 * Track when user clicks "Check Availability" CTA
 * @param availabilityUrl - URL of the booking page
 * @param sessionId - Current session ID
 */
export const trackAvailabilityCTAClick = (
  availabilityUrl: string,
  sessionId: string | null
): void => {
  trackEvent('availability_cta_clicked', {
    availability_url: availabilityUrl,
    session_id: sessionId || 'no_session',
  })
}

/**
 * Track when user clicks a suggestion chip
 * @param suggestion - Text of the clicked suggestion
 */
export const trackSuggestionClick = (suggestion: string): void => {
  trackEvent('suggestion_clicked', {
    suggestion_text: suggestion.substring(0, 50), // Truncate for privacy
  })
}

/**
 * Track when an error occurs in the chat
 * @param errorType - Type of error (api_error, network_error, etc.)
 * @param errorMessage - Optional error message
 */
export const trackChatError = (
  errorType: string,
  errorMessage?: string
): void => {
  trackEvent('chat_error', {
    error_type: errorType,
    error_message: errorMessage?.substring(0, 100), // Truncate for privacy
  })
}

/**
 * Track page view (handled automatically by Plausible, but can be called manually)
 * @param path - Optional custom path
 */
export const trackPageView = (path?: string): void => {
  if (!isPlausibleAvailable()) {
    console.log('[Analytics] Page view:', path || window.location.pathname)
    return
  }

  try {
    if (path) {
      window.plausible?.('pageview', { props: { path } })
    } else {
      window.plausible?.('pageview')
    }
  } catch (error) {
    console.error('[Analytics] Error tracking page view:', error)
  }
}

/**
 * Type augmentation for window.plausible
 */
declare global {
  interface Window {
    plausible?: (
      eventName: string,
      options?: { props?: Record<string, string | number | boolean | undefined> }
    ) => void
  }
}
