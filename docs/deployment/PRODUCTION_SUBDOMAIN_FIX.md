# Production Subdomain Routing Fix

**Date**: October 10, 2025
**Issue**: Admin sidebar links broken in production with double slashes
**Root Cause**: Wrong Nginx configuration active on VPS

## Problem Analysis

### Symptoms
- `https://simmerdown.muva.chat/admin/admin/knowledge-base` ✅ Works (double `/admin`)
- `https://simmerdown.muva.chat/admin/knowledge-base` ❌ Doesn't work
- Tenant "simmerdown" is NOT being detected

### Root Cause
The VPS is using `nginx-innpilot.conf` which does NOT extract subdomain and set the `X-Tenant-Subdomain` header. This causes:

1. Middleware receives NO subdomain header
2. App tries to extract tenant from URL path (first segment)
3. First segment is "admin", so tenant becomes "admin"
4. App rewrites `/admin/knowledge-base` → `/admin/admin/knowledge-base`

### Correct Configuration
`docs/deployment/nginx-subdomain.conf` (lines 26-31) has the correct subdomain extraction:

```nginx
# Extract subdomain from Host header
set $subdomain "";
if ($host ~* ^([^.]+)\.innpilot\.io$) {
    set $subdomain $1;
}

# Proxy headers - Pass to Next.js application
proxy_set_header X-Tenant-Subdomain $subdomain;
```

## Solution

### Step 1: Deploy Correct Nginx Configuration

On your VPS, replace the current Nginx config with `nginx-subdomain.conf`:

```bash
# SSH into VPS
ssh user@muva.chat

# Backup current config
sudo cp /etc/nginx/sites-available/innpilot /etc/nginx/sites-available/innpilot.backup

# Copy the correct subdomain config
sudo cp /path/to/nginx-subdomain.conf /etc/nginx/sites-available/innpilot

# Test Nginx configuration
sudo nginx -t

# If test passes, reload Nginx
sudo systemctl reload nginx
```

### Step 2: Verify Subdomain Header

Test that Nginx is now sending the `X-Tenant-Subdomain` header:

```bash
curl -I https://simmerdown.muva.chat/admin
# Should see: X-Tenant-Subdomain: simmerdown (in backend logs)
```

### Step 3: Update next.config.ts (Secondary Fix)

While the Nginx fix is primary, also update `next.config.ts` to support production domains:

```typescript
// Line 53 and 64 - Change:
value: '(?<subdomain>[^.]+)\\.localhost(?:\\:\\d+)?',

// To:
value: '(?<subdomain>[^.]+)\\.(localhost|innpilot\\.io)(?:\\:\\d+)?',
```

This ensures subdomain rewrites work in BOTH development and production.

## Expected Result

After these fixes:

- ✅ `https://simmerdown.muva.chat/admin` → Works
- ✅ `https://simmerdown.muva.chat/admin/knowledge-base` → Works
- ✅ Tenant "simmerdown" correctly detected
- ✅ No more double slashes in URLs
- ✅ Admin sidebar navigation functional

## Testing Checklist

- [ ] Nginx config deployed and reloaded
- [ ] Subdomain header verified in middleware logs
- [ ] Admin dashboard loads at `https://simmerdown.muva.chat/admin`
- [ ] Knowledge Base link works: `https://simmerdown.muva.chat/admin/knowledge-base`
- [ ] Settings link works: `https://simmerdown.muva.chat/admin/settings`
- [ ] Branding link works: `https://simmerdown.muva.chat/admin/branding`
- [ ] Main site still works: `https://muva.chat`

## Files Changed

1. **VPS Nginx Config**: `/etc/nginx/sites-available/innpilot` (use `nginx-subdomain.conf`)
2. **next.config.ts**: Lines 53, 64 (add `innpilot\\.io` to regex)

## Related Files

- `docs/deployment/nginx-subdomain.conf` - Correct config with subdomain extraction
- `docs/deployment/nginx-innpilot.conf` - Old config WITHOUT subdomain support
- `src/middleware.ts` - Expects `x-tenant-subdomain` header from Nginx
- `src/components/admin/AdminSidebar.tsx` - Uses direct hrefs
