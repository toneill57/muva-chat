# Deployment Playbook

**MUVA Chat Platform**
**Last Updated:** November 5, 2025
**Target Audience:** DevOps Engineers, Tech Leads

---

## Table of Contents

1. [Overview](#overview)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Deployment Procedures](#deployment-procedures)
4. [Post-Deployment Checklist](#post-deployment-checklist)
5. [Rollback Procedures](#rollback-procedures)
6. [Emergency Response](#emergency-response)
7. [Monitoring & Verification](#monitoring--verification)

---

## Overview

### Deployment Flow

```
┌─────────┐      ┌──────────┐      ┌────────────┐
│   DEV   │──────→  STAGING  │──────→ PRODUCTION │
│ (Local) │ Auto │  (Auto)   │Manual│  (Manual)  │
└─────────┘      └──────────┘      └────────────┘
     │                 │                   │
     └─────────────────┴───────────────────┘
          Same code flows through all environments
```

### Deployment Triggers

| Environment | Trigger | Deployment Method | Approval Required |
|-------------|---------|-------------------|-------------------|
| **Dev** | `git push origin dev` | No deployment (local only) | No |
| **Staging** | `git push origin staging` | Automatic via GitHub Actions | No |
| **Production** | `git push origin main` | Automatic via GitHub Actions | Yes (1 approval) |

### Deployment Automation

All deployments are handled by GitHub Actions workflows:

- **Staging**: `.github/workflows/deploy-staging.yml`
- **Production**: `.github/workflows/deploy-production.yml`

---

## Pre-Deployment Checklist

### For Staging Deployment

Before pushing to `staging` branch:

- [ ] **Code Review**: All changes reviewed and merged to `dev`
- [ ] **Build Success**: `pnpm run build` completes without errors
- [ ] **Tests Pass**: All automated tests pass (if applicable)
- [ ] **Local Testing**: Feature tested in local development environment
- [ ] **Migrations Validated**: Database migrations tested locally
  ```bash
  pnpm dlx tsx scripts/validate-migrations.ts
  ```
- [ ] **Migration Status Check**: No conflicting migrations
  ```bash
  pnpm dlx tsx scripts/migration-status.ts --env=dev
  ```
- [ ] **Environment Variables**: New variables documented in `.env.template`
- [ ] **Dependencies**: No breaking dependency changes
- [ ] **No Secrets**: No API keys or passwords in code

### For Production Deployment

Before creating PR to `main`:

- [ ] **Staging Validated**: Feature fully tested and working in staging
  ```bash
  curl https://simmerdown.staging.muva.chat/api/health | jq
  ```
- [ ] **Database Sync**: Staging database has production-like data
- [ ] **Performance Check**: No performance degradation in staging
- [ ] **Migration Tested**: Migrations successfully applied in staging
  ```bash
  pnpm dlx tsx scripts/migration-status.ts --env=staging
  ```
- [ ] **Error Monitoring**: No critical errors in staging logs
  ```bash
  pnpm dlx tsx scripts/alert-on-failure.ts --env=staging
  ```
- [ ] **Backup Plan**: Rollback strategy identified
- [ ] **Team Notification**: Team notified of pending production deployment
- [ ] **Deployment Window**: Scheduled during low-traffic period (if possible)
- [ ] **On-Call Available**: Engineer available for 2 hours post-deployment

---

## Deployment Procedures

### Deploy to Staging (Automatic)

**Estimated Time:** 3-5 minutes

#### Step 1: Merge to Staging

```bash
# 1. Switch to staging branch
git checkout staging
git pull origin staging

# 2. Merge dev changes
git merge dev

# 3. Resolve conflicts if any
# (Use git mergetool or manual resolution)

# 4. Push to staging
git push origin staging
```

#### Step 2: Monitor GitHub Actions

```bash
# View workflow run
gh run watch

# Or visit GitHub Actions UI
open https://github.com/your-org/muva-chat/actions
```

**Workflow Steps:**
1. Checkout code
2. Setup Node.js + pnpm
3. Install dependencies
4. Build application
5. Apply database migrations
6. Deploy to VPS staging
7. Run health checks
8. Restart PM2 service

#### Step 3: Verify Deployment

See [Post-Deployment Checklist](#post-deployment-checklist)

---

### Deploy to Production (Manual Approval)

**Estimated Time:** 5-10 minutes

#### Step 1: Create Production Release Branch

```bash
# 1. Switch to main branch
git checkout main
git pull origin main

# 2. Create release branch
git checkout -b prod/v1.2.0  # Use semantic versioning

# 3. Merge staging
git merge staging

# 4. Update version (if applicable)
# Edit package.json version field

# 5. Push release branch
git push origin prod/v1.2.0
```

#### Step 2: Create Pull Request

```bash
# Create PR using GitHub CLI
gh pr create \
  --base main \
  --title "Production Release v1.2.0" \
  --body "$(cat <<'EOF'
## Release Summary
Brief description of what's being deployed.

## Changes Included
- Feature A
- Bug fix B
- Migration C

## Testing
- [x] Tested in dev environment
- [x] Tested in staging environment
- [x] Database migrations validated
- [x] Performance verified
- [x] Error monitoring clear

## Database Migrations
- [x] Migration files: 20251105120000_add_bookings.sql
- [x] Successfully applied in staging
- [x] Rollback plan identified

## Rollback Plan
If deployment fails:
1. Revert application code via rollback script
2. Restore database from backup if needed
3. Expected rollback time: < 5 minutes

## Post-Deployment Verification
- [ ] Health endpoints return 200
- [ ] Critical user flows tested
- [ ] No errors in production logs
- [ ] Database migrations applied
- [ ] Performance within acceptable range

## Approver Checklist
- [ ] Release notes reviewed
- [ ] Risks assessed
- [ ] Rollback plan clear
- [ ] Team notified
EOF
)"
```

#### Step 3: Request Approval

```bash
# Request review from team lead
gh pr review prod/v1.2.0 --request-review @lead-dev

# Add urgency label if needed
gh pr edit prod/v1.2.0 --add-label "production,release"
```

#### Step 4: Approval Process

**Reviewer Should Verify:**
- [ ] Staging deployment successful
- [ ] No critical issues reported in staging
- [ ] Migration plan is safe
- [ ] Rollback plan is clear
- [ ] Team is aware of deployment

**Approve via GitHub UI or CLI:**
```bash
gh pr review prod/v1.2.0 --approve --body "LGTM - Approved for production"
```

#### Step 5: Monitor Production Deployment

After PR is merged, GitHub Actions will:

1. **Wait for manual approval** (GitHub Environment "production")
2. **Create database backup**
   ```bash
   # Backup stored in GitHub Artifacts
   # Retention: 30 days
   ```
3. **Apply database migrations**
   ```bash
   # Migrations applied via scripts/apply-migrations-production.ts
   # Stop on first error
   ```
4. **Deploy to VPS production**
   ```bash
   # SSH to VPS
   # Pull latest code
   # Build application
   # Restart PM2
   ```
5. **Run health checks**
   ```bash
   # 5 comprehensive checks:
   # - API health endpoint
   # - Database connectivity
   # - Service dependencies
   # - Performance thresholds
   # - Critical table access
   ```
6. **Rollback on failure**
   ```bash
   # If health checks fail:
   # - Revert code to previous commit
   # - Rollback database migrations
   # - Restart with previous version
   ```

**Monitor Progress:**
```bash
# Watch workflow
gh run watch

# View logs
gh run view <run-id> --log

# Or visit GitHub Actions
open https://github.com/your-org/muva-chat/actions
```

#### Step 6: Verify Production

See [Post-Deployment Checklist](#post-deployment-checklist)

---

## Post-Deployment Checklist

### Automated Checks

These run automatically via GitHub Actions:

- [x] Application deployed to VPS
- [x] PM2 service restarted
- [x] Health endpoint returns 200
- [x] Database connectivity verified
- [x] Response time < 5 seconds

### Manual Verification (Staging)

After staging deployment:

```bash
# 1. Health endpoint
curl https://simmerdown.staging.muva.chat/api/health | jq
# Expected: {"status": "healthy", ...}

# 2. Database check
curl https://simmerdown.staging.muva.chat/api/health/db | jq
# Expected: {"status": "ok", "latency_ms": <50, ...}

# 3. Test critical user flows
# - Login as staff user
# - Create test booking
# - View accommodations list
# - Test chat functionality

# 4. Check for errors
pnpm dlx tsx scripts/alert-on-failure.ts --env=staging

# 5. Review deployment metrics
pnpm dlx tsx scripts/deployment-metrics.ts --report --env=staging --days=1
```

### Manual Verification (Production)

After production deployment:

```bash
# 1. Health endpoint
curl https://simmerdown.muva.chat/api/health | jq
# Expected: {"status": "healthy", ...}

# 2. Database check
curl https://simmerdown.muva.chat/api/health/db | jq
# Expected: {"status": "ok", "latency_ms": <100, ...}

# 3. Verify migrations applied
pnpm dlx tsx scripts/migration-status.ts --env=production

# 4. Test critical user flows
# - Login as real user (use test account)
# - Verify booking creation
# - Test payment flow (if applicable)
# - Verify chat works
# - Check WhatsApp integration (if applicable)

# 5. Monitor for errors (first 30 minutes)
pnpm dlx tsx scripts/alert-on-failure.ts --env=production

# 6. Check error logs
# SSH to VPS:
ssh vps
pm2 logs muva-production --lines 50

# 7. Monitor performance
pnpm dlx tsx scripts/monitoring-dashboard.ts --env=production --refresh=30

# 8. Record successful deployment
pnpm dlx tsx scripts/deployment-metrics.ts \
  --record \
  --env=production \
  --status=success \
  --duration=<seconds> \
  --commit=$(git rev-parse HEAD) \
  --branch=main
```

### Stakeholder Notification

After successful deployment:

- [ ] **Team Notification**: Post in Slack #muva-chat-production
  ```
  ✅ Production deployed successfully
  Version: v1.2.0
  Commit: abc1234
  Changes: [brief summary]
  Health: All checks passing
  ```
- [ ] **Update Release Notes**: Document changes in GitHub Release
- [ ] **Close Related Issues**: Mark Jira/GitHub issues as deployed

---

## Rollback Procedures

### When to Rollback

Initiate rollback if:

- 🔴 **Critical Bug**: Feature breaks core functionality
- 🔴 **Data Loss Risk**: Migration causes data integrity issues
- 🔴 **Performance**: Response time > 10x slower than baseline
- 🔴 **Errors**: Error rate > 5% of requests
- 🟡 **User Reports**: Multiple users report same issue

### Automatic Rollback (GitHub Actions)

If health checks fail during deployment, automatic rollback occurs:

1. Revert code to previous commit
2. Rollback migration records
3. Restart PM2 with previous version
4. Verify health checks pass

**No manual intervention needed** - workflow handles it automatically.

### Manual Rollback - Staging

If issues discovered after automatic checks pass:

```bash
# 1. SSH to staging VPS
ssh vps

# 2. Navigate to staging directory
cd /var/www/muva-chat-staging

# 3. Revert to previous commit
git log --oneline -5  # Find previous good commit
git reset --hard <previous-commit-sha>

# 4. Rebuild
pnpm install --frozen-lockfile
pnpm run build

# 5. Restart PM2
pm2 restart muva-staging

# 6. Verify health
curl http://localhost:3001/api/health | jq

# 7. Rollback migrations if needed
cd /path/to/muva-chat
pnpm dlx tsx scripts/rollback-migration-staging.ts --steps=1
```

### Manual Rollback - Production

**⚠️ CRITICAL: Follow these steps carefully**

```bash
# Option 1: Use rollback script (RECOMMENDED)
pnpm dlx tsx scripts/rollback-production.ts

# Option 2: Use rollback script with database restore
pnpm dlx tsx scripts/rollback-production.ts --restore-db

# Option 3: Manual rollback (if scripts fail)
# See detailed steps below
```

#### Manual Rollback Steps (Production)

```bash
# 1. SSH to production VPS
ssh vps

# 2. Navigate to production directory
cd /var/www/muva-chat

# 3. Find previous good commit
git log --oneline -10

# 4. Create rollback branch
git checkout -b rollback-$(date +%Y%m%d-%H%M%S)
git reset --hard <previous-good-commit>

# 5. Rebuild application
pnpm install --frozen-lockfile
pnpm run build

# 6. Restart PM2
pm2 restart muva-production

# 7. Verify health
curl http://localhost:3000/api/health | jq
```

#### Database Rollback (Production)

If migration caused issues:

```bash
# 1. Check available backups
gh run list --workflow="deploy-production.yml" --limit 5

# 2. Download latest backup
gh run download <run-id>

# 3. Restore database
# CAUTION: This will overwrite current database
pnpm dlx tsx scripts/restore-production-db.ts --backup=<backup-file>

# 4. Verify restoration
pnpm dlx tsx scripts/migration-status.ts --env=production
```

### Post-Rollback Actions

After rollback:

- [ ] **Verify System Health**: All checks passing
  ```bash
  pnpm dlx tsx scripts/monitoring-dashboard.ts --env=production
  ```
- [ ] **Notify Team**: Post in Slack
  ```
  ⚠️ Production rollback executed
  Reason: [brief description]
  Rolled back to: commit abc123
  Status: System stable
  ```
- [ ] **Document Incident**: Create post-mortem
- [ ] **Identify Root Cause**: Debug issue in dev/staging
- [ ] **Plan Fix**: Create remediation plan
- [ ] **Record Rollback**: Update deployment metrics
  ```bash
  pnpm dlx tsx scripts/deployment-metrics.ts \
    --record \
    --env=production \
    --status=rollback \
    --duration=<seconds> \
    --error="<reason>"
  ```

---

## Emergency Response

### Production Down

**Severity:** 🔴 CRITICAL
**Response Time:** Immediate

#### Diagnosis Steps

```bash
# 1. Check health endpoint
curl https://simmerdown.muva.chat/api/health
# If timeout or 500 error, service is down

# 2. Check VPS accessibility
ssh vps
# If can't connect, VPS issue

# 3. Check PM2 status (if VPS accessible)
pm2 status
# Look for stopped/errored processes

# 4. Check PM2 logs
pm2 logs muva-production --lines 100
# Look for error patterns

# 5. Check system resources
free -h  # Memory
df -h    # Disk space
top      # CPU usage
```

#### Resolution Steps

```bash
# Scenario A: PM2 process stopped
pm2 restart muva-production
pm2 logs muva-production --lines 20

# Scenario B: Application crashed
cd /var/www/muva-chat
pm2 stop muva-production
pnpm run build
pm2 start muva-production
pm2 logs muva-production --lines 20

# Scenario C: Out of memory
pm2 restart muva-production --max-memory-restart 1G
# Monitor: pm2 monit

# Scenario D: Database connectivity
# Check Supabase dashboard
# Verify environment variables
cat .env.production | grep SUPABASE

# Scenario E: Complete system failure
# Rollback to last known good state
pnpm dlx tsx scripts/rollback-production.ts
```

### Database Issues

**Severity:** 🔴 CRITICAL
**Response Time:** Immediate

#### Common Issues

**Issue: Migration Failed Mid-Execution**

```bash
# 1. Check migration status
pnpm dlx tsx scripts/migration-status.ts --env=production

# 2. Rollback migration
pnpm dlx tsx scripts/rollback-production.ts

# 3. Restore from backup if needed
# Download latest backup from GitHub Artifacts
gh run list --workflow="deploy-production.yml" --limit 1
gh run download <run-id>
# Restore: pnpm dlx tsx scripts/restore-production-db.ts --backup=<file>
```

**Issue: Database Unresponsive**

```bash
# 1. Check Supabase dashboard
open https://supabase.com/dashboard/project/ooaumjzaztmutltifhoq

# 2. Check database connectivity
curl https://ooaumjzaztmutltifhoq.supabase.co/rest/v1/

# 3. If Supabase issue, wait for resolution
# Check status: https://status.supabase.com/

# 4. If prolonged outage, consider:
# - Switching to backup database
# - Displaying maintenance page
```

### Hotfix Process

**Severity:** 🟡 HIGH PRIORITY
**Response Time:** < 1 hour

For critical bugs in production that can't wait for normal release cycle:

#### Step 1: Create Hotfix Branch

```bash
# 1. Branch from main (current production)
git checkout main
git pull origin main
git checkout -b hotfix/critical-bug-description

# 2. Make minimal fix
# Edit only the necessary files
# Avoid refactoring or cleanup

# 3. Test locally
./scripts/dev-with-keys.sh
# Verify fix works

# 4. Commit
git add .
git commit -m "hotfix: resolve critical bug"
git push origin hotfix/critical-bug-description
```

#### Step 2: Expedited Testing

```bash
# 1. Deploy to staging first (if time allows)
git checkout staging
git merge hotfix/critical-bug-description
git push origin staging

# 2. Verify in staging
curl https://simmerdown.staging.muva.chat/api/health | jq
# Test the specific bug fix

# 3. If urgent, skip staging (not recommended)
```

#### Step 3: Fast-Track to Production

```bash
# 1. Create PR to main
gh pr create \
  --base main \
  --head hotfix/critical-bug-description \
  --title "🔥 HOTFIX: Critical bug" \
  --label "urgent,hotfix"

# 2. Request expedited review
# Tag reviewer with @mention
# Notify via Slack

# 3. After approval, merge immediately

# 4. Monitor deployment closely
gh run watch
```

#### Step 4: Backport to Dev/Staging

```bash
# After production deployment successful:

# 1. Cherry-pick to staging
git checkout staging
git cherry-pick <hotfix-commit-sha>
git push origin staging

# 2. Cherry-pick to dev
git checkout dev
git cherry-pick <hotfix-commit-sha>
git push origin dev
```

---

## Monitoring & Verification

### Real-Time Monitoring

```bash
# Dashboard with auto-refresh (every 30 seconds)
pnpm dlx tsx scripts/monitoring-dashboard.ts --refresh=30

# Check specific environment
pnpm dlx tsx scripts/monitoring-dashboard.ts --env=production

# JSON output for integration
pnpm dlx tsx scripts/monitoring-dashboard.ts --json
```

### Error Detection

```bash
# Check for service failures
pnpm dlx tsx scripts/alert-on-failure.ts

# Check specific environment
pnpm dlx tsx scripts/alert-on-failure.ts --env=production

# Analyze error patterns
pnpm dlx tsx scripts/alert-on-failure.ts --check-errors-only
```

### Deployment Metrics

```bash
# View recent deployments
pnpm dlx tsx scripts/deployment-metrics.ts --report --days=7

# View production deployments
pnpm dlx tsx scripts/deployment-metrics.ts --report --env=production

# Generate chart
pnpm dlx tsx scripts/deployment-metrics.ts --chart
```

### Health Check Endpoints

```bash
# Production
curl https://simmerdown.muva.chat/api/health | jq

# Staging
curl https://simmerdown.staging.muva.chat/api/health | jq

# Check database specifically
curl https://simmerdown.muva.chat/api/health/db | jq
```

---

## Additional Resources

- [Developer Guide](./DEVELOPER_GUIDE.md) - Development workflow
- [Migration Guide](./MIGRATION_GUIDE.md) - Database migration management
- [Monitoring Guide](./MONITORING_GUIDE.md) - Detailed monitoring setup
- [Branch Protection Guide](./BRANCH_PROTECTION_GUIDE.md) - Git workflow rules

---

**Emergency Contacts:**

- **Tech Lead**: @lead-dev (Slack)
- **DevOps**: @devops-lead (Slack)
- **Database**: @db-admin (Slack)
- **On-Call**: See PagerDuty rotation

**Last Updated:** November 5, 2025
**Maintained by:** DevOps Team
