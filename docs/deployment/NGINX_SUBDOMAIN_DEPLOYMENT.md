# Nginx Subdomain Configuration Deployment Guide

**Date**: October 10, 2025
**Purpose**: Deploy wildcard subdomain support for InnPilot multi-tenant architecture

## Quick Command Reference

```bash
# 1. SSH into VPS
ssh user@your-vps-ip

# 2. Backup current configuration
sudo cp /etc/nginx/sites-available/innpilot /etc/nginx/sites-available/innpilot.backup-$(date +%Y%m%d)

# 3. Replace with subdomain config
# (Copy content from docs/deployment/nginx-subdomain.conf)
sudo nano /etc/nginx/sites-available/innpilot

# 4. Test configuration
sudo nginx -t

# 5. If test passes, reload Nginx
sudo systemctl reload nginx

# 6. Verify it's working
curl -I https://simmerdown.innpilot.io/admin
```

## Critical Configuration Lines

The **MUST-HAVE** lines in your Nginx config (lines 26-31 in `nginx-subdomain.conf`):

```nginx
# Extract subdomain from Host header
set $subdomain "";
if ($host ~* ^([^.]+)\.innpilot\.io$) {
    set $subdomain $1;
}

# Proxy headers - Pass to Next.js application
proxy_set_header X-Tenant-Subdomain $subdomain;
```

Without these lines, the middleware will NOT detect subdomains and tenant routing will fail.

## Full Nginx Configuration

Copy the entire content from `docs/deployment/nginx-subdomain.conf` to `/etc/nginx/sites-available/innpilot`.

Key features:
- Wildcard subdomain support: `*.innpilot.io`
- Subdomain extraction and header injection
- SSL/TLS with Let's Encrypt wildcard certificate
- HTTP to HTTPS redirect
- Security headers
- Gzip compression
- Proper proxy settings for Next.js

## SSL Certificate Requirements

You need a **wildcard SSL certificate** for `*.innpilot.io`:

```bash
# Request wildcard certificate (requires DNS validation)
sudo certbot certonly --manual --preferred-challenges dns -d "*.innpilot.io" -d "innpilot.io"

# Follow prompts to add TXT records to DNS
# Certificate will be saved to:
# /etc/letsencrypt/live/innpilot.io-0001/fullchain.pem
# /etc/letsencrypt/live/innpilot.io-0001/privkey.pem
```

## DNS Configuration

Ensure your DNS has a wildcard A record:

```
Type    Name                Value           TTL
A       innpilot.io         YOUR_VPS_IP     300
A       *.innpilot.io       YOUR_VPS_IP     300
```

## Testing Checklist

After deployment, test these URLs:

### Subdomain Detection
- [ ] `https://simmerdown.innpilot.io/admin` - Should load admin dashboard
- [ ] `https://simmerdown.innpilot.io/admin/knowledge-base` - No double slashes
- [ ] `https://simmerdown.innpilot.io/admin/settings` - No double slashes
- [ ] `https://simmerdown.innpilot.io/admin/branding` - No double slashes

### Main Site
- [ ] `https://innpilot.io` - Should load main landing page
- [ ] No subdomain detected (empty string in header)

### Different Tenants
- [ ] `https://demo.innpilot.io/admin` - Works for "demo" tenant
- [ ] `https://test.innpilot.io/admin` - Works for "test" tenant

### Middleware Logs
Check PM2 logs to verify subdomain detection:

```bash
pm2 logs innpilot --lines 50 | grep middleware
# Should see: [middleware] Subdomain detected: simmerdown (from: nginx-header)
```

## Troubleshooting

### Issue: Still seeing double slashes
**Cause**: Nginx config not reloaded or wrong config file active
**Fix**:
```bash
sudo nginx -t
sudo systemctl reload nginx
pm2 restart innpilot
```

### Issue: "nginx-header" not appearing in logs
**Cause**: `X-Tenant-Subdomain` header not being sent by Nginx
**Fix**: Verify lines 26-31 are in your Nginx config and Nginx was reloaded

### Issue: 502 Bad Gateway
**Cause**: Next.js app not running on port 3000
**Fix**:
```bash
pm2 status
pm2 restart innpilot
```

### Issue: SSL certificate errors
**Cause**: Wildcard certificate not installed or expired
**Fix**: Renew certificate with `sudo certbot renew`

## Related Changes

This Nginx configuration works in conjunction with:

1. **next.config.ts** - Subdomain rewrites (now supports both localhost and innpilot.io)
2. **middleware.ts** - Reads `x-tenant-subdomain` header from Nginx
3. **AdminSidebar.tsx** - Uses direct hrefs (no tenant prefix needed)

All these pieces work together to enable seamless subdomain-based multi-tenancy.

## Rollback Instructions

If something goes wrong:

```bash
# Restore backup
sudo cp /etc/nginx/sites-available/innpilot.backup-YYYYMMDD /etc/nginx/sites-available/innpilot

# Test and reload
sudo nginx -t
sudo systemctl reload nginx

# Restart app
pm2 restart innpilot
```

## Monitoring

After deployment, monitor for:
- Subdomain detection in middleware logs
- No 404s on admin routes
- Correct tenant isolation in database queries
- Session cookies scoped to correct subdomain

Check PM2 logs:
```bash
pm2 logs innpilot --lines 100
```

Check Nginx logs:
```bash
sudo tail -f /var/log/nginx/innpilot-subdomain-access.log
sudo tail -f /var/log/nginx/innpilot-subdomain-error.log
```
