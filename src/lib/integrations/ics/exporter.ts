/**
 * ICS Exporter Service
 * Generates RFC 5545 compliant iCalendar files for calendar synchronization
 * Compatible with Airbnb, Booking.com, Google Calendar, and other platforms
 */

import { v4 as uuidv4 } from 'uuid'
import { format } from 'date-fns'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Event data for ICS export
 */
export interface ICSEvent {
  uid?: string // If not provided, will be generated
  startDate: Date
  endDate: Date
  summary: string
  description?: string
  location?: string
  url?: string
  status?: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED'
  transparency?: 'OPAQUE' | 'TRANSPARENT' // OPAQUE = busy, TRANSPARENT = free
  classification?: 'PUBLIC' | 'PRIVATE' | 'CONFIDENTIAL'
  priority?: number // 0-9 (0 = undefined, 1 = highest, 9 = lowest)
  organizer?: {
    name?: string
    email: string
  }
  attendees?: Array<{
    name?: string
    email: string
    role?: 'REQ-PARTICIPANT' | 'OPT-PARTICIPANT' | 'NON-PARTICIPANT'
    rsvp?: boolean
  }>
  categories?: string[]
  alarms?: Array<{
    trigger: string // e.g., "-PT15M" for 15 minutes before
    action: 'DISPLAY' | 'EMAIL' | 'AUDIO'
    description: string
  }>
  recurrence?: {
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
    interval?: number
    count?: number
    until?: Date
    byDay?: string[] // e.g., ["MO", "WE", "FR"]
  }
  customProperties?: Record<string, string> // X-* properties
}

/**
 * Calendar metadata
 */
export interface ICSCalendarMetadata {
  name: string
  description?: string
  timezone?: string
  prodId?: string // Product identifier
  method?: 'PUBLISH' | 'REQUEST' | 'REPLY' | 'CANCEL' // Calendar method
  calendarScale?: string // Default: GREGORIAN
  calendarColor?: string // CSS color for display
  refreshInterval?: string // e.g., "PT1H" for hourly refresh
}

/**
 * Export options
 */
export interface ICSExportOptions {
  platform?: 'airbnb' | 'booking.com' | 'google' | 'outlook' | 'generic'
  includeAlarms?: boolean
  includeTZ?: boolean // Include VTIMEZONE component
  lineLength?: number // Max line length (default 75 per RFC)
  dateFormat?: 'DATE' | 'DATE-TIME' // Use DATE for all-day events
  forceUTC?: boolean // Convert all times to UTC
}

// ============================================================================
// ICS EXPORTER CLASS
// ============================================================================

export class ICSExporter {
  private options: Required<ICSExportOptions>

  constructor(options: ICSExportOptions = {}) {
    this.options = {
      platform: options.platform ?? 'generic',
      includeAlarms: options.includeAlarms ?? false,
      includeTZ: options.includeTZ ?? true,
      lineLength: options.lineLength ?? 75,
      dateFormat: options.dateFormat ?? 'DATE',
      forceUTC: options.forceUTC ?? true
    }
  }

  /**
   * Generate complete ICS calendar file
   */
  generateCalendar(
    events: ICSEvent[],
    metadata: ICSCalendarMetadata
  ): string {
    const lines: string[] = []

    // Start calendar
    lines.push('BEGIN:VCALENDAR')
    lines.push('VERSION:2.0')

    // Add metadata
    lines.push(this.formatProperty('PRODID', metadata.prodId || '-//MUVA Chat//Calendar Export//EN'))
    lines.push('CALSCALE:' + (metadata.calendarScale || 'GREGORIAN'))

    if (metadata.method) {
      lines.push('METHOD:' + metadata.method)
    }

    if (metadata.name) {
      lines.push(this.formatProperty('X-WR-CALNAME', metadata.name))
    }

    if (metadata.description) {
      lines.push(this.formatProperty('X-WR-CALDESC', metadata.description))
    }

    if (metadata.timezone) {
      lines.push('X-WR-TIMEZONE:' + metadata.timezone)

      // Add VTIMEZONE component if needed
      if (this.options.includeTZ) {
        lines.push(...this.generateTimezone(metadata.timezone))
      }
    }

    if (metadata.calendarColor) {
      lines.push('X-APPLE-CALENDAR-COLOR:' + metadata.calendarColor)
    }

    if (metadata.refreshInterval) {
      lines.push('X-PUBLISHED-TTL:' + metadata.refreshInterval)
      lines.push('REFRESH-INTERVAL;VALUE=DURATION:' + metadata.refreshInterval)
    }

    // Add events
    for (const event of events) {
      lines.push(...this.generateEvent(event))
    }

    // End calendar
    lines.push('END:VCALENDAR')

    // Join with CRLF as per RFC 5545
    return lines.join('\r\n')
  }

  /**
   * Generate a single event component
   */
  generateEvent(event: ICSEvent): string[] {
    const lines: string[] = []

    // Start event
    lines.push('BEGIN:VEVENT')

    // Required properties
    lines.push('UID:' + (event.uid || this.generateUID()))
    lines.push('DTSTAMP:' + this.formatDateTime(new Date()))

    // Date/time properties
    if (this.options.dateFormat === 'DATE' || this.isAllDayEvent(event)) {
      // Use DATE format (no time component)
      lines.push('DTSTART;VALUE=DATE:' + this.formatDate(event.startDate))
      lines.push('DTEND;VALUE=DATE:' + this.formatDate(this.getExclusiveEndDate(event.endDate)))
    } else {
      // Use DATE-TIME format
      if (this.options.forceUTC) {
        lines.push('DTSTART:' + this.formatDateTime(event.startDate))
        lines.push('DTEND:' + this.formatDateTime(event.endDate))
      } else {
        lines.push('DTSTART;TZID=' + this.getTimezone() + ':' + this.formatLocalDateTime(event.startDate))
        lines.push('DTEND;TZID=' + this.getTimezone() + ':' + this.formatLocalDateTime(event.endDate))
      }
    }

    // Summary (required for most platforms)
    lines.push(this.formatProperty('SUMMARY', this.getPlatformSummary(event)))

    // Optional properties
    if (event.description) {
      lines.push(this.formatProperty('DESCRIPTION', this.getPlatformDescription(event)))
    }

    if (event.location) {
      lines.push(this.formatProperty('LOCATION', event.location))
    }

    if (event.url) {
      lines.push(this.formatProperty('URL', event.url))
    }

    if (event.status) {
      lines.push('STATUS:' + event.status)
    }

    if (event.transparency) {
      lines.push('TRANSP:' + event.transparency)
    } else {
      // Default to OPAQUE (busy) for reservations
      lines.push('TRANSP:OPAQUE')
    }

    if (event.classification) {
      lines.push('CLASS:' + event.classification)
    }

    if (event.priority !== undefined) {
      lines.push('PRIORITY:' + event.priority)
    }

    // Organizer
    if (event.organizer) {
      let organizer = 'ORGANIZER'
      if (event.organizer.name) {
        organizer += `;CN="${event.organizer.name}"`
      }
      organizer += ':MAILTO:' + event.organizer.email
      lines.push(this.formatProperty('', organizer, false))
    }

    // Attendees
    if (event.attendees) {
      for (const attendee of event.attendees) {
        let att = 'ATTENDEE'
        if (attendee.name) {
          att += `;CN="${attendee.name}"`
        }
        if (attendee.role) {
          att += `;ROLE=${attendee.role}`
        }
        if (attendee.rsvp) {
          att += ';RSVP=TRUE'
        }
        att += ':MAILTO:' + attendee.email
        lines.push(this.formatProperty('', att, false))
      }
    }

    // Categories
    if (event.categories && event.categories.length > 0) {
      lines.push('CATEGORIES:' + event.categories.join(','))
    }

    // Recurrence rule
    if (event.recurrence) {
      lines.push(this.generateRRule(event.recurrence))
    }

    // Alarms
    if (this.options.includeAlarms && event.alarms) {
      for (const alarm of event.alarms) {
        lines.push(...this.generateAlarm(alarm))
      }
    }

    // Custom properties
    if (event.customProperties) {
      for (const [key, value] of Object.entries(event.customProperties)) {
        if (key.startsWith('X-')) {
          lines.push(this.formatProperty(key, value))
        }
      }
    }

    // Platform-specific additions
    lines.push(...this.addPlatformSpecificProperties(event))

    // End event
    lines.push('END:VEVENT')

    return lines
  }

  /**
   * Generate timezone component (simplified version)
   */
  private generateTimezone(tzid: string): string[] {
    // Simplified timezone for Colombia
    if (tzid === 'America/Bogota') {
      return [
        'BEGIN:VTIMEZONE',
        'TZID:America/Bogota',
        'X-LIC-LOCATION:America/Bogota',
        'BEGIN:STANDARD',
        'TZOFFSETFROM:-0500',
        'TZOFFSETTO:-0500',
        'TZNAME:COT',
        'DTSTART:19700101T000000',
        'END:STANDARD',
        'END:VTIMEZONE'
      ]
    }

    // For other timezones, skip VTIMEZONE (use UTC instead)
    return []
  }

  /**
   * Generate alarm component
   */
  private generateAlarm(alarm: NonNullable<ICSEvent['alarms']>[0]): string[] {
    return [
      'BEGIN:VALARM',
      'ACTION:' + alarm.action,
      'TRIGGER:' + alarm.trigger,
      this.formatProperty('DESCRIPTION', alarm.description),
      'END:VALARM'
    ]
  }

  /**
   * Generate recurrence rule
   */
  private generateRRule(recurrence: NonNullable<ICSEvent['recurrence']>): string {
    let rrule = 'RRULE:FREQ=' + recurrence.frequency

    if (recurrence.interval) {
      rrule += ';INTERVAL=' + recurrence.interval
    }

    if (recurrence.count) {
      rrule += ';COUNT=' + recurrence.count
    } else if (recurrence.until) {
      rrule += ';UNTIL=' + this.formatDateTime(recurrence.until)
    }

    if (recurrence.byDay && recurrence.byDay.length > 0) {
      rrule += ';BYDAY=' + recurrence.byDay.join(',')
    }

    return rrule
  }

  /**
   * Format property with proper line folding
   */
  private formatProperty(name: string, value: string, includeName = true): string {
    if (!value) return ''

    // Escape special characters
    const escaped = value
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '')

    let line = includeName ? name + ':' + escaped : escaped

    // Apply line folding (RFC 5545 section 3.1)
    if (line.length <= this.options.lineLength) {
      return line
    }

    const lines: string[] = []
    let currentLine = ''

    for (let i = 0; i < line.length; i++) {
      currentLine += line[i]

      if (currentLine.length === this.options.lineLength) {
        lines.push(currentLine)
        currentLine = ' ' // Space for continuation
      }
    }

    if (currentLine.length > 1) {
      lines.push(currentLine)
    }

    return lines.join('\r\n')
  }

  /**
   * Format date in YYYYMMDD format
   */
  private formatDate(date: Date): string {
    return format(date, 'yyyyMMdd')
  }

  /**
   * Format date-time in UTC (YYYYMMDDTHHMMSSZ)
   */
  private formatDateTime(date: Date): string {
    const utc = new Date(date.toISOString())
    return format(utc, "yyyyMMdd'T'HHmmss'Z'")
  }

  /**
   * Format local date-time (YYYYMMDDTHHMMSS)
   */
  private formatLocalDateTime(date: Date): string {
    return format(date, "yyyyMMdd'T'HHmmss")
  }

  /**
   * Get exclusive end date (ICS standard)
   */
  private getExclusiveEndDate(inclusiveDate: Date): Date {
    const exclusive = new Date(inclusiveDate)
    exclusive.setDate(exclusive.getDate() + 1)
    return exclusive
  }

  /**
   * Check if event is all-day
   */
  private isAllDayEvent(event: ICSEvent): boolean {
    // Check if times are at midnight
    const startHours = event.startDate.getHours()
    const startMinutes = event.startDate.getMinutes()
    const endHours = event.endDate.getHours()
    const endMinutes = event.endDate.getMinutes()

    return (
      startHours === 0 &&
      startMinutes === 0 &&
      endHours === 23 &&
      endMinutes === 59
    )
  }

  /**
   * Get platform-specific summary
   */
  private getPlatformSummary(event: ICSEvent): string {
    switch (this.options.platform) {
      case 'airbnb':
        // Airbnb expects "Reserved" or "Airbnb (Not available)"
        if (event.status === 'CONFIRMED') {
          return 'Reserved'
        } else {
          return 'Airbnb (Not available)'
        }

      case 'booking.com':
        // Booking.com format
        if (event.status === 'CONFIRMED') {
          return event.summary || 'Booking'
        } else {
          return 'Not available'
        }

      default:
        return event.summary
    }
  }

  /**
   * Get platform-specific description
   */
  private getPlatformDescription(event: ICSEvent): string {
    const description = event.description || ''

    switch (this.options.platform) {
      case 'airbnb':
        // Airbnb format with reservation URL and phone
        if (event.url) {
          return `Reservation URL: ${event.url}\\n${description}`
        }
        return description

      case 'booking.com':
        // Booking.com includes more details
        return description

      default:
        return description
    }
  }

  /**
   * Add platform-specific properties
   */
  private addPlatformSpecificProperties(event: ICSEvent): string[] {
    const lines: string[] = []

    switch (this.options.platform) {
      case 'google':
        // Google Calendar specific
        if (event.customProperties?.color) {
          lines.push('X-GOOGLE-CALENDAR-COLOR:' + event.customProperties.color)
        }
        break

      case 'outlook':
        // Outlook specific
        lines.push('X-MICROSOFT-CDO-BUSYSTATUS:BUSY')
        lines.push('X-MICROSOFT-CDO-IMPORTANCE:1')
        break

      case 'airbnb':
        // Airbnb might need specific UID format
        // Already handled in generateUID
        break
    }

    return lines
  }

  /**
   * Generate unique identifier
   */
  private generateUID(): string {
    const uuid = uuidv4()

    // Platform-specific UID formats
    switch (this.options.platform) {
      case 'airbnb':
        // Airbnb-like format (but unique)
        return `muva-${Date.now().toString(16)}-${uuid.substr(0, 8)}@muva.chat`

      default:
        return `${uuid}@muva.chat`
    }
  }

  /**
   * Get timezone for current environment
   */
  private getTimezone(): string {
    return 'America/Bogota' // Default for Colombia
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create an ICS event from database calendar event
 */
export function createICSEvent(
  dbEvent: any, // CalendarEvent from database
  options?: { includePrivateData?: boolean }
): ICSEvent {
  const event: ICSEvent = {
    uid: dbEvent.external_uid || dbEvent.id,
    startDate: new Date(dbEvent.start_date),
    endDate: new Date(dbEvent.end_date),
    summary: dbEvent.summary || 'Reservation',
    description: dbEvent.description
  }

  // Add guest information if allowed
  if (options?.includePrivateData) {
    if (dbEvent.guest_name) {
      event.description = `Guest: ${dbEvent.guest_name}\\n${event.description || ''}`
    }
    if (dbEvent.guest_phone_last4) {
      event.description = `Phone: ****${dbEvent.guest_phone_last4}\\n${event.description || ''}`
    }
  }

  // Set status based on event type
  if (dbEvent.event_type === 'reservation') {
    event.status = 'CONFIRMED'
  } else if (dbEvent.status === 'cancelled') {
    event.status = 'CANCELLED'
  } else {
    event.status = 'TENTATIVE'
  }

  // Set transparency
  event.transparency = dbEvent.event_type === 'reservation' ? 'OPAQUE' : 'TRANSPARENT'

  // Add reservation code as custom property
  if (dbEvent.reservation_code) {
    event.customProperties = {
      'X-RESERVATION-CODE': dbEvent.reservation_code
    }
  }

  return event
}

/**
 * Create exporter with platform-specific settings
 */
export function createPlatformExporter(
  platform: ICSExportOptions['platform']
): ICSExporter {
  switch (platform) {
    case 'airbnb':
      return new ICSExporter({
        platform: 'airbnb',
        dateFormat: 'DATE', // Airbnb only supports DATE format
        includeAlarms: false,
        includeTZ: false,
        forceUTC: false
      })

    case 'booking.com':
      return new ICSExporter({
        platform: 'booking.com',
        dateFormat: 'DATE-TIME',
        includeAlarms: false,
        includeTZ: true,
        forceUTC: true
      })

    case 'google':
      return new ICSExporter({
        platform: 'google',
        dateFormat: 'DATE-TIME',
        includeAlarms: true,
        includeTZ: true,
        forceUTC: true
      })

    case 'outlook':
      return new ICSExporter({
        platform: 'outlook',
        dateFormat: 'DATE-TIME',
        includeAlarms: true,
        includeTZ: true,
        forceUTC: false
      })

    default:
      return new ICSExporter({
        platform: 'generic',
        dateFormat: 'DATE',
        includeAlarms: false,
        includeTZ: true,
        forceUTC: true
      })
  }
}

/**
 * Generate calendar feed for multiple properties
 */
export async function generateMultiPropertyFeed(
  properties: Array<{ id: string; name: string; events: any[] }>,
  metadata: ICSCalendarMetadata,
  platform?: ICSExportOptions['platform']
): Promise<string> {
  const exporter = createPlatformExporter(platform)

  // Combine all events
  const allEvents: ICSEvent[] = []

  for (const property of properties) {
    for (const dbEvent of property.events) {
      const icsEvent = createICSEvent(dbEvent, {
        includePrivateData: false // Don't include private data in public feeds
      })

      // Add property name to summary
      icsEvent.summary = `[${property.name}] ${icsEvent.summary}`

      allEvents.push(icsEvent)
    }
  }

  // Sort events by start date
  allEvents.sort((a, b) => a.startDate.getTime() - b.startDate.getTime())

  return exporter.generateCalendar(allEvents, metadata)
}

/**
 * Validate ICS content
 */
export function validateICSContent(content: string): {
  valid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  // Check basic structure
  if (!content.includes('BEGIN:VCALENDAR')) {
    errors.push('Missing BEGIN:VCALENDAR')
  }
  if (!content.includes('END:VCALENDAR')) {
    errors.push('Missing END:VCALENDAR')
  }
  if (!content.includes('VERSION:2.0')) {
    errors.push('Missing VERSION:2.0')
  }
  if (!content.includes('PRODID:')) {
    warnings.push('Missing PRODID')
  }

  // Check for events
  const eventCount = (content.match(/BEGIN:VEVENT/g) || []).length
  const endEventCount = (content.match(/END:VEVENT/g) || []).length

  if (eventCount !== endEventCount) {
    errors.push(`Mismatched VEVENT tags: ${eventCount} BEGIN, ${endEventCount} END`)
  }

  if (eventCount === 0) {
    warnings.push('No events found in calendar')
  }

  // Check line endings
  if (!content.includes('\r\n')) {
    warnings.push('Using LF instead of CRLF line endings')
  }

  // Check line length
  const lines = content.split(/\r?\n/)
  const longLines = lines.filter(line => line.length > 75 && !line.startsWith(' '))
  if (longLines.length > 0) {
    warnings.push(`${longLines.length} lines exceed 75 characters without folding`)
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}