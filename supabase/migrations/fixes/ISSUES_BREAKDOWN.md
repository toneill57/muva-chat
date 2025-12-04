# Issues Breakdown - Supabase Performance Linter

## 1. auth_rls_initplan (114 total, 19 fixed)

### Fixed Policies (19)

**hotels schema (16 policies):**
- hotels.content (4): select, insert, update, delete
- hotels.policies (4): select, insert, update, delete  
- hotels.properties (4): select, insert, update, delete
- hotels.pricing_rules (4): select, insert, update, delete

**public schema (3 policies):**
- public.staff_users (2): staff_own_profile, staff_admin_view_all
- public.tenant_registry (1): Only service role can create tenants

### Obsolete/Removed Policies (95)

These policies were reported in the CSV but no longer exist in the database:
- May have been removed during schema refactoring
- May have been renamed
- May use helper functions instead of direct auth calls

**Impact:** No action needed - already cleaned up

---

## 2. duplicate_index (2 fixed)

### Index 1: hotels.accommodation_types
- **Duplicate:** `idx_hotels_accommodation_types_tenant`
- **Keep:** `idx_hotels_accommodation_types_tenant_id`
- **Reason:** More descriptive name, same coverage

### Index 2: public.accommodation_units_manual_chunks  
- **Duplicate:** `idx_manual_chunks_unit_id`
- **Keep:** `idx_manual_chunks_accommodation_unit_id`
- **Reason:** More descriptive name, same coverage

**Impact:** Frees database storage, no performance change

---

## 3. multiple_permissive_policies (96 instances, 13 tables)

### Affected Tables

| Schema | Table | # Policies | Risk Level |
|--------|-------|-----------|-----------|
| public | airbnb_motopress_comparison | 2 | Low |
| public | chat_conversations | 2 | Low |
| public | chat_messages | 2 | Low |
| public | compliance_submissions | 4 | Medium |
| public | guest_conversations | 9 | Medium |
| public | guest_reservations | 6 | Medium |
| public | hotels | 3 | Low |
| public | muva_content | 2 | Low |
| public | prospective_sessions | 2 | Low |
| public | sire_content | 2 | Low |
| public | staff_users | 2 | Low |
| public | tenant_registry | 5 | Medium |
| public | user_tenant_permissions | 2 | Low |

### What This Means

PERMISSIVE policies use **OR logic** - if ANY policy matches, access is granted.

**Example:** guest_conversations has 9 policies
```sql
-- Policy 1: Guests can view their own
-- Policy 2: Guests can create their own
-- Policy 3: Guests can update their own
-- Policy 4: Guests can delete their own
-- Policy 5: Staff can view tenant conversations
-- Policy 6-9: Service role policies
```

PostgreSQL evaluates ALL policies until one matches. With 9 policies, this means:
- Best case: 1 evaluation (first policy matches)
- Worst case: 9 evaluations (last policy matches or none match)

### Recommendation

**Low Risk (2-3 policies):** No action needed
**Medium Risk (4-9 policies):** Monitor performance, consolidate if slow

**Consolidation Example:**
```sql
-- Instead of 4 separate policies for guest_conversations:
CREATE POLICY "guest_conversations_guest_access" ON guest_conversations
  FOR ALL
  TO public
  USING (
    guest_id = (select auth.uid())
  );
```

**Impact:** Informational only - no automatic fixes applied

---

## Summary Stats

| Issue Type | Reported | Actionable | Fixed |
|------------|----------|-----------|-------|
| auth_rls_initplan | 114 | 19 | 19 |
| duplicate_index | 2 | 2 | 2 |
| multiple_permissive_policies | 96 | 0* | 0* |
| **TOTAL** | **212** | **21** | **21** |

*Informational only - no code changes needed

## Migration Size

- **Lines:** 392
- **Policies recreated:** 19
- **Indexes dropped:** 2
- **Estimated runtime:** < 5 seconds
- **Rollback:** Transaction-wrapped (automatic rollback on error)
