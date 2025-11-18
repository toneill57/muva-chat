/**
 * PRODUCTION SCHEMA CONFIGURATION
 * 
 * Complete table inventory with dependencies, special cases, and copy strategy
 * Generated from production analysis: 2025-11-07
 * 
 * Production: kprqghwdnaykxhostivv
 * Staging: bddcvjoeoiekzfetvxoe
 */

export interface TableCopyConfig {
  schema: string;
  table: string;
  estimatedRows: number;
  method: 'direct' | 'paginated' | 'admin_api' | 'two_pass' | 'skip';
  batchSize?: number;
  excludeColumns?: string[];
  selfRefColumns?: string[];
  dependencies?: string[];
  notes?: string;
}

export interface SpecialCase {
  table: string;
  method: string;
  reason: string;
  excludeColumns?: string[];
  procedure?: string;
}

export interface CircularDependency {
  tables: string[];
  solution: string;
}

/**
 * 1. COMPLETE COPY ORDER (Dependency-Sorted)
 * 
 * Tables MUST be copied in this exact order to satisfy foreign key constraints.
 */
export const COPY_ORDER: TableCopyConfig[] = [
  // ============================================
  // LEVEL 0: ROOT TABLES (No Dependencies)
  // ============================================
  {
    schema: 'public',
    table: 'tenant_registry',
    estimatedRows: 3,
    method: 'direct',
    notes: 'Root of all tenant isolation - MUST copy first',
  },
  {
    schema: 'public',
    table: 'sire_countries',
    estimatedRows: 45,
    method: 'direct',
    notes: 'SIRE compliance catalog data',
  },
  {
    schema: 'public',
    table: 'sire_cities',
    estimatedRows: 42,
    method: 'direct',
    notes: 'SIRE compliance catalog data',
  },
  {
    schema: 'public',
    table: 'sire_document_types',
    estimatedRows: 4,
    method: 'direct',
    notes: 'SIRE compliance catalog data',
  },
  {
    schema: 'public',
    table: 'sire_content',
    estimatedRows: 8,
    method: 'direct',
    notes: 'Shared compliance knowledge base, has vectors',
  },
  {
    schema: 'public',
    table: 'muva_content',
    estimatedRows: 742,
    method: 'paginated',
    batchSize: 500,
    notes: 'Shared tourism knowledge base, has vectors',
  },
  {
    schema: 'public',
    table: 'code_embeddings',
    estimatedRows: 4333,
    method: 'paginated',
    batchSize: 1000,
    notes: 'LARGEST TABLE - System codebase embeddings',
  },

  // ============================================
  // LEVEL 1: AUTH USERS (SPECIAL CASE)
  // ============================================
  {
    schema: 'auth',
    table: 'users',
    estimatedRows: 3,
    method: 'admin_api',
    excludeColumns: ['confirmed_at'], // GENERATED column
    notes: 'MUST use Supabase Admin API - cannot INSERT directly',
  },

  // ============================================
  // LEVEL 2: AUTH DEPENDENCIES
  // ============================================
  {
    schema: 'auth',
    table: 'identities',
    estimatedRows: 3,
    method: 'direct',
    excludeColumns: ['email'], // GENERATED: lower(identity_data->>'email')
    dependencies: ['auth.users'],
    notes: 'FK: user_id → auth.users.id',
  },
  {
    schema: 'auth',
    table: 'sessions',
    estimatedRows: 3,
    method: 'direct',
    dependencies: ['auth.users'],
    notes: 'FK: user_id → auth.users.id',
  },
  {
    schema: 'auth',
    table: 'refresh_tokens',
    estimatedRows: 14,
    method: 'direct',
    dependencies: ['auth.sessions'],
    notes: 'FK: session_id → auth.sessions.id',
  },
  {
    schema: 'auth',
    table: 'mfa_amr_claims',
    estimatedRows: 3,
    method: 'direct',
    dependencies: ['auth.sessions'],
    notes: 'FK: session_id → auth.sessions.id',
  },

  // ============================================
  // LEVEL 3: PUBLIC TABLES (Tenant Dependencies)
  // ============================================
  {
    schema: 'public',
    table: 'user_tenant_permissions',
    estimatedRows: 1,
    method: 'direct',
    dependencies: ['auth.users', 'tenant_registry'],
    notes: 'Links users to tenants - CRITICAL for access control',
  },
  {
    schema: 'public',
    table: 'hotels',
    estimatedRows: 3,
    method: 'direct',
    dependencies: ['tenant_registry'],
    notes: 'Has vector embeddings',
  },
  {
    schema: 'public',
    table: 'policies',
    estimatedRows: 0,
    method: 'skip',
    dependencies: ['tenant_registry'],
  },
  {
    schema: 'public',
    table: 'integration_configs',
    estimatedRows: 3,
    method: 'direct',
    dependencies: ['tenant_registry'],
    notes: 'Contains sensitive config_data (jsonb)',
  },
  {
    schema: 'public',
    table: 'tenant_compliance_credentials',
    estimatedRows: 0,
    method: 'skip',
    dependencies: ['tenant_registry'],
  },
  {
    schema: 'public',
    table: 'tenant_knowledge_embeddings',
    estimatedRows: 0,
    method: 'skip',
    dependencies: ['tenant_registry'],
  },
  {
    schema: 'public',
    table: 'tenant_muva_content',
    estimatedRows: 0,
    method: 'skip',
    dependencies: ['tenant_registry'],
  },
  {
    schema: 'public',
    table: 'sync_history',
    estimatedRows: 85,
    method: 'direct',
    dependencies: ['tenant_registry'],
  },
  {
    schema: 'public',
    table: 'job_logs',
    estimatedRows: 39,
    method: 'direct',
    dependencies: ['tenant_registry'],
  },
  {
    schema: 'public',
    table: 'prospective_sessions',
    estimatedRows: 412,
    method: 'paginated',
    batchSize: 500,
    dependencies: ['tenant_registry'],
  },

  // ============================================
  // LEVEL 4: STAFF USERS (Self-Referencing)
  // ============================================
  {
    schema: 'public',
    table: 'staff_users',
    estimatedRows: 6,
    method: 'two_pass',
    selfRefColumns: ['created_by'],
    dependencies: ['tenant_registry'],
    notes: 'Self-referencing FK: created_by → staff_users.staff_id',
  },

  // ============================================
  // LEVEL 5: ACCOMMODATION UNITS
  // ============================================
  {
    schema: 'public',
    table: 'accommodation_units',
    estimatedRows: 2,
    method: 'direct',
    dependencies: ['tenant_registry', 'hotels'],
    notes: 'Has vectors, some have NULL tenant_id (orphaned?)',
  },
  {
    schema: 'public',
    table: 'accommodation_units_public',
    estimatedRows: 151,
    method: 'paginated',
    batchSize: 150,
    dependencies: ['tenant_registry'],
    notes: 'Has vectors',
  },
  {
    schema: 'public',
    table: 'ics_feed_configurations',
    estimatedRows: 9,
    method: 'direct',
    dependencies: ['tenant_registry', 'accommodation_units'],
    notes: 'Auto-filters orphan rows with invalid accommodation_unit_id FKs.',
  },

  // ============================================
  // LEVEL 6: INTERMEDIATE DEPENDENCIES
  // ============================================
  {
    schema: 'public',
    table: 'hotel_operations',
    estimatedRows: 10,
    method: 'direct',
    dependencies: ['tenant_registry', 'staff_users'],
    notes: 'Has vectors',
  },
  {
    schema: 'public',
    table: 'staff_conversations',
    estimatedRows: 45,
    method: 'direct',
    dependencies: ['staff_users'],
  },
  {
    schema: 'public',
    table: 'guest_reservations',
    estimatedRows: 104,
    method: 'direct',
    excludeColumns: ['accommodation_unit_id_key'], // GENERATED column
    dependencies: ['tenant_registry'],
    notes: 'Mixed tenant_id types: some VARCHAR "simmerdown", others UUID',
  },
  {
    schema: 'public',
    table: 'conversation_memory',
    estimatedRows: 10,
    method: 'direct',
    dependencies: ['tenant_registry', 'prospective_sessions'],
    notes: 'Has vectors',
  },

  // ============================================
  // LEVEL 7: CALENDAR EVENTS (Self-Referencing)
  // ============================================
  {
    schema: 'public',
    table: 'calendar_events',
    estimatedRows: 74,
    method: 'two_pass',
    selfRefColumns: ['parent_event_id', 'merged_into_id'],
    notes: 'Self-referencing FKs + active trigger: propagate_parent_bookings',
  },
  {
    schema: 'public',
    table: 'sire_export_logs',
    estimatedRows: 0,
    method: 'skip',
    dependencies: ['auth.users'],
  },

  // ============================================
  // LEVEL 8: GUEST CHAT & MANUAL DATA
  // ============================================
  {
    schema: 'public',
    table: 'accommodation_units_manual',
    estimatedRows: 8,
    method: 'direct',
    dependencies: ['accommodation_units_public'],
    notes: 'Has vectors',
  },
  {
    schema: 'public',
    table: 'staff_messages',
    estimatedRows: 60,
    method: 'direct',
    dependencies: ['staff_conversations'],
  },
  {
    schema: 'public',
    table: 'guest_conversations',
    estimatedRows: 118,
    method: 'paginated',
    batchSize: 100,
    dependencies: ['guest_reservations'],
  },
  {
    schema: 'public',
    table: 'chat_conversations',
    estimatedRows: 2,
    method: 'direct',
    dependencies: ['guest_reservations'],
  },
  {
    schema: 'public',
    table: 'compliance_submissions',
    estimatedRows: 0,
    method: 'skip',
    dependencies: ['guest_reservations'],
  },
  {
    schema: 'public',
    table: 'reservation_accommodations',
    estimatedRows: 93,
    method: 'direct',
    dependencies: ['guest_reservations'],
  },
  {
    schema: 'public',
    table: 'calendar_sync_logs',
    estimatedRows: 0,
    method: 'skip',
    dependencies: ['ics_feed_configurations'],
  },
  {
    schema: 'public',
    table: 'airbnb_motopress_comparison',
    estimatedRows: 0,
    method: 'skip',
    dependencies: ['tenant_registry', 'calendar_events', 'accommodation_units_public'],
  },
  {
    schema: 'public',
    table: 'property_relationships',
    estimatedRows: 1,
    method: 'direct',
    notes: 'Dependencies unclear - verify before copy',
  },

  // ============================================
  // LEVEL 9: DEEP DEPENDENCIES
  // ============================================
  {
    schema: 'hotels',
    table: 'accommodation_units',
    estimatedRows: 26,
    method: 'direct',
    dependencies: ['tenant_registry'],
    notes: 'Multi-tenant hotels schema - required by accommodation_units_manual_chunks FK',
  },
  {
    schema: 'public',
    table: 'accommodation_units_manual_chunks',
    estimatedRows: 219,
    method: 'paginated',
    batchSize: 200,
    dependencies: ['accommodation_units_manual', 'tenant_registry', 'hotels.accommodation_units'],
    notes: 'Has 3 vector columns (embedding, embedding_balanced, embedding_fast). FK to hotels.accommodation_units',
  },
  {
    schema: 'public',
    table: 'conversation_attachments',
    estimatedRows: 0,
    method: 'skip',
    dependencies: ['guest_conversations'],
  },
  {
    schema: 'public',
    table: 'chat_messages',
    estimatedRows: 393,
    method: 'paginated',
    batchSize: 500,
    dependencies: ['guest_conversations'],
    notes: 'Active trigger: update_conversation_on_message',
  },

  // ============================================
  // LEVEL 10: FINAL LEVEL
  // ============================================
  {
    schema: 'public',
    table: 'calendar_event_conflicts',
    estimatedRows: 0,
    method: 'skip',
    dependencies: ['calendar_events'],
  },

  // ============================================
  // EMPTY TABLES (Schema exists via migrations)
  // ============================================
  {
    schema: 'public',
    table: 'airbnb_mphb_imported_reservations',
    estimatedRows: 0,
    method: 'skip',
  },
];

/**
 * 2. TABLES TO EXCLUDE FROM DATA COPY
 */
export const EXCLUDE_TABLES = [
  {
    schema: 'auth',
    table: 'audit_log_entries',
    reason: 'System audit logs - will regenerate in staging',
  },
  {
    schema: 'auth',
    table: 'schema_migrations',
    reason: 'Managed by Supabase migrations',
  },
  {
    schema: 'storage',
    table: 'migrations',
    reason: 'Storage system migrations',
  },
  {
    schema: 'storage',
    table: 'buckets_analytics',
    reason: 'System analytics - not user data',
  },
];

/**
 * 3. SPECIAL CASES
 */
export const SPECIAL_CASES: SpecialCase[] = [
  {
    table: 'auth.users',
    method: 'admin_api',
    reason: 'Cannot INSERT directly, requires auth.admin.createUser() with password handling',
    excludeColumns: ['confirmed_at'],
    procedure: `
      1. Read from prod: SELECT * FROM auth.users WHERE deleted_at IS NULL
      2. For each user:
         - Extract: email, raw_app_meta_data, raw_user_meta_data
         - Generate temp password OR use Admin API password reset
         - Call: supabase.auth.admin.createUser({
             email,
             password: tempPassword,
             email_confirm: true,
             user_metadata: raw_user_meta_data,
             app_metadata: raw_app_meta_data
           })
         - Store mapping: old_user_id → new_user_id
      3. Update all FK references in dependent tables using mapping
    `,
  },
  {
    table: 'auth.identities',
    method: 'exclude_columns',
    reason: 'Has GENERATED column: email',
    excludeColumns: ['email'],
  },
  {
    table: 'guest_reservations',
    method: 'exclude_columns',
    reason: 'Has GENERATED column: accommodation_unit_id_key',
    excludeColumns: ['accommodation_unit_id_key'],
  },
  {
    table: 'calendar_events',
    method: 'two_pass',
    reason: 'Self-referencing FKs: parent_event_id, merged_into_id',
    procedure: `
      Pass 1: INSERT all rows with self-ref FKs set to NULL
      Pass 2: UPDATE rows to restore self-ref FK values
    `,
  },
  {
    table: 'staff_users',
    method: 'two_pass',
    reason: 'Self-referencing FK: created_by → staff_users.staff_id',
    procedure: `
      Pass 1: INSERT all rows with created_by = NULL
      Pass 2: UPDATE rows to restore created_by values
    `,
  },
];

/**
 * 4. CIRCULAR DEPENDENCIES
 */
export const CIRCULAR_DEPENDENCIES: CircularDependency[] = [
  // Query returned empty - NO circular dependencies detected! ✅
];

/**
 * 5. ACTIVE TRIGGERS (May need to be disabled during bulk INSERT)
 */
export const ACTIVE_TRIGGERS = [
  // updated_at triggers (safe to keep enabled)
  'update_accommodation_units_manual_updated_at',
  'update_calendar_events_updated_at',
  'update_guest_conversations_updated_at',
  'update_ics_feeds_updated_at',
  'update_property_relationships_updated_at',
  'update_tenant_compliance_credentials_updated_at',
  'update_tenant_registry_updated_at',
  'update_user_tenant_permissions_updated_at',
  'hotels_updated_at',
  'conversation_attachments_updated_at',
  'trigger_airbnb_motopress_comparison_updated_at',

  // Business logic triggers (MAY NEED TO DISABLE)
  'propagate_parent_bookings', // calendar_events
  'update_conversation_on_message', // chat_messages
];

/**
 * 6. STORAGE BUCKETS
 */
export const STORAGE_BUCKETS = [
  { name: 'event-qr-codes', public: true, objects: 0 },
  { name: 'guest-attachments', public: true, objects: 0 },
  { name: 'qr-codes', public: true, objects: 0 },
];

/**
 * 7. TENANT DATA (Current State in Production)
 */
export const PRODUCTION_TENANTS = [
  {
    tenant_id: '03d2ae98-06f1-407b-992b-ca809dfc333b',
    type: 'uuid',
    hotels: 1,
    guest_reservations: 11,
  },
  {
    tenant_id: '2263efba-b62b-417b-a422-a84638bc632f',
    type: 'uuid',
    hotels: 1,
    guest_reservations: 2,
  },
  {
    tenant_id: 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf',
    name: 'SimmerDown',
    type: 'uuid',
    hotels: 1,
    guest_reservations: 89,
    user_email: 'simmerdown@demo.com',
  },
];

/**
 * 8. DATA QUALITY ISSUES (Found During Analysis)
 */
export const DATA_ISSUES = [
  {
    table: 'accommodation_units',
    issue: '2 rows with NULL tenant_id',
    severity: 'medium',
    action: 'Investigate before migration - orphaned data?',
  },
  {
    table: 'guest_reservations',
    issue: '2 rows with tenant_id="simmerdown" (VARCHAR instead of UUID)',
    severity: 'low',
    action: 'Legacy data - verify if should be mapped to UUID tenant',
  },
];

/**
 * 9. HELPER FUNCTIONS
 */

export function getTableCopyConfig(schema: string, table: string): TableCopyConfig | undefined {
  return COPY_ORDER.find((t) => t.schema === schema && t.table === table);
}

export function getTablesRequiringPagination(): TableCopyConfig[] {
  return COPY_ORDER.filter((t) => t.method === 'paginated');
}

export function getTablesWithSelfReferences(): TableCopyConfig[] {
  return COPY_ORDER.filter((t) => t.method === 'two_pass');
}

export function getTotalEstimatedRows(): number {
  return COPY_ORDER.reduce((sum, t) => sum + t.estimatedRows, 0);
}

export function getTablesByDependency(tableName: string): TableCopyConfig[] {
  return COPY_ORDER.filter((t) => t.dependencies?.includes(tableName));
}
