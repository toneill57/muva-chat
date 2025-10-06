# Database Schema Rules

**Last Updated:** October 6, 2025
**Purpose:** Document design decisions for database schema constraints

---

## 🎯 Philosophy

Our schema design prioritizes:
1. **Multi-tenant isolation** - Data never leaks across tenants
2. **Data integrity** - Constraints prevent invalid states
3. **Flexibility** - Schema accommodates edge cases
4. **Performance** - Indexes support common queries

---

## 📋 Table: `guest_reservations`

### NOT NULL Constraints (Critical Fields)

These fields are **required** for core business logic:

| Field | Constraint | Rationale |
|-------|-----------|-----------|
| `id` | NOT NULL, PRIMARY KEY | Unique identifier |
| `tenant_id` | NOT NULL | Multi-tenant isolation requirement |
| `guest_name` | NOT NULL | Required for guest identification |
| `check_in_date` | NOT NULL | Core business logic (reservations must have dates) |
| `check_out_date` | NOT NULL | Core business logic (reservations must have dates) |
| `status` | NOT NULL | Workflow state machine requirement |
| `created_at` | NOT NULL | Audit trail requirement |
| `updated_at` | NOT NULL | Audit trail requirement |

### Fields Allowing NULL (Optional Data)

These fields accept NULL when data is unavailable:

| Field | Allows NULL | Rationale | Default Behavior |
|-------|-------------|-----------|------------------|
| `guest_email` | ✅ Yes | Some bookings phone-only (no email) | NULL if not provided |
| `guest_country` | ✅ Yes | Not always collected | NULL if not provided |
| `booking_notes` | ✅ Yes | Optional field | NULL if empty |
| `external_booking_id` | ✅ Yes | Only for synced bookings (MotoPress, etc.) | NULL for manual bookings |

### Special Case: `accommodation_unit_id`

**Current State:** Allows NULL (workaround)
**Problem:** Creates complexity for unique constraints
**Why NULL exists:** Legacy logic allows reservations without assigned units

**Analysis needed:**
```sql
-- Query to measure impact of making NOT NULL
SELECT
  COUNT(*) as null_count,
  COUNT(*) * 100.0 / (SELECT COUNT(*) FROM guest_reservations) as percentage,
  STRING_AGG(DISTINCT status, ', ') as statuses,
  STRING_AGG(DISTINCT booking_source, ', ') as sources
FROM guest_reservations
WHERE accommodation_unit_id IS NULL;
```

**Decision Matrix:**

| NULL % | Decision | Action |
|--------|----------|--------|
| < 5% | Make NOT NULL | Assign default unit, alter column |
| 5-20% | Keep NULL | Document business rules clearly |
| > 20% | Keep NULL | Create explicit `unassigned_reason` enum |

**Temporary Workaround:**
- Generated column: `accommodation_unit_id_key` = `COALESCE(accommodation_unit_id::text, '')`
- Used for unique constraint to handle NULL values
- **TODO:** Remove this hack once decision is made

---

### Special Case: `phone_full` and `phone_last_4`

**Current State:**
- `phone_full`: **NOT NULL** (⚠️ May need review)
- `phone_last_4`: **NOT NULL** (used for guest authentication)

**Problem:** What if guest has no phone?

**Proposed Solution:**
```sql
ALTER TABLE guest_reservations
  ALTER COLUMN phone_full SET DEFAULT 'N/A';

ALTER TABLE guest_reservations
  ALTER COLUMN phone_last_4 SET DEFAULT '0000';
```

**Rationale:**
- Guest authentication requires `phone_last_4` (even if fake)
- Default '0000' signals "no phone provided"
- Allows bookings without phone to proceed

---

## 🔐 Unique Constraints

### Active Constraints

#### `uq_motopress_booking_unit`
```sql
UNIQUE (tenant_id, external_booking_id, accommodation_unit_id_key)
```

**Purpose:** Prevent duplicate MotoPress bookings during sync
**Note:** Uses `accommodation_unit_id_key` (generated column) to handle NULLs

**Why not simple UNIQUE?**
- PostgreSQL: `NULL != NULL` (fails for bookings without units)
- `COALESCE(accommodation_unit_id::text, '')` converts NULL to empty string

**Future:** If `accommodation_unit_id` becomes NOT NULL, simplify to:
```sql
UNIQUE (tenant_id, external_booking_id, accommodation_unit_id)
```

---

## 📊 Table: `hotels.accommodation_units`

### Multi-Tenant Design

| Field | Constraint | Rationale |
|-------|-----------|-----------|
| `tenant_id` | NOT NULL | Tenant isolation (schema-based + column-based) |
| `motopress_unit_id` | NULL allowed | Only set for MotoPress-synced units |
| `motopress_type_id` | NULL allowed | Only set for MotoPress-synced units |

**Why `hotels.*` schema?**
- Business entities should live in tenant-specific schemas
- `public.*` schema for global/shared data only (SIRE, MUVA, tenant_registry)
- RLS policies enforce `tenant_id` filtering

---

## 🚫 Anti-Patterns to Avoid

### ❌ DON'T: Hardcode NOT NULL without defaults

```sql
-- ❌ BAD
ALTER TABLE guest_reservations
  ADD COLUMN new_field TEXT NOT NULL;
-- Breaks existing rows!

-- ✅ GOOD
ALTER TABLE guest_reservations
  ADD COLUMN new_field TEXT NOT NULL DEFAULT 'default_value';
```

### ❌ DON'T: Skip tenant_id in multi-tenant tables

```sql
-- ❌ BAD
CREATE TABLE bookings (
  id UUID PRIMARY KEY,
  guest_name TEXT
);

-- ✅ GOOD
CREATE TABLE bookings (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  guest_name TEXT
);
```

### ❌ DON'T: Use TEXT for everything

```sql
-- ❌ BAD
status TEXT  -- Any string accepted

-- ✅ GOOD (PostgreSQL 12+)
status TEXT CHECK (status IN ('active', 'cancelled', 'pending'))

-- ✅ BETTER (Custom enum)
status reservation_status_enum
```

---

## ✅ Best Practices

### 1. Always Add Comments

```sql
COMMENT ON COLUMN guest_reservations.phone_last_4 IS
  'Last 4 digits of phone number. Used for guest authentication. Default ''0000'' for bookings without phone.';
```

### 2. Use CHECK Constraints for Business Rules

```sql
-- Ensure check-out is after check-in
ALTER TABLE guest_reservations
  ADD CONSTRAINT check_dates
  CHECK (check_out_date > check_in_date);
```

### 3. Index Foreign Keys

```sql
-- Performance: Speed up JOINs
CREATE INDEX idx_guest_reservations_unit
  ON guest_reservations (accommodation_unit_id)
  WHERE accommodation_unit_id IS NOT NULL;
```

### 4. Use Partial Indexes for Common Filters

```sql
-- Only index active reservations (most common query)
CREATE INDEX idx_guest_reservations_active
  ON guest_reservations (tenant_id, check_in_date, phone_last_4)
  WHERE status = 'active';
```

---

## 🔍 Schema Review Checklist

When adding or modifying tables:

1. ✅ Every table has `tenant_id` (if tenant-specific)
2. ✅ Every table has `created_at`, `updated_at` (audit trail)
3. ✅ Foreign keys have indexes
4. ✅ NOT NULL columns have defaults (when possible)
5. ✅ Unique constraints documented in this file
6. ✅ CHECK constraints for enum-like fields
7. ✅ Comments on columns explain business logic
8. ✅ Partial indexes for common WHERE clauses
9. ✅ RLS policies enforce tenant isolation
10. ✅ Migration includes rollback plan

---

## 📖 Related Documentation

- `DATABASE_QUERY_PATTERNS.md` - RPC functions and query guidelines
- `CLAUDE.md` - Project-wide database operation guidelines
- `.claude/agents/database-agent.md` - Database maintenance procedures
- Supabase docs: [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

---

**Remember:** Schema decisions are expensive to change later. When in doubt, discuss with team and document the rationale here.
