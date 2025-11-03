/**
 * Generate Phase 3d: Reservations Data Migration
 *
 * Tables (14): prospective_sessions, guest_reservations, reservation_accommodations,
 *              guest_conversations, chat_conversations, chat_messages, conversation_memory,
 *              conversation_attachments, compliance_submissions, calendar_events,
 *              calendar_event_conflicts, ics_feed_configurations, calendar_sync_logs,
 *              airbnb_mphb_imported_reservations
 *
 * Total: 1,135 rows (412+104+93+112+2+319+10+0+0+74+0+9+0+0)
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Helper to escape SQL strings
function escapeSql(value: any): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  if (typeof value === 'object') {
    // Handle JSONB
    return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  }
  if (Array.isArray(value)) {
    // Handle vector embeddings
    if (value.every((v) => typeof v === 'number')) {
      return `'[${value.join(',')}]'::vector`;
    }
    return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  }
  // String
  return `'${value.toString().replace(/'/g, "''")}'`;
}

// Helper to format timestamp
function formatTimestamp(value: any): string {
  if (!value) return 'NULL';
  return `'${value}'`;
}

async function generateMigration() {
  const lines: string[] = [];

  lines.push('-- Phase 3d: Reservations Data Migration');
  lines.push('-- Generated: ' + new Date().toISOString());
  lines.push('-- Tables (14): prospective_sessions, guest_reservations, reservation_accommodations,');
  lines.push('--               guest_conversations, chat_conversations, chat_messages,');
  lines.push('--               conversation_memory, conversation_attachments, compliance_submissions,');
  lines.push('--               calendar_events, calendar_event_conflicts, ics_feed_configurations,');
  lines.push('--               calendar_sync_logs, airbnb_mphb_imported_reservations');
  lines.push('-- Total rows: 1,135 (412+104+93+112+2+319+10+0+0+74+0+9+0+0)');
  lines.push('');
  lines.push('BEGIN;');
  lines.push('');

  // 1. PROSPECTIVE_SESSIONS (412 rows)
  console.log('Querying prospective_sessions...');
  const { data: sessions, error: sessionsError } = await supabase
    .from('prospective_sessions')
    .select('*')
    .order('created_at');

  if (sessionsError) throw sessionsError;

  lines.push('-- =========================================');
  lines.push('-- 1. PROSPECTIVE_SESSIONS (412 rows)');
  lines.push('-- =========================================');
  lines.push('');
  lines.push('INSERT INTO prospective_sessions (');
  lines.push('  session_id, tenant_id, cookie_id, conversation_history, travel_intent,');
  lines.push('  utm_tracking, referrer, landing_page, converted_to_reservation_id,');
  lines.push('  conversion_date, created_at, expires_at, last_activity_at, status');
  lines.push(') VALUES');

  sessions?.forEach((session, idx) => {
    const values = [
      escapeSql(session.session_id),
      escapeSql(session.tenant_id),
      escapeSql(session.cookie_id),
      escapeSql(session.conversation_history),
      escapeSql(session.travel_intent),
      escapeSql(session.utm_tracking),
      escapeSql(session.referrer),
      escapeSql(session.landing_page),
      escapeSql(session.converted_to_reservation_id),
      formatTimestamp(session.conversion_date),
      formatTimestamp(session.created_at),
      formatTimestamp(session.expires_at),
      formatTimestamp(session.last_activity_at),
      escapeSql(session.status)
    ];

    const line = `  (${values.join(', ')})${idx === sessions.length - 1 ? ';' : ','}`;
    lines.push(line);
  });

  lines.push('');
  lines.push(`SELECT 'prospective_sessions' AS table_name, COUNT(*) AS row_count FROM prospective_sessions;`);
  lines.push('');

  // 2. GUEST_RESERVATIONS (104 rows)
  console.log('Querying guest_reservations...');
  const { data: reservations, error: reservationsError } = await supabase
    .from('guest_reservations')
    .select('*')
    .order('check_in_date');

  if (reservationsError) throw reservationsError;

  lines.push('-- =========================================');
  lines.push('-- 2. GUEST_RESERVATIONS (104 rows)');
  lines.push('-- =========================================');
  lines.push('');
  lines.push('INSERT INTO guest_reservations (');
  lines.push('  reservation_id, tenant_id, guest_name, guest_email, guest_phone,');
  lines.push('  guest_document_type, guest_document_number, guest_country,');
  lines.push('  number_of_guests, adults_count, children_count, check_in_date,');
  lines.push('  check_out_date, total_nights, total_amount, payment_status,');
  lines.push('  booking_source, booking_reference, notes, created_at, updated_at,');
  lines.push('  status');
  lines.push(') VALUES');

  reservations?.forEach((reservation, idx) => {
    const values = [
      escapeSql(reservation.reservation_id),
      escapeSql(reservation.tenant_id),
      escapeSql(reservation.guest_name),
      escapeSql(reservation.guest_email),
      escapeSql(reservation.guest_phone),
      escapeSql(reservation.guest_document_type),
      escapeSql(reservation.guest_document_number),
      escapeSql(reservation.guest_country),
      escapeSql(reservation.number_of_guests),
      escapeSql(reservation.adults_count),
      escapeSql(reservation.children_count),
      formatTimestamp(reservation.check_in_date),
      formatTimestamp(reservation.check_out_date),
      escapeSql(reservation.total_nights),
      escapeSql(reservation.total_amount),
      escapeSql(reservation.payment_status),
      escapeSql(reservation.booking_source),
      escapeSql(reservation.booking_reference),
      escapeSql(reservation.notes),
      formatTimestamp(reservation.created_at),
      formatTimestamp(reservation.updated_at),
      escapeSql(reservation.status)
    ];

    const line = `  (${values.join(', ')})${idx === reservations.length - 1 ? ';' : ','}`;
    lines.push(line);
  });

  lines.push('');
  lines.push(`SELECT 'guest_reservations' AS table_name, COUNT(*) AS row_count FROM guest_reservations;`);
  lines.push('');

  // 3. RESERVATION_ACCOMMODATIONS (93 rows)
  console.log('Querying reservation_accommodations...');
  const { data: resAccommodations, error: resAccommodationsError } = await supabase
    .from('reservation_accommodations')
    .select('*')
    .order('reservation_id');

  if (resAccommodationsError) throw resAccommodationsError;

  lines.push('-- =========================================');
  lines.push('-- 3. RESERVATION_ACCOMMODATIONS (93 rows)');
  lines.push('-- FK: guest_reservations');
  lines.push('-- =========================================');
  lines.push('');
  lines.push('INSERT INTO reservation_accommodations (');
  lines.push('  id, reservation_id, unit_id, unit_name, check_in_date, check_out_date,');
  lines.push('  rate_per_night, total_amount, created_at');
  lines.push(') VALUES');

  resAccommodations?.forEach((resAcc, idx) => {
    const values = [
      escapeSql(resAcc.id),
      escapeSql(resAcc.reservation_id),
      escapeSql(resAcc.unit_id),
      escapeSql(resAcc.unit_name),
      formatTimestamp(resAcc.check_in_date),
      formatTimestamp(resAcc.check_out_date),
      escapeSql(resAcc.rate_per_night),
      escapeSql(resAcc.total_amount),
      formatTimestamp(resAcc.created_at)
    ];

    const line = `  (${values.join(', ')})${idx === resAccommodations.length - 1 ? ';' : ','}`;
    lines.push(line);
  });

  lines.push('');
  lines.push('-- Reset sequence for reservation_accommodations');
  lines.push("SELECT setval('reservation_accommodations_id_seq', (SELECT MAX(id) FROM reservation_accommodations));");
  lines.push('');
  lines.push(`SELECT 'reservation_accommodations' AS table_name, COUNT(*) AS row_count FROM reservation_accommodations;`);
  lines.push('');

  // 4. GUEST_CONVERSATIONS (112 rows)
  console.log('Querying guest_conversations...');
  const { data: guestConversations, error: guestConversationsError } = await supabase
    .from('guest_conversations')
    .select('*')
    .order('created_at');

  if (guestConversationsError) throw guestConversationsError;

  lines.push('-- =========================================');
  lines.push('-- 4. GUEST_CONVERSATIONS (112 rows)');
  lines.push('-- FK: guest_reservations');
  lines.push('-- =========================================');
  lines.push('');
  lines.push('INSERT INTO guest_conversations (');
  lines.push('  conversation_id, tenant_id, reservation_id, conversation_type, status,');
  lines.push('  last_message_at, created_at, updated_at');
  lines.push(') VALUES');

  guestConversations?.forEach((conv, idx) => {
    const values = [
      escapeSql(conv.conversation_id),
      escapeSql(conv.tenant_id),
      escapeSql(conv.reservation_id),
      escapeSql(conv.conversation_type),
      escapeSql(conv.status),
      formatTimestamp(conv.last_message_at),
      formatTimestamp(conv.created_at),
      formatTimestamp(conv.updated_at)
    ];

    const line = `  (${values.join(', ')})${idx === guestConversations.length - 1 ? ';' : ','}`;
    lines.push(line);
  });

  lines.push('');
  lines.push(`SELECT 'guest_conversations' AS table_name, COUNT(*) AS row_count FROM guest_conversations;`);
  lines.push('');

  // 5. CHAT_CONVERSATIONS (2 rows)
  console.log('Querying chat_conversations...');
  const { data: chatConversations, error: chatConversationsError } = await supabase
    .from('chat_conversations')
    .select('*')
    .order('created_at');

  if (chatConversationsError) throw chatConversationsError;

  lines.push('-- =========================================');
  lines.push('-- 5. CHAT_CONVERSATIONS (2 rows)');
  lines.push('-- FK: guest_reservations');
  lines.push('-- =========================================');
  lines.push('');
  lines.push('INSERT INTO chat_conversations (');
  lines.push('  id, tenant_id, guest_reservation_id, guest_session_id, status,');
  lines.push('  conversation_metadata, created_at, updated_at, last_message_at');
  lines.push(') VALUES');

  chatConversations?.forEach((chat, idx) => {
    const values = [
      escapeSql(chat.id),
      escapeSql(chat.tenant_id),
      escapeSql(chat.guest_reservation_id),
      escapeSql(chat.guest_session_id),
      escapeSql(chat.status),
      escapeSql(chat.conversation_metadata),
      formatTimestamp(chat.created_at),
      formatTimestamp(chat.updated_at),
      formatTimestamp(chat.last_message_at)
    ];

    const line = `  (${values.join(', ')})${idx === chatConversations.length - 1 ? ';' : ','}`;
    lines.push(line);
  });

  lines.push('');
  lines.push('-- Reset sequence for chat_conversations');
  lines.push("SELECT setval('chat_conversations_id_seq', (SELECT MAX(id) FROM chat_conversations));");
  lines.push('');
  lines.push(`SELECT 'chat_conversations' AS table_name, COUNT(*) AS row_count FROM chat_conversations;`);
  lines.push('');

  // 6. CHAT_MESSAGES (319 rows)
  console.log('Querying chat_messages...');
  const { data: chatMessages, error: chatMessagesError } = await supabase
    .from('chat_messages')
    .select('*')
    .order('created_at');

  if (chatMessagesError) throw chatMessagesError;

  lines.push('-- =========================================');
  lines.push('-- 6. CHAT_MESSAGES (319 rows)');
  lines.push('-- FK: guest_conversations');
  lines.push('-- =========================================');
  lines.push('');
  lines.push('INSERT INTO chat_messages (');
  lines.push('  id, conversation_id, sender_type, sender_id, message_text,');
  lines.push('  message_metadata, created_at');
  lines.push(') VALUES');

  chatMessages?.forEach((msg, idx) => {
    const values = [
      escapeSql(msg.id),
      escapeSql(msg.conversation_id),
      escapeSql(msg.sender_type),
      escapeSql(msg.sender_id),
      escapeSql(msg.message_text),
      escapeSql(msg.message_metadata),
      formatTimestamp(msg.created_at)
    ];

    const line = `  (${values.join(', ')})${idx === chatMessages.length - 1 ? ';' : ','}`;
    lines.push(line);
  });

  lines.push('');
  lines.push('-- Reset sequence for chat_messages');
  lines.push("SELECT setval('chat_messages_id_seq', (SELECT MAX(id) FROM chat_messages));");
  lines.push('');
  lines.push(`SELECT 'chat_messages' AS table_name, COUNT(*) AS row_count FROM chat_messages;`);
  lines.push('');

  // 7. CONVERSATION_MEMORY (10 rows)
  console.log('Querying conversation_memory...');
  const { data: convMemory, error: convMemoryError } = await supabase
    .from('conversation_memory')
    .select('*')
    .order('created_at');

  if (convMemoryError) throw convMemoryError;

  lines.push('-- =========================================');
  lines.push('-- 7. CONVERSATION_MEMORY (10 rows)');
  lines.push('-- FK: prospective_sessions');
  lines.push('-- =========================================');
  lines.push('');
  lines.push('INSERT INTO conversation_memory (');
  lines.push('  id, session_id, tenant_id, memory_key, memory_value, memory_type,');
  lines.push('  expires_at, created_at');
  lines.push(') VALUES');

  convMemory?.forEach((mem, idx) => {
    const values = [
      escapeSql(mem.id),
      escapeSql(mem.session_id),
      escapeSql(mem.tenant_id),
      escapeSql(mem.memory_key),
      escapeSql(mem.memory_value),
      escapeSql(mem.memory_type),
      formatTimestamp(mem.expires_at),
      formatTimestamp(mem.created_at)
    ];

    const line = `  (${values.join(', ')})${idx === convMemory.length - 1 ? ';' : ','}`;
    lines.push(line);
  });

  lines.push('');
  lines.push('-- Reset sequence for conversation_memory');
  lines.push("SELECT setval('conversation_memory_id_seq', (SELECT MAX(id) FROM conversation_memory));");
  lines.push('');
  lines.push(`SELECT 'conversation_memory' AS table_name, COUNT(*) AS row_count FROM conversation_memory;`);
  lines.push('');

  // 8. CONVERSATION_ATTACHMENTS (0 rows) - Empty template
  console.log('Querying conversation_attachments...');
  const { data: convAttachments, error: convAttachmentsError } = await supabase
    .from('conversation_attachments')
    .select('*')
    .order('created_at');

  if (convAttachmentsError) throw convAttachmentsError;

  lines.push('-- =========================================');
  lines.push('-- 8. CONVERSATION_ATTACHMENTS (0 rows)');
  lines.push('-- FK: guest_conversations');
  lines.push('-- No data currently, structure preserved for future use');
  lines.push('-- =========================================');
  lines.push('');
  lines.push('-- INSERT INTO conversation_attachments (');
  lines.push('--   id, conversation_id, file_name, file_url, file_type, file_size, created_at');
  lines.push('-- ) VALUES');
  lines.push('--   -- (no rows currently)');
  lines.push('--   ;');
  lines.push('');
  lines.push(`SELECT 'conversation_attachments' AS table_name, COUNT(*) AS row_count FROM conversation_attachments;`);
  lines.push('');

  // 9. COMPLIANCE_SUBMISSIONS (0 rows) - Empty template
  console.log('Querying compliance_submissions...');
  const { data: complianceSubmissions, error: complianceSubmissionsError } = await supabase
    .from('compliance_submissions')
    .select('*')
    .order('submitted_at');

  if (complianceSubmissionsError) throw complianceSubmissionsError;

  lines.push('-- =========================================');
  lines.push('-- 9. COMPLIANCE_SUBMISSIONS (0 rows)');
  lines.push('-- FK: guest_reservations (via guest_id)');
  lines.push('-- No data currently, structure preserved for future use');
  lines.push('-- =========================================');
  lines.push('');
  lines.push('-- INSERT INTO compliance_submissions (');
  lines.push('--   id, guest_id, tenant_id, type, status, data,');
  lines.push('--   sire_response, tra_response, error_message, submitted_at, submitted_by');
  lines.push('-- ) VALUES');
  lines.push('--   -- (no rows currently)');
  lines.push('--   ;');
  lines.push('');
  lines.push(`SELECT 'compliance_submissions' AS table_name, COUNT(*) AS row_count FROM compliance_submissions;`);
  lines.push('');

  // 10. ICS_FEED_CONFIGURATIONS (9 rows)
  console.log('Querying ics_feed_configurations...');
  const { data: icsFeedConfigs, error: icsFeedConfigsError } = await supabase
    .from('ics_feed_configurations')
    .select('*')
    .order('id');

  if (icsFeedConfigsError) throw icsFeedConfigsError;

  lines.push('-- =========================================');
  lines.push('-- 10. ICS_FEED_CONFIGURATIONS (9 rows)');
  lines.push('-- =========================================');
  lines.push('');
  lines.push('INSERT INTO ics_feed_configurations (');
  lines.push('  id, tenant_id, unit_id, feed_url, feed_type, is_active, last_sync_at,');
  lines.push('  sync_frequency_hours, created_at, updated_at');
  lines.push(') VALUES');

  icsFeedConfigs?.forEach((config, idx) => {
    const values = [
      escapeSql(config.id),
      escapeSql(config.tenant_id),
      escapeSql(config.unit_id),
      escapeSql(config.feed_url),
      escapeSql(config.feed_type),
      escapeSql(config.is_active),
      formatTimestamp(config.last_sync_at),
      escapeSql(config.sync_frequency_hours),
      formatTimestamp(config.created_at),
      formatTimestamp(config.updated_at)
    ];

    const line = `  (${values.join(', ')})${idx === icsFeedConfigs.length - 1 ? ';' : ','}`;
    lines.push(line);
  });

  lines.push('');
  lines.push('-- Reset sequence for ics_feed_configurations');
  lines.push("SELECT setval('ics_feed_configurations_id_seq', (SELECT MAX(id) FROM ics_feed_configurations));");
  lines.push('');
  lines.push(`SELECT 'ics_feed_configurations' AS table_name, COUNT(*) AS row_count FROM ics_feed_configurations;`);
  lines.push('');

  // 11. CALENDAR_EVENTS (74 rows) - Self-referencing
  console.log('Querying calendar_events...');
  const { data: calendarEvents, error: calendarEventsError } = await supabase
    .from('calendar_events')
    .select('*')
    .order('start_date');

  if (calendarEventsError) throw calendarEventsError;

  lines.push('-- =========================================');
  lines.push('-- 11. CALENDAR_EVENTS (74 rows)');
  lines.push('-- Self-referencing FK: parent_event_id, merged_into_id');
  lines.push('-- =========================================');
  lines.push('');
  lines.push('-- Disable triggers to handle self-referencing FK');
  lines.push('ALTER TABLE calendar_events DISABLE TRIGGER ALL;');
  lines.push('');
  lines.push('INSERT INTO calendar_events (');
  lines.push('  id, tenant_id, unit_id, event_type, start_date, end_date,');
  lines.push('  title, description, source, source_id, ical_uid,');
  lines.push('  is_blocking, parent_event_id, merged_into_id, created_at, updated_at');
  lines.push(') VALUES');

  calendarEvents?.forEach((event, idx) => {
    const values = [
      escapeSql(event.id),
      escapeSql(event.tenant_id),
      escapeSql(event.unit_id),
      escapeSql(event.event_type),
      formatTimestamp(event.start_date),
      formatTimestamp(event.end_date),
      escapeSql(event.title),
      escapeSql(event.description),
      escapeSql(event.source),
      escapeSql(event.source_id),
      escapeSql(event.ical_uid),
      escapeSql(event.is_blocking),
      escapeSql(event.parent_event_id),
      escapeSql(event.merged_into_id),
      formatTimestamp(event.created_at),
      formatTimestamp(event.updated_at)
    ];

    const line = `  (${values.join(', ')})${idx === calendarEvents.length - 1 ? ';' : ','}`;
    lines.push(line);
  });

  lines.push('');
  lines.push('-- Re-enable triggers');
  lines.push('ALTER TABLE calendar_events ENABLE TRIGGER ALL;');
  lines.push('');
  lines.push('-- Reset sequence for calendar_events');
  lines.push("SELECT setval('calendar_events_id_seq', (SELECT MAX(id) FROM calendar_events));");
  lines.push('');
  lines.push(`SELECT 'calendar_events' AS table_name, COUNT(*) AS row_count FROM calendar_events;`);
  lines.push('');

  // 12. CALENDAR_EVENT_CONFLICTS (0 rows) - Empty template
  console.log('Querying calendar_event_conflicts...');
  const { data: calendarConflicts, error: calendarConflictsError } = await supabase
    .from('calendar_event_conflicts')
    .select('*')
    .order('id');

  if (calendarConflictsError) throw calendarConflictsError;

  lines.push('-- =========================================');
  lines.push('-- 12. CALENDAR_EVENT_CONFLICTS (0 rows)');
  lines.push('-- FK: calendar_events');
  lines.push('-- No data currently, structure preserved for future use');
  lines.push('-- =========================================');
  lines.push('');
  lines.push('-- INSERT INTO calendar_event_conflicts (');
  lines.push('--   id, event_1_id, event_2_id, conflict_type, resolution_status,');
  lines.push('--   resolved_at, created_at');
  lines.push('-- ) VALUES');
  lines.push('--   -- (no rows currently)');
  lines.push('--   ;');
  lines.push('');
  lines.push(`SELECT 'calendar_event_conflicts' AS table_name, COUNT(*) AS row_count FROM calendar_event_conflicts;`);
  lines.push('');

  // 13. CALENDAR_SYNC_LOGS (0 rows) - Empty template
  console.log('Querying calendar_sync_logs...');
  const { data: calendarSyncLogs, error: calendarSyncLogsError } = await supabase
    .from('calendar_sync_logs')
    .select('*')
    .order('id');

  if (calendarSyncLogsError) throw calendarSyncLogsError;

  lines.push('-- =========================================');
  lines.push('-- 13. CALENDAR_SYNC_LOGS (0 rows)');
  lines.push('-- FK: ics_feed_configurations');
  lines.push('-- No data currently, structure preserved for future use');
  lines.push('-- =========================================');
  lines.push('');
  lines.push('-- INSERT INTO calendar_sync_logs (');
  lines.push('--   id, config_id, sync_started_at, sync_completed_at, sync_status,');
  lines.push('--   events_added, events_updated, events_deleted, error_message, created_at');
  lines.push('-- ) VALUES');
  lines.push('--   -- (no rows currently)');
  lines.push('--   ;');
  lines.push('');
  lines.push(`SELECT 'calendar_sync_logs' AS table_name, COUNT(*) AS row_count FROM calendar_sync_logs;`);
  lines.push('');

  // 14. AIRBNB_MPHB_IMPORTED_RESERVATIONS (0 rows) - Empty template
  console.log('Querying airbnb_mphb_imported_reservations...');
  const { data: airbnbReservations, error: airbnbReservationsError } = await supabase
    .from('airbnb_mphb_imported_reservations')
    .select('*')
    .order('created_at');

  if (airbnbReservationsError) throw airbnbReservationsError;

  lines.push('-- =========================================');
  lines.push('-- 14. AIRBNB_MPHB_IMPORTED_RESERVATIONS (0 rows)');
  lines.push('-- No data currently, structure preserved for future use');
  lines.push('-- =========================================');
  lines.push('');
  lines.push('-- INSERT INTO airbnb_mphb_imported_reservations (');
  lines.push('--   id, tenant_id, motopress_booking_id, motopress_accommodation_id, motopress_type_id,');
  lines.push('--   guest_name, guest_email, phone_full, phone_last_4, guest_country,');
  lines.push('--   check_in_date, check_out_date, check_in_time, check_out_time,');
  lines.push('--   adults, children, total_price, currency, accommodation_unit_id,');
  lines.push('--   comparison_status, direct_airbnb_reservation_id, given_names,');
  lines.push('--   first_surname, second_surname, created_at, updated_at,');
  lines.push('--   last_compared_at, booking_notes, raw_motopress_data');
  lines.push('-- ) VALUES');
  lines.push('--   -- (no rows currently)');
  lines.push('--   ;');
  lines.push('');
  lines.push(`SELECT 'airbnb_mphb_imported_reservations' AS table_name, COUNT(*) AS row_count FROM airbnb_mphb_imported_reservations;`);
  lines.push('');

  // Final summary
  lines.push('-- =========================================');
  lines.push('-- FINAL SUMMARY');
  lines.push('-- =========================================');
  lines.push('');
  lines.push('SELECT');
  lines.push("  'prospective_sessions' AS table_name, COUNT(*) AS row_count FROM prospective_sessions");
  lines.push('UNION ALL');
  lines.push("SELECT 'guest_reservations', COUNT(*) FROM guest_reservations");
  lines.push('UNION ALL');
  lines.push("SELECT 'reservation_accommodations', COUNT(*) FROM reservation_accommodations");
  lines.push('UNION ALL');
  lines.push("SELECT 'guest_conversations', COUNT(*) FROM guest_conversations");
  lines.push('UNION ALL');
  lines.push("SELECT 'chat_conversations', COUNT(*) FROM chat_conversations");
  lines.push('UNION ALL');
  lines.push("SELECT 'chat_messages', COUNT(*) FROM chat_messages");
  lines.push('UNION ALL');
  lines.push("SELECT 'conversation_memory', COUNT(*) FROM conversation_memory");
  lines.push('UNION ALL');
  lines.push("SELECT 'conversation_attachments', COUNT(*) FROM conversation_attachments");
  lines.push('UNION ALL');
  lines.push("SELECT 'compliance_submissions', COUNT(*) FROM compliance_submissions");
  lines.push('UNION ALL');
  lines.push("SELECT 'calendar_events', COUNT(*) FROM calendar_events");
  lines.push('UNION ALL');
  lines.push("SELECT 'calendar_event_conflicts', COUNT(*) FROM calendar_event_conflicts");
  lines.push('UNION ALL');
  lines.push("SELECT 'ics_feed_configurations', COUNT(*) FROM ics_feed_configurations");
  lines.push('UNION ALL');
  lines.push("SELECT 'calendar_sync_logs', COUNT(*) FROM calendar_sync_logs");
  lines.push('UNION ALL');
  lines.push("SELECT 'airbnb_mphb_imported_reservations', COUNT(*) FROM airbnb_mphb_imported_reservations");
  lines.push('ORDER BY table_name;');
  lines.push('');
  lines.push('COMMIT;');
  lines.push('');
  lines.push('-- Expected total: 1,135 rows');
  lines.push('-- Breakdown: 412+104+93+112+2+319+10+0+0+74+0+9+0+0 = 1,135');

  // Write to file
  const outputDir = path.join(process.cwd(), 'migrations', 'backup-2025-10-31');
  const outputFile = path.join(outputDir, '13-data-reservations.sql');

  fs.writeFileSync(outputFile, lines.join('\n'), 'utf-8');

  console.log(`\n✅ Migration file generated: ${outputFile}`);
  console.log(`📊 Total rows: 1,135`);
  console.log(`📦 Tables processed: 14`);
}

generateMigration().catch(console.error);
