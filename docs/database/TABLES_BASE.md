# Base Tables Documentation

**Last Updated:** October 30, 2025  
**Database:** Production (ooaumjzaztmutltifhoq)  
**Scope:** Foundational tables (Level 0 dependencies)

## Overview

This document details the **foundational tables** that form the architectural base of the MUVA Chat platform. These tables have minimal or no foreign key dependencies and are essential for multi-tenant isolation, authentication, and core configuration.

**Tables covered:**
- `tenant_registry` - Multi-tenant registry (root table - Level 0)
- `staff_users` - Staff authentication and roles (Level 1)
- `user_tenant_permissions` - RBAC permissions (Level 1)
- `sire_countries` - SIRE country codes catalog (Level 0)
- `sire_document_types` - SIRE document types catalog (Level 0)

**Row Counts (Production):**
| Table | Row Count | Purpose |
|-------|-----------|---------|
| tenant_registry | 3 | Active tenants |
| staff_users | 6 | Staff accounts across all tenants |
| user_tenant_permissions | 1 | RBAC permission mappings |
| sire_countries | 45 | SIRE-compliant country codes |
| sire_document_types | 4 | SIRE-compliant document types |

---

## tenant_registry

**Purpose:** The foundational table for the multi-tenant architecture. Each row represents a hotel/tourism business tenant with their own subdomain, branding configuration, and feature entitlements. This is the only table without a `tenant_id` foreign key - it IS the tenant definition itself.

**Row Count (Production):** 3 tenants (simmerdown, tucasamar, loscedrosboutique)  
**RLS Enabled:** Yes  
**Dependencies:** None - Level 0 table (root of dependency tree)

### Schema Definition

**Columns:**
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| tenant_id | uuid | NO | gen_random_uuid() | Primary key - unique tenant identifier |
| nit | varchar(20) | NO | - | Colombian Tax ID (NIT) - unique |
| razon_social | varchar(255) | NO | - | Legal business name |
| nombre_comercial | varchar(255) | NO | - | Commercial/trade name |
| schema_name | varchar(63) | NO | - | Database schema name (legacy, not currently used) |
| tenant_type | varchar(50) | YES | 'hotel' | Business type (hotel, hostel, etc.) |
| is_active | boolean | YES | true | Active status flag |
| created_at | timestamptz | YES | now() | Creation timestamp |
| updated_at | timestamptz | YES | now() | Last update timestamp |
| slug | varchar(50) | YES | - | URL slug (unique) |
| subscription_tier | varchar(20) | YES | 'free' | Subscription level (free/basic/premium) |
| features | jsonb | YES | See below | Feature flags configuration |
| subdomain | text | NO | - | Subdomain identifier (e.g., 'simmerdown') - unique |
| address | text | YES | - | Physical business address |
| phone | varchar(50) | YES | - | Contact phone number |
| email | varchar(255) | YES | - | Contact email |
| social_media_links | jsonb | YES | {} | Social media URLs |
| seo_meta_description | text | YES | - | SEO meta description |
| seo_keywords | text[] | YES | - | SEO keywords array |
| landing_page_content | jsonb | YES | See below | Landing page configuration |
| logo_url | text | YES | - | Logo image URL |
| business_name | text | YES | - | Display business name |
| primary_color | varchar(7) | YES | '#3B82F6' | Brand primary color (hex) |
| chat_cta_link | text | YES | '/with-me' | Chat CTA button link |

**Default JSONB Values:**

```json
// features default
{
  "muva_access": false,
  "premium_chat": false,
  "guest_chat_enabled": true,
  "staff_chat_enabled": true
}

// landing_page_content default
{
  "hero": {
    "title": "",
    "subtitle": "",
    "cta_text": "Get Started",
    "cta_link": "/chat"
  },
  "about": {
    "title": "About Us",
    "content": ""
  },
  "services": {
    "title": "Our Services",
    "items": []
  },
  "gallery": {
    "title": "Gallery",
    "images": []
  },
  "contact": {
    "title": "Contact Us",
    "email": "",
    "phone": "",
    "address": ""
  }
}
```

### Primary Key
- `tenant_id` (UUID, auto-generated)

### Foreign Keys

**Outgoing:**
- None (Level 0 table - root of dependency tree)

**Incoming (17 tables reference this table):**
- `accommodation_units.tenant_id` → `tenant_registry.tenant_id`
- `accommodation_units_manual_chunks.tenant_id` → `tenant_registry.tenant_id`
- `accommodation_units_public.tenant_id` → `tenant_registry.tenant_id`
- `airbnb_motopress_comparison.tenant_id` → `tenant_registry.tenant_id`
- `conversation_memory.tenant_id` → `tenant_registry.tenant_id`
- `hotel_operations.tenant_id` → `tenant_registry.tenant_id`
- `hotels.tenant_id` → `tenant_registry.tenant_id`
- `integration_configs.tenant_id` → `tenant_registry.tenant_id`
- `job_logs.tenant_id` → `tenant_registry.tenant_id`
- `policies.tenant_id` → `tenant_registry.tenant_id`
- `prospective_sessions.tenant_id` → `tenant_registry.tenant_id`
- `staff_users.tenant_id` → `tenant_registry.tenant_id`
- `sync_history.tenant_id` → `tenant_registry.tenant_id`
- `tenant_compliance_credentials.tenant_id` → `tenant_registry.tenant_id`
- `tenant_knowledge_embeddings.tenant_id` → `tenant_registry.tenant_id`
- `tenant_muva_content.tenant_id` → `tenant_registry.tenant_id`
- `user_tenant_permissions.tenant_id` → `tenant_registry.tenant_id`

**Total: 17 tables depend on tenant_registry**

### Indexes

| Index Name | Type | Columns | Purpose |
|------------|------|---------|---------|
| tenant_registry_pkey | PRIMARY KEY | tenant_id | Unique identifier |
| tenant_registry_nit_key | UNIQUE | nit | Enforce unique NIT (Colombian tax ID) |
| tenant_registry_schema_name_key | UNIQUE | schema_name | Enforce unique schema names (legacy) |
| tenant_registry_slug_key | UNIQUE | slug | Enforce unique URL slugs |
| tenant_registry_subdomain_key | UNIQUE | subdomain | Enforce unique subdomains |
| tenant_registry_subdomain_idx | BTREE | subdomain | Fast subdomain lookups (routing) |
| idx_tenant_registry_slug | BTREE | slug | Fast slug-based queries |
| idx_tenant_subscription_tier | BTREE | subscription_tier | Filter by subscription tier |
| idx_tenant_features | GIN | features | JSONB feature flag queries |
| idx_tenant_registry_email | BTREE | email | Email lookups (partial index: WHERE email IS NOT NULL) |
| idx_tenant_registry_social_media | GIN | social_media_links | JSONB social media queries |
| idx_tenant_registry_seo_keywords | GIN | seo_keywords | Array-based SEO keyword searches |

### RLS Policies

**Status:** RLS Enabled

**Policies:**

1. **tenant_registry_public_select** (`SELECT`)
   - **Roles:** public
   - **Condition:** `true`
   - **Purpose:** Allow public read access to tenant registry for routing and subdomain resolution

2. **Users can view tenants they have access to** (`SELECT`)
   - **Roles:** public
   - **Condition:** `tenant_id IN (SELECT tenant_id FROM user_tenant_permissions WHERE user_id = auth.uid() AND is_active = true)`
   - **Purpose:** Authenticated users can view tenants they have permissions for

3. **Only service role can create tenants** (`INSERT`)
   - **Roles:** public
   - **Condition:** `auth.role() = 'service_role'`
   - **Purpose:** Prevent unauthorized tenant creation

4. **Only service role can update tenants** (`UPDATE`)
   - **Roles:** public
   - **Condition:** `auth.role() = 'service_role'`
   - **Purpose:** Restrict tenant configuration updates to service role

5. **Only service role can delete tenants** (`DELETE`)
   - **Roles:** public
   - **Condition:** `auth.role() = 'service_role'`
   - **Purpose:** Prevent unauthorized tenant deletion

**Security Notes:**
- Public SELECT access is necessary for subdomain-based routing
- All write operations restricted to service_role only
- Multi-tenant isolation enforced through user_tenant_permissions table

### Triggers

| Trigger | Event | Action | Purpose |
|---------|-------|--------|---------|
| update_tenant_registry_updated_at | UPDATE | update_updated_at_column() | Auto-update updated_at timestamp on any UPDATE |

### Sample Data (Production)

```json
[
  {
    "tenant_id": "b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf",
    "subdomain": "simmerdown",
    "nombre_comercial": "Simmer Down Guest House",
    "tenant_type": "hotel",
    "is_active": true,
    "subscription_tier": "premium",
    "created_at": "2025-09-22T23:15:20.758991Z"
  },
  {
    "tenant_id": "2263efba-b62b-417b-a422-a84638bc632f",
    "subdomain": "tucasamar",
    "nombre_comercial": "Tu Casa en el Mar",
    "tenant_type": "hotel",
    "is_active": true,
    "subscription_tier": "basic",
    "created_at": "2025-10-11T17:34:33.414322Z"
  },
  {
    "tenant_id": "03d2ae98-06f1-407b-992b-ca809dfc333b",
    "subdomain": "loscedrosboutique",
    "nombre_comercial": "Casa Boutique los Cedros",
    "tenant_type": "hotel",
    "is_active": true,
    "subscription_tier": "premium",
    "created_at": "2025-10-19T00:27:22.486345Z"
  }
]
```

### Usage Patterns

**Common Queries:**

```sql
-- Get tenant by subdomain (most common - used in routing)
SELECT tenant_id, subdomain, nombre_comercial, subscription_tier, features
FROM tenant_registry
WHERE subdomain = 'simmerdown' AND is_active = true;

-- List all active premium tenants
SELECT tenant_id, subdomain, nombre_comercial
FROM tenant_registry
WHERE is_active = true 
  AND subscription_tier = 'premium'
ORDER BY created_at DESC;

-- Check if specific feature is enabled for tenant
SELECT tenant_id, subdomain, 
       features->>'muva_access' as muva_enabled,
       features->>'premium_chat' as premium_chat_enabled
FROM tenant_registry
WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf';

-- Get tenant branding configuration
SELECT subdomain, logo_url, primary_color, business_name, 
       landing_page_content
FROM tenant_registry
WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf';
```

**Performance Considerations:**
- `subdomain` lookups are heavily indexed (most common query pattern)
- GIN indexes on JSONB columns support feature flag queries efficiently
- Public RLS policy allows fast routing without authentication

### Related Tables

**Direct Dependencies (FK from this table):**
- None - this is a Level 0 table

**Tables that depend on this:**
- All 17 operational tables (see Incoming FK section above)
- Most critical: `staff_users`, `user_tenant_permissions`, `accommodation_units`

**Related by Business Logic:**
- `staff_users` - Staff members belong to tenants
- `user_tenant_permissions` - Controls user access to tenants
- `tenant_compliance_credentials` - SIRE credentials per tenant

### Migration Notes

**Pre-Migration:**
- This table MUST be migrated first (root dependency)
- Preserve exact `tenant_id` UUIDs (referenced by 17 tables)
- Verify unique constraints: subdomain, nit, slug, schema_name
- Backup current `features` and `landing_page_content` JSONB

**Post-Migration Validation:**

```sql
-- Validate tenant count
SELECT COUNT(*) FROM tenant_registry; -- Must be 3

-- Validate unique constraints
SELECT subdomain, COUNT(*) 
FROM tenant_registry 
GROUP BY subdomain 
HAVING COUNT(*) > 1; -- Must return 0 rows

-- Validate all active tenants have required fields
SELECT tenant_id, subdomain
FROM tenant_registry
WHERE is_active = true
  AND (subdomain IS NULL OR nombre_comercial IS NULL OR nit IS NULL);
-- Must return 0 rows

-- Validate tenant_id preservation (check one known tenant)
SELECT tenant_id, subdomain 
FROM tenant_registry 
WHERE subdomain = 'simmerdown'; 
-- Must return: b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf
```

**Critical Migration Rules:**
- DO NOT change tenant_id values (breaks 17 FK references)
- DO preserve all JSONB structures exactly
- DO maintain unique constraint data
- TEST subdomain-based routing after migration

### Change History

| Date | Change | Reason |
|------|--------|--------|
| 2025-10-30 | Documented for migration | Phase 1 documentation |
| 2025-10-19 | Added loscedrosboutique tenant | Third production tenant onboarded |
| 2025-10-11 | Added tucasamar tenant | Second production tenant onboarded |
| 2025-09-22 | Added simmerdown tenant | First production tenant (pilot) |

---

## staff_users

**Purpose:** Stores authentication credentials and profile information for staff members (employees) of tenant organizations. Each staff user belongs to exactly one tenant and has role-based permissions. Used for staff portal authentication via username/password.

**Row Count (Production):** 6 staff users (2 CEOs, 3 admins, 1 housekeeper)  
**RLS Enabled:** Yes  
**Dependencies:** 
- `tenant_registry.tenant_id` (staff belongs to tenant)
- `staff_users.staff_id` (self-reference for created_by)

### Schema Definition

**Columns:**
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| staff_id | uuid | NO | gen_random_uuid() | Primary key - unique staff identifier |
| tenant_id | uuid | NO | - | FK to tenant_registry - staff belongs to this tenant |
| role | varchar(20) | NO | - | Staff role (ceo, admin, manager, agent, housekeeper) |
| username | varchar(50) | NO | - | Login username (unique across platform) |
| password_hash | text | NO | - | bcrypt hashed password |
| full_name | text | NO | - | Staff member's full name |
| email | text | YES | - | Staff email address |
| phone | text | YES | - | Staff phone number |
| permissions | jsonb | YES | See below | Granular permission flags |
| is_active | boolean | YES | true | Active status flag |
| last_login_at | timestamptz | YES | - | Timestamp of last successful login |
| created_at | timestamptz | YES | now() | Account creation timestamp |
| updated_at | timestamptz | YES | now() | Last update timestamp |
| created_by | uuid | YES | - | FK to staff_users.staff_id (who created this account) |

**Default JSONB Value (permissions):**

```json
{
  "admin_panel": false,
  "sire_access": true,
  "reports_access": false,
  "modify_operations": false
}
```

### Primary Key
- `staff_id` (UUID, auto-generated)

### Foreign Keys

**Outgoing:**
- `tenant_id` → `tenant_registry.tenant_id` (staff belongs to tenant)
- `created_by` → `staff_users.staff_id` (self-reference, who created this account)

**Incoming:**
- `staff_users.created_by` → `staff_users.staff_id` (self-reference)
- Other tables may reference staff_id for audit trails

### Indexes

| Index Name | Type | Columns | Purpose |
|------------|------|---------|---------|
| staff_users_pkey | PRIMARY KEY | staff_id | Unique identifier |
| staff_users_username_key | UNIQUE | username | Enforce unique usernames globally |
| idx_staff_users_username | BTREE | username | Fast username lookups (partial: WHERE is_active = true) |
| idx_staff_users_tenant | BTREE | tenant_id | Filter staff by tenant (partial: WHERE is_active = true) |
| idx_staff_users_role | BTREE | tenant_id, role | Filter staff by tenant and role combination |

### RLS Policies

**Status:** RLS Enabled

**Policies:**

1. **staff_own_profile** (`SELECT`)
   - **Roles:** public
   - **Condition:** `staff_id = current_setting('request.jwt.claim.staff_id', true)::uuid`
   - **Purpose:** Staff can view their own profile

2. **staff_admin_view_all** (`SELECT`)
   - **Roles:** public
   - **Condition:** `tenant_id = current_setting('request.jwt.claim.tenant_id', true)::uuid AND current_setting('request.jwt.claim.role', true) IN ('ceo', 'admin')`
   - **Purpose:** CEOs and admins can view all staff in their tenant

**Security Notes:**
- No public INSERT/UPDATE/DELETE policies (managed by service_role)
- Staff can only see their own profile or profiles within their tenant (if admin/ceo)
- Username uniqueness enforced globally (cross-tenant)
- Passwords stored as bcrypt hashes only

### Triggers

**None** - No triggers configured on this table (updated_at could benefit from auto-update trigger)

### Sample Data (Anonymized)

**Role Distribution:**
```json
[
  { "role": "ceo", "count": 2, "active_count": 2 },
  { "role": "admin", "count": 3, "active_count": 3 },
  { "role": "housekeeper", "count": 1, "active_count": 1 }
]
```

**Example Structure (anonymized):**
```json
{
  "staff_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "tenant_id": "b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf",
  "role": "admin",
  "username": "admin_user",
  "full_name": "Administrator Name",
  "email": "admin@example.com",
  "permissions": {
    "admin_panel": true,
    "sire_access": true,
    "reports_access": true,
    "modify_operations": true
  },
  "is_active": true,
  "created_at": "2025-10-15T10:00:00Z"
}
```

### Usage Patterns

**Common Queries:**

```sql
-- Authenticate staff user (login)
SELECT staff_id, tenant_id, role, full_name, password_hash, permissions
FROM staff_users
WHERE username = 'admin_user' 
  AND is_active = true;

-- Get all staff for a tenant (admin view)
SELECT staff_id, username, full_name, role, email, is_active, last_login_at
FROM staff_users
WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
  AND is_active = true
ORDER BY role, full_name;

-- Update last login timestamp
UPDATE staff_users 
SET last_login_at = NOW()
WHERE staff_id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';

-- Count staff by role for tenant
SELECT role, COUNT(*) as staff_count
FROM staff_users
WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
  AND is_active = true
GROUP BY role;
```

**Performance Considerations:**
- Username index optimized for login queries (most frequent operation)
- Tenant+role composite index for staff management dashboards
- Consider adding trigger for updated_at auto-update

### Related Tables

**Direct Dependencies (FK from this table):**
- → `tenant_registry` (staff belongs to tenant)
- → `staff_users` (self-reference for created_by audit trail)

**Tables that depend on this:**
- ← `staff_users` (self-reference)
- Potentially audit logs, chat messages sent by staff, etc.

**Related by Business Logic:**
- `user_tenant_permissions` - Alternative RBAC system (not currently used for staff)
- `tenant_registry` - Tenant the staff belongs to

### Migration Notes

**Pre-Migration:**
- NEVER migrate password_hash values (security risk)
- Generate new password_hashes in target environment
- Preserve staff_id UUIDs for audit trail consistency
- Validate tenant_id references exist in tenant_registry
- Document process for staff to reset passwords post-migration

**Post-Migration Validation:**

```sql
-- Validate staff count
SELECT COUNT(*) FROM staff_users; -- Must match source

-- Validate all staff have valid tenant references
SELECT s.staff_id, s.username, s.tenant_id
FROM staff_users s
LEFT JOIN tenant_registry t ON s.tenant_id = t.tenant_id
WHERE t.tenant_id IS NULL;
-- Must return 0 rows

-- Validate unique usernames
SELECT username, COUNT(*) 
FROM staff_users 
GROUP BY username 
HAVING COUNT(*) > 1; -- Must return 0 rows

-- Validate role distribution
SELECT role, COUNT(*) as count
FROM staff_users
GROUP BY role
ORDER BY count DESC;
-- Compare to source distribution
```

**Critical Migration Rules:**
- DO NOT copy password_hash values (regenerate in target)
- DO preserve staff_id UUIDs
- DO verify tenant_id references
- DOCUMENT password reset process for all staff

### Change History

| Date | Change | Reason |
|------|--------|--------|
| 2025-10-30 | Documented for migration | Phase 1 documentation |
| 2025-10-15 | Added housekeeper role | New role type for operations staff |

---

## user_tenant_permissions

**Purpose:** Implements Role-Based Access Control (RBAC) for the platform. Defines which users have access to which tenants and what role/permissions they have. This is a many-to-many relationship table between users (auth.users or staff_users) and tenants.

**Row Count (Production):** 1 permission record  
**RLS Enabled:** Yes  
**Dependencies:** 
- `tenant_registry.tenant_id` (permission grants access to tenant)
- `auth.users` or `staff_users` (user_id references - not enforced by FK)

### Schema Definition

**Columns:**
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key - unique permission record |
| user_id | uuid | NO | - | User identifier (from auth.users or staff_users) |
| tenant_id | uuid | NO | - | FK to tenant_registry - grants access to this tenant |
| role | varchar(50) | NO | 'viewer' | Role within tenant (owner, admin, manager, viewer) |
| permissions | jsonb | YES | {} | Granular permission overrides |
| granted_by | uuid | YES | - | User who granted this permission (audit trail) |
| granted_at | timestamptz | YES | now() | When permission was granted |
| expires_at | timestamptz | YES | - | Optional expiration timestamp |
| is_active | boolean | YES | true | Active status flag |
| created_at | timestamptz | YES | now() | Record creation timestamp |
| updated_at | timestamptz | YES | now() | Last update timestamp |

### Primary Key
- `id` (UUID, auto-generated)

### Unique Constraints
- `(user_id, tenant_id)` - A user can only have one permission record per tenant

### Foreign Keys

**Outgoing:**
- `tenant_id` → `tenant_registry.tenant_id` (permission grants access to tenant)

**Incoming:**
- None directly (but referenced by RLS policies in other tables)

**Note:** `user_id` does NOT have a formal FK constraint - it can reference either `auth.users.id` or `staff_users.staff_id` depending on authentication system used.

### Indexes

| Index Name | Type | Columns | Purpose |
|------------|------|---------|---------|
| user_tenant_permissions_pkey | PRIMARY KEY | id | Unique identifier |
| user_tenant_permissions_user_id_tenant_id_key | UNIQUE | user_id, tenant_id | Enforce one permission per user-tenant pair |
| idx_user_tenant_permissions_user_id | BTREE | user_id | Fast lookups by user |
| idx_user_tenant_permissions_tenant_id | BTREE | tenant_id | Fast lookups by tenant |
| idx_user_tenant_permissions_role | BTREE | role | Filter by role type |
| idx_user_tenant_permissions_active | BTREE | is_active | Optimized for active permissions (partial: WHERE is_active = true) |

### RLS Policies

**Status:** RLS Enabled

**Policies:**

1. **Users can view own permissions** (`SELECT`)
   - **Roles:** public
   - **Condition:** `auth.uid() = user_id`
   - **Purpose:** Users can see which tenants they have access to

2. **Tenant admins can manage permissions** (`ALL`)
   - **Roles:** public
   - **Condition:** `EXISTS (SELECT 1 FROM user_tenant_permissions utp WHERE utp.user_id = auth.uid() AND utp.tenant_id = user_tenant_permissions.tenant_id AND utp.role IN ('owner', 'admin') AND utp.is_active = true)`
   - **Purpose:** Tenant owners and admins can grant/revoke permissions within their tenant

**Security Notes:**
- Prevents users from granting themselves permissions to other tenants
- Admins can only manage permissions within their own tenant
- Circular permission grants prevented by requiring existing admin/owner permission

### Triggers

**None** - No triggers configured (could benefit from updated_at auto-update)

### Sample Data (Anonymized)

**Current State:**
```json
{
  "total_permissions": 1,
  "active_permissions": 1,
  "role_distribution": [
    { "role": "admin", "count": 1 }
  ]
}
```

**Example Structure:**
```json
{
  "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "user_id": "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy",
  "tenant_id": "b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf",
  "role": "admin",
  "permissions": {
    "manage_staff": true,
    "view_analytics": true,
    "manage_integrations": true
  },
  "granted_by": "zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz",
  "granted_at": "2025-10-15T10:00:00Z",
  "expires_at": null,
  "is_active": true
}
```

### Usage Patterns

**Common Queries:**

```sql
-- Get all tenants a user has access to
SELECT t.tenant_id, t.subdomain, t.nombre_comercial, utp.role
FROM user_tenant_permissions utp
JOIN tenant_registry t ON utp.tenant_id = t.tenant_id
WHERE utp.user_id = 'user-uuid-here'
  AND utp.is_active = true
  AND t.is_active = true;

-- Check if user has admin access to specific tenant
SELECT EXISTS (
  SELECT 1 FROM user_tenant_permissions
  WHERE user_id = 'user-uuid-here'
    AND tenant_id = 'tenant-uuid-here'
    AND role IN ('owner', 'admin')
    AND is_active = true
) as is_admin;

-- List all users with access to a tenant
SELECT utp.user_id, utp.role, utp.granted_at, utp.expires_at
FROM user_tenant_permissions utp
WHERE utp.tenant_id = 'tenant-uuid-here'
  AND utp.is_active = true
ORDER BY utp.role, utp.granted_at;

-- Grant permission to user
INSERT INTO user_tenant_permissions (user_id, tenant_id, role, granted_by)
VALUES ('user-uuid', 'tenant-uuid', 'manager', 'admin-uuid');

-- Revoke permission (soft delete)
UPDATE user_tenant_permissions
SET is_active = false, updated_at = NOW()
WHERE user_id = 'user-uuid' AND tenant_id = 'tenant-uuid';
```

**Performance Considerations:**
- Composite unique index on (user_id, tenant_id) prevents duplicates and speeds up access checks
- Partial index on is_active optimizes active permission queries
- Consider cleanup job for expired permissions

### Related Tables

**Direct Dependencies (FK from this table):**
- → `tenant_registry` (permission grants access to tenant)

**Tables that depend on this:**
- Referenced by RLS policies in virtually all tenant-scoped tables
- Used by `tenant_registry` RLS policy for user access filtering

**Related by Business Logic:**
- `staff_users` - Staff authentication (parallel system, not integrated)
- `tenant_registry` - Tenants that permissions grant access to

### Migration Notes

**Pre-Migration:**
- Validate all user_id values exist in target auth system
- Validate all tenant_id values exist in target tenant_registry
- Document granted_by references for audit trail
- Consider resetting expires_at dates post-migration

**Post-Migration Validation:**

```sql
-- Validate permission count
SELECT COUNT(*) FROM user_tenant_permissions; -- Must match source

-- Validate all permissions have valid tenant references
SELECT utp.id, utp.user_id, utp.tenant_id
FROM user_tenant_permissions utp
LEFT JOIN tenant_registry t ON utp.tenant_id = t.tenant_id
WHERE t.tenant_id IS NULL;
-- Must return 0 rows

-- Validate unique constraint (one permission per user-tenant pair)
SELECT user_id, tenant_id, COUNT(*) 
FROM user_tenant_permissions 
GROUP BY user_id, tenant_id 
HAVING COUNT(*) > 1; -- Must return 0 rows

-- Check for expired permissions
SELECT COUNT(*) as expired_permissions
FROM user_tenant_permissions
WHERE expires_at < NOW() AND is_active = true;
-- Consider deactivating these
```

**Critical Migration Rules:**
- DO preserve id UUIDs (may be referenced in audit logs)
- DO verify user_id and tenant_id references
- DO maintain unique constraint on (user_id, tenant_id)
- CONSIDER resetting expires_at dates

### Change History

| Date | Change | Reason |
|------|--------|--------|
| 2025-10-30 | Documented for migration | Phase 1 documentation |

---

## sire_countries

**Purpose:** Reference table containing SIRE-compliant country codes for Colombian tourism regulatory reporting. Maps ISO 3166-1 country codes to SIRE-specific codes required for guest registration submissions. Critical for SIRE compliance features.

**Row Count (Production):** 45 countries  
**RLS Enabled:** No (reference data, read-only)  
**Dependencies:** None - Level 0 table (catalog/reference data)

### Schema Definition

**Columns:**
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| iso_code | varchar(3) | NO | - | ISO 3166-1 numeric country code (primary key) |
| name | varchar(100) | NO | - | Country name in English |
| name_es | varchar(100) | YES | - | Country name in Spanish |
| alpha2_code | varchar(2) | YES | - | ISO 3166-1 alpha-2 code (e.g., 'US', 'CO') |
| created_at | timestamptz | YES | now() | Record creation timestamp |
| sire_code | varchar(3) | YES | - | SIRE-specific country code (differs from ISO) |

**Important:** SIRE codes do NOT match ISO codes. For example:
- USA: ISO 840 → SIRE 249
- Colombia: ISO 170 → SIRE 196

See: `docs/features/sire-compliance/CODIGOS_SIRE_VS_ISO.md`

### Primary Key
- `iso_code` (VARCHAR(3), ISO 3166-1 numeric code)

### Foreign Keys

**Outgoing:**
- None (Level 0 table)

**Incoming:**
- Referenced by guest registration forms
- Used in SIRE submission payloads
- Potentially referenced by guest_reservations table

### Indexes

| Index Name | Type | Columns | Purpose |
|------------|------|---------|---------|
| sire_countries_pkey | PRIMARY KEY | iso_code | Unique identifier (ISO numeric code) |
| idx_sire_countries_name | BTREE | name | English name lookups |
| idx_sire_countries_name_es | BTREE | name_es | Spanish name lookups |
| idx_sire_countries_sire_code | BTREE | sire_code | SIRE code lookups for submissions |

### RLS Policies

**Status:** RLS Disabled

**Reason:** Reference data table, read-only for all users. No sensitive information. Public access required for guest registration forms.

**Security Notes:**
- Table should be INSERT/UPDATE/DELETE restricted at application level
- Consider adding RLS with public SELECT policy if write protection needed

### Triggers

**None** - Static reference data, no triggers needed

### Sample Data (Production)

```json
[
  {
    "iso_code": "188",
    "name": "Costa Rica",
    "sire_code": "196"
  },
  {
    "iso_code": "620",
    "name": "Portugal",
    "sire_code": "607"
  },
  {
    "iso_code": "410",
    "name": "South Korea",
    "sire_code": "190"
  },
  {
    "iso_code": "356",
    "name": "India",
    "sire_code": "361"
  },
  {
    "iso_code": "784",
    "name": "United Arab Emirates",
    "sire_code": "244"
  }
]
```

### Usage Patterns

**Common Queries:**

```sql
-- Get country by ISO code (guest registration form)
SELECT iso_code, name, name_es, sire_code
FROM sire_countries
WHERE iso_code = '840'; -- USA

-- Get SIRE code for submission
SELECT sire_code 
FROM sire_countries
WHERE iso_code = '840'; -- Returns '249' for USA

-- List all countries for dropdown (Spanish)
SELECT iso_code, name_es, sire_code
FROM sire_countries
ORDER BY name_es;

-- Lookup by SIRE code (reverse mapping)
SELECT iso_code, name, name_es
FROM sire_countries
WHERE sire_code = '196'; -- Colombia
```

**Performance Considerations:**
- Small dataset (45 rows), all queries are fast
- Consider caching this data in application layer
- Index on sire_code critical for SIRE submission lookups

### Related Tables

**Direct Dependencies (FK from this table):**
- None - Level 0 table

**Tables that depend on this:**
- `guest_reservations` (likely has country_code field)
- `sire_submissions` (if exists)
- Guest registration forms reference this

**Related by Business Logic:**
- `sire_cities` - Cities within countries (not directly linked by FK)
- `sire_document_types` - Document types also used in guest registration

### Migration Notes

**Pre-Migration:**
- Verify all 45 countries are present
- Confirm SIRE code mappings match SIRE documentation
- Backup current data before migration
- Note: This is static reference data, safe to regenerate

**Post-Migration Validation:**

```sql
-- Validate country count
SELECT COUNT(*) FROM sire_countries; -- Must be 45

-- Validate no duplicate ISO codes
SELECT iso_code, COUNT(*) 
FROM sire_countries 
GROUP BY iso_code 
HAVING COUNT(*) > 1; -- Must return 0 rows

-- Validate critical SIRE code mappings
SELECT iso_code, name, sire_code 
FROM sire_countries 
WHERE iso_code IN ('840', '170', '076'); 
-- Must return:
-- 840 | United States | 249
-- 170 | Colombia | 196
-- 076 | Brazil | [expected SIRE code]

-- Validate all records have sire_code
SELECT COUNT(*) 
FROM sire_countries 
WHERE sire_code IS NULL OR sire_code = '';
-- Should be 0 (or document which countries lack SIRE codes)
```

**Critical Migration Rules:**
- DO verify SIRE code mappings are correct (critical for compliance)
- DO NOT modify ISO codes (standard values)
- SAFE to regenerate from canonical source
- TEST SIRE submission with migrated data

### Change History

| Date | Change | Reason |
|------|--------|--------|
| 2025-10-30 | Documented for migration | Phase 1 documentation |
| 2025-09-20 | Added SIRE code mappings | SIRE compliance feature implementation |

---

## sire_document_types

**Purpose:** Reference table containing SIRE-compliant document type codes for Colombian tourism regulatory reporting. Defines valid document types that can be used for guest identification in SIRE submissions (e.g., Passport, National ID, Special Permits).

**Row Count (Production):** 4 document types  
**RLS Enabled:** No (reference data, read-only)  
**Dependencies:** None - Level 0 table (catalog/reference data)

### Schema Definition

**Columns:**
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| code | varchar(2) | NO | - | SIRE document type code (primary key) |
| name | varchar(100) | NO | - | Document type name (in Spanish) |
| description | text | YES | - | Detailed description of document type |
| created_at | timestamptz | YES | now() | Record creation timestamp |

**Note:** Names are in Spanish as this is for Colombian regulatory compliance.

### Primary Key
- `code` (VARCHAR(2), SIRE document type code)

### Foreign Keys

**Outgoing:**
- None (Level 0 table)

**Incoming:**
- Referenced by guest registration forms
- Used in SIRE submission payloads
- Potentially referenced by guest_reservations table (document_type field)

### Indexes

| Index Name | Type | Columns | Purpose |
|------------|------|---------|---------|
| sire_document_types_pkey | PRIMARY KEY | code | Unique identifier (SIRE code) |

### RLS Policies

**Status:** RLS Disabled

**Reason:** Reference data table, read-only for all users. No sensitive information. Public access required for guest registration forms.

**Security Notes:**
- Table should be INSERT/UPDATE/DELETE restricted at application level
- Consider adding RLS with public SELECT policy if write protection needed

### Triggers

**None** - Static reference data, no triggers needed

### Sample Data (Production)

```json
[
  {
    "code": "3",
    "name": "Pasaporte",
    "description": "Pasaporte internacional"
  },
  {
    "code": "5",
    "name": "Cédula de Ciudadanía",
    "description": "Documento de identidad colombiano"
  },
  {
    "code": "10",
    "name": "PEP",
    "description": "Permiso Especial de Permanencia"
  },
  {
    "code": "46",
    "name": "Permiso de Ingreso y Permanencia",
    "description": "Permiso migratorio especial"
  }
]
```

### Usage Patterns

**Common Queries:**

```sql
-- Get all document types for dropdown
SELECT code, name, description
FROM sire_document_types
ORDER BY name;

-- Get specific document type
SELECT code, name, description
FROM sire_document_types
WHERE code = '3'; -- Passport

-- Validate document type code
SELECT EXISTS (
  SELECT 1 FROM sire_document_types
  WHERE code = '5'
) as is_valid; -- Cédula de Ciudadanía
```

**Performance Considerations:**
- Very small dataset (4 rows), all queries are instant
- Strongly recommend caching this in application memory
- No additional indexes needed beyond primary key

### Related Tables

**Direct Dependencies (FK from this table):**
- None - Level 0 table

**Tables that depend on this:**
- `guest_reservations` (likely has document_type field referencing this)
- `sire_submissions` (if exists)
- Guest registration forms reference this

**Related by Business Logic:**
- `sire_countries` - Country codes also used in guest registration
- `sire_cities` - Cities also used in guest registration

### Migration Notes

**Pre-Migration:**
- Verify all 4 document types are present
- Confirm codes match SIRE documentation
- Backup current data
- Note: This is static reference data, safe to regenerate

**Post-Migration Validation:**

```sql
-- Validate document type count
SELECT COUNT(*) FROM sire_document_types; -- Must be 4

-- Validate no duplicate codes
SELECT code, COUNT(*) 
FROM sire_document_types 
GROUP BY code 
HAVING COUNT(*) > 1; -- Must return 0 rows

-- Validate critical document types exist
SELECT code, name 
FROM sire_document_types 
WHERE code IN ('3', '5', '10', '46')
ORDER BY code;
-- Must return all 4 rows

-- Validate all records have names
SELECT COUNT(*) 
FROM sire_document_types 
WHERE name IS NULL OR name = '';
-- Must return 0
```

**Critical Migration Rules:**
- DO verify codes match SIRE documentation
- DO NOT modify codes (regulatory standard)
- SAFE to regenerate from canonical source
- TEST guest registration form with migrated data

### Change History

| Date | Change | Reason |
|------|--------|--------|
| 2025-10-30 | Documented for migration | Phase 1 documentation |
| 2025-09-20 | Initial catalog load | SIRE compliance feature implementation |

---

## Summary

### Dependency Tree

```
Level 0 (No dependencies):
├── tenant_registry (root table - 17 tables depend on it)
├── sire_countries (SIRE catalog)
├── sire_document_types (SIRE catalog)
├── sire_cities (SIRE catalog - not detailed in this doc)
├── muva_content (tourism catalog - not detailed in this doc)
├── sire_content (compliance catalog - not detailed in this doc)
└── code_embeddings (not detailed in this doc)

Level 1 (Depend only on Level 0):
├── staff_users → tenant_registry
└── user_tenant_permissions → tenant_registry
```

### Migration Priorities

**Phase 1 - Foundation (MUST migrate first):**
1. `tenant_registry` - Root of all tenant data
2. `sire_countries` - Required for guest registration
3. `sire_document_types` - Required for guest registration

**Phase 2 - Authentication & RBAC:**
4. `staff_users` - Staff authentication
5. `user_tenant_permissions` - Access control

**Critical Success Factors:**
- Preserve all UUID primary keys exactly
- Maintain unique constraint integrity
- Verify foreign key references after migration
- Test authentication flows immediately after staff_users migration
- Validate SIRE compliance features with catalog data

### Next Steps

Continue documentation with:
- **TABLES_CATALOGS.md** - Full catalog tables (sire_content, muva_content, sire_cities)
- **TABLES_OPERATIONS.md** - Operational tables (accommodation_units, hotels, policies)
- **TABLES_CHAT.md** - Chat system tables (conversations, messages)
- **TABLES_INTEGRATIONS.md** - Integration tables (motopress, airbnb)

### See Also

- [Database Overview](./OVERVIEW.md) - Full database architecture
- [SIRE Compliance Codes](../features/sire-compliance/CODIGOS_SIRE_VS_ISO.md) - SIRE vs ISO code mappings
- [Database Query Patterns](../architecture/DATABASE_QUERY_PATTERNS.md) - RPC functions and query optimization

---

**Document Status:** Complete  
**Review Status:** Pending technical review  
**Last Updated:** October 30, 2025
