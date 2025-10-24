/**
 * ICS Parser Service
 * Parses and validates ICS/iCalendar files for MUVA Chat
 * Supports multiple OTA platforms (Airbnb, Booking.com, VRBO, etc.)
 */

import ical from 'node-ical'
import { z } from 'zod'
import { SupabaseClient } from '@supabase/supabase-js'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Parsed calendar event from ICS
 */
export interface ParsedCalendarEvent {
  uid: string
  summary: string
  description?: string
  startDate: Date
  endDate: Date
  location?: string
  url?: string
  sequence?: number
  lastModified?: Date
  created?: Date
  status?: string
  organizer?: string
  attendees?: string[]
  rrule?: any // Recurring rule if present
  categories?: string[]
  // Custom fields from different platforms
  customFields?: Record<string, any>
}

/**
 * Source detection result
 */
export interface SourceDetection {
  platform: CalendarSource
  confidence: number // 0-100
  metadata: {
    uidPrefix?: string
    prodId?: string
    customHeaders?: Record<string, string>
  }
}

/**
 * Calendar source platforms
 */
export type CalendarSource =
  | 'airbnb'
  | 'booking.com'
  | 'vrbo'
  | 'motopress'
  | 'motopress_api'
  | 'manual'
  | 'generic_ics'

/**
 * Event type classification
 */
export type EventType =
  | 'reservation'
  | 'block'
  | 'maintenance'
  | 'parent_block'

/**
 * Parser configuration
 */
export interface ICSParserConfig {
  strictMode?: boolean // Reject non-compliant ICS
  timezone?: string // Default timezone for date conversion
  maxEvents?: number // Limit for performance
  timeout?: number // HTTP timeout in ms
  detectSource?: boolean // Auto-detect platform
  expandRecurring?: boolean // Expand RRULE events
  dateRangeFilter?: {
    start: Date
    end: Date
  }
}

/**
 * Parse result with metadata
 */
export interface ParseResult {
  events: ParsedCalendarEvent[]
  source: SourceDetection
  metadata: {
    totalEvents: number
    parsedEvents: number
    skippedEvents: number
    errors: Array<{ event: string; error: string }>
    warnings: Array<{ event: string; warning: string }>
    calendarName?: string
    calendarDescription?: string
    calendarTimezone?: string
  }
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

/**
 * Zod schema for validating parsed events
 */
const CalendarEventSchema = z.object({
  uid: z.string().min(1),
  summary: z.string(),
  startDate: z.date(),
  endDate: z.date(),
  description: z.string().optional(),
  location: z.string().optional(),
  url: z.string().url().optional(),
  sequence: z.number().optional(),
  lastModified: z.date().optional(),
  created: z.date().optional(),
  status: z.string().optional(),
  organizer: z.string().optional(),
  attendees: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  customFields: z.record(z.any()).optional()
})

// ============================================================================
// ICS PARSER CLASS
// ============================================================================

export class ICSParser {
  private config: Required<ICSParserConfig>

  constructor(config: ICSParserConfig = {}) {
    this.config = {
      strictMode: config.strictMode ?? false,
      timezone: config.timezone ?? 'America/Bogota',
      maxEvents: config.maxEvents ?? 10000,
      timeout: config.timeout ?? 30000,
      detectSource: config.detectSource ?? true,
      expandRecurring: config.expandRecurring ?? true,
      dateRangeFilter: config.dateRangeFilter ?? {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        end: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000) // 2 years future
      }
    }
  }

  /**
   * Parse ICS content from string
   */
  async parseContent(icsContent: string): Promise<ParseResult> {
    const errors: Array<{ event: string; error: string }> = []
    const warnings: Array<{ event: string; warning: string }> = []
    const parsedEvents: ParsedCalendarEvent[] = []

    try {
      // Parse ICS content
      const data = ical.parseICS(icsContent)

      // Detect source platform
      const source = this.detectSource(icsContent, data)

      // Extract calendar metadata
      const metadata = this.extractCalendarMetadata(data)

      // Process each component
      let totalEvents = 0
      let skippedEvents = 0

      for (const [key, component] of Object.entries(data)) {
        if (component.type === 'VEVENT') {
          totalEvents++

          // Apply max events limit
          if (parsedEvents.length >= this.config.maxEvents) {
            warnings.push({
              event: key,
              warning: `Maximum events limit reached (${this.config.maxEvents})`
            })
            skippedEvents++
            continue
          }

          try {
            const event = this.parseEvent(component, source.platform)

            // Apply date range filter
            if (this.isWithinDateRange(event)) {
              parsedEvents.push(event)
            } else {
              skippedEvents++
            }

            // Handle recurring events
            if (this.config.expandRecurring && component.rrule) {
              const expandedEvents = this.expandRecurringEvent(event, component.rrule)
              parsedEvents.push(...expandedEvents)
            }
          } catch (error) {
            errors.push({
              event: key,
              error: error instanceof Error ? error.message : String(error)
            })

            if (this.config.strictMode) {
              throw error
            }
          }
        }
      }

      return {
        events: parsedEvents,
        source,
        metadata: {
          totalEvents,
          parsedEvents: parsedEvents.length,
          skippedEvents,
          errors,
          warnings,
          ...metadata
        }
      }
    } catch (error) {
      throw new Error(`Failed to parse ICS content: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Parse ICS from URL with HTTP optimization
   */
  async parseFromURL(
    url: string,
    etag?: string,
    lastModified?: string
  ): Promise<ParseResult & { notModified?: boolean; newEtag?: string; newLastModified?: string }> {
    try {
      // Build headers for conditional request
      const headers: Record<string, string> = {}
      if (etag) headers['If-None-Match'] = etag
      if (lastModified) headers['If-Modified-Since'] = lastModified

      // Fetch with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

      const response = await fetch(url, {
        headers,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      // Handle 304 Not Modified
      if (response.status === 304) {
        return {
          events: [],
          source: { platform: 'generic_ics', confidence: 0, metadata: {} },
          metadata: {
            totalEvents: 0,
            parsedEvents: 0,
            skippedEvents: 0,
            errors: [],
            warnings: []
          },
          notModified: true
        }
      }

      // Check response status
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      // Get response text
      const icsContent = await response.text()

      // Parse content
      const result = await this.parseContent(icsContent)

      // Add HTTP metadata
      return {
        ...result,
        notModified: false,
        newEtag: response.headers.get('ETag') || undefined,
        newLastModified: response.headers.get('Last-Modified') || undefined
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.config.timeout}ms`)
      }
      throw error
    }
  }

  /**
   * Parse a single event component
   */
  private parseEvent(component: any, platform: CalendarSource): ParsedCalendarEvent {
    // Extract base fields
    const event: ParsedCalendarEvent = {
      uid: component.uid || this.generateUID(),
      summary: component.summary || 'Untitled Event',
      startDate: this.normalizeDate(component.start),
      endDate: this.normalizeDate(component.end)
    }

    // Optional fields
    if (component.description) event.description = component.description
    if (component.location) event.location = component.location
    if (component.url) event.url = component.url
    if (component.sequence) event.sequence = component.sequence
    if (component.lastmodified) event.lastModified = this.normalizeDate(component.lastmodified)
    if (component.created) event.created = this.normalizeDate(component.created)
    if (component.status) event.status = component.status
    if (component.organizer) event.organizer = this.extractOrganizer(component.organizer)
    if (component.attendee) event.attendees = this.extractAttendees(component.attendee)
    if (component.categories) event.categories = Array.isArray(component.categories) ? component.categories : [component.categories]
    if (component.rrule) event.rrule = component.rrule

    // Extract platform-specific fields
    event.customFields = this.extractCustomFields(component, platform)

    // Validate if in strict mode
    if (this.config.strictMode) {
      CalendarEventSchema.parse(event)
    }

    return event
  }

  /**
   * Detect the source platform from ICS content and parsed data
   */
  private detectSource(content: string, data: any): SourceDetection {
    // Check for Airbnb patterns
    if (content.includes('@airbnb.com') || content.includes('airbnb.com/hosting')) {
      // Detect UID prefix patterns
      const uidMatch = content.match(/UID:([a-f0-9]{12})-/i)
      const prefix = uidMatch?.[1]

      return {
        platform: 'airbnb',
        confidence: 99,
        metadata: {
          uidPrefix: prefix,
          prodId: data.prodid
        }
      }
    }

    // Check for Booking.com patterns
    if (content.includes('@booking.com') || content.includes('PRODID.*Booking\\.com')) {
      return {
        platform: 'booking.com',
        confidence: 95,
        metadata: {
          prodId: data.prodid
        }
      }
    }

    // Check for VRBO patterns
    if (content.includes('@vrbo.com') || content.includes('X-VRBO')) {
      return {
        platform: 'vrbo',
        confidence: 95,
        metadata: {
          prodId: data.prodid
        }
      }
    }

    // Check for MotoPress patterns
    if (content.includes('MotoPress') || content.includes('X-MOTOPRESS')) {
      return {
        platform: 'motopress',
        confidence: 98,
        metadata: {
          prodId: data.prodid
        }
      }
    }

    // Default to generic
    return {
      platform: 'generic_ics',
      confidence: 50,
      metadata: {
        prodId: data.prodid
      }
    }
  }

  /**
   * Extract calendar-level metadata
   */
  private extractCalendarMetadata(data: any): {
    calendarName?: string
    calendarDescription?: string
    calendarTimezone?: string
  } {
    const metadata: any = {}

    // Look for calendar properties
    for (const [key, value] of Object.entries(data)) {
      if (value && typeof value === 'object' && 'type' in value) {
        if (value.type === 'VCALENDAR') {
          const calObj = value as any
          if (calObj['x-wr-calname']) metadata.calendarName = calObj['x-wr-calname']
          if (calObj['x-wr-caldesc']) metadata.calendarDescription = calObj['x-wr-caldesc']
          if (calObj['x-wr-timezone']) metadata.calendarTimezone = calObj['x-wr-timezone']
        }
      }
    }

    return metadata
  }

  /**
   * Extract custom fields based on platform
   */
  private extractCustomFields(component: any, platform: CalendarSource): Record<string, any> {
    const custom: Record<string, any> = {}

    // Extract all X- properties
    for (const [key, value] of Object.entries(component)) {
      if (key.startsWith('x-')) {
        custom[key] = value
      }
    }

    // Platform-specific extraction
    switch (platform) {
      case 'airbnb':
        // Extract reservation code from description
        if (component.description) {
          const codeMatch = component.description.match(/([A-Z0-9]{10,})/)?.[1]
          if (codeMatch) custom.reservationCode = codeMatch

          const phoneMatch = component.description.match(/(\d{4})$/)?.[1]
          if (phoneMatch) custom.phoneLast4 = phoneMatch
        }
        break

      case 'booking.com':
        // Extract booking reference
        if (component.description) {
          const refMatch = component.description.match(/Booking Reference:\s*(\w+)/)?.[1]
          if (refMatch) custom.bookingReference = refMatch
        }
        break

      case 'vrbo':
        // Extract listing and reservation IDs
        const uidParts = component.uid?.split('-')
        if (uidParts?.length >= 2) {
          custom.listingId = uidParts[0]
          custom.reservationId = uidParts[1]
        }
        break
    }

    return custom
  }

  /**
   * Normalize date to JavaScript Date object
   */
  private normalizeDate(date: any): Date {
    if (!date) {
      throw new Error('Date is required')
    }

    if (date instanceof Date) {
      return date
    }

    if (typeof date === 'string') {
      return new Date(date)
    }

    if (date.toJSDate && typeof date.toJSDate === 'function') {
      return date.toJSDate()
    }

    if (date.toDate && typeof date.toDate === 'function') {
      return date.toDate()
    }

    // Try to parse as string
    return new Date(String(date))
  }

  /**
   * Check if event is within configured date range
   */
  private isWithinDateRange(event: ParsedCalendarEvent): boolean {
    const { start, end } = this.config.dateRangeFilter!
    return event.startDate >= start && event.endDate <= end
  }

  /**
   * Expand recurring event into individual occurrences
   */
  private expandRecurringEvent(
    baseEvent: ParsedCalendarEvent,
    rrule: any
  ): ParsedCalendarEvent[] {
    const expanded: ParsedCalendarEvent[] = []

    try {
      // Get occurrences within date range
      const occurrences = rrule.between(
        this.config.dateRangeFilter!.start,
        this.config.dateRangeFilter!.end,
        true // Include boundaries
      )

      // Create event for each occurrence
      for (const date of occurrences) {
        const duration = baseEvent.endDate.getTime() - baseEvent.startDate.getTime()

        expanded.push({
          ...baseEvent,
          uid: `${baseEvent.uid}-${date.getTime()}`,
          startDate: new Date(date),
          endDate: new Date(date.getTime() + duration)
        })
      }
    } catch (error) {
      console.warn('Failed to expand recurring event:', error)
    }

    return expanded
  }

  /**
   * Extract organizer from various formats
   */
  private extractOrganizer(organizer: any): string | undefined {
    if (!organizer) return undefined

    if (typeof organizer === 'string') {
      return organizer
    }

    if (organizer.val) {
      return organizer.val.replace('MAILTO:', '')
    }

    if (organizer.params && organizer.params.CN) {
      return organizer.params.CN
    }

    return String(organizer)
  }

  /**
   * Extract attendees from various formats
   */
  private extractAttendees(attendee: any): string[] {
    if (!attendee) return []

    const attendees: string[] = []

    const list = Array.isArray(attendee) ? attendee : [attendee]

    for (const a of list) {
      if (typeof a === 'string') {
        attendees.push(a.replace('MAILTO:', ''))
      } else if (a.val) {
        attendees.push(a.val.replace('MAILTO:', ''))
      } else if (a.params && a.params.CN) {
        attendees.push(a.params.CN)
      }
    }

    return attendees
  }

  /**
   * Generate a unique ID if none provided
   */
  private generateUID(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@muva.chat`
  }
}

// ============================================================================
// EVENT CLASSIFIER
// ============================================================================

export class EventClassifier {
  /**
   * Classify event type based on content and source
   */
  static classifyEventType(
    event: ParsedCalendarEvent,
    source: CalendarSource
  ): EventType {
    const summary = event.summary.toLowerCase()
    const description = (event.description || '').toLowerCase()

    // Check for reservation indicators
    if (
      summary.includes('reserved') ||
      summary.includes('booking') ||
      summary.includes('reservation') ||
      event.customFields?.reservationCode ||
      event.customFields?.bookingReference
    ) {
      return 'reservation'
    }

    // Check for maintenance indicators
    if (
      summary.includes('maintenance') ||
      summary.includes('repair') ||
      summary.includes('cleaning')
    ) {
      return 'maintenance'
    }

    // Check for block indicators
    if (
      summary.includes('blocked') ||
      summary.includes('not available') ||
      summary.includes('unavailable') ||
      summary.includes('hold')
    ) {
      return 'block'
    }

    // Platform-specific defaults
    switch (source) {
      case 'airbnb':
        // Airbnb uses specific patterns
        if (summary === 'airbnb (not available)') {
          return 'block'
        }
        break

      case 'booking.com':
        // Booking.com patterns
        if (summary.includes('closed')) {
          return 'block'
        }
        break
    }

    // Default to block for safety (prevents double booking)
    return 'block'
  }

  /**
   * Extract guest information from event
   */
  static extractGuestInfo(
    event: ParsedCalendarEvent,
    source: CalendarSource
  ): {
    name?: string
    email?: string
    phone?: string
    phoneLast4?: string
  } {
    const info: any = {}

    // Try to extract from standard fields
    if (event.organizer) {
      // Email might be in organizer
      if (event.organizer.includes('@')) {
        info.email = event.organizer
      }
    }

    // Platform-specific extraction
    switch (source) {
      case 'airbnb':
        // Airbnb provides phone last 4 digits
        if (event.customFields?.phoneLast4) {
          info.phoneLast4 = event.customFields.phoneLast4
        }

        // Guest name might be in description
        const nameMatch = event.description?.match(/Guest:\s*([^\\n]+)/)
        if (nameMatch) {
          info.name = nameMatch[1].trim()
        }
        break

      case 'booking.com':
        // Booking.com might include guest name in summary
        const bookingNameMatch = event.summary.match(/^(.+?)\s*-\s*Booking/)
        if (bookingNameMatch) {
          info.name = bookingNameMatch[1].trim()
        }
        break
    }

    // Extract from description using common patterns
    if (event.description) {
      const emailMatch = event.description.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)
      if (emailMatch) info.email = emailMatch[1]

      const phoneMatch = event.description.match(/(?:Phone|Tel|Mobile)[:\s]*([+\d\s()-]+)/)
      if (phoneMatch) info.phone = phoneMatch[1].trim()
    }

    return info
  }

  /**
   * Detect if event is from parent-child relationship
   */
  static isParentChildBlock(
    event: ParsedCalendarEvent,
    parentEvents: ParsedCalendarEvent[]
  ): boolean {
    // Check if this block matches any parent reservation
    for (const parent of parentEvents) {
      if (
        parent.startDate.getTime() === event.startDate.getTime() &&
        parent.endDate.getTime() === event.endDate.getTime() &&
        EventClassifier.classifyEventType(parent, 'generic_ics') === 'reservation'
      ) {
        return true
      }
    }

    return false
  }
}

// ============================================================================
// EXPORT HELPER FUNCTIONS
// ============================================================================

/**
 * Convert ICS exclusive end date to inclusive for database storage
 */
export function convertToInclusiveEndDate(endDate: Date): Date {
  const inclusive = new Date(endDate)
  inclusive.setDate(inclusive.getDate() - 1)
  return inclusive
}

/**
 * Extract reservation code from various formats
 */
export function extractReservationCode(text: string): string | null {
  // Airbnb format: HMXXXXXXXX (10 characters)
  const airbnbMatch = text.match(/HM[A-Z0-9]{8}/i)
  if (airbnbMatch) return airbnbMatch[0].toUpperCase()

  // Booking.com format: 10+ digits
  const bookingMatch = text.match(/\b\d{10,}\b/)
  if (bookingMatch) return bookingMatch[0]

  // Generic format: any 8+ character alphanumeric
  const genericMatch = text.match(/\b[A-Z0-9]{8,}\b/i)
  if (genericMatch) return genericMatch[0].toUpperCase()

  return null
}

/**
 * Create a parser instance with default MUVA configuration
 */
export function createMUVAParser(config?: Partial<ICSParserConfig>): ICSParser {
  return new ICSParser({
    strictMode: false, // Be lenient with malformed ICS
    timezone: 'America/Bogota',
    maxEvents: 5000,
    timeout: 30000,
    detectSource: true,
    expandRecurring: true,
    dateRangeFilter: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days past
      end: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000) // 2 years future
    },
    ...config
  })
}