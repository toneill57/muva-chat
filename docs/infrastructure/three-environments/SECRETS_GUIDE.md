# Environment Variables & Secrets Management Guide

**Project:** MUVA Chat - Three Environments CI/CD
**Last Updated:** 2025-11-05
**Related Docs:** [plan.md](./plan.md) | [BRANCH_PROTECTION_GUIDE.md](./BRANCH_PROTECTION_GUIDE.md)

---

## Table of Contents

- [Overview](#overview)
- [Secrets Inventory](#secrets-inventory)
  - [Development Environment](#development-environment)
  - [Staging Environment](#staging-environment)
  - [Production Environment](#production-environment)
  - [Shared Secrets](#shared-secrets)
- [How to Configure GitHub Secrets](#how-to-configure-github-secrets)
- [How to Rotate Secrets](#how-to-rotate-secrets)
- [Environment File Structure](#environment-file-structure)
- [Security Best Practices](#security-best-practices)
- [Validation](#validation)
- [Troubleshooting](#troubleshooting)

---

## Overview

This guide documents the complete system for managing environment variables and secrets across three environments:

- **Development (dev):** Local development environment
- **Staging:** Pre-production testing environment
- **Production (prod):** Live production environment

### Key Principles

1. **Environment Isolation:** Each environment has its own Supabase project/branch and credentials
2. **Least Privilege:** Each environment only has access to its own resources
3. **No Hardcoding:** All sensitive values stored in GitHub Secrets or .env files (gitignored)
4. **Validation:** Automated validation of environment variables before deployment
5. **Rotation:** Regular rotation of credentials (quarterly recommended)

### Secret Naming Convention

We use **prefixed naming** for GitHub Secrets to clearly identify which environment they belong to:

- Development: `DEV_*`
- Staging: `STAGING_*`
- Production: `PROD_*`
- Shared: No prefix (e.g., `ANTHROPIC_API_KEY`)

---

## Secrets Inventory

### Development Environment

Development environment connects to Supabase dev branch (project ref: `ooaumjzaztmutltifhoq`).

| Secret Name | Description | Where to Get It | Required | Used By |
|-------------|-------------|-----------------|----------|---------|
| `DEV_SUPABASE_URL` | Supabase project URL | Supabase Dashboard → Settings → API → Project URL | ✅ Yes | validate-dev.yml |
| `DEV_SUPABASE_ANON_KEY` | Supabase anonymous key (public) | Supabase Dashboard → Settings → API → anon key | ✅ Yes | validate-dev.yml |
| `DEV_SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (private) | Supabase Dashboard → Settings → API → service_role key | ✅ Yes | validate-dev.yml |
| `DEV_SUPABASE_PROJECT_ID` | Supabase project reference ID | Project URL (e.g., `ooaumjzaztmutltifhoq`) | ⚠️ Optional | Migration scripts |
| `DEV_DATABASE_URL` | Direct PostgreSQL connection string | Supabase Dashboard → Settings → Database → Connection string | ⚠️ Optional | Direct DB access |
| `DEV_SUPABASE_DB_PASSWORD` | Database password for pg_dump/psql | Supabase Dashboard → Settings → Database → Password | ⚠️ Optional | Backups, migrations |

**Example Values (dev):**
```bash
DEV_SUPABASE_URL=https://ooaumjzaztmutltifhoq.supabase.co
DEV_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ...
DEV_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ...
DEV_SUPABASE_PROJECT_ID=ooaumjzaztmutltifhoq
DEV_DATABASE_URL=postgresql://postgres.ooaumjzaztmutltifhoq:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

---

### Staging Environment

Staging environment connects to Supabase staging branch (project ref: `rvjmwwvkhglcuqwcznph`).

| Secret Name | Description | Where to Get It | Required | Used By |
|-------------|-------------|-----------------|----------|---------|
| `STAGING_SUPABASE_URL` | Supabase staging project URL | Supabase Dashboard → Staging branch → Settings → API | ✅ Yes | deploy-staging.yml |
| `STAGING_SUPABASE_ANON_KEY` | Supabase staging anonymous key | Supabase Dashboard → Staging branch → Settings → API | ✅ Yes | deploy-staging.yml |
| `STAGING_SUPABASE_SERVICE_ROLE_KEY` | Supabase staging service role key | Supabase Dashboard → Staging branch → Settings → API | ✅ Yes | deploy-staging.yml |
| `STAGING_SUPABASE_PROJECT_ID` | Staging project reference ID | Staging project URL (e.g., `rvjmwwvkhglcuqwcznph`) | ✅ Yes | Migration scripts |
| `STAGING_DATABASE_URL` | Staging PostgreSQL connection | Supabase Dashboard → Staging → Settings → Database | ⚠️ Optional | Direct DB access |
| `STAGING_SUPABASE_DB_PASSWORD` | Staging database password | Supabase Dashboard → Staging → Settings → Database | ⚠️ Optional | Backups |
| `STAGING_VPS_HOST` | Staging VPS hostname/IP | VPS provider dashboard | ✅ Yes | SSH deployment |
| `STAGING_VPS_USER` | Staging VPS SSH username | VPS provider dashboard | ✅ Yes | SSH deployment |
| `STAGING_VPS_SSH_KEY` | Staging VPS SSH private key | Generated with `ssh-keygen` | ✅ Yes | SSH deployment |

**Example Values (staging):**
```bash
STAGING_SUPABASE_URL=https://rvjmwwvkhglcuqwcznph.supabase.co
STAGING_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ...
STAGING_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ...
STAGING_SUPABASE_PROJECT_ID=rvjmwwvkhglcuqwcznph
STAGING_VPS_HOST=123.45.67.89
STAGING_VPS_USER=ubuntu
STAGING_VPS_SSH_KEY=-----BEGIN OPENSSH PRIVATE KEY-----\n...
```

---

### Production Environment

Production environment uses the main Supabase project (same as dev, project ref: `ooaumjzaztmutltifhoq`).

| Secret Name | Description | Where to Get It | Required | Used By |
|-------------|-------------|-----------------|----------|---------|
| `PROD_SUPABASE_URL` | Supabase production URL | Supabase Dashboard → Main project → Settings → API | ✅ Yes | deploy-production.yml |
| `PROD_SUPABASE_ANON_KEY` | Supabase production anon key | Supabase Dashboard → Main project → Settings → API | ✅ Yes | deploy-production.yml |
| `PROD_SUPABASE_SERVICE_ROLE_KEY` | Supabase production service role key | Supabase Dashboard → Main project → Settings → API | ✅ Yes | deploy-production.yml |
| `PROD_SUPABASE_PROJECT_ID` | Production project reference ID | Production URL (e.g., `ooaumjzaztmutltifhoq`) | ✅ Yes | Backups, migrations |
| `PROD_DATABASE_URL` | Production PostgreSQL connection | Supabase Dashboard → Settings → Database | ⚠️ Optional | Direct DB access |
| `PROD_SUPABASE_DB_PASSWORD` | Production database password | Supabase Dashboard → Settings → Database | ✅ Yes | Backups (pg_dump) |
| `PROD_VPS_HOST` | Production VPS hostname/IP | VPS provider dashboard | ✅ Yes | SSH deployment |
| `PROD_VPS_USER` | Production VPS SSH username | VPS provider dashboard | ✅ Yes | SSH deployment |
| `PROD_VPS_SSH_KEY` | Production VPS SSH private key | Generated with `ssh-keygen` | ✅ Yes | SSH deployment |

**Example Values (production):**
```bash
PROD_SUPABASE_URL=https://ooaumjzaztmutltifhoq.supabase.co
PROD_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ...
PROD_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ...
PROD_SUPABASE_PROJECT_ID=ooaumjzaztmutltifhoq
PROD_SUPABASE_DB_PASSWORD=your_secure_password_here
PROD_VPS_HOST=muva.chat
PROD_VPS_USER=ubuntu
PROD_VPS_SSH_KEY=-----BEGIN OPENSSH PRIVATE KEY-----\n...
```

---

### Shared Secrets

These secrets are used across ALL environments.

| Secret Name | Description | Where to Get It | Required | Used By |
|-------------|-------------|-----------------|----------|---------|
| `ANTHROPIC_API_KEY` | Claude AI API key | https://console.anthropic.com/settings/keys | ✅ Yes | All workflows (chat) |
| `OPENAI_API_KEY` | OpenAI API key | https://platform.openai.com/api-keys | ⚠️ Optional | Embeddings (if used) |
| `SUPABASE_ACCESS_TOKEN` | Supabase Management API token | https://supabase.com/dashboard/account/tokens | ⚠️ Optional | MCP tools, branching scripts |
| `VPS_HOST` | Shared VPS hostname (if same VPS) | VPS provider dashboard | ⚠️ Optional | Fallback if no env-specific |
| `VPS_USER` | Shared VPS SSH username | VPS provider dashboard | ⚠️ Optional | Fallback if no env-specific |
| `VPS_SSH_KEY` | Shared VPS SSH private key | Generated with `ssh-keygen` | ⚠️ Optional | Fallback if no env-specific |
| `GITHUB_TOKEN` | GitHub Personal Access Token | GitHub Settings → Developer settings → PAT | ⚠️ Optional | GitHub API operations |

**Example Values (shared):**
```bash
ANTHROPIC_API_KEY=sk-ant-api03-...
OPENAI_API_KEY=sk-proj-...
SUPABASE_ACCESS_TOKEN=sbp_...
```

---

## How to Configure GitHub Secrets

### Step 1: Navigate to Repository Settings

1. Go to your GitHub repository: `https://github.com/your-org/muva-chat`
2. Click **Settings** (top navigation)
3. In left sidebar, click **Secrets and variables** → **Actions**

### Step 2: Add New Secret

1. Click **New repository secret** button (green button, top right)
2. Enter secret **Name** (e.g., `STAGING_SUPABASE_URL`)
3. Enter secret **Value** (copy from Supabase Dashboard)
4. Click **Add secret**

### Step 3: Verify Secret Was Added

- Secret should appear in the list
- You cannot view the value after creation (security feature)
- To update: click secret name → **Update secret** button

### Step 4: Update Workflows to Use Secret

In your `.github/workflows/*.yml` files, reference secrets like this:

```yaml
env:
  NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.STAGING_SUPABASE_URL }}
  NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.STAGING_SUPABASE_ANON_KEY }}
  SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.STAGING_SUPABASE_SERVICE_ROLE_KEY }}
```

### Step 5: Test Secret Access

- Push to the branch that triggers the workflow
- Check workflow logs: secrets are masked as `***`
- Verify deployment succeeds

---

## How to Rotate Secrets

**Why Rotate?**
- Security compliance (quarterly rotation recommended)
- Suspected credential leak
- Team member departure
- Regular security hygiene

### Automated Rotation (Recommended)

Use the `rotate-secrets.ts` script (when implemented):

```bash
# Rotate staging Supabase service role key
pnpm dlx tsx scripts/rotate-secrets.ts \
  --env=staging \
  --secret=SUPABASE_SERVICE_ROLE_KEY

# Rotate production database password
pnpm dlx tsx scripts/rotate-secrets.ts \
  --env=production \
  --secret=SUPABASE_DB_PASSWORD \
  --force
```

### Manual Rotation Process

#### For Supabase Keys (ANON_KEY, SERVICE_ROLE_KEY)

1. **Generate New Keys in Supabase:**
   - Go to Supabase Dashboard → Project → Settings → API
   - Click **Rotate JWT Secret** (regenerates ALL keys)
   - ⚠️ **WARNING:** This invalidates ALL existing keys immediately

2. **Update GitHub Secrets:**
   - Go to GitHub repo → Settings → Secrets → Actions
   - Update each secret with new value:
     - `STAGING_SUPABASE_ANON_KEY`
     - `STAGING_SUPABASE_SERVICE_ROLE_KEY`

3. **Update VPS Environment:**
   - SSH into VPS: `ssh user@staging.muva.chat`
   - Edit `.env.local` file with new keys
   - Restart PM2 process: `pm2 restart muva-chat-staging`

4. **Verify Functionality:**
   - Test health endpoint: `curl https://staging.muva.chat/api/health`
   - Check PM2 logs: `pm2 logs muva-chat-staging`
   - Verify chat functionality works

#### For Database Password

1. **Reset Password in Supabase:**
   - Supabase Dashboard → Settings → Database → Reset Database Password
   - Copy new password (won't be shown again)

2. **Update DATABASE_URL:**
   - Update GitHub Secret: `STAGING_DATABASE_URL`
   - Update local `.env.staging` file
   - Update VPS `.env.local` file

3. **Test Connection:**
   ```bash
   # Test direct PostgreSQL connection
   psql "postgresql://postgres.rvjmwwvkhglcuqwcznph:[NEW_PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres" -c "SELECT 1;"
   ```

#### For VPS SSH Keys

1. **Generate New Key Pair:**
   ```bash
   ssh-keygen -t ed25519 -C "github-actions-staging" -f ~/.ssh/github_staging_new
   ```

2. **Add Public Key to VPS:**
   ```bash
   ssh-copy-id -i ~/.ssh/github_staging_new.pub user@staging-vps
   ```

3. **Update GitHub Secret:**
   - Copy private key: `cat ~/.ssh/github_staging_new`
   - Update `STAGING_VPS_SSH_KEY` in GitHub Secrets

4. **Test SSH Access:**
   - Trigger a test deployment
   - Verify GitHub Actions can SSH successfully

5. **Remove Old Key (After Verification):**
   ```bash
   # On VPS
   vim ~/.ssh/authorized_keys  # Remove old key line
   ```

#### For API Keys (Anthropic, OpenAI)

1. **Generate New Key:**
   - Anthropic: https://console.anthropic.com/settings/keys → Create Key
   - OpenAI: https://platform.openai.com/api-keys → Create Secret Key

2. **Update GitHub Secret:**
   - Update `ANTHROPIC_API_KEY` in GitHub Secrets

3. **Update VPS:**
   - SSH into each environment's VPS
   - Update `.env.local` with new key
   - Restart PM2: `pm2 restart muva-chat-*`

4. **Revoke Old Key:**
   - Return to API provider dashboard
   - Revoke/delete old key

---

## Environment File Structure

### Local Development: `.env.local`

**Purpose:** Local development on your machine
**Location:** Project root (gitignored)
**Created from:** `.env.template`

```bash
# Copy template and fill in values
cp .env.template .env.local

# Edit with your values
vim .env.local
```

### Environment-Specific Files

| File | Purpose | Source | Gitignored |
|------|---------|--------|------------|
| `.env.dev` | Development environment config | Created manually | ✅ Yes |
| `.env.staging` | Staging environment config | Created manually | ✅ Yes |
| `.env.production` | Production environment config | Created manually | ✅ Yes |
| `.env.template` | Template with all variables documented | Committed to repo | ❌ No (safe) |

### VPS Environment Files

On the VPS, environment variables are stored in `.env.local`:

**Staging VPS:**
```bash
/var/www/muva-chat-staging/.env.local
```

**Production VPS:**
```bash
/var/www/muva-chat/.env.local
```

These files are created automatically by GitHub Actions workflows during deployment.

---

## Security Best Practices

### DO ✅

1. **Use GitHub Secrets for CI/CD**
   - Never hardcode secrets in workflows
   - Use `${{ secrets.SECRET_NAME }}` syntax

2. **Use Different Credentials Per Environment**
   - Dev, staging, production should have separate keys
   - Limits blast radius if credentials leak

3. **Rotate Keys Quarterly**
   - Set calendar reminder for key rotation
   - Document rotation in change log

4. **Use Service Role Keys Carefully**
   - Never expose to browser/client
   - Only use server-side (API routes, workflows)

5. **Validate Environment Variables**
   - Run `validate-env-vars.ts` before deployment
   - Catch misconfigurations early

6. **Limit Access to Secrets**
   - Only admins should access GitHub Secrets
   - Use GitHub Environment protection rules

7. **Monitor for Leaks**
   - Review commit history for accidental commits
   - Use tools like `git-secrets` or `truffleHog`

8. **Backup Secrets Securely**
   - Store in password manager (1Password, LastPass)
   - Encrypted document (not plain text)

### DON'T ❌

1. **Never Commit .env Files**
   - `.env.local`, `.env.dev`, `.env.staging`, `.env.production`
   - Already in `.gitignore` but double-check

2. **Never Log Secret Values**
   - GitHub Actions masks secrets in logs
   - Don't `console.log()` or `echo` secrets

3. **Never Share Secrets in Slack/Email**
   - Use secure channels (password manager shared vault)
   - Rotate if accidentally shared

4. **Never Reuse Keys Across Projects**
   - Each project should have unique keys
   - Prevents cross-project compromises

5. **Never Use Production Keys in Development**
   - Use separate dev/staging environments
   - Prevents accidental data modifications

---

## Validation

### Validate Environment Variables

Use the validation script to check completeness and format:

```bash
# Validate specific environment
pnpm dlx tsx scripts/validate-env-vars.ts --env=staging

# Validate all environments
pnpm dlx tsx scripts/validate-env-vars.ts --all

# Show help
pnpm dlx tsx scripts/validate-env-vars.ts --help
```

### Validation Checks

The script validates:

- ✅ **Supabase URL:** Format (`https://`, `.supabase.co`), correct project ref
- ✅ **Supabase Keys:** JWT format, length, 3-part structure
- ✅ **Anthropic Key:** Starts with `sk-ant-`, minimum length
- ✅ **Database URL:** PostgreSQL format, contains project ref, uses pooler
- ⚠️ **Optional Vars:** Warns if missing but doesn't fail

### Exit Codes

- `0` - All validations passed
- `1` - Critical variables missing or invalid format

### Example Output

```
╔═══════════════════════════════════════════════════╗
║     ENVIRONMENT VARIABLES VALIDATION SCRIPT       ║
╚═══════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Environment: STAGING (.env.staging)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  Warnings:
   • DATABASE_URL: Not set (optional, but needed for migrations)
   • OPENAI_API_KEY: Not set (optional, only for embeddings)

✅ All critical variables are valid
```

---

## Troubleshooting

### Error: "Missing environment variable"

**Problem:** Workflow fails with "Missing required environment variable: STAGING_SUPABASE_URL"

**Solution:**
1. Verify secret exists in GitHub: Settings → Secrets → Actions
2. Check secret name matches exactly (case-sensitive)
3. Check workflow file references correct secret:
   ```yaml
   env:
     NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.STAGING_SUPABASE_URL }}
   ```

### Error: "Invalid JWT token"

**Problem:** Application fails to connect to Supabase with "Invalid JWT"

**Solution:**
1. Verify you copied the FULL key (JWT tokens are 200+ characters)
2. Check for leading/trailing spaces in secret value
3. Verify key hasn't been rotated in Supabase Dashboard
4. Re-copy key from Supabase Dashboard → Settings → API

### Error: "Connection refused" to Database

**Problem:** Cannot connect to PostgreSQL directly

**Solution:**
1. Verify `DATABASE_URL` format is correct:
   ```
   postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```
2. Check database password is current (not rotated)
3. Verify pooler is used (`.pooler.supabase.com`)
4. Test connection with `psql` command

### Error: "SSH connection failed"

**Problem:** GitHub Actions cannot SSH to VPS

**Solution:**
1. Verify VPS is running and accessible
2. Check SSH key is complete (including `-----BEGIN/END-----` lines)
3. Verify public key is in VPS `~/.ssh/authorized_keys`
4. Test SSH manually: `ssh -i ~/.ssh/key user@vps-host`
5. Check VPS firewall allows SSH (port 22)

### Error: "Secret is masked as ***"

**This is normal behavior!** GitHub Actions automatically masks secrets in logs for security.

If you need to debug:
1. Check secret length: `echo "${{ secrets.SECRET }}" | wc -c`
2. Check first 3 characters: `echo "${{ secrets.SECRET }}" | head -c 3`
3. Never log full secret value

### Validation Warnings

**Warning:** "DATABASE_URL: Not set"

- Optional for most operations
- Required for `pg_dump`, `psql`, direct migrations
- Safe to ignore if only using Supabase client

**Warning:** "OPENAI_API_KEY: Not set"

- Only needed if using OpenAI embeddings
- Not required if using only Anthropic Claude
- Safe to ignore if not using embeddings feature

---

## Related Documentation

- [Supabase Branching Guide](./SUPABASE_BRANCHING_GUIDE.md) - How to create and manage Supabase branches
- [Branch Protection Guide](./BRANCH_PROTECTION_GUIDE.md) - GitHub branch protection rules
- [Migration Guide](./MIGRATION_GUIDE.md) - Database migration best practices
- [Three Environments Plan](./plan.md) - Overall CI/CD architecture

---

## Appendix: Complete Secret Checklist

Use this checklist when setting up a new environment:

### Development Environment

- [ ] `DEV_SUPABASE_URL`
- [ ] `DEV_SUPABASE_ANON_KEY`
- [ ] `DEV_SUPABASE_SERVICE_ROLE_KEY`
- [ ] `DEV_SUPABASE_PROJECT_ID`
- [ ] `DEV_DATABASE_URL` (optional)
- [ ] `DEV_SUPABASE_DB_PASSWORD` (optional)

### Staging Environment

- [ ] `STAGING_SUPABASE_URL`
- [ ] `STAGING_SUPABASE_ANON_KEY`
- [ ] `STAGING_SUPABASE_SERVICE_ROLE_KEY`
- [ ] `STAGING_SUPABASE_PROJECT_ID`
- [ ] `STAGING_DATABASE_URL` (optional)
- [ ] `STAGING_SUPABASE_DB_PASSWORD` (optional)
- [ ] `STAGING_VPS_HOST`
- [ ] `STAGING_VPS_USER`
- [ ] `STAGING_VPS_SSH_KEY`

### Production Environment

- [ ] `PROD_SUPABASE_URL`
- [ ] `PROD_SUPABASE_ANON_KEY`
- [ ] `PROD_SUPABASE_SERVICE_ROLE_KEY`
- [ ] `PROD_SUPABASE_PROJECT_ID`
- [ ] `PROD_DATABASE_URL` (optional)
- [ ] `PROD_SUPABASE_DB_PASSWORD` (**required for backups**)
- [ ] `PROD_VPS_HOST`
- [ ] `PROD_VPS_USER`
- [ ] `PROD_VPS_SSH_KEY`

### Shared Secrets

- [ ] `ANTHROPIC_API_KEY`
- [ ] `OPENAI_API_KEY` (optional)
- [ ] `SUPABASE_ACCESS_TOKEN` (optional)
- [ ] `GITHUB_TOKEN` (optional)

### Validation

- [ ] Run `pnpm dlx tsx scripts/validate-env-vars.ts --all`
- [ ] All critical variables pass validation
- [ ] Warnings reviewed and acceptable
- [ ] Test deployment successful

---

**Last Updated:** 2025-11-05
**Maintainer:** DevOps Team
**Questions?** See [Troubleshooting](#troubleshooting) or open an issue
