/**
 * ICS Sync Manager
 *
 * Orchestrates multi-source calendar synchronization with conflict resolution
 * and parent-child relationship propagation.
 *
 * Key Features:
 * - Priority-based conflict resolution (Motopress > Airbnb > Manual)
 * - Automatic parent-child property blocking
 * - Incremental sync with ETag support
 * - Duplicate detection and deduplication
 * - Comprehensive error handling and logging
 *
 * @see docs/architecture/ics-sync-architecture.md
 */

import { ICSParser, ParseResult, ParsedCalendarEvent } from './parser';
import { createServerClient } from '@/lib/supabase';

// ============================================================================
// Types & Interfaces
// ============================================================================

export type EventSource = 'motopress' | 'airbnb' | 'booking_com' | 'manual';

export interface SyncConfig {
  tenantId: string;
  feedConfigId: string;
  feedUrl: string;
  propertyId: string;
  source: EventSource;
  lastEtag?: string;
  forceFullSync?: boolean;
}

export interface SyncResult {
  success: boolean;
  feedConfigId: string;
  source: EventSource;
  stats: {
    totalEvents: number;
    newEvents: number;
    updatedEvents: number;
    deletedEvents: number;
    conflicts: number;
    errors: number;
  };
  newEtag?: string;
  errors: SyncError[];
  duration: number;
}

export interface SyncError {
  eventId?: string;
  externalUid?: string;
  error: string;
  severity: 'warning' | 'error';
}

export interface ConflictResolutionResult {
  action: 'keep_existing' | 'update' | 'create_conflict_record';
  reason: string;
  winningSource: EventSource;
}

interface CalendarEvent {
  id: string;
  tenant_id: string;
  accommodation_unit_id: string;
  source: EventSource;
  external_uid: string;
  event_type: 'reservation' | 'block' | 'maintenance' | 'parent_block';
  summary: string;
  description?: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'pending' | 'cancelled' | 'completed';
  guest_name?: string;
  guest_email?: string;
  guest_phone?: string;
  total_price?: number;
  currency?: string;
  created_at?: string;
  updated_at?: string;
  last_modified?: string;
  external_updated_at?: string;
  ics_dtstamp?: string;
}

// ============================================================================
// Priority Configuration
// ============================================================================

const SOURCE_PRIORITY: Record<EventSource, number> = {
  motopress: 100,    // Highest priority - authoritative source
  airbnb: 50,        // Medium priority
  booking_com: 50,   // Medium priority (same as Airbnb)
  manual: 10,        // Lowest priority
};

// ============================================================================
// Sync Manager
// ============================================================================

export class ICSyncManager {
  private parser: ICSParser;
  private supabase: ReturnType<typeof createServerClient>;

  constructor() {
    this.parser = new ICSParser();
    this.supabase = createServerClient();
  }

  /**
   * Synchronize a single ICS feed
   */
  async syncFeed(config: SyncConfig): Promise<SyncResult> {
    const startTime = Date.now();
    const errors: SyncError[] = [];
    const stats = {
      totalEvents: 0,
      newEvents: 0,
      updatedEvents: 0,
      deletedEvents: 0,
      conflicts: 0,
      errors: 0,
    };

    try {
      // Log sync start
      await this.logSyncStart(config);

      // Parse ICS feed
      const parseResult = await this.parser.parseFromURL(
        config.feedUrl,
        config.forceFullSync ? undefined : config.lastEtag
      );

      // Check if feed has been modified
      if (parseResult.notModified && !config.forceFullSync) {
        await this.logSyncComplete(config, {
          success: true,
          stats,
          message: 'Feed not modified (ETag match)',
        });

        return {
          success: true,
          feedConfigId: config.feedConfigId,
          source: config.source,
          stats,
          newEtag: parseResult.newEtag,
          errors: [],
          duration: Date.now() - startTime,
        };
      }

      stats.totalEvents = parseResult.events.length;

      // Process events
      for (const event of parseResult.events) {
        try {
          const result = await this.processEvent(event, config);

          if (result.action === 'update') {
            stats.updatedEvents++;
          } else if (result.action === 'create_conflict_record') {
            stats.conflicts++;
          } else {
            stats.newEvents++;
          }
        } catch (error) {
          stats.errors++;
          errors.push({
            eventId: event.uid,
            externalUid: event.uid,
            error: error instanceof Error ? error.message : 'Unknown error',
            severity: 'error',
          });
        }
      }

      // Handle deletions (events in DB but not in feed)
      if (config.forceFullSync) {
        const deletedCount = await this.handleDeletions(config, parseResult.events);
        stats.deletedEvents = deletedCount;
      }

      // Update feed configuration with new ETag
      if (parseResult.newEtag) {
        await this.updateFeedEtag(config.feedConfigId, parseResult.newEtag);
      }

      // Log sync completion
      await this.logSyncComplete(config, {
        success: true,
        stats,
        message: 'Sync completed successfully',
      });

      return {
        success: true,
        feedConfigId: config.feedConfigId,
        source: config.source,
        stats,
        newEtag: parseResult.newEtag,
        errors,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      errors.push({
        error: errorMessage,
        severity: 'error',
      });

      await this.logSyncComplete(config, {
        success: false,
        stats,
        message: errorMessage,
      });

      return {
        success: false,
        feedConfigId: config.feedConfigId,
        source: config.source,
        stats,
        errors,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Process a single event with conflict resolution
   */
  private async processEvent(
    event: ParsedCalendarEvent,
    config: SyncConfig
  ): Promise<{ action: 'insert' | 'update' | 'create_conflict_record' }> {
    // Check for existing event
    const { data: existing } = await this.supabase
      .from('calendar_events')
      .select('*')
      .eq('tenant_id', config.tenantId)
      .eq('external_uid', event.uid)
      .single();

    if (!existing) {
      // New event - insert
      await this.insertEvent(event, config);
      return { action: 'insert' };
    }

    // Event exists - resolve conflict
    const resolution = this.resolveConflict(
      existing as CalendarEvent,
      event,
      config.source
    );

    if (resolution.action === 'update') {
      await this.updateEvent(existing.id, event, config);
      return { action: 'update' };
    } else if (resolution.action === 'create_conflict_record') {
      await this.createConflictRecord(existing.id, event, config, resolution);
      return { action: 'create_conflict_record' };
    }

    return { action: 'insert' }; // Keep existing
  }

  /**
   * Resolve conflict between existing event and new event
   */
  private resolveConflict(
    existing: CalendarEvent,
    incoming: ParsedCalendarEvent,
    incomingSource: EventSource
  ): ConflictResolutionResult {
    const existingPriority = SOURCE_PRIORITY[existing.source];
    const incomingPriority = SOURCE_PRIORITY[incomingSource];

    // Priority-based resolution
    if (incomingPriority > existingPriority) {
      return {
        action: 'update',
        reason: `Incoming source (${incomingSource}) has higher priority than existing (${existing.source})`,
        winningSource: incomingSource,
      };
    }

    if (incomingPriority < existingPriority) {
      return {
        action: 'keep_existing',
        reason: `Existing source (${existing.source}) has higher priority than incoming (${incomingSource})`,
        winningSource: existing.source,
      };
    }

    // Same priority - check timestamps
    const existingUpdated = existing.external_updated_at || existing.updated_at;
    const incomingUpdated = incoming.lastModified;

    if (!existingUpdated || !incomingUpdated) {
      // No timestamps - create conflict record
      return {
        action: 'create_conflict_record',
        reason: 'Same priority and missing timestamps',
        winningSource: existing.source,
      };
    }

    const existingDate = new Date(existingUpdated);
    const incomingDate = new Date(incomingUpdated);

    if (incomingDate > existingDate) {
      return {
        action: 'update',
        reason: `Incoming event is newer (${incomingUpdated} > ${existingUpdated})`,
        winningSource: incomingSource,
      };
    }

    if (incomingDate < existingDate) {
      return {
        action: 'keep_existing',
        reason: `Existing event is newer (${existingUpdated} > ${incomingUpdated})`,
        winningSource: existing.source,
      };
    }

    // Exact same timestamp - create conflict record for manual review
    return {
      action: 'create_conflict_record',
      reason: 'Same priority and timestamp - needs manual review',
      winningSource: existing.source,
    };
  }

  /**
   * Get the correct accommodation_unit_id for guest chat
   * For Airbnb reservations, we need the ID from accommodation_units_public (for embeddings)
   * For other sources, we use the hotels.accommodation_units ID
   */
  private async getAccommodationUnitIdForGuest(
    hotelUnitId: string,
    source: EventSource,
    tenantId: string
  ): Promise<string> {
    // For non-Airbnb sources, use the hotel unit ID directly
    if (source !== 'airbnb') {
      return hotelUnitId;
    }

    // For Airbnb, we need to find the corresponding accommodation_units_public ID
    // First, get the name from hotels.accommodation_units
    const { data: hotelUnit, error: hotelError } = await this.supabase
      .from('hotels.accommodation_units')
      .select('name')
      .eq('id', hotelUnitId)
      .eq('tenant_id', tenantId)
      .single();

    if (hotelError || !hotelUnit) {
      console.error('[ICS Sync] Failed to get hotel unit name:', hotelError);
      return hotelUnitId; // Fallback to hotel unit ID
    }

    // Now find the corresponding unit in accommodation_units_public by matching the name
    // We look for the Overview chunk which always exists
    const { data: publicUnit, error: publicError } = await this.supabase
      .from('accommodation_units_public')
      .select('unit_id')
      .eq('tenant_id', tenantId)
      .eq('metadata->original_accommodation', hotelUnit.name)
      .like('name', `${hotelUnit.name} - Overview`)
      .single();

    if (publicError || !publicUnit) {
      console.error('[ICS Sync] Failed to find public unit for:', hotelUnit.name, publicError);
      return hotelUnitId; // Fallback to hotel unit ID
    }

    console.log(`[ICS Sync] Mapped ${hotelUnit.name}: ${hotelUnitId} -> ${publicUnit.unit_id}`);
    return publicUnit.unit_id;
  }

  /**
   * Insert new event into database
   * Also creates a guest_reservation record for Airbnb guests (same as MotoPress)
   */
  private async insertEvent(event: ParsedCalendarEvent, config: SyncConfig): Promise<void> {
    // Step 1: Insert calendar event
    const { error } = await this.supabase.from('calendar_events').insert({
      tenant_id: config.tenantId,
      accommodation_unit_id: config.propertyId,
      source: config.source,
      external_uid: event.uid,
      event_type: 'reservation', // Default to reservation
      summary: event.summary,
      description: event.description,
      start_date: this.formatDateUTC(event.startDate), // DATE only in UTC
      end_date: this.formatDateUTC(event.endDate), // DATE only in UTC
      status: event.status === 'CANCELLED' ? 'cancelled' : 'active',
      guest_name: event.attendees?.[0],
      guest_email: event.customFields?.email,
      guest_phone: event.customFields?.phone,
      total_price: event.customFields?.amount || null,
      currency: event.customFields?.currency || 'COP',
      ics_dtstamp: event.created?.toISOString(),
      last_modified: event.lastModified?.toISOString(),
    });

    if (error) {
      throw new Error(`Failed to insert event: ${error.message}`);
    }

    // Step 2: Create guest_reservation record (only for active reservations from Airbnb)
    if (config.source === 'airbnb' && event.status !== 'CANCELLED') {
      const phoneLast4 = this.extractPhoneLast4(event);
      const reservationCode = this.extractReservationCode(event);

      // Check if reservation already exists (avoid duplicates)
      const { data: existing } = await this.supabase
        .from('guest_reservations')
        .select('id')
        .eq('external_booking_id', event.uid)
        .eq('tenant_id', config.tenantId)
        .single();

      if (!existing) {
        // Get the correct accommodation_unit_id for guest chat (public ID for Airbnb)
        const guestAccommodationId = await this.getAccommodationUnitIdForGuest(
          config.propertyId,
          config.source,
          config.tenantId
        );

        const { data: reservation, error: reservationError } = await this.supabase
          .from('guest_reservations')
          .insert({
            tenant_id: config.tenantId,
            guest_name: event.attendees?.[0] || 'Guest',
            phone_full: event.customFields?.phone || '',
            phone_last_4: phoneLast4,
            check_in_date: this.formatDateUTC(event.startDate),
            check_out_date: this.formatDateUTC(event.endDate),
            check_in_time: '15:00:00',
            check_out_time: '12:00:00',
            reservation_code: reservationCode,
            status: 'active',
            accommodation_unit_id: guestAccommodationId, // Use the public ID for guest chat
            guest_email: event.customFields?.email || null,
            guest_country: null,
            adults: 2, // Default - ICS doesn't provide this
            children: 0,
            total_price: event.customFields?.amount || null,
            currency: event.customFields?.currency || 'COP',
            booking_source: 'airbnb',
            external_booking_id: event.uid,
            booking_notes: event.description,
          })
          .select('id')
          .single();

        if (reservationError) {
          console.error('[ICS Sync] Failed to create guest_reservation:', reservationError);
          // Don't throw - calendar event was already created successfully
        } else if (reservation) {
          // Step 3: Create reservation_accommodations junction record
          // Keep using the hotel unit ID here for operational purposes
          const { error: junctionError } = await this.supabase
            .from('reservation_accommodations')
            .insert({
              reservation_id: reservation.id,
              accommodation_unit_id: config.propertyId, // Keep hotel unit ID for operations
              motopress_accommodation_id: null,
              motopress_type_id: null,
              room_rate: event.customFields?.amount || null,
            });

          if (junctionError) {
            console.error('[ICS Sync] Failed to create reservation_accommodations:', junctionError);
          }
        }
      }
    }
  }

  /**
   * Update existing event in database
   */
  private async updateEvent(
    eventId: string,
    event: ParsedCalendarEvent,
    config: SyncConfig
  ): Promise<void> {
    const { error } = await this.supabase
      .from('calendar_events')
      .update({
        summary: event.summary,
        description: event.description,
        start_date: this.formatDateUTC(event.startDate), // DATE only in UTC
        end_date: this.formatDateUTC(event.endDate), // DATE only in UTC
        status: event.status === 'CANCELLED' ? 'cancelled' : 'active',
        guest_name: event.attendees?.[0],
        guest_email: event.customFields?.email,
        guest_phone: event.customFields?.phone,
        total_price: event.customFields?.amount,
        currency: event.customFields?.currency || 'COP',
        last_modified: event.lastModified?.toISOString(),
      })
      .eq('id', eventId);

    if (error) {
      throw new Error(`Failed to update event: ${error.message}`);
    }
  }

  /**
   * Create conflict record for manual resolution
   */
  private async createConflictRecord(
    eventId: string,
    incomingEvent: ParsedCalendarEvent,
    config: SyncConfig,
    resolution: ConflictResolutionResult
  ): Promise<void> {
    const { error } = await this.supabase.from('calendar_event_conflicts').insert({
      event_id: eventId,
      conflicting_source: config.source,
      conflicting_data: {
        summary: incomingEvent.summary,
        description: incomingEvent.description,
        start_date: incomingEvent.startDate.toISOString(),
        end_date: incomingEvent.endDate.toISOString(),
        status: incomingEvent.status,
        attendees: incomingEvent.attendees,
        customFields: incomingEvent.customFields,
      },
      resolution_status: 'pending',
      conflict_reason: resolution.reason,
    });

    if (error) {
      throw new Error(`Failed to create conflict record: ${error.message}`);
    }
  }

  /**
   * Handle deletions (events in DB but not in feed)
   */
  private async handleDeletions(
    config: SyncConfig,
    currentEvents: ParsedCalendarEvent[]
  ): Promise<number> {
    const currentUids = new Set(currentEvents.map(e => e.uid));

    // Get all events from this feed
    const { data: dbEvents, error } = await this.supabase
      .from('calendar_events')
      .select('id, external_uid')
      .eq('tenant_id', config.tenantId)
      .eq('source', config.source);

    if (error || !dbEvents) {
      throw new Error(`Failed to fetch events for deletion check: ${error?.message}`);
    }

    // Find events to delete
    const toDelete = dbEvents.filter(e => !currentUids.has(e.external_uid));

    if (toDelete.length === 0) {
      return 0;
    }

    // Soft delete by setting status to cancelled
    const { error: deleteError } = await this.supabase
      .from('calendar_events')
      .update({ status: 'cancelled' })
      .in('id', toDelete.map(e => e.id));

    if (deleteError) {
      throw new Error(`Failed to delete events: ${deleteError.message}`);
    }

    return toDelete.length;
  }

  /**
   * Synchronize all feeds for a tenant
   */
  async syncAllFeeds(tenantId: string): Promise<SyncResult[]> {
    // Get all active feed configurations
    const { data: feeds, error } = await this.supabase
      .from('ics_feed_configurations')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    if (error || !feeds) {
      throw new Error(`Failed to fetch feed configurations: ${error?.message}`);
    }

    const results: SyncResult[] = [];

    // Sync each feed
    for (const feed of feeds) {
      const config: SyncConfig = {
        tenantId: feed.tenant_id,
        feedConfigId: feed.id,
        feedUrl: feed.feed_url,
        propertyId: feed.accommodation_unit_id,
        source: feed.source_platform as EventSource,
        lastEtag: feed.last_etag,
      };

      const result = await this.syncFeed(config);
      results.push(result);
    }

    return results;
  }

  // ============================================================================
  // Logging Methods
  // ============================================================================

  private async logSyncStart(config: SyncConfig): Promise<void> {
    await this.supabase.from('calendar_sync_logs').insert({
      tenant_id: config.tenantId,
      feed_config_id: config.feedConfigId,
      sync_status: 'in_progress',
      started_at: new Date().toISOString(),
    });
  }

  private async logSyncComplete(
    config: SyncConfig,
    result: {
      success: boolean;
      stats: SyncResult['stats'];
      message: string;
    }
  ): Promise<void> {
    const { data: log } = await this.supabase
      .from('calendar_sync_logs')
      .select('id')
      .eq('feed_config_id', config.feedConfigId)
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    if (log) {
      await this.supabase
        .from('calendar_sync_logs')
        .update({
          sync_status: result.success ? 'completed' : 'failed',
          completed_at: new Date().toISOString(),
          events_processed: result.stats.totalEvents,
          events_created: result.stats.newEvents,
          events_updated: result.stats.updatedEvents,
          events_deleted: result.stats.deletedEvents,
          conflicts_detected: result.stats.conflicts,
          error_message: result.success ? null : result.message,
        })
        .eq('id', log.id);
    }

    // Update feed configuration statistics
    const { data: feedConfig } = await this.supabase
      .from('ics_feed_configurations')
      .select('total_syncs, successful_syncs, failed_syncs, consecutive_failures, events_imported_total')
      .eq('id', config.feedConfigId)
      .single();

    if (feedConfig) {
      await this.supabase
        .from('ics_feed_configurations')
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_status: result.success ? 'success' : 'failed',
          last_sync_error: result.success ? null : result.message,
          total_syncs: (feedConfig.total_syncs || 0) + 1,
          successful_syncs: result.success ? (feedConfig.successful_syncs || 0) + 1 : feedConfig.successful_syncs,
          failed_syncs: result.success ? feedConfig.failed_syncs : (feedConfig.failed_syncs || 0) + 1,
          consecutive_failures: result.success ? 0 : (feedConfig.consecutive_failures || 0) + 1,
          events_imported_last: result.stats.newEvents,
          events_imported_total: (feedConfig.events_imported_total || 0) + result.stats.newEvents,
        })
        .eq('id', config.feedConfigId);
    }
  }

  private async updateFeedEtag(feedConfigId: string, etag: string): Promise<void> {
    await this.supabase
      .from('ics_feed_configurations')
      .update({
        last_etag: etag,
        last_sync_at: new Date().toISOString(),
      })
      .eq('id', feedConfigId);
  }

  /**
   * Format date as YYYY-MM-DD in UTC (no timezone shifting)
   * This ensures dates from ICS VALUE=DATE fields remain consistent
   */
  private formatDateUTC(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Extract phone last 4 digits from event description or summary
   * Airbnb format: "Phone Number (Last 4 Digits): 8216"
   */
  private extractPhoneLast4(event: ParsedCalendarEvent): string {
    const text = `${event.description || ''} ${event.summary || ''}`;
    const match = text.match(/Phone Number \(Last 4 Digits\):\s*(\d{4})/i);
    return match?.[1] || '0000';
  }

  /**
   * Extract reservation code from event UID or description
   * Example: "HMFYJRTJ38" from Airbnb URL
   */
  private extractReservationCode(event: ParsedCalendarEvent): string {
    const text = `${event.description || ''} ${event.uid || ''}`;
    const match = text.match(/\/([A-Z0-9]{10,})/);
    return match?.[1] || event.uid.substring(0, 10);
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get priority for a source
 */
export function getSourcePriority(source: EventSource): number {
  return SOURCE_PRIORITY[source];
}

/**
 * Compare two sources by priority
 */
export function compareSourcePriority(
  source1: EventSource,
  source2: EventSource
): number {
  return SOURCE_PRIORITY[source2] - SOURCE_PRIORITY[source1];
}
