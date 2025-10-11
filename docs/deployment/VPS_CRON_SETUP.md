# VPS Cron Jobs Setup Guide

Complete guide for setting up automated cron jobs on VPS for MUVA.

---

## Overview

MUVA uses **VPS crontab** (NOT Vercel Cron) for scheduled tasks:

- **Conversation Archiving**: Daily at 2am (Colombia timezone)
  - Archives conversations inactive for 30+ days
  - Deletes archived conversations after 90+ days

---

## Prerequisites

1. SSH access to VPS (root or sudo privileges)
2. MUVA deployed on VPS (see `VPS_SETUP_GUIDE.md`)
3. PM2 running with MUVA process
4. `CRON_SECRET` environment variable configured

---

## Installation

### Step 1: Generate CRON_SECRET

On your VPS, generate a secure random secret:

```bash
openssl rand -base64 32
```

**Example output:**
```
K8mJ9nL2pQ5rT7vW1xY3zA6bC8dE0fG2hI4jK6mN8oP=
```

Save this secret for Step 2.

---

### Step 2: Configure Environment Variables

Add to `/var/www/innpilot/.env.local`:

```bash
# Cron Job Authentication
CRON_SECRET="K8mJ9nL2pQ5rT7vW1xY3zA6bC8dE0fG2hI4jK6mN8oP="
```

Reload PM2 to apply new environment variables:

```bash
cd /var/www/innpilot
pm2 reload innpilot --update-env
```

Verify PM2 loaded the variable:

```bash
pm2 env innpilot | grep CRON_SECRET
```

---

### Step 3: Run Setup Script

SSH to VPS:

```bash
ssh root@muva.chat
cd /var/www/innpilot
```

Export `CRON_SECRET` and run setup:

```bash
export CRON_SECRET="K8mJ9nL2pQ5rT7vW1xY3zA6bC8dE0fG2hI4jK6mN8oP="
bash scripts/cron/setup-archive-cron.sh
```

**Expected output:**

```
🚀 Setting up conversation archiving cron job...

➕ Adding new cron job...
✅ Cron job configured successfully!

📋 Configuration:
   Schedule: Daily at 2am (Colombia timezone)
   Endpoint: https://muva.chat/api/cron/archive-conversations
   Log file: /var/log/innpilot/cron-archive.log

🔍 Verify installation:
   crontab -l | grep archive-conversations

📊 Monitor logs:
   tail -f /var/log/innpilot/cron-archive.log

🧪 Test manually:
   curl -H 'Authorization: Bearer $CRON_SECRET' https://muva.chat/api/cron/archive-conversations
```

---

### Step 4: Verify Installation

Check cron is installed:

```bash
crontab -l | grep archive-conversations
```

**Expected output:**

```
0 2 * * * curl -s -H 'Authorization: Bearer K8mJ9nL2pQ5rT7vW1xY3zA6bC8dE0fG2hI4jK6mN8oP=' https://muva.chat/api/cron/archive-conversations >> /var/log/innpilot/cron-archive.log 2>&1
```

---

## Testing

### Manual Trigger (Test Immediately)

Test the cron endpoint without waiting for scheduled time:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://muva.chat/api/cron/archive-conversations
```

**Expected response:**

```json
{
  "success": true,
  "archived": 2,
  "deleted": 0,
  "timestamp": "2025-10-05T14:30:00.000Z"
}
```

**Response fields:**
- `archived`: Number of conversations archived (30+ days inactive)
- `deleted`: Number of conversations deleted (90+ days archived)
- `timestamp`: Execution timestamp

---

### Monitor Logs

View cron execution logs in real-time:

```bash
tail -f /var/log/innpilot/cron-archive.log
```

View last 50 lines:

```bash
tail -n 50 /var/log/innpilot/cron-archive.log
```

**Example log output:**

```json
{"success":true,"archived":5,"deleted":1,"timestamp":"2025-10-05T06:00:01.234Z"}
{"success":true,"archived":0,"deleted":0,"timestamp":"2025-10-06T06:00:02.456Z"}
```

---

## Troubleshooting

### 1. Cron Not Executing

**Symptom:** No entries in log file after 2am

**Solutions:**

1. **Verify cron service is running:**
   ```bash
   systemctl status cron
   ```

   If not running:
   ```bash
   sudo systemctl start cron
   sudo systemctl enable cron
   ```

2. **Check VPS timezone:**
   ```bash
   timedatectl
   ```

   Should show: `America/Bogota` or equivalent Colombia timezone.

   If incorrect:
   ```bash
   sudo timedatectl set-timezone America/Bogota
   ```

3. **Verify crontab entry:**
   ```bash
   crontab -l
   ```

   Should contain line with `archive-conversations`.

---

### 2. 401 Unauthorized Error

**Symptom:** Log shows `{"error":"Unauthorized"}`

**Solutions:**

1. **Verify `CRON_SECRET` in `.env.local`:**
   ```bash
   grep CRON_SECRET /var/www/innpilot/.env.local
   ```

2. **Ensure PM2 loaded new environment variables:**
   ```bash
   cd /var/www/innpilot
   pm2 restart innpilot --update-env
   pm2 env innpilot | grep CRON_SECRET
   ```

3. **Test endpoint manually:**
   ```bash
   export CRON_SECRET="<value_from_env>"
   curl -H "Authorization: Bearer $CRON_SECRET" \
     https://muva.chat/api/cron/archive-conversations
   ```

---

### 3. Log File Permission Denied

**Symptom:** Cron can't write to log file

**Solution:**

```bash
sudo mkdir -p /var/log/innpilot
sudo touch /var/log/innpilot/cron-archive.log
sudo chmod 666 /var/log/innpilot/cron-archive.log
```

Verify permissions:

```bash
ls -la /var/log/innpilot/cron-archive.log
```

Expected: `-rw-rw-rw-`

---

### 4. Database Connection Error

**Symptom:** Cron logs show Supabase connection errors

**Solution:**

1. **Verify Supabase environment variables:**
   ```bash
   cd /var/www/innpilot
   pm2 env innpilot | grep SUPABASE
   ```

   Should show:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

2. **Restart PM2:**
   ```bash
   pm2 restart innpilot
   ```

3. **Check PM2 logs:**
   ```bash
   pm2 logs innpilot --lines 50
   ```

---

### 5. Cron Runs But No Conversations Archived

**Symptom:** `{"success":true,"archived":0,"deleted":0}`

**Explanation:** This is normal if:
- No conversations are 30+ days inactive
- No archived conversations are 90+ days old

**Verify with database query:**

```sql
-- Check conversations eligible for archiving (30+ days inactive)
SELECT id, title, last_activity_at, is_archived
FROM guest_conversations
WHERE is_archived = false
  AND last_activity_at < NOW() - INTERVAL '30 days'
LIMIT 10;

-- Check conversations eligible for deletion (90+ days archived)
SELECT id, title, archived_at
FROM guest_conversations
WHERE is_archived = true
  AND archived_at < NOW() - INTERVAL '90 days'
LIMIT 10;
```

---

### 6. Curl Command Not Found

**Symptom:** Cron log shows `/bin/sh: curl: command not found`

**Solution:**

Install curl:

```bash
sudo apt update
sudo apt install curl -y
```

Verify installation:

```bash
which curl
```

Expected: `/usr/bin/curl`

---

## Maintenance

### Update Cron Schedule

To change the schedule (e.g., run at 3am instead of 2am):

1. Edit setup script:
   ```bash
   nano scripts/cron/setup-archive-cron.sh
   ```

2. Modify `CRON_SCHEDULE` variable:
   ```bash
   CRON_SCHEDULE="0 3 * * *"  # Daily at 3am
   ```

3. Re-run setup script:
   ```bash
   export CRON_SECRET="<your-secret>"
   bash scripts/cron/setup-archive-cron.sh
   ```

---

### Remove Cron Job

To completely remove the cron job:

```bash
crontab -l | grep -v "archive-conversations" | crontab -
```

Verify removal:

```bash
crontab -l
```

---

### Rotate Logs (Recommended)

Add log rotation to prevent large log files.

Create `/etc/logrotate.d/innpilot`:

```bash
sudo nano /etc/logrotate.d/innpilot
```

Add content:

```
/var/log/innpilot/*.log {
  daily
  rotate 30
  compress
  missingok
  notifempty
  create 0666 root root
}
```

Test log rotation:

```bash
sudo logrotate -f /etc/logrotate.d/innpilot
```

Verify rotation worked:

```bash
ls -la /var/log/innpilot/
```

---

## Security Notes

### CRON_SECRET Best Practices

1. **Length:** At least 32 characters
2. **Randomness:** Generated with `openssl rand` (NOT manually typed)
3. **Storage:** Only in VPS `.env.local` (NEVER commit to git)
4. **Rotation:** Rotate every 90 days

**Generate new secret:**

```bash
openssl rand -base64 32
```

**Update `.env.local`:**

```bash
nano /var/www/innpilot/.env.local
# Update CRON_SECRET value
```

**Reload PM2:**

```bash
pm2 reload innpilot --update-env
```

**Re-run cron setup:**

```bash
export CRON_SECRET="<new-secret>"
bash scripts/cron/setup-archive-cron.sh
```

---

### Log File Security

Log files may contain sensitive data. Restrict access:

```bash
sudo chmod 600 /var/log/innpilot/cron-archive.log
```

Only root can read/write: `-rw-------`

---

### Endpoint Authentication

The `/api/cron/archive-conversations` endpoint:

- **Requires:** `Authorization: Bearer <CRON_SECRET>` header
- **Returns 401** for invalid/missing tokens
- **No public access:** Only callable via cron or manual testing

---

## Performance & Monitoring

### Expected Performance

| Operation | Time (avg) | Database Impact |
|-----------|------------|-----------------|
| Archive 10 conversations | ~200ms | 10 UPDATEs |
| Delete 5 conversations | ~150ms | 5 DELETEs (CASCADE) |
| No conversations to process | ~50ms | 2 SELECTs |

---

### Monitoring Checklist

**Daily:**
- [ ] Check log file for errors: `tail -n 50 /var/log/innpilot/cron-archive.log`
- [ ] Verify cron executed (should run at 2am daily)

**Weekly:**
- [ ] Review archived conversations count: Check database
- [ ] Verify log rotation is working: `ls -la /var/log/innpilot/`

**Monthly:**
- [ ] Rotate `CRON_SECRET` (every 90 days)
- [ ] Review cron job performance metrics

---

## Related Documentation

- **VPS Setup:** `docs/deployment/VPS_SETUP_GUIDE.md`
- **Subdomain Setup:** `docs/deployment/SUBDOMAIN_SETUP_GUIDE.md`
- **Deployment Workflow:** `docs/deployment/DEPLOYMENT_WORKFLOW.md`
- **Conversation Memory:** Plan FASE 2.6 section in `plan.md`
- **Environment Variables:** `docs/deployment/env.example.vps`

---

## Cron Schedule Reference

Common cron schedule patterns:

```bash
# Every day at 2am
0 2 * * *

# Every day at 3:30am
30 3 * * *

# Every Sunday at midnight
0 0 * * 0

# Every 6 hours
0 */6 * * *

# Every Monday at 9am
0 9 * * 1
```

**Format:** `minute hour day month weekday`

---

**Last Updated:** October 5, 2025
**Applies To:** VPS deployment on muva.chat
**Related FASE:** 2.6 (Conversation Intelligence)
