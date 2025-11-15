# Supabase Branching Guide

Complete guide to Supabase Branching for the MUVA Chat Three Environments CI/CD workflow.

**Last Updated**: 2025-11-01
**Status**: Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Branch Architecture](#branch-architecture)
3. [Creating a New Branch](#creating-a-new-branch)
4. [Copying Data Between Branches](#copying-data-between-branches)
5. [Managing Branches](#managing-branches)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)
8. [Credentials Reference](#credentials-reference)

---

## Overview

### What is Supabase Branching?

Supabase Branching allows you to create isolated database environments from a parent Supabase project. Each branch has:

- **Separate database instance** with its own data
- **Unique project reference** (`project_ref`)
- **Separate API keys** (anon, service_role)
- **Independent database password**
- **Same schema as parent** (initially)

### Why Use Supabase Branching?

- **Isolated Testing**: Test database changes without affecting production
- **Development Parity**: Develop against realistic data structures
- **Safe Migrations**: Validate migrations before applying to production
- **Feature Branches**: Create temporary environments for feature development
- **Preview Deployments**: Enable preview environments with isolated data

### Key Differences: Branches vs Projects

| Feature | Supabase Project | Supabase Branch |
|---------|------------------|-----------------|
| **Cost** | Full project billing | Hourly billing (cheaper) |
| **Data** | Independent | Inherits schema from parent |
| **Schema** | Fully independent | Synced from parent initially |
| **Lifespan** | Permanent | Temporary (can be long-lived) |
| **Migrations** | Applied directly | Inherited from parent |

---

## Branch Architecture

### Current Setup (MUVA Chat)

```
┌─────────────────────────────────────────────────────────┐
│                    Supabase Branching                    │
└─────────────────────────────────────────────────────────┘

  Parent Project: ooaumjzaztmutltifhoq (DEV)
  └── Branch: staging (rvjmwwvkhglcuqwcznph)
```

### Git ↔ Supabase Mapping

| Git Branch | Supabase Branch | Project Ref | Environment |
|------------|-----------------|-------------|-------------|
| `dev` | `dev` (parent) | `ooaumjzaztmutltifhoq` | Development/Production |
| `staging` | `staging` | `rvjmwwvkhglcuqwcznph` | Staging/Testing |
| `main` | `dev` (parent) | `ooaumjzaztmutltifhoq` | Production |

**Note**: In our architecture, the `dev` branch in Supabase IS our production database. This is intentional.

---

## Creating a New Branch

### Method 1: Automated Script (Recommended)

Use our automated setup script:

```bash
# Schema only (no data)
pnpm dlx tsx scripts/setup-supabase-branch.ts --name <branch-name>

# Schema + data copy
pnpm dlx tsx scripts/setup-supabase-branch.ts --name <branch-name> --with-data
```

**Examples:**

```bash
# Create staging branch (schema only)
pnpm dlx tsx scripts/setup-supabase-branch.ts --name staging

# Create feature branch with data
pnpm dlx tsx scripts/setup-supabase-branch.ts --name feature-auth --with-data
```

**What the script does:**

1. ✅ Validates `SUPABASE_ACCESS_TOKEN` environment variable
2. ✅ Creates branch via Supabase Management API
3. ✅ Waits for branch to be ready (ACTIVE_HEALTHY status)
4. ✅ Retrieves API keys (anon, service_role)
5. ✅ Retrieves database password
6. ✅ Outputs complete `.env.<branch-name>` configuration
7. ✅ Provides next steps

**Output:**

```bash
╔════════════════════════════════════════════════════════════════╗
║  BRANCH CONFIGURATION - Add to .env.staging                    ║
╚════════════════════════════════════════════════════════════════╝

# Supabase Branch: staging
# Git Branch: staging
# Project Ref: rvjmwwvkhglcuqwcznph
# Created: 2025-11-01

NEXT_PUBLIC_SUPABASE_URL=https://rvjmwwvkhglcuqwcznph.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_PROJECT_ID=rvjmwwvkhglcuqwcznph
SUPABASE_DB_PASSWORD=3hZMdp62TmM6RycK

# Environment
NODE_ENV=staging
```

### Method 2: Supabase CLI

```bash
# Install Supabase CLI (if not already installed)
brew install supabase/tap/supabase

# Login with your access token
supabase login

# Create branch
supabase branches create <branch-name> --project-ref ooaumjzaztmutltifhoq
```

### Method 3: MCP Tools (Claude Code)

```typescript
// Use the MCP Supabase tools
await mcp__supabase__create_branch({
  project_id: "ooaumjzaztmutltifhoq",
  name: "staging",
  confirm_cost_id: "<cost_confirmation_id>" // From mcp__supabase__confirm_cost
});
```

---

## Copying Data Between Branches

### Important: Schema vs Data

**Supabase branching behavior:**
- ✅ **Schema (DDL)** is ALWAYS copied when creating a branch
- ❌ **Data (DML)** is NOT copied by default

**To copy data**, you have two options:

### Method 1: TypeScript Script (Recommended) ✅

Use our batch copy script:

```bash
pnpm dlx tsx scripts/copy-dev-to-staging.ts
```

**⚠️ IMPORTANTE - Credenciales Correctas:**

Este script usa **SERVICE_ROLE_KEY** (NO database password):

```typescript
// ✅ CORRECTO - Service Role Keys
const dev = createClient(DEV_URL, DEV_SERVICE_KEY);
const staging = createClient(STAGING_URL, STAGING_SERVICE_KEY);

// ❌ INCORRECTO - Database passwords NO funcionan para esto
```

**What it does:**

1. Connects to DEV (production) using **service role key**
2. Connects to STAGING (target) using **service role key**
3. Truncates existing data in staging
4. Copies data in batches of 100 rows per table
5. Verifies row counts after completion

**Resultado comprobado:** 6,576 registros copiados exitosamente (94.6%)

**Supported tables:**

```typescript
const TABLES = [
  'code_embeddings',
  'muva_content',
  'prospective_sessions',
  'chat_messages',
  'accommodation_units_manual_chunks',
  'accommodation_units_public',
  'guest_conversations',
  'guest_reservations',
  'reservation_accommodations',
  'sync_history',
];
```

**For special tables** (different PKs, generated columns):

```bash
pnpm dlx tsx scripts/copy-missing-tables.ts
```

### Method 2: PostgreSQL pg_dump/psql ❌ (NO RECOMENDADO)

**⚠️ ADVERTENCIA:** Este método **NO funcionó** en nuestras pruebas.

**Intentos que fallaron:**

```bash
# ❌ FALLÓ - FATAL: Tenant or user not found
PGPASSWORD="fhPqCduAAaBl0axt" pg_dump \
  "postgresql://postgres.ooaumjzaztmutltifhoq@aws-0-us-east-1.pooler.supabase.com:5432/postgres" \
  --data-only \
  --no-owner \
  --no-acl \
  --file="backups/dev-data-$(date +%Y%m%d).sql"

# ❌ TAMBIÉN FALLÓ
PGPASSWORD="3hZMdp62TmM6RycK" psql \
  "postgresql://postgres.rvjmwwvkhglcuqwcznph@aws-0-us-east-1.pooler.supabase.com:5432/postgres" \
  --file="backups/dev-data.sql"
```

**Problemas encontrados:**

- `FATAL: Tenant or user not found` - Errores de autenticación
- Connection string format issues con el pooler
- Múltiples intentos con diferentes passwords fallaron

**Lección aprendida:**

- Database Passwords (`SUPABASE_DB_PASSWORD`) ≠ Service Role Keys
- Para copiar datos: **Use Method 1 (TypeScript + Service Role Keys)**
- Database passwords son principalmente para Supabase CLI y operaciones DDL

**Ver guía completa de credenciales:** [CREDENTIALS_GUIDE.md](./CREDENTIALS_GUIDE.md)

---

## Managing Branches

### List All Branches

**Using MCP:**

```typescript
await mcp__supabase__list_branches({
  project_id: "ooaumjzaztmutltifhoq"
});
```

**Using Supabase CLI:**

```bash
supabase branches list --project-ref ooaumjzaztmutltifhoq
```

**Expected Output:**

```
NAME       STATUS             PROJECT_REF          CREATED_AT
dev        ACTIVE_HEALTHY     ooaumjzaztmutltifhoq  2024-10-15
staging    ACTIVE_HEALTHY     rvjmwwvkhglcuqwcznph  2025-11-01
```

### Check Branch Status

**Using MCP:**

```typescript
await mcp__supabase__get_project({
  id: "rvjmwwvkhglcuqwcznph"
});
```

**Possible Statuses:**

- `ACTIVE_HEALTHY` - Ready to use
- `COMING_UP` - Initializing
- `MIGRATIONS_FAILED` - Migration issues (check migrations directory)
- `PAUSED` - Branch paused
- `UNKNOWN` - Status unknown

### Delete a Branch

**Using MCP:**

```typescript
await mcp__supabase__delete_branch({
  branch_id: "<branch_id>" // NOT project_ref, use branch ID
});
```

**Using Supabase CLI:**

```bash
supabase branches delete <branch-name> --project-ref ooaumjzaztmutltifhoq
```

**⚠️ Warning:** Deleting a branch is **irreversible**. All data will be lost.

### Merge Branch to Production

**Using MCP:**

```typescript
await mcp__supabase__merge_branch({
  branch_id: "<branch_id>"
});
```

**What it does:**

- Applies migrations from branch to parent
- Copies Edge Functions
- **Does NOT copy data**

---

## Best Practices

### 1. Branch Naming

**Align with Git branches:**

```
✅ Good:
   Git: staging      → Supabase: staging
   Git: feature-auth → Supabase: feature-auth
   Git: fix-booking  → Supabase: fix-booking

❌ Bad:
   Git: staging      → Supabase: staging-v2
   Git: feature-auth → Supabase: test-branch
```

### 2. Environment Variables

**Create dedicated `.env.<branch-name>` files:**

```
.env.dev       → DEV branch credentials
.env.staging   → STAGING branch credentials
.env.production → PRODUCTION credentials
```

**Never commit:**

```bash
# .gitignore should include:
.env.local
.env.dev
.env.staging
.env.production
.env*.local
```

### 3. Data Synchronization

**Schedule regular data copies:**

```bash
# Daily staging refresh (cron job)
0 2 * * * cd /path/to/muva-chat && pnpm dlx tsx scripts/copy-dev-to-staging.ts
```

**Or manual refresh when needed:**

```bash
# Before major testing
pnpm dlx tsx scripts/copy-dev-to-staging.ts
```

### 4. Migration Testing

**Always test migrations on staging first:**

```bash
# 1. Create migration
pnpm dlx tsx scripts/execute-ddl-via-api.ts migration.sql

# 2. Test on staging
# (Switch to .env.staging)
pnpm run build && pnpm run test

# 3. If successful, apply to production
# (Switch to .env.dev)
pnpm dlx tsx scripts/execute-ddl-via-api.ts migration.sql
```

### 5. Branch Lifecycle

**Short-lived feature branches:**

```bash
# Create
pnpm dlx tsx scripts/setup-supabase-branch.ts --name feature-xyz

# Use (2-5 days)
# ... develop feature ...

# Merge migrations to production
# ... via Supabase Dashboard or CLI ...

# Delete
supabase branches delete feature-xyz
```

**Long-lived staging branches:**

```bash
# Create once
pnpm dlx tsx scripts/setup-supabase-branch.ts --name staging

# Refresh data periodically
pnpm dlx tsx scripts/copy-dev-to-staging.ts

# Keep alive permanently
```

### 6. Cost Management

**Supabase branch billing:**

- Charged per **compute hour** (not full project price)
- Paused branches: **$0/hour**
- Active branches: **~$0.01344/hour** (~$10/month)

**Cost optimization:**

```bash
# Pause unused branches
supabase branches pause feature-old --project-ref ooaumjzaztmutltifhoq

# Delete completed feature branches
supabase branches delete feature-completed
```

---

## Troubleshooting

### Error: "MIGRATIONS_FAILED" Status

**Symptoms:**

```
Branch status: MIGRATIONS_FAILED
Branch has data but shows errors in Supabase Dashboard
```

**Common Causes:**

1. **Non-.sql files in `supabase/migrations/` directory**

   ```bash
   # ❌ This causes errors:
   supabase/migrations/README.md
   supabase/migrations/notes.txt

   # ✅ Only .sql files allowed:
   supabase/migrations/20251101000000_init.sql
   ```

   **Fix:** Move documentation to `docs/database/`

2. **Invalid SQL syntax in migration file**

   **Fix:** Test migration locally first

3. **Migration order issues** (foreign key dependencies)

   **Fix:** Reorder migrations respecting dependencies

**Resolution:**

```bash
# Check what's in migrations directory
ls -la supabase/migrations/

# Remove non-.sql files
mv supabase/migrations/README.md docs/database/

# Verify branch status
supabase branches list --project-ref ooaumjzaztmutltifhoq
```

### Error: "Tenant or user not found" (PostgreSQL)

**Symptoms:**

```bash
pg_dump: error: connection to server failed: FATAL: Tenant or user not found
```

**Cause:** Wrong database password or project ref

**Fix:**

1. **Verify you're using the correct password for the environment:**

   ```bash
   # DEV password (ooaumjzaztmutltifhoq):
   fhPqCduAAaBl0axt

   # STAGING password (rvjmwwvkhglcuqwcznph):
   3hZMdp62TmM6RycK
   ```

2. **Get current password from Supabase Dashboard:**

   - Go to: Project Settings → Database → Connection String
   - Password is shown in the connection string

3. **Update `.env.staging` or `.env.dev`:**

   ```bash
   SUPABASE_DB_PASSWORD=<correct_password>
   ```

### Error: "Cannot insert into generated column"

**Symptoms:**

```bash
ERROR: cannot insert a non-DEFAULT value into column "accommodation_unit_id_key"
DETAIL: Column "accommodation_unit_id_key" is a generated column.
```

**Cause:** Trying to insert data into auto-generated column

**Fix:**

Remove generated columns before insert:

```typescript
// In copy script
const cleanData = data.map((row: any) => {
  const { accommodation_unit_id_key, ...rest } = row;
  return rest;
});

await stagingClient.from(table).insert(cleanData);
```

### Error: Branch has 0 records after creation

**Symptoms:**

```
Branch created successfully
Branch status: ACTIVE_HEALTHY
Row count: 0 (expected: 7,757)
```

**Cause:** Supabase branches copy **schema only**, not data

**Fix:**

Copy data manually using our scripts:

```bash
pnpm dlx tsx scripts/copy-dev-to-staging.ts
```

### Error: "Access token not found"

**Symptoms:**

```bash
❌ Error: SUPABASE_ACCESS_TOKEN environment variable not set
```

**Fix:**

1. **Get access token:**
   - Go to: https://supabase.com/dashboard/account/tokens
   - Generate new token if needed

2. **Set in environment:**

   ```bash
   # .env.local (for local development)
   SUPABASE_ACCESS_TOKEN=sbp_xxxxx...

   # Or export in shell
   export SUPABASE_ACCESS_TOKEN=sbp_xxxxx...
   ```

3. **Verify:**

   ```bash
   echo $SUPABASE_ACCESS_TOKEN
   ```

---

## Reference

### Environment Variables Quick Reference

**.env.dev** (Production):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://ooaumjzaztmutltifhoq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_PROJECT_ID=ooaumjzaztmutltifhoq
SUPABASE_DB_PASSWORD=fhPqCduAAaBl0axt
NODE_ENV=development
```

**.env.staging**:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://rvjmwwvkhglcuqwcznph.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_PROJECT_ID=rvjmwwvkhglcuqwcznph
SUPABASE_DB_PASSWORD=3hZMdp62TmM6RycK
NODE_ENV=staging
```

### Useful Commands

```bash
# Create new branch (schema only)
pnpm dlx tsx scripts/setup-supabase-branch.ts --name <name>

# Create branch with data copy
pnpm dlx tsx scripts/setup-supabase-branch.ts --name <name> --with-data

# Copy data from dev to staging
pnpm dlx tsx scripts/copy-dev-to-staging.ts

# Copy special tables
pnpm dlx tsx scripts/copy-missing-tables.ts

# List all branches
supabase branches list --project-ref ooaumjzaztmutltifhoq

# Delete branch
supabase branches delete <name> --project-ref ooaumjzaztmutltifhoq

# Check branch status
supabase branches get <name> --project-ref ooaumjzaztmutltifhoq
```

### Related Documentation

- [Three Environments Plan](./plan.md) - Overall architecture
- [Git ↔ Supabase Sync](../GIT_SUPABASE_SYNC.md) - Branch mapping
- [TODO List](./TODO.md) - Implementation progress
- [.env.template](../../../.env.template) - Environment variables reference
- **[Credentials Guide](./CREDENTIALS_GUIDE.md)** - ⚠️ **IMPORTANTE** - Diferencia entre tipos de credenciales

---

## Credentials Reference

### 🔑 4 Tipos de Credenciales en Supabase

Es **CRÍTICO** entender la diferencia entre estos 4 tipos de credenciales:

| Credencial | Formato | Para qué sirve | ✅ Copiar Datos |
|------------|---------|----------------|----------------|
| **ACCESS_TOKEN** | `sbp_...` | Gestionar proyectos/branches (Management API) | N/A |
| **SERVICE_ROLE_KEY** | JWT largo | Admin API, bypass RLS | ✅ **SÍ** |
| **ANON_KEY** | JWT largo | Frontend público, con RLS | ❌ NO |
| **DB_PASSWORD** | String simple | PostgreSQL directo (pg_dump) | ❌ **NO** |

### ⚠️ Confusión Común (Lección Aprendida)

**Lo que NO funcionó:**

```bash
# ❌ Intentamos usar Database Passwords
PGPASSWORD="fhPqCduAAaBl0axt" pg_dump ...
# → FATAL: Tenant or user not found
```

**Lo que SÍ funcionó:**

```typescript
// ✅ Service Role Keys con Supabase client
const dev = createClient(DEV_URL, DEV_SERVICE_KEY);
const staging = createClient(STAGING_URL, STAGING_SERVICE_KEY);
// → 6,576 registros copiados exitosamente
```

### 📖 Guía Completa

Para entender en detalle cada tipo de credencial, cuándo usar cada una, y ver ejemplos completos:

**👉 [Lee CREDENTIALS_GUIDE.md](./CREDENTIALS_GUIDE.md)**

Esta guía incluye:
- Descripción detallada de cada credencial
- Ejemplos de uso correctos
- Qué funcionó y qué NO funcionó
- Comparación lado a lado
- Solución comprobada para copiar datos

---

**Need Help?**

- [Supabase Branching Docs](https://supabase.com/docs/guides/platform/branching)
- [MUVA Chat CLAUDE.md](../../../CLAUDE.md) - Project guidelines
- [GitHub Issues](https://github.com/your-org/muva-chat/issues) - Report problems
