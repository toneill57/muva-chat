# GitHub Secrets Setup Guide

**Project:** MUVA Chat - Three Environments CI/CD
**Last Updated:** 2025-11-05
**Purpose:** Step-by-step guide to configure GitHub Secrets

---

## Quick Setup (Automated)

### Prerequisites

1. **Install GitHub CLI:**
   ```bash
   brew install gh
   ```

2. **Login to GitHub:**
   ```bash
   gh auth login
   # Follow prompts to authenticate
   ```

3. **Verify authentication:**
   ```bash
   gh auth status
   ```

### Run Automated Setup

```bash
./scripts/setup-github-secrets.sh
```

This script will configure **all 24 secrets** automatically:
- ✅ 4 Development secrets
- ✅ 8 Staging secrets (including VPS credentials)
- ✅ 7 Production secrets (including VPS credentials)
- ✅ 3 Shared secrets
- ✅ 2 Legacy secrets (compatibility)

**Estimated time:** < 2 minutes

---

## Manual Setup (Step-by-Step)

If you prefer manual configuration or need to troubleshoot:

### 1. Navigate to GitHub Secrets

1. Go to: `https://github.com/YOUR_USERNAME/muva-chat`
2. Click **Settings** (top navigation)
3. In left sidebar: **Secrets and variables** → **Actions**

---

### 2. Development Environment (4 secrets)

| Secret Name | Value | Notes |
|-------------|-------|-------|
| `DEV_SUPABASE_URL` | `https://ooaumjzaztmutltifhoq.supabase.co` | Dev Supabase project URL |
| `DEV_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vYXVtanphenRtdXRsdGlmaG9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NTQyMDksImV4cCI6MjA3MjQzMDIwOX0.HapBSfCjxBuUijFQvQIgu8Y44YI3OPL6Gr45RKTw-Fk` | Public anon key |
| `DEV_SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vYXVtanphenRtdXRsdGlmaG9xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg1NDIwOSwiZXhwIjoyMDcyNDMwMjA5fQ.ngQSR4E9UHWLcbDAhi0QJy3ffriuV2bi4rGxyHy8Eoc` | Private service role |
| `DEV_SUPABASE_PROJECT_ID` | `ooaumjzaztmutltifhoq` | Project reference ID |

**How to add each secret:**
1. Click **"New repository secret"**
2. Name: Enter secret name exactly as shown
3. Value: Copy-paste value from table
4. Click **"Add secret"**

---

### 3. Staging Environment (8 secrets)

#### Supabase Credentials (5 secrets)

| Secret Name | Value | Notes |
|-------------|-------|-------|
| `STAGING_SUPABASE_URL` | `https://rvjmwwvkhglcuqwcznph.supabase.co` | Staging branch URL |
| `STAGING_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2am13d3ZraGdsY3Vxd2N6bnBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNDAxNzcsImV4cCI6MjA3NzYxNjE3N30.HygM917avxMH3hb4gdEEK7xbt26bUx9jky1dbH_6CdA` | Staging anon key |
| `STAGING_SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2am13d3ZraGdsY3Vxd2N6bnBoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjA0MDE3NywiZXhwIjoyMDc3NjE2MTc3fQ.yOfeLkNPD-dM_IB954XtelUv-d237vfa39UdUB1WTlA` | Staging service role |
| `STAGING_SUPABASE_PROJECT_ID` | `rvjmwwvkhglcuqwcznph` | Staging project ID |
| `STAGING_SUPABASE_DB_PASSWORD` | `3hZMdp62TmM6RycK` | Database password |

#### VPS Credentials (3 secrets)

| Secret Name | Value | Notes |
|-------------|-------|-------|
| `STAGING_VPS_HOST` | `195.200.6.216` | VPS IP address |
| `STAGING_VPS_USER` | `root` | SSH username |
| `STAGING_VPS_PASSWORD` | `rabbitHole0+` | SSH password |

⚠️ **Note:** Currently using password authentication. Consider switching to SSH keys for better security.

---

### 4. Production Environment (7 secrets)

#### Supabase Credentials (4 secrets)

| Secret Name | Value | Notes |
|-------------|-------|-------|
| `PROD_SUPABASE_URL` | `https://ooaumjzaztmutltifhoq.supabase.co` | Same as dev (base project) |
| `PROD_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vYXVtanphenRtdXRsdGlmaG9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NTQyMDksImV4cCI6MjA3MjQzMDIwOX0.HapBSfCjxBuUijFQvQIgu8Y44YI3OPL6Gr45RKTw-Fk` | Production anon key |
| `PROD_SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vYXVtanphenRtdXRsdGlmaG9xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg1NDIwOSwiZXhwIjoyMDcyNDMwMjA5fQ.ngQSR4E9UHWLcbDAhi0QJy3ffriuV2bi4rGxyHy8Eoc` | Production service role |
| `PROD_SUPABASE_PROJECT_ID` | `ooaumjzaztmutltifhoq` | Production project ID |

#### VPS Credentials (3 secrets)

| Secret Name | Value | Notes |
|-------------|-------|-------|
| `PROD_VPS_HOST` | `195.200.6.216` | Same VPS as staging |
| `PROD_VPS_USER` | `root` | SSH username |
| `PROD_VPS_PASSWORD` | `rabbitHole0+` | SSH password |

⚠️ **Note:** Production uses same VPS but different directory (`/var/www/muva-chat` vs `/var/www/muva-chat-staging`)

---

### 5. Shared Secrets (3 secrets)

These secrets are used across **all environments**:

| Secret Name | Value | Notes |
|-------------|-------|-------|
| `ANTHROPIC_API_KEY` | `sk-ant-api03-xxx...xxx (get from console.anthropic.com)` | Claude AI API key |
| `OPENAI_API_KEY` | `sk-proj-xxx...xxx (get from platform.openai.com)` | OpenAI API key (embeddings) |
| `SUPABASE_ACCESS_TOKEN` | `sbp_xxx...xxx (get from supabase.com/dashboard)` | Supabase Management API |

---

### 6. Legacy Secrets (Compatibility)

These maintain compatibility with existing workflows:

| Secret Name | Value | Notes |
|-------------|-------|-------|
| `VPS_HOST` | `195.200.6.216` | Fallback for old workflows |
| `VPS_PASSWORD` | `rabbitHole0+` | Fallback password |

---

## Verification

### 1. List All Secrets

```bash
gh secret list
```

**Expected output (24 secrets):**
```
ANTHROPIC_API_KEY               Updated 2025-11-05
DEV_SUPABASE_ANON_KEY           Updated 2025-11-05
DEV_SUPABASE_PROJECT_ID         Updated 2025-11-05
DEV_SUPABASE_SERVICE_ROLE_KEY   Updated 2025-11-05
DEV_SUPABASE_URL                Updated 2025-11-05
OPENAI_API_KEY                  Updated 2025-11-05
PROD_SUPABASE_ANON_KEY          Updated 2025-11-05
PROD_SUPABASE_PROJECT_ID        Updated 2025-11-05
PROD_SUPABASE_SERVICE_ROLE_KEY  Updated 2025-11-05
PROD_SUPABASE_URL               Updated 2025-11-05
PROD_VPS_HOST                   Updated 2025-11-05
PROD_VPS_PASSWORD               Updated 2025-11-05
PROD_VPS_USER                   Updated 2025-11-05
STAGING_SUPABASE_ANON_KEY       Updated 2025-11-05
STAGING_SUPABASE_DB_PASSWORD    Updated 2025-11-05
STAGING_SUPABASE_PROJECT_ID     Updated 2025-11-05
STAGING_SUPABASE_SERVICE_ROLE_KEY Updated 2025-11-05
STAGING_SUPABASE_URL            Updated 2025-11-05
STAGING_VPS_HOST                Updated 2025-11-05
STAGING_VPS_PASSWORD            Updated 2025-11-05
STAGING_VPS_USER                Updated 2025-11-05
SUPABASE_ACCESS_TOKEN           Updated 2025-11-05
VPS_HOST                        Updated 2025-11-05
VPS_PASSWORD                    Updated 2025-11-05
```

### 2. Validate Environment Variables

```bash
pnpm dlx tsx scripts/validate-env-vars.ts --all
```

**Expected:** ✅ All critical variables valid

### 3. Test Workflows

Push to each branch and verify workflows succeed:

```bash
# Test dev workflow
git push origin dev

# Test staging workflow
git push origin staging

# Test production workflow (requires manual approval)
git push origin main
```

---

## Security Best Practices

### ✅ DO

1. **Use GitHub CLI for setup** - More secure than web UI copy-paste
2. **Rotate keys quarterly** - Set calendar reminder
3. **Limit secret access** - Only admins should configure secrets
4. **Monitor workflow logs** - Check for authentication issues
5. **Use SSH keys instead of passwords** - Better security (future improvement)

### ❌ DON'T

1. **Never commit secrets** - Already in `.gitignore` but double-check
2. **Never share secrets via Slack/email** - Use secure channels
3. **Never log secret values** - GitHub Actions masks them automatically
4. **Never reuse keys across projects** - Prevents cross-project compromises
5. **Never use production keys in development** - Use separate environments

---

## Troubleshooting

### Error: "gh: command not found"

**Solution:**
```bash
brew install gh
gh auth login
```

### Error: "Not authenticated"

**Solution:**
```bash
gh auth login
# Follow prompts to authenticate with your GitHub account
```

### Error: "HTTP 404: Repository not found"

**Solution:**
- Verify you're in the correct repository directory
- Check authentication: `gh auth status`
- Verify repository access: `gh repo view`

### Secret not working in workflow

**Checklist:**
1. ✅ Secret name matches exactly (case-sensitive)
2. ✅ No leading/trailing spaces in value
3. ✅ Workflow references correct secret: `${{ secrets.SECRET_NAME }}`
4. ✅ Secret was added before workflow run

---

## Next Steps

After configuring secrets:

1. ✅ **Test workflows** - Push to dev/staging/main
2. ✅ **Monitor logs** - Check GitHub Actions tab
3. ✅ **Document changes** - Update CHANGELOG.md
4. ✅ **Schedule rotation** - Add to calendar (quarterly)
5. ✅ **Set up SSH keys** - Replace password authentication (optional)

---

## Related Documentation

- [SECRETS_GUIDE.md](./SECRETS_GUIDE.md) - Complete secrets inventory and management
- [FASE7_COMPLETION_SUMMARY.md](./FASE7_COMPLETION_SUMMARY.md) - Environment variables implementation
- [plan.md](./plan.md) - Overall CI/CD architecture

---

## Support

**Questions?** See [SECRETS_GUIDE.md Troubleshooting](./SECRETS_GUIDE.md#troubleshooting)
**Issues?** Open GitHub issue with `[secrets]` prefix

---

**Last Updated:** 2025-11-05
**Maintainer:** DevOps Team
