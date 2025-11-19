# Migration Management Guide

**MUVA Chat - Three Environments System**  
**Last Updated:** 2025-11-05  
**Version:** 1.0.0

---

## Table of Contents

1. [Overview](#overview)
2. [Creating Migrations](#creating-migrations)
3. [Migration Workflow](#migration-workflow)
4. [Common Patterns](#common-patterns)
5. [Monitoring Migrations](#monitoring-migrations)
6. [Emergency Procedures](#emergency-procedures)
7. [Troubleshooting](#troubleshooting)
8. [Best Practices](#best-practices)

---

## Overview

### What are Migrations?

Database migrations are version-controlled SQL files that define schema changes. Each migration has:

- **Timestamp**: `YYYYMMDDHHMMSS` format (e.g., `20251105143022`)
- **Name**: Descriptive name in snake_case (e.g., `add_users_table`)
- **UP Section**: Changes to apply
- **DOWN Section**: Rollback statements (optional but recommended)

### Three Environments Workflow

```
┌─────────────┐       ┌──────────────┐       ┌──────────────┐
│     DEV     │  -->  │   STAGING    │  -->  │  PRODUCTION  │
│   (Local)   │       │ (Auto-deploy)│       │ (Approval)   │
└─────────────┘       └──────────────┘       └──────────────┘
      │                      │                       │
      └──────────────────────┴───────────────────────┘
              Same migration files applied in order
```

**Key Principles:**

1. **Always test in dev first** - Local testing is mandatory
2. **Never skip staging** - Staging catches issues before production
3. **Staging = Production preview** - Data should be similar
4. **Production requires backup** - Auto-backup before migrations
5. **Migrations are append-only** - Never edit applied migrations

---

## Creating Migrations

### Using the Migration Generator

The easiest way to create a migration:

```bash
pnpm dlx tsx scripts/create-migration.ts "migration_name"
```

**Examples:**

```bash
# Create table migration
pnpm dlx tsx scripts/create-migration.ts "add_users_table"
# Output: supabase/migrations/20251105143022_add_users_table.sql

# Add column migration
pnpm dlx tsx scripts/create-migration.ts "add user email verification"
# Output: supabase/migrations/20251105143145_add_user_email_verification.sql

# Fix RLS policies
pnpm dlx tsx scripts/create-migration.ts "fix_guest_chat_rls"
# Output: supabase/migrations/20251105143210_fix_guest_chat_rls.sql
```

### Manual Migration Creation

If you prefer manual creation:

1. **Generate timestamp:**

```bash
date +"%Y%m%d%H%M%S"
# Example output: 20251105143022
```

2. **Create file:**

```bash
touch supabase/migrations/20251105143022_add_users_table.sql
```

3. **Add content** (see templates below)

### Migration File Structure

```sql
-- Migration: add_users_table
-- Created: 2025-11-05T14:30:22.000Z
-- Description: Add users table with authentication

-- ============================================================
-- UP Migration
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- DOWN Migration (for rollback)
-- ============================================================

DROP TABLE IF EXISTS users CASCADE;
```

---

## Migration Workflow

### Development Workflow (Local)

**Step 1: Create Migration**

```bash
# On branch: dev
pnpm dlx tsx scripts/create-migration.ts "add_feature_x"
```

**Step 2: Edit Migration SQL**

Edit the generated file in `supabase/migrations/`:

- Remove example code
- Add your schema changes
- Add rollback statements
- Test SQL syntax

**Step 3: Test Locally**

```bash
# Load environment
set -a && source .env.dev && set +a

# Run local dev server
./scripts/dev-with-keys.sh

# Verify changes work in local app
```

**Step 4: Commit to Dev**

```bash
git add supabase/migrations/20251105143022_add_feature_x.sql
git commit -m "feat: add feature X schema"
git push origin dev
```

This triggers GitHub Actions validation:
- ✅ Build check
- ✅ Test check
- ✅ Migration syntax validation

---

### Staging Deployment

**Step 1: Merge to Staging**

```bash
git checkout staging
git pull origin staging
git merge dev
git push origin staging
```

**Step 2: Auto-Deployment**

GitHub Actions automatically:

1. Builds application
2. **Applies pending migrations** (`apply-migrations-staging.ts`)
3. Deploys to VPS staging
4. Runs health checks

**Step 3: Verify in Staging**

Visit `https://staging.muva.chat` and test:

- ✅ Application loads
- ✅ New features work
- ✅ No errors in console
- ✅ Database queries work

**Step 4: Monitor Logs**

Check GitHub Actions logs for migration output:

```
🔄 Apply Migrations to Staging
================================================
📦 Staging Project: iyeueszchbvlutlcmvcb
📂 Found 1 migration files
📝 Found 1 pending migrations:
   - 20251105143022_add_feature_x.sql
🚀 Applying pending migrations...
✅ Applied: 20251105143022_add_feature_x.sql
================================================
✅ All migrations applied successfully
```

---

### Production Deployment

**Step 1: Create Pull Request**

```bash
# On GitHub: Create PR from staging → main
# Title: "Release: Feature X"
# Description: List changes and migration details
```

**Step 2: Code Review**

Wait for approval from:
- CODEOWNERS (CEO/CTO)
- DevOps team (if applicable)

**Step 3: Manual Approval**

GitHub Environment "production" requires manual approval:

1. Reviewer clicks "Review pending deployments"
2. Reviews changes and migration SQL
3. Clicks "Approve and deploy"

**Step 4: Automated Production Deployment**

GitHub Actions workflow:

1. **Backup Database** (`backup-production-db.ts`)
   - Creates full pg_dump backup
   - Uploads to GitHub Artifacts (30 days retention)
   - Verifies backup created successfully

2. **Apply Migrations** (`apply-migrations-production.ts`)
   - Safety Check 1: Verify backup exists and is recent (< 10 min)
   - Safety Check 2: Confirm production environment
   - Execute migrations one by one
   - Pause 5s between migrations
   - Stop on first error

3. **Deploy Application**
   - SSH to production VPS
   - Pull latest code
   - Install dependencies
   - Build application
   - Restart PM2

4. **Health Checks** (`verify-production-health.ts`)
   - API health endpoint (< 5s response)
   - Database connectivity (< 1s query)
   - Critical tables exist
   - RLS policies active
   - 5 comprehensive checks

5. **Rollback on Failure** (if any step fails)
   - Execute `rollback-production.ts`
   - Restore from backup (optional with `--restore-db`)
   - Notify team of failure

**Step 5: Verify Production**

After successful deployment:

- ✅ Visit `https://muva.chat`
- ✅ Test critical user flows
- ✅ Monitor error logs (first 30 minutes)
- ✅ Check analytics/monitoring

---

## Common Patterns

### 1. Add Table

```sql
-- Migration: add_notifications_table
-- Created: 2025-11-05

-- UP Migration
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL,
  message text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Index for user queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id 
  ON notifications(user_id);

-- Index for unread notifications
CREATE INDEX IF NOT EXISTS idx_notifications_unread 
  ON notifications(user_id, read) WHERE NOT read;

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can read their own notifications
CREATE POLICY "Users can read their own notifications"
  ON notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- DOWN Migration
DROP TABLE IF EXISTS notifications CASCADE;
```

### 2. Add Column

```sql
-- Migration: add_user_phone_number
-- Created: 2025-11-05

-- UP Migration
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS phone text;

-- Add index if needed for lookups
CREATE INDEX IF NOT EXISTS idx_users_phone 
  ON users(phone) WHERE phone IS NOT NULL;

-- DOWN Migration
ALTER TABLE users 
  DROP COLUMN IF EXISTS phone;

DROP INDEX IF EXISTS idx_users_phone;
```

### 3. Create Index

```sql
-- Migration: add_messages_performance_indexes
-- Created: 2025-11-05

-- UP Migration

-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
  ON messages(conversation_id, created_at DESC);

-- Partial index for unread messages
CREATE INDEX IF NOT EXISTS idx_messages_unread 
  ON messages(conversation_id) WHERE NOT read;

-- GIN index for full-text search
CREATE INDEX IF NOT EXISTS idx_messages_content_search 
  ON messages USING gin(to_tsvector('english', content));

-- DOWN Migration
DROP INDEX IF EXISTS idx_messages_conversation_created;
DROP INDEX IF EXISTS idx_messages_unread;
DROP INDEX IF EXISTS idx_messages_content_search;
```

### 4. Update RLS Policies

```sql
-- Migration: fix_guest_reservations_rls
-- Created: 2025-11-05

-- UP Migration

-- Drop old policy
DROP POLICY IF EXISTS "Guests can read their own reservations" 
  ON guest_reservations;

-- Create improved policy
CREATE POLICY "Guests can read their own reservations"
  ON guest_reservations
  FOR SELECT
  USING (
    auth.uid() = guest_id 
    OR 
    EXISTS (
      SELECT 1 FROM staff_users 
      WHERE id = auth.uid() AND tenant_id = guest_reservations.tenant_id
    )
  );

-- DOWN Migration
DROP POLICY IF EXISTS "Guests can read their own reservations" 
  ON guest_reservations;

-- Restore original policy
CREATE POLICY "Guests can read their own reservations"
  ON guest_reservations
  FOR SELECT
  USING (auth.uid() = guest_id);
```

### 5. Create RPC Function

```sql
-- Migration: add_search_function
-- Created: 2025-11-05

-- UP Migration
CREATE OR REPLACE FUNCTION search_accommodations(
  search_query text,
  tenant_id text
)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  similarity real
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.name,
    a.description,
    similarity(a.name || ' ' || a.description, search_query) as similarity
  FROM accommodation_units a
  WHERE 
    a.tenant_id = search_accommodations.tenant_id
    AND similarity(a.name || ' ' || a.description, search_query) > 0.3
  ORDER BY similarity DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql STABLE;

-- DOWN Migration
DROP FUNCTION IF EXISTS search_accommodations(text, text);
```

### 6. Data Migration

```sql
-- Migration: populate_default_settings
-- Created: 2025-11-05

-- UP Migration

-- Add new column
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{}'::jsonb;

-- Populate default settings for existing users
UPDATE users
SET settings = jsonb_build_object(
  'notifications_enabled', true,
  'theme', 'light',
  'language', 'en'
)
WHERE settings = '{}'::jsonb;

-- DOWN Migration
ALTER TABLE users 
  DROP COLUMN IF EXISTS settings;
```

### 7. Rename Column (Safe Pattern)

```sql
-- Migration: rename_user_full_name
-- Created: 2025-11-05

-- UP Migration

-- Step 1: Add new column
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS full_name text;

-- Step 2: Copy data
UPDATE users 
SET full_name = name 
WHERE full_name IS NULL;

-- Step 3: Make new column NOT NULL
ALTER TABLE users 
  ALTER COLUMN full_name SET NOT NULL;

-- Step 4: Drop old column (ONLY after app updated to use new column)
-- ALTER TABLE users DROP COLUMN name;

-- DOWN Migration

-- Restore old column
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS name text;

UPDATE users 
SET name = full_name 
WHERE name IS NULL;

ALTER TABLE users 
  ALTER COLUMN name SET NOT NULL;

DROP COLUMN IF EXISTS full_name;
```

---

## Monitoring Migrations

### Check Migration Status

```bash
# Check staging environment
pnpm dlx tsx scripts/migration-status.ts --env=staging

# Check production environment
pnpm dlx tsx scripts/migration-status.ts --env=production

# Check all environments
pnpm dlx tsx scripts/migration-status.ts --all
```

**Example Output:**

```
================================================
🔍 Migration Status Reporter
================================================

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Staging Environment
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Summary:
  ✅ Applied: 12
  ⏳ Pending: 1
  ❌ Unknown: 0

Migrations:

  Status   Timestamp           Migration Name
  ──────── ─────────────────── ──────────────────────
  ✅ applied 2025-11-01 00:00:00  create_core_schema
  ✅ applied 2025-11-03 08:12:15  guest_chat_stable_id_fixes
  ⏳ pending 2025-11-05 14:30:22  add_notifications_table

================================================
✅ Migration status check completed
================================================
```

### Detect Schema Drift

Compare schemas between environments to ensure consistency:

```bash
# Compare dev → staging
pnpm dlx tsx scripts/detect-schema-drift.ts --source=dev --target=staging

# Compare staging → production
pnpm dlx tsx scripts/detect-schema-drift.ts --source=staging --target=production
```

**Example Output:**

```
================================================
🔍 Schema Drift Detection
================================================

📊 Comparing schemas:
   Source: Staging (iyeueszchbvlutlcmvcb)
   Target: Production ([DEPRECATED-OLD-STAGING])

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Schema Drift Report: Staging → Production
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Summary:
  🔴 Critical: 1
  🟡 Warning: 0
  🔵 Info: 0

Missing in Production:

  🔴 CRITICAL public.notifications
     Table exists in Staging but missing in Production

Recommendations:

  ⚠️  CRITICAL drift detected!
     This may cause application errors
     Run migrations to sync schemas

================================================
❌ Schema drift check failed (critical differences)
================================================
```

### GitHub Actions Logs

Check migration logs in GitHub Actions:

1. Go to repository → Actions tab
2. Select "Deploy to Staging" or "Deploy to Production" workflow
3. Click on latest run
4. Expand "Apply Migrations" step
5. Review migration output

---

## Emergency Procedures

### Manual Migration Application

For emergency fixes or out-of-order migrations:

```bash
# Apply specific migration to staging
pnpm dlx tsx scripts/sync-migrations.ts \
  --env=staging \
  --migration=20251105143022_hotfix_rls.sql

# Apply to production (requires --force)
pnpm dlx tsx scripts/sync-migrations.ts \
  --env=production \
  --migration=20251105143022_hotfix_rls.sql \
  --force
```

**Safety Checks:**

- ✅ Verifies backup exists (production only)
- ✅ Checks if migration already applied
- ✅ Requires `--force` flag for production
- ✅ Logs all actions

### Dry Run Mode

Preview migration without applying:

```bash
pnpm dlx tsx scripts/sync-migrations.ts \
  --env=production \
  --migration=20251105143022_hotfix_rls.sql \
  --dry-run
```

This will:
- Load the migration file
- Display the SQL that would be executed
- NOT apply any changes
- Exit with success

### Rollback Migration

If a migration causes issues:

**Staging:**

```bash
pnpm dlx tsx scripts/rollback-migration-staging.ts --steps=1
```

**Production:**

```bash
# Rollback migration records only
pnpm dlx tsx scripts/rollback-production.ts --steps=1

# Rollback with database restore (CRITICAL)
pnpm dlx tsx scripts/rollback-production.ts --steps=1 --restore-db
```

**Warning:** Database restore will:
- Restore from latest backup
- **LOSE all data changes since backup**
- Should only be used in critical situations

---

## Troubleshooting

### Migration Fails in Staging

**Symptom:** GitHub Actions workflow fails at "Apply Migrations" step

**Diagnosis:**

1. Check GitHub Actions logs for error message
2. Common causes:
   - SQL syntax error
   - Missing table/column reference
   - Constraint violation
   - Permission issue

**Solution:**

```bash
# Fix the migration SQL locally
vim supabase/migrations/20251105143022_failed_migration.sql

# Test locally
set -a && source .env.dev && set +a
./scripts/dev-with-keys.sh

# Commit fix
git add supabase/migrations/20251105143022_failed_migration.sql
git commit -m "fix: migration SQL syntax"
git push origin dev

# Merge to staging again
git checkout staging
git merge dev
git push origin staging
```

**Alternative:** If migration is fundamentally broken:

```bash
# Rollback staging
pnpm dlx tsx scripts/rollback-migration-staging.ts --steps=1

# Delete bad migration file
rm supabase/migrations/20251105143022_failed_migration.sql

# Create corrected migration
pnpm dlx tsx scripts/create-migration.ts "failed_migration_fixed"
# Edit and test...
```

---

### Production Has Data Staging Doesn't

**Symptom:** Migration works in staging but fails in production due to existing data

**Example:**

```sql
-- This works in staging (empty table)
ALTER TABLE users ADD COLUMN email text NOT NULL;

-- But fails in production (existing users without email)
-- ERROR: column "email" contains null values
```

**Solution:** Use conditional migrations

```sql
-- UP Migration

-- Step 1: Add column as nullable
ALTER TABLE users ADD COLUMN IF NOT EXISTS email text;

-- Step 2: Populate email for existing users
UPDATE users 
SET email = CONCAT(id::text, '@legacy.example.com')
WHERE email IS NULL;

-- Step 3: Make column NOT NULL
ALTER TABLE users ALTER COLUMN email SET NOT NULL;

-- Step 4: Add unique constraint
ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);
```

---

### Schema Drift After Manual Changes

**Symptom:** detect-schema-drift.ts reports critical differences

**Cause:** Someone made manual changes to database without migration

**Solution:**

1. **Document the change:**

```bash
# Create migration that matches current state
pnpm dlx tsx scripts/create-migration.ts "sync_manual_changes"
```

2. **Add SQL to migration:**

```sql
-- UP Migration

-- This migration syncs manual changes made on 2025-11-05
-- Manual change: Added email_verified column to users

ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_users_email_verified 
  ON users(email_verified);

-- DOWN Migration
ALTER TABLE users DROP COLUMN IF EXISTS email_verified;
```

3. **Apply to all environments:**

```bash
# Mark as applied in environment where change was made manually
pnpm dlx tsx scripts/sync-migrations.ts \
  --env=production \
  --migration=20251105143022_sync_manual_changes.sql \
  --force

# Apply normally to other environments
git add supabase/migrations/
git commit -m "chore: sync manual schema changes"
git push
```

---

### Migration Fails: Table Already Exists

**Symptom:**

```
ERROR: relation "notifications" already exists
```

**Cause:** Migration already applied manually, or migration re-run

**Solution:** Use idempotent SQL

```sql
-- ❌ BAD: Will fail if table exists
CREATE TABLE notifications (...);

-- ✅ GOOD: Idempotent (can run multiple times)
CREATE TABLE IF NOT EXISTS notifications (...);
```

**Fix existing migration:**

```bash
# Edit migration to add IF NOT EXISTS
vim supabase/migrations/20251105143022_add_notifications.sql

# Re-apply
pnpm dlx tsx scripts/sync-migrations.ts \
  --env=staging \
  --migration=20251105143022_add_notifications.sql \
  --force
```

---

### GitHub Actions Stuck on "Waiting for Approval"

**Symptom:** Production deployment doesn't proceed

**Cause:** Manual approval required for production environment

**Solution:**

1. Go to repository → Actions tab
2. Click on pending workflow run
3. Look for yellow "Review pending deployments" button
4. Click button
5. Review changes
6. Click "Approve and deploy"

**If approval button not visible:**

- Ensure you're logged in as CODEOWNER
- Check GitHub Environment protection rules
- Verify you have write access to repository

---

## Best Practices

### 1. Always Test Locally First

```bash
# Load dev environment
set -a && source .env.dev && set +a

# Run dev server
./scripts/dev-with-keys.sh

# Test migration manually (if needed)
psql $DATABASE_URL -f supabase/migrations/20251105143022_new_feature.sql

# Verify app still works
```

### 2. Write Idempotent Migrations

Use these patterns:

```sql
-- Tables
CREATE TABLE IF NOT EXISTS ...
DROP TABLE IF EXISTS ... CASCADE

-- Columns
ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...
ALTER TABLE ... DROP COLUMN IF EXISTS ...

-- Indexes
CREATE INDEX IF NOT EXISTS ...
DROP INDEX IF EXISTS ...

-- Policies
DROP POLICY IF EXISTS "policy_name" ON table_name;
CREATE POLICY "policy_name" ...

-- Functions
CREATE OR REPLACE FUNCTION ...
DROP FUNCTION IF EXISTS ...
```

### 3. Use Transactions for Complex Migrations

```sql
-- UP Migration

BEGIN;

-- Step 1: Add new column
ALTER TABLE users ADD COLUMN IF NOT EXISTS status text;

-- Step 2: Populate values
UPDATE users SET status = 'active' WHERE status IS NULL;

-- Step 3: Add constraint
ALTER TABLE users ALTER COLUMN status SET NOT NULL;

-- Step 4: Add check constraint
ALTER TABLE users ADD CONSTRAINT users_status_check 
  CHECK (status IN ('active', 'inactive', 'suspended'));

COMMIT;

-- If any step fails, entire transaction rolls back
```

### 4. Document Breaking Changes

```sql
-- Migration: rename_user_role_to_user_type
-- Created: 2025-11-05
-- 
-- ⚠️  BREAKING CHANGE:
-- This migration renames column `role` to `user_type`
-- Application code must be updated BEFORE this migration runs
--
-- Required app changes:
-- - Update all references from user.role to user.user_type
-- - Update API responses to use user_type
-- - Update frontend components
--
-- Deployment order:
-- 1. Deploy app with code supporting BOTH role and user_type
-- 2. Run this migration
-- 3. Deploy app removing role references
```

### 5. Keep Migrations Focused

**❌ BAD: Kitchen sink migration**

```sql
-- Migration: november_updates
-- Created: 2025-11-05

-- Add notifications
CREATE TABLE notifications (...);

-- Fix user RLS
ALTER TABLE users ...;

-- Add indexes to messages
CREATE INDEX ...;

-- Update function
CREATE OR REPLACE FUNCTION ...;
```

**✅ GOOD: Focused migrations**

```
20251105143000_add_notifications_table.sql
20251105143030_fix_user_rls_policy.sql
20251105143100_optimize_messages_indexes.sql
20251105143130_update_search_function.sql
```

### 6. Consider Impact on Existing Data

```sql
-- UP Migration

-- ❌ BAD: Will lock table for entire duration
ALTER TABLE users ADD COLUMN verification_token text NOT NULL;

-- ✅ GOOD: Add as nullable, populate, then constrain
ALTER TABLE users ADD COLUMN verification_token text;

-- Populate in batches (for large tables)
UPDATE users 
SET verification_token = gen_random_uuid()::text 
WHERE verification_token IS NULL 
LIMIT 1000;

-- After all rows populated (maybe in another migration)
-- ALTER TABLE users ALTER COLUMN verification_token SET NOT NULL;
```

### 7. Add Indexes for Foreign Keys

```sql
-- UP Migration

CREATE TABLE comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ✅ ALWAYS add indexes for foreign keys
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);

-- ✅ Consider composite indexes for common queries
CREATE INDEX idx_comments_post_created ON comments(post_id, created_at DESC);
```

### 8. Backup Before Risky Production Migrations

For high-risk migrations:

```bash
# Create fresh backup before applying
pnpm dlx tsx scripts/backup-production-db.ts

# Verify backup created
ls -lh backups/

# Now apply migration
git push origin main
```

### 9. Monitor After Production Deployment

After production migration:

- ✅ Check application logs (first 30 minutes)
- ✅ Monitor error rates
- ✅ Test critical user flows
- ✅ Check database performance metrics
- ✅ Verify new features work correctly

### 10. Document Migration Dependencies

```sql
-- Migration: add_comment_ratings
-- Created: 2025-11-05
--
-- Dependencies:
-- - Requires migration 20251103081215_add_comments_table
-- - Must run AFTER authentication system is deployed
-- - Requires RLS to be enabled on comments table
--
-- Related PRs:
-- - #123 Add comment rating feature
-- - #124 Update API endpoints
```

---

## Summary

### Migration Checklist

Before pushing migration to dev:
- [ ] Migration filename follows naming convention
- [ ] SQL uses idempotent patterns (IF EXISTS, IF NOT EXISTS)
- [ ] DOWN migration included for rollback
- [ ] Tested locally
- [ ] Breaking changes documented
- [ ] Dependencies listed

Before merging to staging:
- [ ] Code review approved
- [ ] Tests pass in dev
- [ ] Migration validated in dev workflow

Before deploying to production:
- [ ] Successfully deployed to staging
- [ ] Verified in staging environment
- [ ] Schema drift check passed
- [ ] Backup plan confirmed
- [ ] Rollback procedure understood
- [ ] Team notified of deployment

---

## Additional Resources

- [Supabase Branching Guide](./SUPABASE_BRANCHING_GUIDE.md)
- [Branch Protection Guide](./BRANCH_PROTECTION_GUIDE.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)
- [Three Environments Plan](./plan.md)

---

**Questions or Issues?**

- Check [Troubleshooting](#troubleshooting) section
- Review [FAQ](./FAQ.md)
- Contact DevOps team
- Create issue in repository

---

**Last Updated:** 2025-11-05  
**Maintained by:** DevOps Team
