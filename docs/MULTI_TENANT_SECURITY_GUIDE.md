# 🔒 MULTI-TENANT SECURITY GUIDE - CRITICAL

## ⚠️ MANDATORY READING FOR ALL DEVELOPERS ⚠️

This guide was created after a **CRITICAL SECURITY INCIDENT** where hardcoded tenant data was exposed to unauthorized users. **Following this guide is NOT optional** - it's required for system security.

## 🚨 WHAT WENT WRONG (Sept 26, 2025)

### The Incident
- **`/api/chat` endpoint** was hardcoded to return SimmerDown data to ALL users
- **`searchDocuments()` function** violated multi-tenant isolation
- **`populate-embeddings.js`** had 6+ hardcoded fallbacks to 'simmerdown'
- **Result**: Data contamination between tenants, security breach

### Root Cause
**Hardcoded tenant identifiers** scattered throughout the codebase instead of dynamic UUID-based lookups.

---

## 🔒 SECURITY RULES (NEVER BREAK THESE)

### Rule #1: NO HARDCODED TENANT IDENTIFIERS
```javascript
// ❌ FORBIDDEN - Hardcoded tenant data
if (tenant === 'simmerdown') { ... }
const tenant_id = metadata.tenant_id || 'simmerdown'

// ✅ REQUIRED - Dynamic UUID lookup
const tenant_id = await resolveTenantSchemaName(client_id)
if (!metadata.tenant_id) throw new Error('tenant_id required')
```

### Rule #2: NO FALLBACK VALUES IN MULTI-TENANT CODE
```javascript
// ❌ FORBIDDEN - Fallbacks contaminate data
tenant_id: metadata.tenant_id || 'default_value'

// ✅ REQUIRED - Explicit validation
if (!metadata.tenant_id) {
  throw new Error('tenant_id is required for security')
}
```

### Rule #3: ALL SEARCH FUNCTIONS MUST BE TENANT-AWARE
```javascript
// ❌ FORBIDDEN - Global search without tenant filtering
await supabase.rpc('match_documents', { query_embedding })

// ✅ REQUIRED - Tenant-specific search
await supabase.rpc('match_sire_documents', {
  query_embedding,
  tenant_id_filter: tenantUuid
})
```

---

## 📋 SECURITY CHECKLIST

Before deploying ANY code that touches tenant data:

### ✅ Code Review Checklist
- [ ] No hardcoded tenant names ('simmerdown', 'hotel1', etc.)
- [ ] No fallback values in tenant_id assignments
- [ ] All database queries include proper tenant filtering
- [ ] No functions expose data from other tenants
- [ ] tenant_id validation is explicit and throws errors

### ✅ Testing Checklist
- [ ] Test with multiple tenant UUIDs
- [ ] Verify data isolation between tenants
- [ ] Test error handling for invalid/missing tenant_ids
- [ ] Verify no cross-tenant data leakage

---

## 🛡️ SECURE ARCHITECTURE PATTERNS

### Pattern 1: Tenant Resolution
```typescript
// Always use this pattern for tenant-aware operations
const tenantId = await resolveTenantSchemaName(client_id)
if (!tenantId) throw new Error('Invalid tenant')

const { data } = await supabase
  .rpc('tenant_specific_function', {
    tenant_id_filter: tenantId,
    // ... other params
  })
```

### Pattern 2: Data Insertion
```typescript
// Always validate tenant_id before insertion
if (!metadata.tenant_id) {
  throw new Error(`tenant_id required for ${table_name}. File: ${source_file}`)
}

const insertData = {
  // ... other fields
  tenant_id: metadata.tenant_id // No fallbacks!
}
```

### Pattern 3: Search Functions
```typescript
// Use specific functions, not global search
const searchSpecific = async (query: string, tenantId: string) => {
  if (!tenantId) throw new Error('tenantId required')

  return await supabase.rpc('match_tenant_documents', {
    query_embedding: embedding,
    tenant_id_filter: tenantId
  })
}
```

---

## 🚫 FORBIDDEN PATTERNS

These patterns have caused security incidents and are **BANNED**:

### ❌ Hardcoded Tenant Checks
```javascript
// FORBIDDEN - Creates maintenance nightmare
if (tenant_id === 'simmerdown') {
  return specific_simmerdown_logic()
}
```

### ❌ Fallback Assignments
```javascript
// FORBIDDEN - Causes data contamination
const tenant = metadata.tenant_id || 'default_tenant'
```

### ❌ Global Search Functions
```javascript
// FORBIDDEN - Violates tenant isolation
function searchAllDocuments() {
  return supabase.from('documents').select('*')
}
```

### ❌ Direct Table Access Without Filtering
```javascript
// FORBIDDEN - No tenant filtering
const allData = await supabase.from('accommodation_units').select('*')
```

---

## 🔧 EMERGENCY PROCEDURES

### If You Discover Hardcoded Tenant Data:

1. **STOP ALL DEPLOYMENTS** immediately
2. **Document the security violation** with file paths and line numbers
3. **Fix the hardcoding** using approved patterns above
4. **Test thoroughly** with multiple tenant UUIDs
5. **Code review** the fix with a senior developer
6. **Deploy the fix** as highest priority

### If You Suspect Data Contamination:

1. **Immediately notify the security team**
2. **Check database logs** for cross-tenant queries
3. **Audit affected tenant data** for contamination
4. **Implement data cleanup** if necessary
5. **Review all related code** for similar issues

---

## 📚 REQUIRED READING

Before touching ANY multi-tenant code, developers MUST read:

1. This security guide (MULTI_TENANT_SECURITY_GUIDE.md)
2. Tenant resolver documentation (src/lib/tenant-resolver.ts)
3. Multi-tenant architecture guide (MULTI_TENANT_ARCHITECTURE.md)

---

## 🏗️ APPROVED FUNCTIONS & PATTERNS

### Safe Search Functions
- `match_sire_documents()` - SIRE compliance documents
- `match_muva_documents()` - MUVA tourism documents
- `match_hotels_documents()` - Tenant-specific hotel data
- `match_optimized_documents()` - Multi-tier with tenant filtering

### Safe Tenant Functions
- `resolveTenantSchemaName()` - Dynamic UUID lookup
- `getTenantInfo()` - Tenant metadata retrieval

---

## 🚨 INCIDENT PREVENTION

This incident could have been prevented by:

1. **Mandatory code reviews** for all multi-tenant changes
2. **Automated testing** with multiple tenant UUIDs
3. **Static analysis** to detect hardcoded tenant strings
4. **Security training** on multi-tenant architecture
5. **Clear documentation** (this guide)

**Never again.** Follow this guide religiously.

---

*Document created: Sept 26, 2025*
*Last updated: Sept 26, 2025*
*Incident reference: HARDCODED-TENANT-BREACH-092625*