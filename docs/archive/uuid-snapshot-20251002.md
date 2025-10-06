# UUID Migration Snapshot - 2025-10-02

**Timestamp:** 2025-10-02T00:00:00Z
**Purpose:** Pre-migration backup for deterministic UUID implementation
**Migration Target:** hotels.accommodation_units

---

## Executive Summary

- **Total Accommodations:** 9 units
- **UUID Extension:** ✅ uuid-ossp v1.1 (installed in schema: extensions)
- **Dependencies:** 3 tables with foreign keys
  - `guest_reservations`: 133 records
  - `accommodation_units_manual`: 8 records
  - `accommodation_units_manual_chunks`: 89 records

---

## Current UUID State

### hotels.accommodation_units (9 units)

| ID | Tenant ID | MotoPress ID | Name | Created At |
|---|---|---|---|---|
| 5c6cbd49-e2b2-44dd-96c9-6e0b0e6c9a55 | b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf | 317 | Dreamland | 2025-10-02 07:52:45.223069+00 |
| 11b19234-1220-449b-b84e-cb2482e31780 | b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf | 323 | Jammin' | 2025-10-02 08:04:50.296+00 |
| a76eed03-1654-4e4d-a6a1-474b6518b44c | b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf | 314 | Kaya | 2025-10-02 07:52:46.25397+00 |
| fafc0d86-85bc-4af7-bf24-56199d88a07e | b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf | 326 | Misty Morning | 2025-10-02 07:52:42.290227+00 |
| 6e52da50-5dd4-4b58-b553-249756c7b275 | b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf | 320 | Natural Mystic | 2025-10-02 07:52:44.241802+00 |
| dd45a372-3a0d-4d2c-a04a-a02a0f8b8a8e | b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf | 329 | One Love | 2025-10-02 07:52:41.296062+00 |
| e5a2b4f3-3cff-49ef-8853-8199246f4f5e | b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf | 335 | Simmer Highs | 2025-10-02 07:52:39.390069+00 |
| bf3ca51a-d69d-4d52-b21e-1ae71b9951d4 | b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf | 307 | Summertime | 2025-10-02 07:52:47.375974+00 |
| 3514b482-cc49-4897-81b6-efe1cc1f29df | b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf | 89 | Sunshine | 2025-10-02 07:52:37.893722+00 |

---

## Extension Status

### uuid-ossp Extension

```sql
-- Extension availability check
SELECT * FROM pg_available_extensions WHERE name = 'uuid-ossp';
```

| Name | Default Version | Installed Version | Comment |
|---|---|---|---|
| uuid-ossp | 1.1 | 1.1 | generate universally unique identifiers (UUIDs) |

**Status:** ✅ **ENABLED** in schema `extensions`

**Available Functions:**
- `uuid_generate_v5(namespace uuid, name text)` - SHA-1 based deterministic UUID generation

---

## Dependency Analysis

### Foreign Key Relationships

#### 1. guest_reservations
- **Column:** `accommodation_unit_id`
- **Records:** 133 reservations
- **Impact:** All 133 records will need UUID updates during migration

#### 2. accommodation_units_manual
- **Column:** `unit_id`
- **Records:** 8 manuals
- **Impact:** All 8 records will need UUID updates during migration

#### 3. accommodation_units_manual_chunks
- **Column:** `accommodation_unit_id`
- **Records:** 89 chunks
- **Impact:** All 89 records will need UUID updates during migration

**Total Records Affected:** 230 records across 3 dependent tables

---

## Migration Impact Assessment

### UUID Changes Expected
All 9 accommodation units will receive new deterministic UUIDs based on:
- Namespace: `b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf` (tenant_id)
- Name: `motopress_{motopress_unit_id}`

**Example:**
```sql
-- Old UUID: 5c6cbd49-e2b2-44dd-96c9-6e0b0e6c9a55
-- New UUID: uuid_generate_v5('b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf', 'motopress_317')
-- Unit: Dreamland (motopress_unit_id: 317)
```

### Rollback Strategy
This snapshot enables complete rollback via:
1. Restore UUIDs from this document's table
2. Update all 9 accommodation_units records
3. Cascade updates to 230 dependent records

---

## Pre-Migration Checklist

- [x] ✅ Backup completed (9 accommodations documented)
- [x] ✅ uuid-ossp extension verified (v1.1 installed)
- [x] ✅ Dependencies analyzed (230 records across 3 tables)
- [x] ✅ Impact assessment completed
- [ ] 🔜 Code references audit (next phase)
- [ ] 🔜 Migration script creation (FASE 2)
- [ ] 🔜 Testing in development branch (FASE 3)

---

## Next Steps (FASE 2)

1. Create migration SQL script with:
   - Temporary table for UUID mappings
   - UPDATE statements for all 3 dependent tables
   - Transaction-wrapped migration with rollback capability

2. Audit code references:
   - Search for `accommodation_unit_id` in codebase
   - Identify API endpoints returning this field
   - Plan frontend update strategy

---

**Prepared by:** @database-agent
**Migration Plan:** See `/Users/oneill/Sites/apps/InnPilot/plan.md` (lines 162-338)
**Task Checklist:** See `/Users/oneill/Sites/apps/InnPilot/TODO.md` (lines 11-81)
