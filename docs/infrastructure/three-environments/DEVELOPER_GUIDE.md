# Developer Guide - Three Environments

**MUVA Chat Platform**
**Last Updated:** November 5, 2025
**Target Audience:** Software Developers

---

## Table of Contents

1. [Quick Start (5 Minutes)](#quick-start-5-minutes)
2. [Daily Workflow](#daily-workflow)
3. [Environment Variables](#environment-variables)
4. [Common Commands](#common-commands)
5. [Creating Migrations](#creating-migrations)
6. [Testing Guidelines](#testing-guidelines)
7. [Troubleshooting](#troubleshooting)
8. [Best Practices](#best-practices)
9. [Code Review Checklist](#code-review-checklist)

---

## Quick Start (5 Minutes)

### 1. Clone and Install

```bash
# Clone repository
git clone https://github.com/your-org/muva-chat.git
cd muva-chat

# Install dependencies (pnpm required)
pnpm install
```

### 2. Setup Environment Variables

```bash
# Copy template
cp .env.template .env.local

# Edit .env.local with your credentials
# You'll need:
# - NEXT_PUBLIC_SUPABASE_URL (from dev environment)
# - NEXT_PUBLIC_SUPABASE_ANON_KEY (from dev environment)
# - SUPABASE_SERVICE_ROLE_KEY (from dev environment)
# - ANTHROPIC_API_KEY (get from team lead)
# - OPENAI_API_KEY (get from team lead)
```

### 3. Start Development Server

```bash
# Use dev script (loads .env.local automatically)
./scripts/dev-with-keys.sh

# App runs at http://localhost:3000
```

### 4. Verify Setup

```bash
# Check health endpoint
curl http://localhost:3000/api/health | jq

# Expected response: { "status": "healthy", ... }
```

**You're ready to code!**

---

## Daily Workflow

### Morning Routine

```bash
# 1. Ensure you're on dev branch
git checkout dev
git pull origin dev

# 2. Check for pending changes
git status

# 3. Start dev server
./scripts/dev-with-keys.sh
```

### Working on a Feature

#### Option A: Direct Commit to Dev (Quick Features)

```bash
# 1. Make changes
# Edit files in src/, add tests, etc.

# 2. Test locally
pnpm run build  # Ensure builds successfully
# Test manually in browser

# 3. Commit to dev
git add .
git commit -m "feat: add new widget component"
git push origin dev

# GitHub Actions will validate build + tests automatically
```

#### Option B: Feature Branch (Complex Features)

```bash
# 1. Create feature branch
git checkout -b feature/new-booking-flow

# 2. Make changes
# ... development work ...

# 3. Commit regularly
git add .
git commit -m "feat: implement booking step 1"
git push origin feature/new-booking-flow

# 4. Create PR to dev
gh pr create --base dev --title "New booking flow"

# 5. PR auto-merges if checks pass
```

### Deploying to Staging

```bash
# 1. Switch to staging branch
git checkout staging
git pull origin staging

# 2. Merge dev changes
git merge dev

# 3. Push to staging
git push origin staging

# GitHub Actions will:
# - Build application
# - Apply database migrations
# - Deploy to VPS staging
# - Run health checks

# 4. Verify deployment
curl https://simmerdown.staging.muva.chat/api/health | jq

# 5. Test manually
# Visit: https://simmerdown.staging.muva.chat
```

### Deploying to Production

```bash
# 1. Switch to main branch
git checkout main
git pull origin main

# 2. Create production release branch
git checkout -b prod/v1.2.0

# 3. Merge staging
git merge staging

# 4. Push and create PR
git push origin prod/v1.2.0
gh pr create --base main --title "Deploy v1.2.0 to production"

# 5. Request approval from team lead
# Tag reviewer in PR: @lead-dev

# 6. After approval, GitHub Actions will:
# - Create database backup
# - Apply migrations
# - Deploy to production VPS
# - Run comprehensive health checks

# 7. Verify production
curl https://simmerdown.muva.chat/api/health | jq
```

---

## Environment Variables

### Required Variables

All environments need these variables:

| Variable | Purpose | Where to Get |
|----------|---------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public API key | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin API key | Supabase Dashboard → Settings → API |
| `ANTHROPIC_API_KEY` | Claude AI API key | Team lead / Anthropic Console |
| `OPENAI_API_KEY` | OpenAI API key | Team lead / OpenAI Dashboard |

### Environment-Specific Values

#### Development (.env.local)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://rvjmwwvkhglcuqwcznph.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... (dev anon key)
SUPABASE_SERVICE_ROLE_KEY=eyJ... (dev service role key)
ANTHROPIC_API_KEY=sk-ant-... (shared)
OPENAI_API_KEY=sk-... (shared)
```

#### Staging (VPS: /var/www/muva-chat-staging/.env.production)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://[DEPRECATED-OLD-STAGING].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... (staging anon key)
SUPABASE_SERVICE_ROLE_KEY=eyJ... (staging service role key)
# ... same API keys
```

#### Production (VPS: /var/www/muva-chat/.env.production)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://iyeueszchbvlutlcmvcb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... (production anon key)
SUPABASE_SERVICE_ROLE_KEY=eyJ... (production service role key)
# ... same API keys
```

### Validation

Validate your environment variables:

```bash
pnpm dlx tsx scripts/validate-env-vars.ts --env=dev
```

---

## Common Commands

### Development

```bash
# Start dev server
./scripts/dev-with-keys.sh

# Build for production
pnpm run build

# Run linter
pnpm run lint

# Type check
pnpm run type-check  # If available
```

### Database

```bash
# Create new migration
pnpm dlx tsx scripts/create-migration.ts "add_users_table"

# Check migration status
pnpm dlx tsx scripts/migration-status.ts --env=dev

# Apply migrations locally (dev)
pnpm dlx tsx scripts/apply-migrations-staging.ts  # Adaptar para dev si es necesario

# Detect schema drift
pnpm dlx tsx scripts/detect-schema-drift.ts --source=dev --target=staging
```

### Git

```bash
# Check status
git status --short

# View changes
git diff

# View commit history
git log --oneline --graph --all -10

# Stash changes
git stash
git stash pop
```

### Monitoring

```bash
# Check all environments health
pnpm dlx tsx scripts/monitoring-dashboard.ts

# Check only staging
pnpm dlx tsx scripts/monitoring-dashboard.ts --env=staging

# Run health check
curl http://localhost:3000/api/health | jq
curl https://simmerdown.staging.muva.chat/api/health | jq
```

---

## Creating Migrations

### When to Create a Migration

Create a migration when you:

- Add/remove/modify database tables
- Add/remove/modify columns
- Create/update indexes
- Change RLS policies
- Create/update database functions
- Modify table constraints (FK, unique, etc.)

### Step-by-Step Process

#### 1. Generate Migration File

```bash
pnpm dlx tsx scripts/create-migration.ts "descriptive_name"

# Examples:
pnpm dlx tsx scripts/create-migration.ts "add_bookings_table"
pnpm dlx tsx scripts/create-migration.ts "add email column to users"
pnpm dlx tsx scripts/create-migration.ts "fix_guest_chat_rls_policies"
```

#### 2. Edit Migration File

File created at: `supabase/migrations/YYYYMMDDHHMMSS_descriptive_name.sql`

**Example - Add Table:**

```sql
-- Migration: Add bookings table
-- Created: 2025-11-05

-- UP Migration
BEGIN;

CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenant_registry(tenant_id),
  guest_name TEXT NOT NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can view own bookings"
  ON public.bookings FOR SELECT
  USING (tenant_id = auth.uid());

-- Add indexes
CREATE INDEX idx_bookings_tenant ON public.bookings(tenant_id);
CREATE INDEX idx_bookings_dates ON public.bookings(check_in, check_out);

COMMIT;

-- DOWN Migration (optional but recommended)
-- BEGIN;
-- DROP TABLE IF EXISTS public.bookings CASCADE;
-- COMMIT;
```

#### 3. Test Locally

```bash
# Apply migration to local dev database
# (Use Supabase CLI or script)
pnpm dlx supabase db push --project-ref rvjmwwvkhglcuqwcznph

# Verify table exists
pnpm dlx tsx -e "
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data } = await supabase.from('bookings').select('*').limit(1);
console.log('Table accessible:', data !== null);
"
```

#### 4. Commit Migration

```bash
git add supabase/migrations/YYYYMMDDHHMMSS_*.sql
git commit -m "feat: add bookings table migration"
git push origin dev
```

#### 5. Deploy to Staging

```bash
git checkout staging
git merge dev
git push origin staging

# GitHub Actions will automatically apply migration
# Monitor workflow: https://github.com/your-org/muva-chat/actions
```

#### 6. Verify in Staging

```bash
# Check migration was applied
pnpm dlx tsx scripts/migration-status.ts --env=staging

# Test table in staging database
curl https://simmerdown.staging.muva.chat/api/health/db | jq
```

### Migration Best Practices

1. **Idempotent**: Use `IF EXISTS` / `IF NOT EXISTS`
2. **Transactional**: Wrap in `BEGIN; ... COMMIT;`
3. **Documented**: Add comments explaining WHY
4. **Reversible**: Include DOWN section when possible
5. **Tested**: Always test in dev first
6. **Small**: One logical change per migration

See full guide: `docs/infrastructure/three-environments/MIGRATION_GUIDE.md`

---

## Testing Guidelines

### Local Testing

```bash
# 1. Build test
pnpm run build

# 2. Manual testing
./scripts/dev-with-keys.sh
# Visit http://localhost:3000
# Test your feature

# 3. Database testing
# Insert test data
# Verify queries work
# Check RLS policies
```

### Pre-Commit Checks

Before pushing code:

- [ ] Code builds successfully (`pnpm run build`)
- [ ] No TypeScript errors
- [ ] No console errors in browser
- [ ] Feature works in local environment
- [ ] Migrations tested (if applicable)
- [ ] Environment variables documented (if new)

### Staging Testing

After deploying to staging:

- [ ] Application loads successfully
- [ ] Health endpoint returns 200
- [ ] Database connectivity works
- [ ] Your feature works as expected
- [ ] No errors in PM2 logs (ask DevOps if needed)

---

## Troubleshooting

### Problem: Build Fails Locally

**Symptoms:** `pnpm run build` exits with errors

**Solutions:**

```bash
# 1. Clean install
rm -rf node_modules pnpm-lock.yaml .next
pnpm install

# 2. Check TypeScript errors
pnpm run type-check  # If available

# 3. Check for missing environment variables
cat .env.local
# Ensure all required variables are set

# 4. Verify Node version
node --version  # Should be 20.x
```

### Problem: Local Dev Server Won't Start

**Symptoms:** `./scripts/dev-with-keys.sh` fails or hangs

**Solutions:**

```bash
# 1. Check port 3000 is available
lsof -i :3000
# Kill process if found: kill -9 <PID>

# 2. Verify .env.local exists
ls -la .env.local

# 3. Check environment variables are valid
pnpm dlx tsx scripts/validate-env-vars.ts --env=dev

# 4. Try direct start
pnpm run dev
```

### Problem: Database Connection Fails

**Symptoms:** "Failed to connect to database" or CORS errors

**Solutions:**

```bash
# 1. Verify Supabase credentials
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY

# 2. Test Supabase connection
curl $NEXT_PUBLIC_SUPABASE_URL/rest/v1/

# 3. Check service role key
pnpm dlx tsx -e "
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const { error } = await supabase.from('tenant_registry').select('*').limit(1);
console.log('Connection:', error ? 'FAILED' : 'OK');
"
```

### Problem: Migration Fails

**Symptoms:** GitHub Actions fails at "Apply Migrations" step

**Solutions:**

```bash
# 1. Check migration syntax
pnpm dlx tsx scripts/validate-migrations.ts

# 2. View migration status
pnpm dlx tsx scripts/migration-status.ts --env=staging

# 3. Test migration locally first
# Apply to dev database and verify

# 4. Check for schema conflicts
pnpm dlx tsx scripts/detect-schema-drift.ts --source=staging --target=production
```

### Problem: Feature Works Locally but Not in Staging

**Symptoms:** Works on localhost:3000, broken on staging.muva.chat

**Common Causes:**

```bash
# 1. Environment variables mismatch
# Compare local vs staging variables

# 2. Uncommitted files
git status --short
# Commit any missing files

# 3. Build cache issues (on VPS)
# SSH to staging and rebuild:
cd /var/www/muva-chat-staging
pnpm run build
pm2 restart muva-staging

# 4. Database migration not applied
pnpm dlx tsx scripts/migration-status.ts --env=staging
```

### Problem: Can't Push to Main

**Symptoms:** "Branch protection rules prevent push"

**Reason:** This is correct! You must use Pull Requests.

**Solution:**

```bash
# Create PR instead
git checkout -b prod/release-v1.0.0
git merge staging
git push origin prod/release-v1.0.0

gh pr create --base main --title "Production Release v1.0.0"
# Request approval from @lead-dev
```

---

## Best Practices

### Code Organization

**File Structure:**
```
src/
├── app/              # Next.js 15 app directory
│   ├── api/         # API routes
│   ├── (routes)/    # Page routes
│   └── layout.tsx   # Root layout
├── components/      # Reusable components
├── lib/            # Utility functions
└── types/          # TypeScript types
```

**Naming Conventions:**
- Files: `kebab-case.tsx`
- Components: `PascalCase`
- Functions: `camelCase`
- Constants: `SCREAMING_SNAKE_CASE`
- Database: `snake_case`

### Git Commits

Use conventional commits:

```bash
# Format: <type>(<scope>): <subject>

# Types:
feat:     # New feature
fix:      # Bug fix
docs:     # Documentation only
style:    # Code style (formatting, semicolons, etc)
refactor: # Code restructuring
test:     # Adding tests
chore:    # Build process, dependencies

# Examples:
git commit -m "feat(bookings): add booking creation form"
git commit -m "fix(auth): resolve token expiration issue"
git commit -m "docs: update API documentation"
```

### Component Patterns

**Use TypeScript:**
```typescript
interface BookingFormProps {
  tenantId: string;
  onSubmit: (data: BookingData) => Promise<void>;
  initialData?: Partial<BookingData>;
}

export function BookingForm({ tenantId, onSubmit, initialData }: BookingFormProps) {
  // Component implementation
}
```

**Server Components by Default:**
```typescript
// app/bookings/page.tsx
export default async function BookingsPage() {
  const supabase = createServerClient();
  const { data } = await supabase.from('bookings').select('*');

  return <BookingsList bookings={data} />;
}
```

**Client Components Only When Needed:**
```typescript
'use client';

import { useState } from 'react';

export function InteractiveWidget() {
  const [count, setCount] = useState(0);
  // ...
}
```

### Database Queries

**Use Supabase Client:**
```typescript
import { createServerClient } from '@/lib/supabase';

const supabase = createServerClient();

// Good: Specific columns, filters
const { data } = await supabase
  .from('bookings')
  .select('id, guest_name, check_in')
  .eq('tenant_id', tenantId)
  .order('check_in', { ascending: false });

// Bad: Select all, no filters
const { data } = await supabase.from('bookings').select('*');
```

**Respect RLS Policies:**
```typescript
// RLS handles authorization automatically
// No need to add manual tenant_id filters if RLS is properly configured
const { data } = await supabase.from('bookings').select('*');
```

### Error Handling

```typescript
try {
  const { data, error } = await supabase
    .from('bookings')
    .insert({ ...bookingData });

  if (error) {
    console.error('Database error:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
} catch (error) {
  console.error('Unexpected error:', error);
  return { success: false, error: 'An unexpected error occurred' };
}
```

---

## Code Review Checklist

### Before Submitting PR

- [ ] Code builds successfully (`pnpm run build`)
- [ ] No TypeScript errors or warnings
- [ ] No console errors in browser devtools
- [ ] Feature tested locally in dev environment
- [ ] Database migrations tested (if applicable)
- [ ] Environment variables documented in `.env.template`
- [ ] Commit messages follow conventional commit format
- [ ] Branch is up to date with base (`git pull origin <base>`)
- [ ] No sensitive data (API keys, passwords) committed
- [ ] Code follows project patterns and conventions

### PR Description Template

```markdown
## Description
Brief description of what this PR changes and why.

## Type of Change
- [ ] Bug fix (non-breaking change)
- [ ] New feature (non-breaking change)
- [ ] Breaking change (fix or feature that changes existing functionality)
- [ ] Documentation update

## Changes Made
- Added booking creation form
- Updated RLS policies for bookings table
- Created migration for bookings table

## Testing
- [x] Tested locally in dev environment
- [x] Migration applied successfully
- [x] Feature works as expected
- [ ] Tested in staging (after merge)

## Database Migrations
- [x] Migration file created: `20251105120000_add_bookings_table.sql`
- [x] Migration tested locally
- [x] DOWN migration included

## Screenshots (if applicable)
[Add screenshots here]

## Checklist
- [x] Code follows style guidelines
- [x] Self-review completed
- [x] Documentation updated
- [x] No console errors
- [x] Environment variables documented
```

### Reviewing Others' PRs

When reviewing a teammate's PR:

1. **Functionality**: Does it solve the problem?
2. **Code Quality**: Is it readable and maintainable?
3. **Performance**: Are there obvious performance issues?
4. **Security**: Any security concerns (SQL injection, XSS, etc.)?
5. **Tests**: Are changes adequately tested?
6. **Documentation**: Is documentation updated?
7. **Migrations**: Are database changes safe and reversible?

---

## Additional Resources

### Documentation

- [Migration Guide](./MIGRATION_GUIDE.md)
- [Deployment Playbook](./DEPLOYMENT_PLAYBOOK.md)
- [Monitoring Guide](./MONITORING_GUIDE.md)
- [Branch Protection Guide](./BRANCH_PROTECTION_GUIDE.md)
- [Secrets Guide](./SECRETS_GUIDE.md)

### Tools

- [Supabase Dashboard](https://supabase.com/dashboard)
- [GitHub Repository](https://github.com/your-org/muva-chat)
- [GitHub Actions](https://github.com/your-org/muva-chat/actions)

### Getting Help

- **Slack**: #muva-chat-dev
- **Team Lead**: @lead-dev
- **DevOps**: @devops-lead
- **Database**: @db-admin

---

**Happy Coding!** 🚀

**Last Updated:** November 5, 2025
**Maintained by:** MUVA Development Team
