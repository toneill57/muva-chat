# Schema Routing Guidelines

> **Status**: Current as of September 2025
> **Last Updated**: After accommodation system schema migration
> **Critical**: Follow these guidelines to prevent cross-tenant data breaches

## Overview

This document establishes clear guidelines for database schema routing to prevent the critical architectural error that occurred with the accommodation system, where tables were incorrectly created in the `public` schema instead of the appropriate business-type schema.

## ⚠️ CRITICAL PRINCIPLE: Business Data Isolation

**NEVER ALLOW BUSINESS DATA TO MIX SCHEMAS**

Every business type must have complete data isolation to prevent security breaches and maintain proper tenant separation.

## Schema Architecture Rules

### 1. Schema-by-Business-Type Strategy

```
Database Architecture:
├── public/ (SHARED DATA ONLY)
│   ├── sire_content (SIRE compliance - shared)
│   ├── muva_content (Tourism - shared)
│   ├── tenant_registry (Tenant metadata)
│   └── user_tenant_permissions (Access control)
├── hotels/ (ALL HOTEL BUSINESSES)
│   ├── accommodation_units (tenant_id filtering)
│   ├── policies (tenant_id filtering)
│   ├── properties (tenant_id filtering)
│   └── [all hotel-related tables]
├── restaurants/ (ALL RESTAURANT BUSINESSES)
│   ├── menus (tenant_id filtering)
│   ├── reservations (tenant_id filtering)
│   └── [all restaurant-related tables]
└── activities/ (ALL ACTIVITY BUSINESSES)
    ├── tours (tenant_id filtering)
    ├── equipment (tenant_id filtering)
    └── [all activity-related tables]
```

### 2. Decision Tree for Schema Selection

```
Is this data SHARED across ALL tenants?
├── YES → public schema
│   ├── SIRE compliance data → public.sire_content
│   ├── Tourism/MUVA data → public.muva_content
│   └── System metadata → public.[table_name]
└── NO → Business-type schema
    ├── Hotel business? → hotels schema
    ├── Restaurant business? → restaurants schema
    ├── Activity business? → activities schema
    └── New business type? → Create new schema
```

### 3. Tenant Isolation Within Business Schemas

All business-type schemas MUST use `tenant_id` filtering:

```sql
-- CORRECT: Tenant-isolated query
SELECT * FROM hotels.accommodation_units
WHERE tenant_id = 'simmerdown';

-- WRONG: No tenant filtering (SECURITY BREACH)
SELECT * FROM hotels.accommodation_units;
```

## Implementation Guidelines

### Code-Level Schema Routing

#### 1. populate-embeddings.js Schema Detection

```javascript
// CORRECT implementation
function deriveSchema(type) {
  // Global/shared data
  if (type.startsWith('sire')) return 'public'
  if (['tourism', 'restaurants', 'beaches', 'activities'].includes(type)) return 'public'

  // Business-type data
  if (['hotel', 'amenities', 'policies', 'guest_manual', 'accommodation_unit'].includes(type)) return 'hotels'
  if (['menu', 'reservation', 'restaurant_info'].includes(type)) return 'restaurants'
  if (['tour', 'activity', 'equipment'].includes(type)) return 'activities'

  // Default to public for safety
  return 'public'
}

// WRONG implementation (previous error)
function deriveSchema(type) {
  if (type.startsWith('hotel')) return 'simmerdown' // Creates tenant-specific schema!
  return 'public'
}
```

#### 2. API Endpoint Schema Usage

```typescript
// CORRECT: Use business-type schema with tenant filtering
const query = supabase
  .schema('hotels')
  .from('accommodation_units')
  .select('*')
  .eq('tenant_id', tenantId)

// WRONG: Use public schema for business data
const query = supabase
  .from('accommodation_units') // Defaults to public schema!
  .select('*')
```

#### 3. Database Function Schema Routing

```sql
-- CORRECT: Business-type schema function
CREATE OR REPLACE FUNCTION public.match_hotels_documents(
  query_embedding vector,
  tenant_id_filter text DEFAULT NULL,
  -- other params
)
RETURNS TABLE (...)
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM hotels.accommodation_units au
  WHERE (tenant_id_filter IS NULL OR au.tenant_id = tenant_id_filter);
END;
$$;

-- WRONG: Public schema for business data
CREATE OR REPLACE FUNCTION public.match_accommodation_units(...)
RETURNS TABLE (...)
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.accommodation_units -- WRONG SCHEMA!
  WHERE tenant_id = tenant_id_filter;
END;
$$;
```

## Template and Documentation Updates

### 1. YAML Frontmatter Requirements

```yaml
# CORRECT: Business-type routing
type: "hotel"
content_type: "accommodation_unit"
tenant_id: "simmerdown"
schema: "hotels"  # REQUIRED and HARDCODED

# WRONG: Flexible schema (leads to errors)
type: "hotel"
schema: "public|simmerdown|hotels"  # NO FLEXIBILITY ALLOWED
```

### 2. Documentation Template Updates

All business-type templates MUST hardcode the correct schema:

```markdown
**⚠️ CRITICAL**: The `schema` field is HARDCODED and CANNOT be changed:
- Hotel content: `schema: "hotels"`
- Restaurant content: `schema: "restaurants"`
- Activity content: `schema: "activities"`

**🚫 NEVER use**: `schema: "public"` for business-specific data
```

## Validation and Prevention

### 1. Pre-Deployment Validation Script

```bash
#!/bin/bash
# validate-schema-routing.sh

echo "🔍 Validating schema routing..."

# Check for incorrect public schema usage in business APIs
if grep -r "\.from('accommodation_units')" src/app/api/ | grep -v "schema('hotels')"; then
  echo "❌ ERROR: Found accommodation_units queries without hotels schema!"
  exit 1
fi

# Check for hardcoded schemas in templates
if grep -r 'schema:.*public.*hotels' _assets/; then
  echo "❌ ERROR: Found flexible schema definitions in templates!"
  exit 1
fi

echo "✅ Schema routing validation passed"
```

### 2. Database Migration Validation

```sql
-- Run this check before any accommodation-related migration
SELECT
  table_schema,
  table_name,
  COUNT(*) as record_count
FROM information_schema.tables t
JOIN (
  SELECT schemaname, tablename, n_tup_ins
  FROM pg_stat_user_tables
  WHERE schemaname IN ('public', 'hotels')
) s ON t.table_schema = s.schemaname AND t.table_name = s.tablename
WHERE table_name LIKE '%accommodation%'
GROUP BY table_schema, table_name;

-- Expected result: Only hotels.accommodation_units should have records
```

### 3. Code Review Checklist

Before any schema-related changes:

- [ ] Is business data going to the correct business-type schema?
- [ ] Are all business queries using `tenant_id` filtering?
- [ ] Are templates hardcoded with correct schemas?
- [ ] Are API endpoints using `.schema()` method correctly?
- [ ] Have validation scripts been run?

## Common Anti-Patterns to Avoid

### ❌ ANTI-PATTERN 1: Per-Tenant Schemas
```sql
-- WRONG: Creating schema per tenant
CREATE SCHEMA simmerdown;
CREATE SCHEMA other_hotel;

-- Leads to: Unmaintainable schema explosion
```

### ❌ ANTI-PATTERN 2: Business Data in Public Schema
```sql
-- WRONG: Business data in shared schema
CREATE TABLE public.accommodation_units (...);

-- Leads to: Potential data mixing across tenants
```

### ❌ ANTI-PATTERN 3: Flexible Schema Configuration
```javascript
// WRONG: Runtime schema selection
const schema = config.hotel_schema || 'public'

// Leads to: Inconsistent routing and errors
```

### ❌ ANTI-PATTERN 4: Missing Tenant Filtering
```typescript
// WRONG: No tenant isolation
const units = await supabase
  .schema('hotels')
  .from('accommodation_units')
  .select('*') // SECURITY BREACH!

// Leads to: Cross-tenant data exposure
```

## Corrective Actions for Schema Errors

If you discover data in the wrong schema:

### 1. Immediate Assessment
```sql
-- Check for data in wrong locations
SELECT table_schema, table_name,
       (SELECT COUNT(*) FROM information_schema.columns
        WHERE table_schema = t.table_schema AND table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_name LIKE '%[business_type]%'
ORDER BY table_schema;
```

### 2. Migration Plan
1. **Create correct schema structure**
2. **Migrate data with tenant_id assignment**
3. **Update all API endpoints**
4. **Update documentation**
5. **Test tenant isolation**
6. **Remove old incorrect structures**

### 3. Rollback Plan
Always maintain the ability to rollback:
```sql
-- Backup before migration
CREATE TABLE backup_accommodation_units AS
SELECT * FROM public.accommodation_units;
```

## Success Metrics

A properly implemented schema routing system will have:

- ✅ **Zero cross-tenant data leaks**
- ✅ **Clear schema separation by business type**
- ✅ **Consistent API routing with tenant filtering**
- ✅ **Hardcoded schemas in all templates**
- ✅ **Validation scripts preventing future errors**
- ✅ **Complete tenant isolation within business schemas**

## Emergency Procedures

### Data Breach Detection
```sql
-- Check for potential cross-tenant exposure
SELECT tenant_id, COUNT(*)
FROM hotels.accommodation_units
GROUP BY tenant_id;

-- Should show clear separation, no mixed data
```

### Quick Schema Audit
```bash
# Check all accommodation-related tables
psql -c "
SELECT schemaname, tablename, n_tup_ins as records
FROM pg_stat_user_tables
WHERE tablename LIKE '%accommodation%'
ORDER BY schemaname, tablename;
"
```

---

**Remember**: Schema routing is a SECURITY BOUNDARY. Any error in schema routing can lead to data exposure across tenants. When in doubt, always err on the side of caution and implement the strictest tenant isolation possible.