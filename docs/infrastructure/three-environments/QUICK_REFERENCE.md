# Quick Reference Card

**MUVA Chat - Three Environments CI/CD**
**Print this page for quick access to common commands**

---

## Environment URLs

| Environment | Application | Health Check |
|-------------|-------------|--------------|
| **Local Dev** | http://localhost:3000 | http://localhost:3000/api/health |
| **Staging** | https://simmerdown.staging.muva.chat | https://simmerdown.staging.muva.chat/api/health |
| **Production** | https://simmerdown.muva.chat | https://simmerdown.muva.chat/api/health |

---

## Daily Commands

### Development
```bash
# Start dev server
./scripts/dev-with-keys.sh

# Build application
pnpm run build

# Validate environment variables
pnpm dlx tsx scripts/validate-env-vars.ts --env=dev
```

### Git Workflow
```bash
# Deploy to staging
git checkout staging && git merge dev && git push origin staging

# Create production PR
gh pr create --base main --title "Production Release vX.X.X"

# Check git status
git status --short
```

### Database
```bash
# Create migration
pnpm dlx tsx scripts/create-migration.ts "migration_name"

# Check migration status
pnpm dlx tsx scripts/migration-status.ts --env=staging

# Detect schema drift
pnpm dlx tsx scripts/detect-schema-drift.ts --source=staging --target=production
```

### Monitoring
```bash
# Check all environments
pnpm dlx tsx scripts/monitoring-dashboard.ts

# Check for errors
pnpm dlx tsx scripts/alert-on-failure.ts

# View deployment metrics
pnpm dlx tsx scripts/deployment-metrics.ts --report
```

### Rollback (Emergency)
```bash
# Rollback production
pnpm dlx tsx scripts/rollback-production.ts

# Rollback with database restore
pnpm dlx tsx scripts/rollback-production.ts --restore-db
```

---

## Git Workflow Diagram

```
┌─────────┐      ┌──────────┐      ┌────────────┐
│   dev   │─────→│ staging  │─────→│    main    │
│ (Local) │ auto │ (Auto)   │ PR+✓ │ (Manual ✓) │
└─────────┘      └──────────┘      └────────────┘
     │                 │                   │
     ↓                 ↓                   ↓
  Validate         Deploy +          Deploy +
   Build          Migrations       Backup +
   Tests                          Migrations
```

---

## Deployment Checklist

### Before Staging Deploy
- [ ] Code builds locally
- [ ] Tests pass
- [ ] Migrations validated
- [ ] No sensitive data

### Before Production Deploy
- [ ] Tested in staging
- [ ] PR created and approved
- [ ] Team notified
- [ ] Rollback plan ready

---

## Troubleshooting Quick Fixes

### Build Fails
```bash
rm -rf node_modules pnpm-lock.yaml .next
pnpm install
pnpm run build
```

### Database Connection Error
```bash
# Verify Supabase connection
curl $NEXT_PUBLIC_SUPABASE_URL/rest/v1/

# Check environment variables
cat .env.local | grep SUPABASE
```

### Migration Failed
```bash
# Check status
pnpm dlx tsx scripts/migration-status.ts --env=staging

# Rollback if needed
pnpm dlx tsx scripts/rollback-migration-staging.ts --steps=1
```

### Production Down
```bash
# 1. Check health
curl https://simmerdown.muva.chat/api/health

# 2. SSH to VPS
ssh vps

# 3. Check PM2
pm2 status
pm2 logs muva-production --lines 50

# 4. Restart if needed
pm2 restart muva-production
```

---

## Emergency Contacts

| Issue | Contact | Response Time |
|-------|---------|---------------|
| **Production Down** | @lead-dev, @devops-lead | < 15 min |
| **Deployment Failed** | @devops-lead | < 30 min |
| **Database Issue** | @db-admin | < 1 hour |
| **Dev Question** | #muva-chat-dev (Slack) | Best effort |

---

## Key Scripts Location

All scripts in `/scripts/` directory:

**Most Used:**
- `monitoring-dashboard.ts` - System status
- `alert-on-failure.ts` - Error detection
- `create-migration.ts` - New migration
- `migration-status.ts` - Migration tracking
- `rollback-production.ts` - Emergency rollback

**Health Checks:**
- `health-check-staging.ts`
- `verify-production-health.ts`

**Database:**
- `apply-migrations-staging.ts`
- `apply-migrations-production.ts`
- `sync-prod-to-staging-ultimate.ts`
- `detect-schema-drift.ts`

---

## Supabase Project IDs (Three-Tier)

| Environment | Project ID | URL | Status |
|-------------|------------|-----|--------|
| **Dev** | rvjmwwvkhglcuqwcznph | https://rvjmwwvkhglcuqwcznph.supabase.co | ✅ Active |
| **Tst** | bddcvjoeoiekzfetvxoe | https://bddcvjoeoiekzfetvxoe.supabase.co | ✅ Active |
| **Prd** | kprqghwdnaykxhostivv | https://kprqghwdnaykxhostivv.supabase.co | ✅ Active |

**Legacy IDs (Pre-Nov 2025 Migration):**
- Old Staging: `hoaiwcueleiemeplrurv` → Migrated to Tst (bddcvjoeoiekzfetvxoe)
- Old Production: `ooaumjzaztmutltifhoq` → Migrated to Prd (kprqghwdnaykxhostivv)

---

## Documentation Quick Links

| Need | Read This | Time |
|------|-----------|------|
| **Daily development** | [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) | 30 min |
| **Deploy to production** | [DEPLOYMENT_PLAYBOOK.md](./DEPLOYMENT_PLAYBOOK.md) | 20 min |
| **New team member** | [PROJECT_HANDOVER.md](./PROJECT_HANDOVER.md) | 20 min |
| **Learn the system** | [TRAINING_MATERIALS.md](./TRAINING_MATERIALS.md) | 3-4 hours |
| **Database migrations** | [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) | 15 min |
| **Monitoring setup** | [MONITORING_GUIDE.md](./MONITORING_GUIDE.md) | 15 min |

---

## Common Errors & Solutions

| Error | Solution |
|-------|----------|
| **Port 3000 in use** | `lsof -i :3000` then `kill -9 <PID>` |
| **Supabase connection failed** | Check .env.local has correct SUPABASE_URL |
| **Build timeout** | Clear `.next` cache: `rm -rf .next` |
| **Migration conflict** | Check timestamp order with `migration-status.ts` |
| **GitHub Actions stuck** | Cancel workflow and retry |
| **PM2 not responding** | SSH to VPS and `pm2 restart all` |

---

## Useful Aliases (Optional)

Add to your `.bashrc` or `.zshrc`:

```bash
# MUVA Chat aliases
alias muva-dev='cd ~/Sites/apps/muva-chat && ./scripts/dev-with-keys.sh'
alias muva-build='cd ~/Sites/apps/muva-chat && pnpm run build'
alias muva-status='cd ~/Sites/apps/muva-chat && pnpm dlx tsx scripts/monitoring-dashboard.ts'
alias muva-alerts='cd ~/Sites/apps/muva-chat && pnpm dlx tsx scripts/alert-on-failure.ts'
alias muva-deploy-staging='git checkout staging && git merge dev && git push origin staging'
```

---

**Print Date:** November 16, 2025
**Version:** 2.0.0 (Three-Tier Migration)
**Keep this card handy for quick reference!**
