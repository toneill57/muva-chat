# PLAN PART 7: RLS POLICIES DOCUMENTATION

**Purpose:** Document all 134 RLS policies across all tables
**Duration:** 3-4 hours
**Executor:** @agent-database-agent
**Prerequisites:** PART1, PART2, PART3, PART4, PART5, PART6 complete
**Output:** `docs/database/RLS_POLICIES.md` (~1500-2000 lines)

---

## OBJECTIVE

Create comprehensive documentation for all Row Level Security (RLS) policies in the MUVA Chat database, grouped by security pattern and table.

**Scope:**
- **Total Policies:** 134 (claimed, verify in PART1)
- **Tables with RLS:** 40/41 (code_embeddings missing)
- **Policy Types:** SELECT, INSERT, UPDATE, DELETE
- **Security Patterns:** Tenant isolation, staff authentication, guest access, admin-only

**Critical Focus:**
- Document tenant isolation strategy (multi-tenant architecture)
- Explain staff authentication flow
- Identify tables missing RLS (security gaps)
- Provide test cases for each policy pattern

---

## OUTPUT FILE STRUCTURE

```markdown
# RLS POLICIES DOCUMENTATION

**Purpose:** Row Level Security policy reference for all tables
**Total Policies:** [ACTUAL from PART1]
**Tables with RLS:** [COUNT]/[TOTAL]
**Multi-Tenant Isolation:** tenant_id filtering
**Last Updated:** [DATE] by @agent-database-agent

---

## Overview

Row Level Security (RLS) enforces data access control at the database level, ensuring:
- **Tenant Isolation:** Users only see data for their tenant
- **Staff Authentication:** Staff can only access assigned properties
- **Guest Privacy:** Guests only see their own conversations/reservations
- **Admin Control:** Superadmins have full access

### Policy Enforcement

**Enforcement Levels:**
1. **Database:** PostgreSQL RLS (this document)
2. **Application:** Additional checks in API routes
3. **Client:** UI/UX hides unauthorized actions

**RLS is PRIMARY enforcement** - application-level checks are supplementary.

### Security Patterns

#### Pattern 1: Tenant Isolation (Most Common)
```sql
-- Users only access data for their tenant
CREATE POLICY tenant_isolation_select
ON [table]
FOR SELECT
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id FROM user_tenant_permissions
    WHERE user_id = auth.uid()
  )
);
```

**Used by:** ~80% of tables
**Purpose:** Multi-tenant data segregation
**Columns required:** `tenant_id` (uuid, FK to tenant_registry)

#### Pattern 2: Staff Authentication
```sql
-- Staff users access data assigned to them
CREATE POLICY staff_access_select
ON [table]
FOR SELECT
TO authenticated
USING (
  staff_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM staff_users
    WHERE id = auth.uid()
    AND is_superadmin = true
  )
);
```

**Used by:** Staff-specific tables (conversations, assignments)
**Purpose:** Staff can only see their assigned work
**Columns required:** `staff_user_id` (uuid, FK to staff_users)

#### Pattern 3: Guest Access
```sql
-- Guests access their own data
CREATE POLICY guest_access_select
ON [table]
FOR SELECT
TO authenticated
USING (
  guest_id = auth.uid()
);
```

**Used by:** Guest-facing tables (reservations, messages)
**Purpose:** Guests only see their own bookings/conversations
**Columns required:** `guest_id` (uuid, FK to guests table)

#### Pattern 4: Admin-Only
```sql
-- Only superadmins can access
CREATE POLICY admin_only_select
ON [table]
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM staff_users
    WHERE id = auth.uid()
    AND is_superadmin = true
  )
);
```

**Used by:** Sensitive tables (tenant_registry, compliance, logs)
**Purpose:** Restrict access to platform administrators
**Columns required:** None (checks staff_users.is_superadmin)

#### Pattern 5: Public Read
```sql
-- Anyone can read, only authenticated can write
CREATE POLICY public_read_select
ON [table]
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY authenticated_write_insert
ON [table]
FOR INSERT
TO authenticated
WITH CHECK ([tenant_isolation_check]);
```

**Used by:** Catalog tables, public content
**Purpose:** Read-only access for unauthenticated users
**Columns required:** Depends on write restrictions

---

## Policy Categories

### 1. Tenant Isolation Policies (80% of tables)

Tables using `tenant_id` filtering for multi-tenant isolation.

**Tables:**
- tenant_registry (special: admin-only access)
- staff_users (tenant-isolated)
- accommodations (tenant-isolated)
- accommodation_units (tenant-isolated via FK)
- guest_reservations (tenant-isolated)
- guest_conversations (tenant-isolated)
- chat_messages (tenant-isolated via FK)
- [... all other tenant-scoped tables ...]

**Standard Pattern:**
```sql
-- SELECT: User must have permission for tenant
CREATE POLICY [table]_tenant_select
ON [table]
FOR SELECT
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id FROM user_tenant_permissions
    WHERE user_id = auth.uid()
  )
);

-- INSERT: User must have permission for tenant
CREATE POLICY [table]_tenant_insert
ON [table]
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM user_tenant_permissions
    WHERE user_id = auth.uid()
  )
);

-- UPDATE: User must have permission for tenant
CREATE POLICY [table]_tenant_update
ON [table]
FOR UPDATE
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id FROM user_tenant_permissions
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM user_tenant_permissions
    WHERE user_id = auth.uid()
  )
);

-- DELETE: User must have permission for tenant
CREATE POLICY [table]_tenant_delete
ON [table]
FOR DELETE
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id FROM user_tenant_permissions
    WHERE user_id = auth.uid()
  )
);
```

**Test Case:**
```sql
-- Setup test users
-- User A: tenant_id = 'aaa...'
-- User B: tenant_id = 'bbb...'

-- As User A:
SELECT * FROM accommodations;
-- Expected: Only accommodations with tenant_id = 'aaa...'

-- As User B:
SELECT * FROM accommodations;
-- Expected: Only accommodations with tenant_id = 'bbb...'

-- As User A, try to insert for User B's tenant:
INSERT INTO accommodations (tenant_id, ...) VALUES ('bbb...', ...);
-- Expected: ERROR - WITH CHECK violation
```

---

### 2. Staff Authentication Policies

Tables where staff users access assigned data.

**Tables:**
- guest_conversations (staff_user_id = auth.uid())
- staff_messages (sender_id = auth.uid())
- staff_conversations (assigned staff)
- [... other staff-specific tables ...]

**Standard Pattern:**
```sql
-- Staff can access conversations assigned to them
CREATE POLICY [table]_staff_access_select
ON [table]
FOR SELECT
TO authenticated
USING (
  staff_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM staff_users
    WHERE id = auth.uid()
    AND tenant_id = [table].tenant_id
    AND is_superadmin = true
  )
);
```

**Test Case:**
```sql
-- Setup:
-- Staff A: id = 'staff-a-uuid', tenant = 'tenant-1'
-- Staff B: id = 'staff-b-uuid', tenant = 'tenant-1'
-- Conversation 1: staff_user_id = 'staff-a-uuid'

-- As Staff A:
SELECT * FROM guest_conversations WHERE id = '[conversation-1]';
-- Expected: Returns conversation (assigned to them)

-- As Staff B:
SELECT * FROM guest_conversations WHERE id = '[conversation-1]';
-- Expected: Empty (not assigned, not superadmin)

-- As Superadmin in tenant-1:
SELECT * FROM guest_conversations WHERE id = '[conversation-1]';
-- Expected: Returns conversation (superadmin override)
```

---

### 3. Guest Access Policies

Tables where guests access their own data.

**Tables:**
- guest_reservations (guest_id = auth.uid())
- prospective_sessions (guest_email/phone match)
- [... other guest-facing tables ...]

**Standard Pattern:**
```sql
-- Guests can only access their own reservations
CREATE POLICY [table]_guest_access_select
ON [table]
FOR SELECT
TO authenticated
USING (
  guest_id = auth.uid()
);
```

**Test Case:**
```sql
-- Setup:
-- Guest A: id = 'guest-a-uuid'
-- Guest B: id = 'guest-b-uuid'
-- Reservation 1: guest_id = 'guest-a-uuid'

-- As Guest A:
SELECT * FROM guest_reservations WHERE id = '[reservation-1]';
-- Expected: Returns reservation

-- As Guest B:
SELECT * FROM guest_reservations WHERE id = '[reservation-1]';
-- Expected: Empty (not their reservation)
```

---

### 4. Admin-Only Policies

Tables restricted to superadmins.

**Tables:**
- tenant_registry (platform-level data)
- compliance_submissions (regulatory data)
- sire_export_logs (audit logs)
- [... other admin tables ...]

**Standard Pattern:**
```sql
-- Only superadmins can access
CREATE POLICY [table]_admin_only_select
ON [table]
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM staff_users
    WHERE id = auth.uid()
    AND is_superadmin = true
  )
);
```

**Test Case:**
```sql
-- Setup:
-- Staff A: is_superadmin = false
-- Admin B: is_superadmin = true

-- As Staff A:
SELECT * FROM tenant_registry;
-- Expected: Empty (not superadmin)

-- As Admin B:
SELECT * FROM tenant_registry;
-- Expected: All tenant records
```

---

### 5. Catalog/Reference Data Policies

Read-only tables accessible to all authenticated users.

**Tables:**
- sire_countries
- sire_document_types
- sire_content
- muva_content (with tenant filtering)
- [... other catalog tables ...]

**Standard Pattern:**
```sql
-- Anyone authenticated can read
CREATE POLICY [table]_public_read_select
ON [table]
FOR SELECT
TO authenticated
USING (true);

-- Only admins can modify
CREATE POLICY [table]_admin_modify
ON [table]
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM staff_users
    WHERE id = auth.uid()
    AND is_superadmin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM staff_users
    WHERE id = auth.uid()
    AND is_superadmin = true
  )
);
```

---

## Per-Table Policy Documentation

[For each of the 41 tables, document using this format:]

---

### Table: accommodations

**RLS Enabled:** ✅ Yes
**Policies:** 4 (SELECT, INSERT, UPDATE, DELETE)
**Security Pattern:** Tenant Isolation
**Purpose:** Multi-tenant property management

---

#### Policy: accommodations_tenant_select

```sql
CREATE POLICY accommodations_tenant_select
ON accommodations
FOR SELECT
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id FROM user_tenant_permissions
    WHERE user_id = auth.uid()
  )
);
```

**Purpose:** Allow users to view accommodations for tenants they have access to
**Security Level:** Tenant Isolation
**Roles:** authenticated
**Test Case:**
```sql
-- User with access to tenant 'aaa...' can only see accommodations for that tenant
SET LOCAL role authenticated;
SET LOCAL request.jwt.claim.sub TO '[user-uuid]';
SELECT * FROM accommodations; -- Returns only tenant 'aaa...' accommodations
```

---

#### Policy: accommodations_tenant_insert

```sql
CREATE POLICY accommodations_tenant_insert
ON accommodations
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM user_tenant_permissions
    WHERE user_id = auth.uid()
  )
);
```

**Purpose:** Allow users to create accommodations only for tenants they have access to
**Security Level:** Tenant Isolation
**Roles:** authenticated
**Test Case:**
```sql
-- User with access to tenant 'aaa...' cannot insert for tenant 'bbb...'
INSERT INTO accommodations (tenant_id, name) VALUES ('bbb...', 'Test');
-- Expected: ERROR - new row violates row-level security policy
```

---

[Repeat for UPDATE and DELETE policies]

---

[Repeat this structure for ALL 41 tables]

---

```

---

## TASKS FOR @agent-database-agent

### TASK 7.1: Extract All RLS Policies (1 hour)

**Query to Get All Policies:**
```sql
-- Get all RLS policies with full details
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;
```

**Expected Output:** ~134 rows

**Query to Get RLS Status Per Table:**
```sql
-- Check which tables have RLS enabled
SELECT
  t.tablename,
  t.rowsecurity AS rls_enabled,
  COUNT(p.policyname) AS policy_count
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public'
GROUP BY t.tablename, t.rowsecurity
ORDER BY policy_count DESC, t.tablename;
```

**Expected Output:**
```
tablename                  | rls_enabled | policy_count
---------------------------|-------------|-------------
accommodations             | true        | 4
guest_reservations         | true        | 4
staff_users                | true        | 4
code_embeddings            | false       | 0  ← SECURITY ISSUE
...
```

**Action:**
- Export all policies to structured JSON for processing
- Group policies by table
- Identify policy patterns (tenant isolation, staff auth, etc.)
- Flag tables without RLS (security gaps)

---

### TASK 7.2: Categorize Policies by Pattern (45 min)

**Analyze Policy Patterns:**

For each policy, determine which pattern it follows:

1. **Tenant Isolation** - Check for `tenant_id IN (SELECT tenant_id FROM user_tenant_permissions ...)`
2. **Staff Authentication** - Check for `staff_user_id = auth.uid()` or `EXISTS (SELECT 1 FROM staff_users ...)`
3. **Guest Access** - Check for `guest_id = auth.uid()`
4. **Admin-Only** - Check for `is_superadmin = true`
5. **Public Read** - Check for `USING (true)` on SELECT
6. **Custom** - Policies that don't fit standard patterns

**Query to Analyze Patterns:**
```sql
-- Categorize policies by pattern
SELECT
  tablename,
  policyname,
  cmd,
  CASE
    WHEN qual LIKE '%user_tenant_permissions%' THEN 'Tenant Isolation'
    WHEN qual LIKE '%staff_user_id = auth.uid()%' THEN 'Staff Authentication'
    WHEN qual LIKE '%guest_id = auth.uid()%' THEN 'Guest Access'
    WHEN qual LIKE '%is_superadmin = true%' THEN 'Admin-Only'
    WHEN qual = 'true' AND cmd = 'SELECT' THEN 'Public Read'
    ELSE 'Custom'
  END AS pattern
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY pattern, tablename;
```

**Action:**
- Create pattern distribution summary
- Document standard patterns (with examples)
- Identify custom policies needing special documentation

---

### TASK 7.3: Document Standard Patterns (1 hour)

For each of the 5 standard patterns:

1. **Write pattern description** (purpose, use case)
2. **Provide SQL template** (generic version)
3. **List tables using pattern** (from categorization)
4. **Write test case** (how to verify policy works)
5. **Document variations** (if pattern has multiple forms)

**Pattern Documentation Template:**

```markdown
### Pattern: [Pattern Name]

**Description:** [1-2 sentences explaining what this pattern does]

**Use Case:** [When to use this pattern]

**Tables Using Pattern:** [COUNT] tables
- [table1]
- [table2]
- [table3]
- [... full list ...]

**Standard SQL Template:**
```sql
CREATE POLICY [table]_[pattern]_[cmd]
ON [table]
FOR [SELECT/INSERT/UPDATE/DELETE]
TO [roles]
USING ([qual_expression])
WITH CHECK ([with_check_expression]);  -- Only for INSERT/UPDATE
```

**Parameters:**
- `[pattern]`: Pattern identifier (tenant, staff, guest, admin, public)
- `[cmd]`: Command type (select, insert, update, delete)
- `[qual_expression]`: Filter condition for row visibility
- `[with_check_expression]`: Validation condition for new/updated rows

**Example:**
```sql
-- Real example from accommodations table
CREATE POLICY accommodations_tenant_select
ON accommodations
FOR SELECT
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id FROM user_tenant_permissions
    WHERE user_id = auth.uid()
  )
);
```

**Test Case:**
```sql
-- Setup
[Setup SQL - create test data]

-- Test as User A
SET LOCAL role authenticated;
SET LOCAL request.jwt.claim.sub TO '[user-a-uuid]';
[Query that should succeed]
-- Expected: [Result]

-- Test as User B
SET LOCAL request.jwt.claim.sub TO '[user-b-uuid]';
[Query that should fail or return different results]
-- Expected: [Result]

-- Cleanup
[Cleanup SQL]
```

**Variations:**
[Document any variations of the pattern, e.g., tenant isolation with FK traversal]
```

---

### TASK 7.4: Document Each Table's Policies (2 hours)

For EACH of the 40 tables with RLS:

**Table Policy Documentation:**

```markdown
### Table: [table_name]

**RLS Enabled:** ✅ Yes
**Policies:** [COUNT] (SELECT: [X], INSERT: [X], UPDATE: [X], DELETE: [X])
**Security Pattern:** [Primary pattern used]
**Purpose:** [Why RLS is needed for this table]

---

[For each policy on the table:]

#### Policy: [policy_name]

```sql
[FULL POLICY DDL]
```

**Purpose:** [What this policy does]
**Security Level:** [Tenant Isolation / Staff Auth / Guest Access / Admin-Only / Public]
**Command:** [SELECT/INSERT/UPDATE/DELETE]
**Roles:** [authenticated / anon / service_role]
**Permissive:** [Yes/No - allows combining with other policies]

**Logic Breakdown:**
- **USING clause:** [Explain the filter condition]
- **WITH CHECK clause:** [Explain the validation condition, if present]

**Test Case:**
```sql
[Specific test case for this policy]
```

**Related Policies:**
- [Link to other policies on same table]
- [Link to policies on related tables]

---
```

**Action:**
- Document all 134 policies (distributed across 40 tables)
- Average 3-4 policies per table (SELECT, INSERT, UPDATE, DELETE)
- Some tables may have additional policies (e.g., different roles)

---

### TASK 7.5: Document Tables Missing RLS (30 min)

**Tables Without RLS:**

```markdown
## Security Gaps: Tables Missing RLS

⚠️ **CRITICAL:** The following tables have NO Row Level Security policies:

---

### Table: code_embeddings

**RLS Enabled:** ❌ No
**Row Count:** 4,333 rows (74 MB)
**Severity:** HIGH
**Impact:** All authenticated users can access codebase embeddings

#### Current State
```sql
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'code_embeddings';
-- Result: rowsecurity = false
```

#### Risk Analysis
- **Data Exposure:** Codebase file paths, function names, code snippets
- **Attack Vector:** Reverse-engineer application structure, identify vulnerabilities
- **Compliance:** Violates data access control requirements

#### Recommended RLS Policies

```sql
-- Enable RLS
ALTER TABLE code_embeddings ENABLE ROW LEVEL SECURITY;

-- Policy 1: Authenticated users can search
CREATE POLICY code_embeddings_select_authenticated
ON code_embeddings
FOR SELECT
TO authenticated
USING (true);  -- All authenticated users (codebase is shared resource)

-- Policy 2: Only service role can modify
CREATE POLICY code_embeddings_modify_service
ON code_embeddings
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

#### Remediation Steps
1. ✅ Enable RLS during migration
2. ✅ Add SELECT policy for authenticated users
3. ✅ Add INSERT/UPDATE/DELETE policy for service_role only
4. ✅ Test search functionality after RLS enabled
5. ✅ Update ADVISORS_ANALYSIS.md to reflect remediation

#### Migration Priority
**CRITICAL** - Add RLS BEFORE copying data (prevent access to incomplete data)

---

[Repeat for any other tables missing RLS]
```

---

### TASK 7.6: Create Policy Test Suite (45 min)

**Test Case Documentation:**

```markdown
## RLS Policy Testing Guide

### Test Environment Setup

```sql
-- Create test users
INSERT INTO staff_users (id, tenant_id, email, is_superadmin)
VALUES
  ('test-user-a', 'tenant-a', 'usera@test.com', false),
  ('test-user-b', 'tenant-b', 'userb@test.com', false),
  ('test-admin', 'tenant-a', 'admin@test.com', true);

-- Grant permissions
INSERT INTO user_tenant_permissions (user_id, tenant_id)
VALUES
  ('test-user-a', 'tenant-a'),
  ('test-user-b', 'tenant-b');

-- Create test data
INSERT INTO accommodations (id, tenant_id, name)
VALUES
  ('acc-a', 'tenant-a', 'Property A'),
  ('acc-b', 'tenant-b', 'Property B');
```

### Test Suite

#### Test 1: Tenant Isolation (SELECT)

**Expected Behavior:** Users only see data for their tenant

```sql
-- As User A (tenant-a)
SET LOCAL role authenticated;
SET LOCAL request.jwt.claim.sub TO 'test-user-a';
SELECT id, name FROM accommodations;
-- Expected: Only 'acc-a' (Property A)

-- As User B (tenant-b)
SET LOCAL request.jwt.claim.sub TO 'test-user-b';
SELECT id, name FROM accommodations;
-- Expected: Only 'acc-b' (Property B)
```

**Status:** [ ] PASS [ ] FAIL

---

#### Test 2: Tenant Isolation (INSERT)

**Expected Behavior:** Users cannot insert data for other tenants

```sql
-- As User A (tenant-a), try to insert for tenant-b
SET LOCAL role authenticated;
SET LOCAL request.jwt.claim.sub TO 'test-user-a';
INSERT INTO accommodations (id, tenant_id, name)
VALUES ('acc-c', 'tenant-b', 'Property C');
-- Expected: ERROR - new row violates row-level security policy
```

**Status:** [ ] PASS [ ] FAIL

---

#### Test 3: Staff Access

**Expected Behavior:** Staff can only access assigned conversations

```sql
-- As Staff A, access their conversation
SET LOCAL role authenticated;
SET LOCAL request.jwt.claim.sub TO 'staff-a';
SELECT * FROM guest_conversations WHERE staff_user_id = 'staff-a';
-- Expected: Returns conversations assigned to staff-a

-- As Staff A, try to access Staff B's conversation
SELECT * FROM guest_conversations WHERE staff_user_id = 'staff-b';
-- Expected: Empty result
```

**Status:** [ ] PASS [ ] FAIL

---

#### Test 4: Admin Override

**Expected Behavior:** Superadmins can access all data in their tenant

```sql
-- As Admin, access all conversations in tenant
SET LOCAL role authenticated;
SET LOCAL request.jwt.claim.sub TO 'test-admin';
SELECT * FROM guest_conversations WHERE tenant_id = 'tenant-a';
-- Expected: Returns all conversations (including other staff's)
```

**Status:** [ ] PASS [ ] FAIL

---

#### Test 5: Guest Access

**Expected Behavior:** Guests only see their own reservations

```sql
-- As Guest A, access their reservation
SET LOCAL role authenticated;
SET LOCAL request.jwt.claim.sub TO 'guest-a';
SELECT * FROM guest_reservations WHERE guest_id = 'guest-a';
-- Expected: Returns reservations for guest-a

-- As Guest A, try to access Guest B's reservation
SELECT * FROM guest_reservations WHERE guest_id = 'guest-b';
-- Expected: Empty result
```

**Status:** [ ] PASS [ ] FAIL

---

### Test Cleanup

```sql
-- Remove test data
DELETE FROM accommodations WHERE id IN ('acc-a', 'acc-b', 'acc-c');
DELETE FROM user_tenant_permissions WHERE user_id IN ('test-user-a', 'test-user-b');
DELETE FROM staff_users WHERE id IN ('test-user-a', 'test-user-b', 'test-admin');
```

---

```

---

## SUCCESS CRITERIA

- [ ] All 134 policies extracted and documented
- [ ] 5 standard policy patterns identified and documented
- [ ] Each pattern has SQL template and test case
- [ ] All 40 tables with RLS documented (4 policies average per table)
- [ ] Each policy documented with purpose, logic breakdown, test case
- [ ] code_embeddings security gap documented with remediation
- [ ] Any other tables missing RLS documented
- [ ] Policy test suite created with 5+ test scenarios
- [ ] Test cases cover all standard patterns
- [ ] RLS_POLICIES.md file created (~1500-2000 lines)
- [ ] DOCUMENTATION_PROGRESS.md updated

---

## ESTIMATED TIMELINE

| Task | Duration | Cumulative |
|------|----------|------------|
| 7.1 Extract All Policies | 1.0 hr | 1.0 hr |
| 7.2 Categorize by Pattern | 45 min | 1.75 hr |
| 7.3 Document Standard Patterns | 1.0 hr | 2.75 hr |
| 7.4 Document Each Table's Policies | 2.0 hr | 4.75 hr |
| 7.5 Document Missing RLS | 30 min | 5.25 hr |
| 7.6 Create Test Suite | 45 min | 6.0 hr |
| **File Creation & Formatting** | 1.0 hr | **7.0 hr** |

**Realistic Total:** 3-4 hours (with optimized bulk documentation of similar policies)

**Optimization Strategy:**
- Document patterns ONCE, reference for similar tables
- Group tables by pattern (batch document similar policies)
- Use templates for standard policy documentation
- Focus detail on unique/complex policies

---

## NEXT STEPS AFTER COMPLETION

Once PART7 is complete:

1. Verify RLS_POLICIES.md includes all 134 policies
2. Check that code_embeddings security gap is prominently featured
3. Validate test suite covers all standard patterns
4. Proceed to PART8 (MIGRATION_SCRIPTS.md)

**Ready for:** PLAN_PART8_MIGRATION_SCRIPTS.md
