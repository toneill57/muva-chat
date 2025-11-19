# PostgreSQL Version Upgrade Guide

**Last Updated:** October 6, 2025
**Current Version:** `supabase-postgres-17.4.1.075`
**Status:** Security patches available
**Priority:** ⚠️ HIGH - Upgrade recommended this week

---

## ⚠️ Why Upgrade?

Supabase has released security patches for known PostgreSQL vulnerabilities. Running an outdated version exposes the database to:

- **Security exploits** - Known CVEs patched in newer versions
- **Compliance issues** - SOC2, ISO 27001 require timely security updates
- **Performance degradation** - Bug fixes and optimizations in newer releases
- **Support limitations** - Older versions may lose official support

**Recommendation:** Upgrade within 7 days of patch release.

---

## 📋 Pre-Upgrade Checklist

### 1. Create Database Backup

**Option A: Supabase Dashboard (RECOMMENDED)**

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select project: `iyeueszchbvlutlcmvcb`
3. Navigate to **Database** → **Backups**
4. Click **"Create Manual Backup"**
5. Name: `pre-postgres-upgrade-2025-10-06`
6. Wait for completion (~2-5 minutes)

**Option B: CLI Backup**

```bash
# Export full database schema + data
pg_dump \
  --host=db.iyeueszchbvlutlcmvcb.supabase.co \
  --port=5432 \
  --username=postgres \
  --format=custom \
  --file=innpilot-backup-2025-10-06.dump \
  --verbose

# Verify backup file created
ls -lh innpilot-backup-2025-10-06.dump
```

**Expected Output:**
```
-rw-r--r--  1 user  staff   45M Oct  6 10:00 innpilot-backup-2025-10-06.dump
```

### 2. Run Pre-Upgrade Tests

```bash
# Unit tests
pnpm test

# E2E tests (critical paths)
ppnpm run test:e2e -- guest-login.spec.ts
ppnpm run test:e2e -- guest-chat-messaging.spec.ts
ppnpm run test:e2e -- staff-chat.spec.ts

# Type check
pnpm run type-check

# Build (ensure no errors)
pnpm run build
```

**All tests must pass** ✅ before proceeding.

### 3. Check Current Version

```bash
# Via Supabase MCP tool
supabase db version

# Or via SQL query
SELECT version();
```

**Expected Output:**
```
PostgreSQL 17.4.1 on x86_64-pc-linux-gnu, compiled by gcc (Ubuntu 11.4.0-1ubuntu1~22.04) 11.4.0, 64-bit
(Supabase build: supabase-postgres-17.4.1.075)
```

### 4. Review Migration History

```bash
# List all applied migrations
supabase migration list

# Verify latest migration applied
supabase migration show
```

**Ensure all local migrations are applied** before upgrading.

### 5. Schedule Maintenance Window

**Recommended:**
- **Duration:** 30 minutes
- **Time:** Low-traffic period (e.g., 2am-3am local time)
- **Day:** Weekday (avoid weekends for faster support response)

**Notify stakeholders:**
- Staff team
- Active guests (if any critical bookings)
- Development team

---

## 🚀 Upgrade Procedure

### Method 1: Supabase Dashboard (EASIEST)

**Step 1: Navigate to Upgrade Page**

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select project: `iyeueszchbvlutlcmvcb`
3. Navigate to **Project Settings** → **Infrastructure**
4. Scroll to **Database Version** section

**Step 2: Initiate Upgrade**

1. Click **"Upgrade to Latest Version"** button
2. Review upgrade details:
   - Current version: `17.4.1.075`
   - Target version: `17.x.x.xxx` (latest)
   - Estimated downtime: 5-10 minutes
3. Confirm upgrade

**Step 3: Monitor Progress**

- Dashboard will show progress bar
- Database will be briefly unavailable (5-10 min)
- Health checks will run automatically

**Step 4: Verify Completion**

Once dashboard shows "Upgrade Complete":

```bash
# Check new version
SELECT version();

# Expected: PostgreSQL 17.x.x (newer build number)
```

### Method 2: Supabase CLI

**Step 1: Install/Update CLI**

```bash
# Install Supabase CLI (if not installed)
pnpm add -g supabase

# Or update to latest
pnpm update -g supabase

# Verify version
supabase --version
```

**Step 2: Link to Project**

```bash
# Link to production project
supabase link --project-ref iyeueszchbvlutlcmvcb

# Verify link
supabase projects list
```

**Step 3: Execute Upgrade**

```bash
# Upgrade Postgres to latest version
supabase db upgrade

# Follow prompts:
# - Confirm project: iyeueszchbvlutlcmvcb
# - Confirm upgrade: Yes
# - Wait for completion
```

**Expected Output:**
```
✅ Postgres upgrade initiated
⏳ Upgrading database (this may take 5-10 minutes)...
✅ Upgrade complete!
New version: PostgreSQL 17.x.x
```

---

## ✅ Post-Upgrade Verification

### 1. Check Database Health

**Via Supabase Dashboard:**

1. Go to **Database** → **Database Health**
2. Verify all metrics are green:
   - ✅ CPU usage: <50%
   - ✅ Memory usage: <80%
   - ✅ Active connections: <100
   - ✅ Disk usage: <80%

**Via MCP Tool:**

```typescript
// Run health check endpoint
const response = await fetch('https://muva.chat/api/health')
const data = await response.json()

console.log('Status:', data.status)
console.log('Supabase:', data.services.supabase.status)
```

**Expected:**
```json
{
  "status": "healthy",
  "services": {
    "supabase": {
      "status": "healthy",
      "responseTime": "42ms"
    }
  }
}
```

### 2. Verify Postgres Version

```bash
# Check version via SQL
supabase db execute --sql "SELECT version();"

# Or via psql
psql -h db.iyeueszchbvlutlcmvcb.supabase.co -U postgres -c "SELECT version();"
```

**Expected:** Version number > `17.4.1.075`

### 3. Run Security Advisors

```bash
# Check for any new security issues
supabase db advisors --type security

# Expected: No critical issues
```

### 4. Test Critical Functionality

```bash
# Run full test suite
ppnpm run test:e2e

# Test specific critical paths:
# 1. Guest login + chat
# 2. Staff login + chat
# 3. Vector search (embeddings)
# 4. File upload (if implemented)
```

**All tests must pass** ✅

### 5. Monitor Logs (24 hours)

```bash
# Monitor Postgres logs for errors
supabase logs postgres --level error --tail 100

# Monitor API logs
supabase logs api --tail 100

# Monitor Edge Function logs (if any)
supabase logs edge --tail 100
```

**Expected:** No errors related to Postgres upgrade

### 6. Performance Comparison

Run these queries before and after upgrade to compare:

```sql
-- Average query time
SELECT
  mean_exec_time,
  calls,
  query
FROM pg_stat_statements
WHERE query LIKE '%match_%'
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Vector search performance
SELECT
  COUNT(*) as total_searches,
  AVG(execution_time_ms) as avg_time_ms
FROM vector_search_logs
WHERE created_at > NOW() - INTERVAL '1 hour';
```

**Expected:** Similar or better performance

---

## 🔄 Rollback Procedure (Emergency Only)

**⚠️ Only use if upgrade causes critical failures**

### Method 1: Restore from Backup (SAFEST)

**Via Supabase Dashboard:**

1. Go to **Database** → **Backups**
2. Find backup: `pre-postgres-upgrade-2025-10-06`
3. Click **"Restore"**
4. Confirm restoration (⚠️ this will overwrite current data)
5. Wait for completion (~10-15 minutes)

**Via CLI:**

```bash
# Restore from local backup
pg_restore \
  --host=db.iyeueszchbvlutlcmvcb.supabase.co \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  --verbose \
  innpilot-backup-2025-10-06.dump
```

### Method 2: Contact Supabase Support

If restore fails:

1. Go to [Supabase Support](https://supabase.com/dashboard/support)
2. Create ticket: **"Postgres upgrade rollback request"**
3. Include:
   - Project ID: `iyeueszchbvlutlcmvcb`
   - Upgrade date/time
   - Error details
   - Request rollback to `17.4.1.075`

**Response time:** Usually <2 hours for critical issues

---

## 📊 Upgrade Timeline

| Phase | Duration | Activity |
|-------|----------|----------|
| **Preparation** | 30 min | Backup, pre-tests, review |
| **Maintenance Window** | 10 min | Actual upgrade execution |
| **Verification** | 20 min | Post-tests, health checks |
| **Monitoring** | 24 hours | Log monitoring, performance |
| **Total** | ~1 hour + monitoring | |

---

## 🔗 References

**Official Documentation:**
- [Supabase Postgres Upgrade Guide](https://supabase.com/docs/guides/platform/upgrading)
- [PostgreSQL Release Notes](https://www.postgresql.org/docs/release/)
- [Supabase Platform Status](https://status.supabase.com/)

**MUVA Internal:**
- [Database Architecture](/docs/backend/MULTI_TENANT_ARCHITECTURE.md)
- [Health Check Endpoint](/src/app/api/health/route.ts)
- [Deployment Workflow](/docs/deployment/DEPLOYMENT_WORKFLOW.md)

**Support:**
- Supabase Discord: https://discord.supabase.com
- Supabase Support: https://supabase.com/dashboard/support

---

## ✅ Post-Upgrade Checklist

After successful upgrade, update these files:

- [ ] Update `SNAPSHOT.md` - Remove "Postgres version with patches available" warning
- [ ] Update `README.md` - Update Postgres version in tech stack
- [ ] Commit changes: `git commit -m "chore: upgrade Postgres to vX.X.X"`
- [ ] Deploy to VPS (if any config changes)
- [ ] Notify team of successful upgrade

---

**Next Review:** 3 months from upgrade date
**Responsible:** Database Administrator / DevOps
