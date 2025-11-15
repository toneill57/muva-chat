# FASE 6 - Environment Variables Validation

**Date:** 2025-11-05
**Status:** ✅ Validated

## Project IDs Verification

### Supabase Projects

| Environment | Project ID | Status | Notes |
|------------|-----------|--------|-------|
| **dev** | `rvjmwwvkhglcuqwcznph` | ✅ Configured | From docs, not visible in MCP (different org?) |
| **staging** | `ooaumjzaztmutltifhoq` | ✅ Verified | Confirmed via `mcp__supabase__list_projects` |
| **production** | `ztfslsrkemlfjqpzksir` | ✅ Configured | From docs, production environment |

**All scripts use correct Project IDs** ✅

---

## Environment Variables Required

### Scripts Configuration

All FASE 6 scripts expect the following environment variables:

```bash
# Development environment
SUPABASE_SERVICE_ROLE_KEY_DEV=<dev_service_role_key>

# Staging environment (default, current .env.local)
SUPABASE_SERVICE_ROLE_KEY=<staging_service_role_key>

# Production environment
SUPABASE_SERVICE_ROLE_KEY_PRODUCTION=<production_service_role_key>
```

### Current .env.local Status

| Variable | Status | Notes |
|----------|--------|-------|
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ **SET** | Staging environment (ooaumjzaztmutltifhoq) |
| `SUPABASE_SERVICE_ROLE_KEY_DEV` | ⚠️ **NOT SET** | Optional - only needed for dev environment testing |
| `SUPABASE_SERVICE_ROLE_KEY_PRODUCTION` | ⚠️ **NOT SET** | Optional - only needed for production operations |

### Recommendation

**For local development/testing:**
- ✅ Staging key is already set - scripts will work for staging environment
- ⚠️ If you need to test dev environment, add `SUPABASE_SERVICE_ROLE_KEY_DEV`
- ⚠️ If you need production operations, add `SUPABASE_SERVICE_ROLE_KEY_PRODUCTION`

**Script behavior when key is missing:**
- Scripts gracefully handle missing keys
- Show error message: `❌ Error: SUPABASE_SERVICE_ROLE_KEY_XXX not set`
- Exit without crashing
- User can run with `--env=staging` to use available environment

---

## Validation Results

### ✅ What Works Now

With current `.env.local` configuration:

```bash
# ✅ These will work:
pnpm dlx tsx scripts/create-migration.ts "test"
pnpm dlx tsx scripts/migration-status.ts --env=staging
pnpm dlx tsx scripts/detect-schema-drift.ts --source=staging --target=staging
pnpm dlx tsx scripts/sync-migrations.ts --env=staging --migration=test --dry-run
```

### ⚠️ What Needs Additional Setup

```bash
# ⚠️ These need SUPABASE_SERVICE_ROLE_KEY_DEV:
pnpm dlx tsx scripts/migration-status.ts --env=dev

# ⚠️ These need SUPABASE_SERVICE_ROLE_KEY_PRODUCTION:
pnpm dlx tsx scripts/migration-status.ts --env=production
pnpm dlx tsx scripts/sync-migrations.ts --env=production --migration=test --force
```

---

## How to Add Missing Keys

### Get Service Role Key from Supabase Dashboard

1. Go to Supabase Dashboard
2. Select project (dev/production)
3. Settings → API
4. Copy "service_role" key (starts with `eyJhbGci...`)

### Add to .env.local

```bash
# Add these lines to .env.local:

# Development (if needed)
SUPABASE_SERVICE_ROLE_KEY_DEV=eyJhbGci...your_dev_key_here

# Production (if needed)
SUPABASE_SERVICE_ROLE_KEY_PRODUCTION=eyJhbGci...your_production_key_here
```

### Verify Setup

```bash
# Check if keys are loaded
source .env.local
echo $SUPABASE_SERVICE_ROLE_KEY_DEV
echo $SUPABASE_SERVICE_ROLE_KEY_PRODUCTION
```

---

## Security Notes

⚠️ **IMPORTANT:**

1. **Never commit service role keys to git**
   - ✅ `.env.local` is in `.gitignore`
   - ✅ Scripts use environment variables (not hardcoded)

2. **Production key requires extra care**
   - Use `--force` flag for production operations
   - Always verify backup before production migrations
   - Keep production key separate from dev/staging

3. **Key rotation**
   - If keys are compromised, rotate them in Supabase Dashboard
   - Update `.env.local` with new keys
   - No code changes needed

---

## Next Steps

1. ✅ **Current setup is sufficient for testing** - staging key is configured
2. ⚠️ Add dev/production keys only when needed for those environments
3. ✅ All scripts handle missing keys gracefully
4. ✅ Ready to proceed with testing scripts on staging

---

**Conclusion:** Environment setup is **VALID** for FASE 6 testing on staging environment. Additional keys can be added when dev/production access is needed.
