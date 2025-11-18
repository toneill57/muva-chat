# Training Materials - Three Environments

**MUVA Chat Platform**
**Last Updated:** November 5, 2025
**Estimated Time:** 3-4 hours total

---

## Table of Contents

1. [Learning Path](#learning-path)
2. [Training Exercises](#training-exercises)
3. [Assessment Checklist](#assessment-checklist)
4. [Additional Resources](#additional-resources)
5. [FAQ](#faq)

---

## Learning Path

### Recommended Order

Complete these in sequence for best learning experience:

```
1. Read Developer Guide (30 min) ──→ 2. Exercise 1: Setup (30 min)
                                            ↓
3. Read Migration Guide (20 min) ──→ 4. Exercise 2: Feature Deploy (45 min)
                                            ↓
5. Read Deployment Playbook (20 min) → 6. Exercise 3: Migration (30 min)
                                            ↓
7. Read Monitoring Guide (15 min) ──→ 8. Exercise 4: Rollback (20 min)
                                            ↓
9. Read Project Handover (20 min) ──→ 10. Exercise 5: Emergency (30 min)
                                            ↓
                              Assessment & Certification
```

**Total Time:** ~4 hours

### Prerequisites

Before starting:
- [ ] Git basics (commit, branch, merge)
- [ ] Command line familiarity
- [ ] Basic TypeScript/JavaScript knowledge
- [ ] Database concepts (tables, queries, migrations)
- [ ] Access to GitHub repository
- [ ] Supabase account access
- [ ] Local development environment setup

---

## Training Exercises

### Exercise 1: Setup & First Deploy

**Goal:** Get local environment running and understand the basic workflow

**Time:** 30 minutes

**Prerequisites:** None

#### Part A: Local Setup (15 min)

```bash
# 1. Clone repository
git clone https://github.com/your-org/muva-chat.git
cd muva-chat

# 2. Install dependencies
pnpm install

# 3. Setup environment variables
cp .env.template .env.local

# 4. Edit .env.local with your credentials
# Get these from team lead or Supabase dashboard:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
# - ANTHROPIC_API_KEY
# - OPENAI_API_KEY

# 5. Verify environment variables
pnpm dlx tsx scripts/validate-env-vars.ts --env=dev

# 6. Start development server
./scripts/dev-with-keys.sh
```

**Expected Result:**
- Server runs at `http://localhost:3000`
- Health endpoint returns 200: `curl http://localhost:3000/api/health`
- No errors in console

#### Part B: Verify Access (10 min)

```bash
# 1. Check Supabase connection
pnpm dlx tsx -e "
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const { data, error } = await supabase.from('tenant_registry').select('*').limit(1);
console.log('Connection:', error ? 'FAILED: ' + error.message : 'SUCCESS');
"

# 2. Check monitoring dashboard
pnpm dlx tsx scripts/monitoring-dashboard.ts

# 3. Check migration status
pnpm dlx tsx scripts/migration-status.ts --env=dev
```

**Expected Result:**
- Supabase connection successful
- Monitoring dashboard shows environment statuses
- Migration status displays correctly

#### Part C: Make Your First Change (5 min)

```bash
# 1. Create a test branch
git checkout dev
git checkout -b training/your-name-setup

# 2. Make a small change
echo "// Training exercise completed" >> README.md

# 3. Commit and push
git add README.md
git commit -m "docs: complete training exercise 1"
git push origin training/your-name-setup

# 4. Create PR to dev
gh pr create --base dev --title "Training: Exercise 1"

# 5. Observe GitHub Actions validation
gh run watch
```

**Expected Result:**
- PR created successfully
- GitHub Actions `validate-dev` workflow runs
- All checks pass

**Completion Criteria:**
- [ ] Local dev server running
- [ ] Environment variables configured
- [ ] Supabase connection verified
- [ ] First PR created and validated

---

### Exercise 2: Feature Development & Deployment

**Goal:** Develop a feature and deploy through all environments

**Time:** 45 minutes

**Prerequisites:** Exercise 1 completed

#### Part A: Create a Feature (20 min)

**Task:** Add a simple "System Info" API endpoint

```bash
# 1. Create feature branch
git checkout dev
git pull origin dev
git checkout -b feature/system-info-endpoint
```

**Create file:** `src/app/api/system-info/route.ts`

```typescript
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  const systemInfo = {
    service: 'MUVA Chat',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptime: process.uptime?.() || 'N/A',
  };

  return NextResponse.json(systemInfo);
}
```

```bash
# 2. Test locally
./scripts/dev-with-keys.sh
# In another terminal:
curl http://localhost:3000/api/system-info | jq

# 3. Verify response format is correct

# 4. Build to ensure no errors
pnpm run build

# 5. Commit
git add .
git commit -m "feat: add system info API endpoint"
git push origin feature/system-info-endpoint
```

#### Part B: Deploy to Staging (15 min)

```bash
# 1. Merge to dev
git checkout dev
git merge feature/system-info-endpoint
git push origin dev

# Wait for validate-dev workflow to pass

# 2. Deploy to staging
git checkout staging
git pull origin staging
git merge dev
git push origin staging

# 3. Monitor deployment
gh run watch

# 4. Verify in staging
curl https://simmerdown.staging.muva.chat/api/system-info | jq
```

**Expected Result:**
- Endpoint returns system info
- `"environment": "production"` (staging uses production build)

#### Part C: Deploy to Production (10 min)

```bash
# 1. Create production release branch
git checkout main
git pull origin main
git checkout -b prod/add-system-info

# 2. Merge staging
git merge staging

# 3. Create PR
gh pr create \
  --base main \
  --title "Production: Add system info endpoint" \
  --body "$(cat <<'EOF'
## Description
Adding system info API endpoint for monitoring purposes.

## Testing
- [x] Tested in dev
- [x] Tested in staging
- [x] No database changes
- [x] No breaking changes

## Verification
curl https://simmerdown.staging.muva.chat/api/system-info

## Rollback Plan
Simple revert if needed - no database impact.
EOF
)"

# 4. Request approval
# Ask team lead to approve PR

# 5. After merge, monitor deployment
gh run watch

# 6. Verify in production
curl https://simmerdown.muva.chat/api/system-info | jq
```

**Completion Criteria:**
- [ ] Feature works in local dev
- [ ] Deployed to staging successfully
- [ ] Deployed to production successfully
- [ ] Endpoint accessible in all environments

---

### Exercise 3: Database Migration

**Goal:** Create and deploy a database migration

**Time:** 30 minutes

**Prerequisites:** Exercise 2 completed

#### Part A: Create Migration (10 min)

```bash
# 1. Create migration file
pnpm dlx tsx scripts/create-migration.ts "training_exercise_table"

# 2. Edit the generated file in supabase/migrations/
```

**Add this content:**

```sql
-- Migration: Training Exercise Table
-- Purpose: Practice database migrations
-- Created: <timestamp>

-- UP Migration
BEGIN;

CREATE TABLE IF NOT EXISTS public.training_exercise_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_name TEXT NOT NULL,
  completed_by TEXT NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- Add RLS policies
ALTER TABLE public.training_exercise_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access"
  ON public.training_exercise_log FOR SELECT
  USING (true);

CREATE POLICY "Authenticated insert"
  ON public.training_exercise_log FOR INSERT
  WITH CHECK (true);

-- Add index
CREATE INDEX idx_training_exercise_completed
  ON public.training_exercise_log(completed_at DESC);

COMMIT;

-- DOWN Migration
-- BEGIN;
-- DROP TABLE IF EXISTS public.training_exercise_log CASCADE;
-- COMMIT;
```

```bash
# 3. Commit migration
git add supabase/migrations/
git commit -m "feat: add training exercise log table"
git push origin feature/system-info-endpoint
```

#### Part B: Test Migration Locally (5 min)

```bash
# Apply migration to dev database (if Supabase CLI configured)
pnpm dlx supabase db push --project-ref rvjmwwvkhglcuqwcznph

# Verify table exists
pnpm dlx tsx -e "
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const { data, error } = await supabase
  .from('training_exercise_log')
  .insert({ exercise_name: 'Exercise 3', completed_by: 'Your Name' });
console.log('Insert:', error ? 'FAILED' : 'SUCCESS');
"
```

#### Part C: Deploy Migration to Staging (10 min)

```bash
# 1. Merge to staging
git checkout staging
git merge dev
git push origin staging

# 2. Monitor deployment
gh run watch
# Look for "Apply migrations" step in workflow

# 3. Verify migration applied
pnpm dlx tsx scripts/migration-status.ts --env=staging

# 4. Test table in staging
curl https://simmerdown.staging.muva.chat/api/health | jq
```

#### Part D: Deploy to Production (5 min)

```bash
# 1. Create PR to main (following Exercise 2 pattern)
# 2. Get approval
# 3. Monitor deployment - note the backup step!
# 4. Verify migration applied
pnpm dlx tsx scripts/migration-status.ts --env=production
```

**Completion Criteria:**
- [ ] Migration file created with UP and DOWN sections
- [ ] Migration applied to dev successfully
- [ ] Migration applied to staging via GitHub Actions
- [ ] Migration applied to production via GitHub Actions
- [ ] Table accessible in all environments

---

### Exercise 4: Rollback Simulation

**Goal:** Practice rollback procedures

**Time:** 20 minutes

**Prerequisites:** Exercise 3 completed

#### Part A: Staging Rollback (10 min)

**Scenario:** You deployed a change that breaks staging

```bash
# 1. Intentionally break staging (for practice)
git checkout staging
git checkout -b break-staging

# Create a broken file
cat > src/app/api/broken/route.ts <<'EOF'
import { NextResponse } from 'next/server';

export async function GET() {
  // This will cause a build error
  return new InvalidClass();
}
EOF

git add .
git commit -m "test: intentional break for rollback practice"
git push origin break-staging

# 2. Merge to staging (this will fail during build)
git checkout staging
git merge break-staging
git push origin staging

# 3. Observe GitHub Actions failure
gh run watch
# Deployment should fail at "Build" step

# 4. Rollback to previous commit
git revert HEAD
git push origin staging

# 5. Verify rollback successful
gh run watch
curl https://simmerdown.staging.muva.chat/api/health | jq
```

#### Part B: Production Rollback Practice (10 min)

**Don't actually run this in production! Just understand the steps:**

```bash
# IF production deployment failed, you would:

# Option 1: Use rollback script (recommended)
pnpm dlx tsx scripts/rollback-production.ts

# Option 2: Manual rollback
ssh vps
cd /var/www/muva-chat
git log --oneline -5  # Find previous good commit
git reset --hard <previous-commit>
pnpm install --frozen-lockfile
pnpm run build
pm2 restart muva-production

# Option 3: Database rollback (if migration failed)
pnpm dlx tsx scripts/rollback-production.ts --restore-db
```

**Study these scenarios:**

1. **Application code rollback** - Revert Git commit
2. **Migration rollback** - Remove from schema_migrations
3. **Full rollback** - Revert code + restore database backup

**Completion Criteria:**
- [ ] Successfully broke staging deployment
- [ ] Successfully rolled back staging
- [ ] Understand production rollback procedures
- [ ] Know when to use each rollback method

---

### Exercise 5: Emergency Response

**Goal:** Handle a production incident simulation

**Time:** 30 minutes

**Prerequisites:** All previous exercises completed

#### Scenario: Production Health Check Failing

**Alerts received:**
- Slack: "Production service DEGRADED"
- Monitoring dashboard shows 🟡 for production

#### Part A: Diagnosis (10 min)

```bash
# 1. Check health endpoint
curl https://simmerdown.muva.chat/api/health | jq
# Note the response - what's degraded?

# 2. Run monitoring dashboard
pnpm dlx tsx scripts/monitoring-dashboard.ts --env=production

# 3. Check for errors
pnpm dlx tsx scripts/alert-on-failure.ts --env=production

# 4. Check deployment history
pnpm dlx tsx scripts/deployment-metrics.ts --report --env=production --days=1

# 5. Check migration status
pnpm dlx tsx scripts/migration-status.ts --env=production
```

**Document your findings:**
- What service is degraded?
- What's the error message?
- When did it start?
- Was there a recent deployment?

#### Part B: Resolution (15 min)

**Based on your diagnosis, choose appropriate action:**

**Scenario 1: Database Connection Issue**

```bash
# 1. Verify Supabase is up
curl https://iyeueszchbvlutlcmvcb.supabase.co/rest/v1/

# 2. Check environment variables (on VPS)
ssh vps
cat /var/www/muva-chat/.env.production | grep SUPABASE

# 3. Restart PM2 if env vars are correct
pm2 restart muva-production
pm2 logs muva-production --lines 20
```

**Scenario 2: Recent Deployment Caused Issue**

```bash
# 1. Rollback to previous version
pnpm dlx tsx scripts/rollback-production.ts

# 2. Verify health restored
curl https://simmerdown.muva.chat/api/health | jq

# 3. Investigate issue in staging
# Fix bug
# Redeploy
```

**Scenario 3: Migration Failed Partially**

```bash
# 1. Check migration status
pnpm dlx tsx scripts/migration-status.ts --env=production

# 2. Rollback migration and restore DB
pnpm dlx tsx scripts/rollback-production.ts --restore-db

# 3. Fix migration file
# 4. Test in dev/staging
# 5. Redeploy to production
```

#### Part C: Post-Incident (5 min)

```bash
# 1. Verify system fully recovered
pnpm dlx tsx scripts/monitoring-dashboard.ts --env=production
# All checks should be 🟢

# 2. Record incident
pnpm dlx tsx scripts/deployment-metrics.ts \
  --record \
  --env=production \
  --status=rollback \
  --duration=<minutes-to-resolve> \
  --error="<brief-description>"

# 3. Notify team
# Post in Slack #muva-chat-production:
# "Incident resolved. Root cause: [X]. Resolution: [Y]. Duration: [Z] min."

# 4. Create post-mortem (in docs/incidents/)
```

**Post-Mortem Template:**

```markdown
# Incident Report - [Date]

## Summary
Brief description of what happened.

## Timeline
- HH:MM - Alert received
- HH:MM - Diagnosis started
- HH:MM - Root cause identified
- HH:MM - Resolution applied
- HH:MM - System verified healthy

## Root Cause
Detailed explanation of what caused the issue.

## Resolution
What actions were taken to resolve.

## Preventive Measures
- [ ] Add test to prevent recurrence
- [ ] Update documentation
- [ ] Improve monitoring
- [ ] Add alerts

## Lessons Learned
What we learned from this incident.
```

**Completion Criteria:**
- [ ] Successfully diagnosed simulated issue
- [ ] Applied appropriate resolution
- [ ] Verified system recovered
- [ ] Documented incident
- [ ] Identified preventive measures

---

## Assessment Checklist

### Knowledge Assessment

After completing all exercises, you should be able to:

#### Git & Workflow
- [ ] Explain the three environments (dev, staging, production)
- [ ] Create a feature branch
- [ ] Merge changes through environments correctly
- [ ] Create a production PR with proper documentation
- [ ] Understand branch protection rules

#### Development
- [ ] Setup local development environment
- [ ] Validate environment variables
- [ ] Build application successfully
- [ ] Test changes locally
- [ ] Use monitoring dashboard

#### Database
- [ ] Create a database migration
- [ ] Understand UP and DOWN migrations
- [ ] Check migration status across environments
- [ ] Detect schema drift
- [ ] Apply migrations safely

#### Deployment
- [ ] Deploy to staging via GitHub Actions
- [ ] Create production deployment PR
- [ ] Understand approval workflow
- [ ] Monitor deployment progress
- [ ] Verify deployment success

#### Troubleshooting
- [ ] Diagnose common issues
- [ ] Check health endpoints
- [ ] Review error logs
- [ ] Use monitoring tools
- [ ] Execute rollback procedures

#### Emergency Response
- [ ] Identify severity levels
- [ ] Follow incident response process
- [ ] Execute appropriate resolution
- [ ] Document incidents
- [ ] Communicate with team

### Practical Skills Test

**Task:** Complete this end-to-end workflow without guidance

1. Create a new API endpoint `/api/training-complete`
2. Add a database migration for a `training_completions` table
3. Test locally
4. Deploy to staging
5. Verify in staging
6. Create production PR
7. (Simulated) Get approval and deploy to production
8. Verify in production
9. Record deployment metrics

**Time Limit:** 45 minutes

**Evaluation Criteria:**
- Correct workflow followed
- No errors in deployment
- Proper commit messages
- Complete PR documentation
- Successful verification

---

## Additional Resources

### Documentation

**Internal Documentation:**
- [Developer Guide](./DEVELOPER_GUIDE.md)
- [Deployment Playbook](./DEPLOYMENT_PLAYBOOK.md)
- [Migration Guide](./MIGRATION_GUIDE.md)
- [Monitoring Guide](./MONITORING_GUIDE.md)
- [Project Handover](./PROJECT_HANDOVER.md)

**External Resources:**
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [pnpm Documentation](https://pnpm.io/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

### Video Tutorials

**Planned (Not Yet Created):**

1. **Setup & First Deploy (15 min)**
   - Local environment setup
   - First commit and deploy
   - Using monitoring tools

2. **Database Migrations (20 min)**
   - Creating migrations
   - Testing safely
   - Deploying through environments

3. **Production Deployment (15 min)**
   - Creating production PR
   - Approval process
   - Post-deployment verification

4. **Troubleshooting & Rollback (20 min)**
   - Common issues and solutions
   - Rollback procedures
   - Emergency response

**To create these videos:**
- Record screen with narration
- Upload to YouTube (unlisted)
- Add links to this document

### Cheat Sheets

#### Quick Commands

```bash
# Development
./scripts/dev-with-keys.sh                    # Start dev server
pnpm run build                                # Build application
pnpm dlx tsx scripts/validate-env-vars.ts     # Validate env vars

# Monitoring
pnpm dlx tsx scripts/monitoring-dashboard.ts  # Check all environments
pnpm dlx tsx scripts/alert-on-failure.ts      # Check for errors

# Database
pnpm dlx tsx scripts/create-migration.ts "name"           # Create migration
pnpm dlx tsx scripts/migration-status.ts --env=staging    # Check status
pnpm dlx tsx scripts/detect-schema-drift.ts --source=staging --target=production

# Deployment
git checkout staging && git merge dev && git push origin staging  # Deploy staging
gh pr create --base main --title "Production Deploy"             # Deploy prod

# Rollback
pnpm dlx tsx scripts/rollback-production.ts                       # Rollback app
pnpm dlx tsx scripts/rollback-production.ts --restore-db          # Rollback + DB
```

#### Environment URLs

| Environment | Application URL | Health Check |
|-------------|----------------|--------------|
| Local | http://localhost:3000 | http://localhost:3000/api/health |
| Staging | https://simmerdown.staging.muva.chat | https://simmerdown.staging.muva.chat/api/health |
| Production | https://simmerdown.muva.chat | https://simmerdown.muva.chat/api/health |

#### Git Workflow

```bash
# Feature development
dev → feature/name → dev → staging → main

# Hotfix
main → hotfix/name → main → staging → dev
```

---

## FAQ

### General

**Q: How long does training take?**
A: Approximately 3-4 hours total, can be spread over 2-3 days.

**Q: Do I need prior DevOps experience?**
A: No, but basic Git and command line knowledge is helpful.

**Q: Can I repeat exercises?**
A: Yes! Practice makes perfect. Use training branches.

### Technical

**Q: What if I break something during training?**
A: Training exercises are designed to be safe. Use feature branches and avoid touching production.

**Q: How do I get API keys for local development?**
A: Ask your team lead. They're stored in 1Password/LastPass.

**Q: What if GitHub Actions fail during my exercise?**
A: This is part of learning! Check the error logs, fix the issue, and redeploy.

### Workflow

**Q: Can I push directly to staging?**
A: No, staging should always come from merging dev. This ensures consistency.

**Q: When should I create a PR vs direct merge?**
A: Always PR for production. Dev and staging can be direct merge if you're confident.

**Q: How long do I wait for approval on production PRs?**
A: Typical response time is < 24 hours. For urgent fixes, tag reviewer in Slack.

### Troubleshooting

**Q: My local dev server won't start, what do I do?**
A: Check the [Developer Guide - Troubleshooting](./DEVELOPER_GUIDE.md#troubleshooting) section.

**Q: Migration failed in staging, should I panic?**
A: No! Check logs, understand the error, and use rollback scripts if needed. Staging is for catching these issues.

**Q: Production is down, what's the first step?**
A: Check health endpoint, notify team in Slack, and follow the [Emergency Response](./DEPLOYMENT_PLAYBOOK.md#emergency-response) guide.

---

## Certification

**After completing all exercises and passing the assessment:**

**I, [Your Name], have successfully completed the MUVA Chat Three Environments training.**

**Date:** _______________

**Supervisor:** _______________

**Signature:** _______________

**You are now authorized to:**
- [x] Develop features in dev environment
- [x] Deploy to staging environment
- [x] Review and approve staging PRs
- [x] Create production deployment PRs
- [ ] Approve production deployments (requires 6 months experience)
- [ ] Execute emergency rollbacks (requires 3 months experience)

---

**Training Version:** 1.0.0
**Last Updated:** November 5, 2025
**Next Review:** February 2026
