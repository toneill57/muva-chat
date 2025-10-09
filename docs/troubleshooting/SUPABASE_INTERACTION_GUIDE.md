# Supabase Interaction Guide - Complete Methodology

**Created:** October 9, 2025
**Status:** ✅ PRODUCTION-READY
**Purpose:** Document efficient methods for interacting with Supabase database

---

## 🎯 Executive Summary

This guide documents the **correct and efficient methodology** for interacting with Supabase in the InnPilot project, based on lessons learned during SIRE Compliance Phase 12 testing (Oct 9, 2025).

**Key Learnings:**
1. ✅ **NEVER invent project IDs** - Always use `SUPABASE_PROJECT_ID` from `.env.local`
2. ✅ **MCP `list_tables` requires explicit `schemas` parameter** - Prevents permission errors
3. ✅ **TypeScript scripts for RPC testing** - More reliable than MCP for complex operations
4. ✅ **Management API for DDL** - Only method that works programmatically

---

## 📋 Table of Contents

1. [Quick Reference](#quick-reference)
2. [The Problem We Solved](#the-problem-we-solved)
3. [Correct Methodology](#correct-methodology)
4. [Common Pitfalls](#common-pitfalls)
5. [Scripts Reference](#scripts-reference)
6. [Troubleshooting](#troubleshooting)

---

## ⚡ Quick Reference

### ✅ CORRECT Patterns

```typescript
// 1. List tables via MCP (with correct project_id + schemas)
mcp__supabase__list_tables({
  project_id: "ooaumjzaztmutltifhoq",  // From .env.local
  schemas: ["public"]  // ← CRITICAL: Must be explicit
})

// 2. Test RPC function (using Supabase JS client)
// File: scripts/debug-rpc-function.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const { data, error } = await supabase.rpc('get_sire_guest_data', {
  p_reservation_id: 'some-uuid'
});

// 3. Execute DDL migration (via Management API)
// Run: set -a && source .env.local && set +a && npx tsx scripts/execute-ddl-via-api.ts migration.sql
```

### ❌ INCORRECT Patterns

```typescript
// ❌ WRONG: Invented project ID
mcp__supabase__list_tables({
  project_id: "vdkqhmejntobqtvrnfsk"  // ← INVENTED! Will fail
})

// ❌ WRONG: Missing schemas parameter
mcp__supabase__list_tables({
  project_id: "ooaumjzaztmutltifhoq"  // ← Will try to read ALL schemas, fails
})

// ❌ WRONG: Using MCP for DDL
mcp__supabase__apply_migration(...)  // ← Permission denied
mcp__supabase__execute_sql("CREATE FUNCTION...")  // ← Permission denied
```

---

## 🚨 The Problem We Solved

### Context: SIRE Compliance Phase 12 Testing (October 9, 2025)

**Goal:** Test 3 staff endpoints that required JWT authentication:
1. `GET /api/reservations/list` (with SIRE fields)
2. `GET /api/sire/guest-data` (TXT export)
3. `GET /api/sire/statistics` (completeness metrics)

**Challenge:** RPC function `get_sire_guest_data()` was failing with cryptic error:
```
Error: structure of query does not match function result type
Details: Returned type character varying(20) does not match expected type text in column 2.
```

### Root Causes Discovered

#### Issue 1: Invented Project ID
**What happened:**
- Used `project_id: "vdkqhmejntobqtvrnfsk"` in MCP call
- This ID was **completely invented** - didn't exist in any file
- Correct ID (`ooaumjzaztmutltifhoq`) was in `.env.local` but not documented

**Lesson Learned:**
> **NEVER invent IDs.** Always read from source of truth (`.env.local` or `NEXT_PUBLIC_SUPABASE_URL`).

#### Issue 2: Type Mismatch in RPC Function
**What happened:**
- Table `guest_reservations` had column `reservation_code VARCHAR(20)`
- RPC function declared return type as `reservation_code TEXT`
- PostgreSQL strict type checking failed: `VARCHAR ≠ TEXT`

**Solution Applied:**
- Added explicit CAST to TEXT for all VARCHAR columns
- Migration: `supabase/migrations/20251009000103_fix_get_sire_guest_data_types.sql`
- Executed via Management API (only method that works for DDL)

**Code Fix:**
```sql
CREATE OR REPLACE FUNCTION get_sire_guest_data(p_reservation_id UUID)
RETURNS TABLE (
  reservation_id UUID,
  reservation_code TEXT,  -- Declared as TEXT
  tenant_id TEXT,
  -- ... more fields
)
AS $$
BEGIN
  RETURN QUERY
  SELECT
    gr.id,
    gr.reservation_code::TEXT,  -- ✅ Explicit CAST
    gr.tenant_id::TEXT,
    -- ... more fields with CAST
  FROM guest_reservations gr
  -- ... rest of function
END;
$$;
```

#### Issue 3: Work-around Temptation
**What almost happened:**
- Created multiple "debugging" scripts instead of fixing root cause
- Almost gave up on MCP and used only TypeScript scripts
- Would have perpetuated inefficiency

**Lesson Learned:**
> **Always investigate root cause first.** Work-arounds should be last resort after thorough investigation.

---

## ✅ Correct Methodology

### Hierarchy for Database Operations

```
DATABASE OPERATIONS DECISION TREE
│
├── Schema Inspection (Read table metadata)
│   ├── PRIMARY: MCP list_tables
│   │   • MUST include: project_id + schemas
│   │   • Fast, structured response
│   │   • Example: mcp__supabase__list_tables({ project_id: "ooaumjzaztmutltifhoq", schemas: ["public"] })
│   │
│   └── SECONDARY: TypeScript scripts
│       • For complex queries
│       • Example: scripts/check-table-schema.ts
│
├── Data Queries (DML: SELECT/INSERT/UPDATE/DELETE)
│   ├── PRIMARY: RPC Functions (via Supabase JS)
│   │   • Production-ready
│   │   • Example: supabase.rpc('get_sire_statistics', {...})
│   │
│   └── SECONDARY: Direct SQL (via MCP execute_sql)
│       • Ad-hoc analysis only
│       • Example: mcp__supabase__execute_sql({ query: "SELECT * FROM..." })
│
└── Schema Changes (DDL: CREATE/ALTER/DROP)
    └── ONLY: Management API
        • Via scripts/execute-ddl-via-api.ts
        • Example: npx tsx scripts/execute-ddl-via-api.ts migration.sql
```

### Configuration Requirements

**Environment Variables (`.env.local`):**
```bash
# Supabase Configuration
SUPABASE_PROJECT_ID=ooaumjzaztmutltifhoq  # ← NEW: Explicit project ID
SUPABASE_URL=https://ooaumjzaztmutltifhoq.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# MCP Servers Configuration
SUPABASE_ACCESS_TOKEN=sbp_32b777f1b90ca669a789023b6b0c0ba2e92974fa
```

**MCP Configuration (`~/.claude/mcp.json`):**
```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-supabase"],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "sbp_32b777f1b90ca669a789023b6b0c0ba2e92974fa"
      }
    }
  }
}
```

---

## ⚠️ Common Pitfalls

### Pitfall 1: Inventing Project IDs

**Problem:**
```typescript
// ❌ WRONG: Where did this ID come from?
mcp__supabase__list_tables({
  project_id: "vdkqhmejntobqtvrnfsk"
})
```

**Solution:**
```typescript
// ✅ CORRECT: Use ID from .env.local or extract from URL
const projectId = process.env.SUPABASE_PROJECT_ID ||
                  process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/(.+)\.supabase\.co/)?.[1];

mcp__supabase__list_tables({
  project_id: "ooaumjzaztmutltifhoq",  // From .env.local
  schemas: ["public"]
})
```

### Pitfall 2: Omitting `schemas` Parameter

**Problem:**
```typescript
// ❌ WRONG: Missing schemas parameter
mcp__supabase__list_tables({
  project_id: "ooaumjzaztmutltifhoq"
})
// Error: 42501: permission denied for schema public
```

**Why it fails:**
- Without `schemas`, MCP tries to list **ALL schemas** including:
  - `pg_catalog`, `information_schema`, `extensions`, `auth`, `storage`
- Access token doesn't have permission for system schemas

**Solution:**
```typescript
// ✅ CORRECT: Explicit schemas array
mcp__supabase__list_tables({
  project_id: "ooaumjzaztmutltifhoq",
  schemas: ["public"]  // ← CRITICAL
})
```

### Pitfall 3: Using MCP for DDL

**Problem:**
```bash
# ❌ WRONG: MCP tools fail for DDL
mcp__supabase__apply_migration(...)
mcp__supabase__execute_sql("CREATE OR REPLACE FUNCTION...")
# Error: permission denied
```

**Why it fails:**
- MCP tools use limited permissions
- DDL requires higher privileges than granted to access token

**Solution:**
```bash
# ✅ CORRECT: Use Management API
set -a && source .env.local && set +a
npx tsx scripts/execute-ddl-via-api.ts supabase/migrations/20251009000103_fix.sql
```

### Pitfall 4: Creating Work-arounds Before Investigation

**Problem:**
```bash
# ❌ WRONG: Creating alternative script without understanding why original fails
# scripts/workaround-list-tables.ts
# scripts/alternative-rpc-test.ts
# scripts/bypass-mcp.ts
```

**Solution:**
```bash
# ✅ CORRECT: Investigate root cause first
# 1. Read error message carefully
# 2. Check if project_id is correct
# 3. Verify schemas parameter is included
# 4. Test with simpler query first
# 5. ONLY then create work-around if truly needed
```

---

## 📚 Scripts Reference

### Created During Phase 12

#### 1. `scripts/debug-rpc-function.ts`
**Purpose:** Test RPC functions using Supabase JS client
**When to use:** Verify RPC function works before using in production

```bash
# Usage
set -a && source .env.local && set +a && npx tsx scripts/debug-rpc-function.ts

# Expected output:
# ✅ RPC Success!
# Data: [{ reservation_id: '...', reservation_code: 'MP-30459', ... }]
```

**Template:**
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testRPC() {
  const { data, error } = await supabase.rpc('get_sire_guest_data', {
    p_reservation_id: '186a52ff-e128-4cf0-8f5d-874c3a0fdf92'
  });

  if (error) {
    console.error('❌ RPC Error:', error);
    return;
  }

  console.log('✅ RPC Success!');
  console.log('Data:', JSON.stringify(data, null, 2));
}

testRPC();
```

#### 2. `scripts/test-staff-endpoints.ts`
**Purpose:** End-to-end test of staff authentication + endpoints
**When to use:** Validate JWT auth flow + API responses

```bash
# Usage
set -a && source .env.local && set +a && npx tsx scripts/test-staff-endpoints.ts

# Expected output:
# 🎉 All staff endpoint tests PASSED!
# ✅ Test Coverage: Now 24/24 (100%)
```

**Key features:**
- Tests login flow with tenant_id
- Tests 3 staff endpoints in sequence
- Validates response structures
- Reports coverage metrics

#### 3. `scripts/execute-ddl-via-api.ts`
**Purpose:** Execute DDL migrations via Supabase Management API
**When to use:** Apply CREATE/ALTER/DROP functions to database

```bash
# Usage
set -a && source .env.local && set +a
npx tsx scripts/execute-ddl-via-api.ts supabase/migrations/20251009000103_fix.sql

# Expected output:
# ✅ DDL executed successfully!
```

**Why it works:**
- Uses Management API (higher privileges than MCP)
- Reads SQL file and sends to `/database/query` endpoint
- Only method that works programmatically for DDL

---

## 🔧 Troubleshooting

### Error: "permission denied for schema public"

**Cause:** Missing `schemas` parameter in `mcp__supabase__list_tables`

**Solution:**
```typescript
// Add schemas parameter
mcp__supabase__list_tables({
  project_id: "ooaumjzaztmutltifhoq",
  schemas: ["public"]  // ← Fix
})
```

**Reference:** `docs/troubleshooting/MCP_SUPABASE_LIST_TABLES_WORKAROUND.md`

---

### Error: "structure of query does not match function result type"

**Cause:** Type mismatch between table columns and RPC function return type

**Example:**
```
Details: Returned type character varying(20) does not match expected type text in column 2.
```

**Solution:**
1. Add explicit CAST in RPC function:
```sql
SELECT
  gr.reservation_code::TEXT,  -- ← Add ::TEXT
  gr.tenant_id::TEXT,
  -- ... more fields
FROM guest_reservations gr
```

2. Execute DDL via Management API:
```bash
set -a && source .env.local && set +a
npx tsx scripts/execute-ddl-via-api.ts migration.sql
```

---

### Error: "Your account does not have the necessary privileges"

**Cause:** Using MCP tools for DDL operations

**Solution:** Use Management API instead (see "Scripts Reference" above)

---

## 🎯 Success Criteria

When this methodology is working correctly, you should see:

✅ **MCP list_tables works:**
```typescript
mcp__supabase__list_tables({ project_id: "ooaumjzaztmutltifhoq", schemas: ["public"] })
// Returns: [{ schema: "public", name: "guest_reservations", rows: 144, ... }]
```

✅ **RPC functions work:**
```bash
npx tsx scripts/debug-rpc-function.ts
# Output: ✅ RPC Success! Data: [...]
```

✅ **DDL migrations work:**
```bash
npx tsx scripts/execute-ddl-via-api.ts migration.sql
# Output: ✅ DDL executed successfully!
```

✅ **Tests pass:**
```bash
npx tsx scripts/test-staff-endpoints.ts
# Output: 🎉 All staff endpoint tests PASSED! (3/3 - 100%)
```

---

## 📖 Related Documentation

- **CLAUDE.md** - Lines 114-169: "Supabase Interaction Best Practices"
- **MCP_SUPABASE_LIST_TABLES_WORKAROUND.md** - Why `schemas` parameter is required
- **MCP_SERVERS_RESULTS.md** - Lines 282-331: Supabase MCP server configuration
- **.env.local** - Line 2: `SUPABASE_PROJECT_ID=ooaumjzaztmutltifhoq`

---

## 🔄 History

**October 9, 2025** - Initial discovery and documentation
- User identified pattern of "inventing IDs" and creating work-arounds
- Root cause analysis revealed:
  1. Missing project ID documentation
  2. Type mismatch in RPC function
  3. Incorrect tool usage (MCP vs TypeScript scripts vs Management API)
- Solution implemented:
  1. Added `SUPABASE_PROJECT_ID` to `.env.local`
  2. Fixed RPC function with explicit CAST
  3. Documented correct methodology in this guide
- Result: **24/24 tests passing (100% coverage)**

---

## 🚀 Quick Start Checklist

Before interacting with Supabase, verify:

- [ ] `.env.local` has `SUPABASE_PROJECT_ID=ooaumjzaztmutltifhoq`
- [ ] MCP Supabase server is connected (`/mcp` shows 5/5)
- [ ] Know which tool to use (MCP vs TypeScript vs Management API)
- [ ] Include `schemas: ["public"]` in MCP calls
- [ ] Never invent project IDs - always read from `.env.local`

**Then proceed with confidence!** ✅

---

**Maintained by:** @agent-database-agent
**Last verified:** October 9, 2025
**Next review:** After PostgreSQL upgrade (when permissions may change)
