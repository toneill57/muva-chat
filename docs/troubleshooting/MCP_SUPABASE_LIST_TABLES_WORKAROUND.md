# MCP Supabase `list_tables` Workaround

**Created:** October 9, 2025
**Severity:** 🟡 Medium - Blocks MCP database inspection
**Status:** ✅ SOLVED

---

## 🚨 Problem

When using the MCP Supabase tool `mcp__supabase__list_tables`, you may encounter:

```
ERROR: 42501: permission denied for schema public
```

This error occurs even though:
- ✅ The Supabase access token is valid
- ✅ The project_id is correct
- ✅ We DO have read access to public schema tables via direct queries

---

## ✅ Solution (The Workaround)

**DO NOT** call `list_tables` without parameters or with default behavior.

**ALWAYS** specify the `schemas` parameter explicitly with an array of schemas you want to inspect:

### ✅ CORRECT Usage

```typescript
// Specify schemas explicitly
mcp__supabase__list_tables({
  project_id: "ooaumjzaztmutltifhoq",
  schemas: ["public"]  // ← CRITICAL: Explicit array
})

// Or for multi-tenant inspection
mcp__supabase__list_tables({
  project_id: "ooaumjzaztmutltifhoq",
  schemas: ["public", "hotels"]  // Multiple schemas
})
```

### ❌ INCORRECT Usage (Will Fail)

```typescript
// ❌ Without schemas parameter (tries to read ALL schemas including system ones)
mcp__supabase__list_tables({
  project_id: "ooaumjzaztmutltifhoq"
})

// ❌ Empty array (same as no parameter)
mcp__supabase__list_tables({
  project_id: "ooaumjzaztmutltifhoq",
  schemas: []
})
```

---

## 🔍 Why This Happens

### Root Cause

When `schemas` parameter is omitted, the MCP server attempts to list **ALL schemas** in the database, including:
- `pg_catalog` (PostgreSQL system catalog)
- `information_schema` (SQL standard metadata)
- `extensions` (Supabase extensions schema)
- `auth` (Supabase auth schema)
- `storage` (Supabase storage schema)
- `public` (your application schema)
- Custom schemas (`hotels`, `simmerdown`, etc.)

The Supabase access token may NOT have permission to read system schemas, causing the error.

### Why Explicit Schema Works

By specifying `schemas: ["public"]`, you're telling the MCP server:
- ✅ "Only query schemas I have explicit permission for"
- ✅ Avoid attempting to read restricted system schemas
- ✅ Reduce query scope to relevant application data

---

## 🛡️ Alternative: Use `execute_sql` for Schema Inspection

If `list_tables` continues failing even with explicit schemas, use direct SQL:

```typescript
mcp__supabase__execute_sql({
  project_id: "ooaumjzaztmutltifhoq",
  query: `
    SELECT
      schemaname,
      tablename,
      pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS total_size
    FROM pg_tables
    WHERE schemaname IN ('public', 'hotels')
    ORDER BY schemaname, tablename;
  `
})
```

**Advantages:**
- ✅ Full control over query permissions
- ✅ Can filter exactly what you need
- ✅ Works even with restrictive RLS policies

**Disadvantages:**
- ❌ More verbose (requires SQL knowledge)
- ❌ Doesn't return structured MCP response format
- ❌ Requires manual parsing of results

---

## 📋 Verification Steps

After applying the workaround, verify it works:

### 1. Test `list_tables` with Explicit Schema

```typescript
mcp__supabase__list_tables({
  project_id: "ooaumjzaztmutltifhoq",
  schemas: ["public"]
})
```

**Expected Output:**
```json
{
  "tables": [
    {
      "schema": "public",
      "name": "guest_reservations",
      "rows": 144,
      "columns": [...],
      "rls_enabled": true
    },
    ...
  ]
}
```

### 2. Verify No Permission Errors

Look for:
- ✅ HTTP 200 response
- ✅ No "42501: permission denied" errors
- ✅ Table list returned successfully

### 3. Test Multi-Schema Query

```typescript
mcp__supabase__list_tables({
  project_id: "ooaumjzaztmutltifhoq",
  schemas: ["public", "hotels"]
})
```

Should return tables from BOTH schemas without errors.

---

## 🎯 When to Use This Workaround

**ALWAYS use explicit `schemas` parameter when:**
- ✅ Inspecting database structure via MCP
- ✅ Generating schema documentation
- ✅ Debugging table permissions or RLS policies
- ✅ Running database health checks

**Consider `execute_sql` alternative when:**
- ⚠️ You need highly specific filtering (e.g., only tables with vector columns)
- ⚠️ `list_tables` fails even with explicit schemas
- ⚠️ You need metadata not returned by `list_tables` (e.g., index usage stats)

---

## 📚 Related Documentation

- **MCP Supabase Server:** `docs/optimization/MCP_SERVERS_RESULTS.md` (Lines 282-331)
- **Database Agent Snapshot:** `snapshots/database-agent.md` (Lines 110-158)
- **Database Query Patterns:** `docs/architecture/DATABASE_QUERY_PATTERNS.md`

---

## 🔄 History

**October 9, 2025 - Initial Discovery**
- User reported: "Hace un rato encontraste el workaround pero no quedó documentado"
- Root cause: Default `list_tables` behavior tries to read restricted system schemas
- Solution: Always use `schemas: ["public"]` parameter explicitly
- This document created to preserve knowledge for future sessions

---

## 🚀 Quick Reference Card

```bash
# ✅ ALWAYS DO THIS
mcp__supabase__list_tables({
  project_id: "ooaumjzaztmutltifhoq",
  schemas: ["public"]
})

# ❌ NEVER DO THIS
mcp__supabase__list_tables({
  project_id: "ooaumjzaztmutltifhoq"
  # Missing schemas parameter = tries to read ALL schemas
})
```

**Bookmark this file:** Save time rediscovering this workaround in future debugging sessions.

---

**Maintained by:** @agent-database-agent
**Last verified:** October 9, 2025
**Next review:** After PostgreSQL upgrade (when permissions may change)
