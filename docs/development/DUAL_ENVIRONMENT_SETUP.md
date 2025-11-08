# Dual Environment Development Setup

Complete guide for running production and staging environments simultaneously.

## Overview

This setup allows you to:
- Run **production** (port 3000) and **staging** (port 3001) **at the same time**
- Test changes in staging without affecting production data
- Compare behavior between environments
- Develop with confidence knowing production is isolated

## Environment Details

### Production Environment
- **Database**: `ooaumjzaztmutltifhoq.supabase.co`
- **Port**: 3000 (default)
- **Script**: `./scripts/dev-production.sh`
- **Use case**: Testing against real production data (read-only recommended)

### Staging Environment
- **Database**: `hoaiwcueleiemeplrurv.supabase.co`
- **Port**: 3001
- **Script**: `./scripts/dev-staging.sh`
- **Use case**: Development, testing, breaking changes

## Setup Instructions

### 1. Make Scripts Executable

```bash
chmod +x scripts/dev-production.sh scripts/dev-staging.sh
```

### 2. Verify `.env.local`

Your `.env.local` should contain **non-Supabase** environment variables:

```bash
# OpenAI
OPENAI_API_KEY=sk-...

# Other services
# (MotoPress, etc.)
```

**Note**: Supabase credentials are hardcoded in the scripts to prevent accidental mixing.

### 3. Start Both Environments

**Terminal 1 - Production:**
```bash
./scripts/dev-production.sh
```

**Terminal 2 - Staging:**
```bash
./scripts/dev-staging.sh
```

### 4. Verify Both Are Running

```bash
# Production health check
curl http://localhost:3000/api/health

# Staging health check
curl http://localhost:3001/api/health
```

## How It Works

### Script Behavior

Both scripts follow this pattern:

1. **Override Supabase vars** with environment-specific values
2. **Load `.env.local`** for other variables (OpenAI, etc.)
3. **Re-override Supabase vars** to ensure correct database
4. **Start Next.js dev server** on appropriate port

### Environment Variable Priority

```
Script hardcoded values > .env.local > System environment
```

This ensures you **always** connect to the right database.

## Common Use Cases

### 1. Test a Feature in Staging

```bash
# Terminal 1: Keep production running
./scripts/dev-production.sh

# Terminal 2: Work in staging
./scripts/dev-staging.sh

# Make changes, test at http://localhost:3001
# Production at http://localhost:3000 remains untouched
```

### 2. Compare Environments Side-by-Side

```bash
# Production tenant
open http://localhost:3000/simmerdown/dashboard

# Staging tenant (after migration)
open http://localhost:3001/simmerdown/dashboard
```

### 3. Test Database Migrations

```bash
# Run migration on staging
pnpm dlx tsx scripts/apply-migration-staging.ts

# Verify at http://localhost:3001
# Production unaffected at http://localhost:3000
```

## Safety Features

### Database Isolation

- Each script **hardcodes** its Supabase credentials
- Impossible to accidentally connect to wrong database
- Even if `.env.local` is misconfigured, scripts override it

### Port Separation

- Production: `3000`
- Staging: `3001`
- No port conflicts, can run simultaneously

### Visual Differentiation

Both scripts print the environment on startup:

```
🚀 Starting development server with STAGING environment...
   Port: 3001
   Database: hoaiwcueleiemeplrurv (staging)
```

## Troubleshooting

### "Port 3000 already in use"

If you're running production, this is expected. Staging uses 3001.

If not running anything:
```bash
lsof -ti:3000 | xargs kill -9
```

### "Port 3001 already in use"

Kill staging process:
```bash
lsof -ti:3001 | xargs kill -9
```

### Wrong Database Connected

**Symptoms**: Seeing production data in staging (or vice versa)

**Cause**: Script didn't override environment variables correctly

**Fix**:
1. Kill both dev servers
2. Restart using the scripts (not `pnpm run dev` directly)
3. Check console output shows correct database

### Changes Not Hot Reloading

This is a Next.js issue, not environment-specific.

**Fix**:
```bash
# Kill the problematic server
pkill -f "next dev"

# Restart it
./scripts/dev-staging.sh  # or dev-production.sh
```

## Best Practices

### ✅ Do

- **Always use the scripts** to start dev servers
- Test destructive changes in **staging only**
- Keep production server running for **reference**
- Use staging for **data migrations** before production

### ❌ Don't

- **Don't** use `pnpm run dev` directly (loses environment override)
- **Don't** modify production data during development
- **Don't** commit `.env.local` (contains secrets)
- **Don't** hardcode database URLs in app code

## Migration Workflow

When migrating data from production to staging:

1. **Start production** (read-only reference)
   ```bash
   ./scripts/dev-production.sh
   ```

2. **Run migration script** targeting staging
   ```bash
   pnpm dlx tsx scripts/copy-prod-to-staging.ts
   ```

3. **Start staging** to verify migration
   ```bash
   ./scripts/dev-staging.sh
   ```

4. **Compare** both environments at:
   - Production: http://localhost:3000
   - Staging: http://localhost:3001

## Architecture

```
┌─────────────────────────────────────────────────┐
│  Local Development Machine                      │
│                                                  │
│  ┌──────────────────┐  ┌──────────────────┐   │
│  │  Terminal 1      │  │  Terminal 2      │   │
│  │  Port 3000       │  │  Port 3001       │   │
│  │  (Production)    │  │  (Staging)       │   │
│  └────────┬─────────┘  └─────────┬────────┘   │
│           │                       │             │
└───────────┼───────────────────────┼─────────────┘
            │                       │
            │                       │
    ┌───────▼────────┐      ┌──────▼──────┐
    │   Production   │      │   Staging   │
    │   Database     │      │   Database  │
    │  ooaumjzaz...  │      │  hoaiwcue...│
    └────────────────┘      └─────────────┘
```

## Related Documentation

- `QUICK_START_DUAL_ENV.md` - Quick reference
- `scripts/dev-production.sh` - Production script
- `scripts/dev-staging.sh` - Staging script

## Support

If you encounter issues:
1. Check this documentation
2. Verify scripts have correct Supabase credentials
3. Ensure `.env.local` has OpenAI key
4. Check port availability (3000, 3001)
