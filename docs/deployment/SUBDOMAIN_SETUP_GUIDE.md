# Subdomain Setup Guide - Guest Portal Multi-Conversation

Complete guide for configuring wildcard subdomain routing for MUVA Guest Portal Multi-Conversation architecture.

**Last Updated**: Oct 5, 2025
**Status**: Production-ready
**DNS**: `*.muva.chat` → VPS 195.200.6.216

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [FASE 1.1: DNS Wildcard Configuration](#fase-11-dns-wildcard-configuration)
4. [FASE 1.2: SSL Wildcard Certificate](#fase-12-ssl-wildcard-certificate)
5. [FASE 1.3: Nginx Subdomain Routing](#fase-13-nginx-subdomain-routing)
6. [FASE 1.4: Testing & Validation](#fase-14-testing--validation)
7. [Troubleshooting](#troubleshooting)
8. [Architecture Diagram](#architecture-diagram)

---

## Overview

### What is Subdomain Architecture?

MUVA uses wildcard subdomain routing to enable multi-tenant guest portal access:

- **Main site**: `muva.chat` - Marketing & staff login
- **Tenant subdomains**: `simmerdown.muva.chat`, `cabanabeach.muva.chat`, etc. - Guest portals

### Flow

```
Guest → simmerdown.muva.chat
  ↓
DNS (Cloudflare) → 195.200.6.216
  ↓
Nginx → Extracts "simmerdown" from Host header
  ↓
Adds header: X-Tenant-Subdomain: simmerdown
  ↓
Proxy to Next.js (localhost:3000)
  ↓
Middleware reads X-Tenant-Subdomain header
  ↓
Resolves subdomain → tenant_id (via database)
  ↓
Guest Chat loads tenant-specific context
```

### Benefits

- **No URL parameters**: Clean URLs (`simmerdown.muva.chat` vs `muva.chat?tenant=simmerdown`)
- **Tenant isolation**: Each tenant feels like separate site
- **SEO-friendly**: Subdomains can be indexed independently
- **Security**: Middleware validates tenant exists before processing

---

## Prerequisites

- VPS: Ubuntu 20.04+ with root access
- Domain: `muva.chat` registered and managed
- DNS Provider: Cloudflare (or equivalent with wildcard support)
- Software: Nginx, Certbot, PM2, Node.js 18+

---

## FASE 1.1: DNS Wildcard Configuration

### Step 1: Configure Cloudflare DNS

Login to Cloudflare → Select `muva.chat` domain → DNS Records

**Add Wildcard A Record:**

| Type | Name | Content | Proxy | TTL |
|------|------|---------|-------|-----|
| A | `*` | `195.200.6.216` | Proxied (orange cloud) | Auto |

**Verify existing root record:**

| Type | Name | Content | Proxy | TTL |
|------|------|---------|-------|-----|
| A | `@` | `195.200.6.216` | Proxied | Auto |

### Step 2: Validate DNS Propagation

```bash
# Test wildcard DNS resolution
dig simmerdown.muva.chat +short
# Expected output: 195.200.6.216 (or Cloudflare proxy IP)

dig cabanabeach.muva.chat +short
# Expected output: 195.200.6.216 (or Cloudflare proxy IP)

# Test root domain
dig muva.chat +short
# Expected output: 195.200.6.216 (or Cloudflare proxy IP)
```

**Note**: With Cloudflare proxy enabled, you may see Cloudflare IPs (104.x.x.x, 172.x.x.x) instead of VPS IP. This is normal.

### Step 3: Verify Cloudflare SSL/TLS Settings

Navigate to: **SSL/TLS** → **Overview**

- Encryption mode: **Full (strict)**

Navigate to: **SSL/TLS** → **Edge Certificates**

- Always Use HTTPS: **On**
- Minimum TLS Version: **1.2**
- Automatic HTTPS Rewrites: **On**

---

## FASE 1.2: SSL Wildcard Certificate

### Step 1: SSH to VPS

```bash
ssh root@muva.chat
```

### Step 2: Install Certbot (if not installed)

```bash
# Update package list
apt update

# Install Certbot for Nginx
apt install -y certbot python3-certbot-nginx
```

### Step 3: Obtain Wildcard Certificate

```bash
# Request wildcard certificate
certbot certonly --manual \
  --preferred-challenges dns \
  -d muva.chat \
  -d *.muva.chat \
  --email your-email@example.com \
  --agree-tos
```

**Important**: Certbot will prompt for DNS TXT record verification:

```
Please deploy a DNS TXT record under the name
_acme-challenge.muva.chat with the following value:

XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

Before continuing, verify the record is deployed.
```

### Step 4: Add TXT Record to Cloudflare

In Cloudflare DNS:

| Type | Name | Content | TTL |
|------|------|---------|-----|
| TXT | `_acme-challenge` | `<value from certbot>` | Auto |

**Verify TXT record:**

```bash
# On local machine (wait 1-2 minutes for propagation)
dig _acme-challenge.muva.chat TXT +short

# Expected: "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
```

Press Enter in Certbot to continue verification.

### Step 5: Verify Certificate Installation

```bash
# Check certificate files
ls -la /etc/letsencrypt/live/

# Expected output:
# muva.chat-0001/  (or similar with -0001 suffix)

# List certificate contents
ls -la /etc/letsencrypt/live/muva.chat-0001/

# Expected files:
# cert.pem       - Server certificate only
# chain.pem      - Intermediate certificates
# fullchain.pem  - cert.pem + chain.pem (used by Nginx)
# privkey.pem    - Private key (used by Nginx)
```

**Note**: The `-0001` suffix indicates certificate renewal/reissue. Your path may vary.

### Step 6: Set Up Auto-Renewal

```bash
# Test renewal process (dry run)
certbot renew --dry-run

# Expected output: "Congratulations, all renewals succeeded"

# Verify cron job exists
systemctl list-timers | grep certbot

# Expected: certbot.timer should be active
```

Certbot auto-renewal runs twice daily. Manual renewal:

```bash
certbot renew --force-renewal
```

---

## FASE 1.3: Nginx Subdomain Routing

### Step 1: Copy Nginx Configuration to VPS

**On local machine:**

```bash
# Copy nginx-subdomain.conf to VPS
scp docs/deployment/nginx-subdomain.conf root@muva.chat:/etc/nginx/sites-available/
```

### Step 2: Create Symlink (Enable Site)

**On VPS (SSH):**

```bash
# Create symlink to enable configuration
ln -sf /etc/nginx/sites-available/nginx-subdomain.conf /etc/nginx/sites-enabled/

# Verify symlink created
ls -la /etc/nginx/sites-enabled/ | grep nginx-subdomain

# Expected: nginx-subdomain.conf -> /etc/nginx/sites-available/nginx-subdomain.conf
```

### Step 3: Remove Default Nginx Config (if exists)

```bash
# Check for default config
ls -la /etc/nginx/sites-enabled/default

# If exists, remove it
rm /etc/nginx/sites-enabled/default
```

### Step 4: Validate Nginx Configuration

```bash
# Test Nginx syntax
sudo nginx -t

# Expected output:
# nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
# nginx: configuration file /etc/nginx/nginx.conf test is successful
```

**If errors occur**, see [Troubleshooting](#troubleshooting) section.

### Step 5: Reload Nginx

```bash
# Reload Nginx to apply changes
sudo systemctl reload nginx

# Verify Nginx is running
sudo systemctl status nginx

# Expected: active (running)
```

### Step 6: Verify Nginx Logs

```bash
# Check error logs for issues
tail -f /var/log/nginx/innpilot-subdomain-error.log

# In another terminal, test request
curl -I https://simmerdown.muva.chat

# Check access logs
tail -n 20 /var/log/nginx/innpilot-subdomain-access.log
```

---

## FASE 1.4: Testing & Validation

### Test 1: HTTPS Works

```bash
# Test root domain
curl -I https://muva.chat

# Expected HTTP status: 200 OK (or 502 if Next.js not running)
```

### Test 2: Subdomain Resolution

```bash
# Test subdomain
curl -I https://simmerdown.muva.chat

# Expected HTTP status: 200 OK (or 502 if Next.js not running)
```

### Test 3: HTTP → HTTPS Redirect

```bash
# Test HTTP redirect
curl -I http://simmerdown.muva.chat

# Expected output:
# HTTP/1.1 301 Moved Permanently
# Location: https://simmerdown.muva.chat/
```

### Test 4: Custom Header Injection (Requires Next.js Running)

**Start Next.js on VPS:**

```bash
# Navigate to app directory
cd /var/www/innpilot

# Start with PM2
pm2 start ecosystem.config.cjs

# Verify app is running
pm2 status
```

**Test subdomain header:**

```bash
# Test custom header injection
curl -v https://simmerdown.muva.chat 2>&1 | grep X-Tenant-Subdomain

# Expected output:
# < X-Tenant-Subdomain: simmerdown
```

**Test root domain (no subdomain):**

```bash
curl -v https://muva.chat 2>&1 | grep X-Tenant-Subdomain

# Expected output:
# < X-Tenant-Subdomain: (empty value)
```

### Test 5: SSL Certificate Validation

```bash
# Check SSL certificate details
openssl s_client -connect simmerdown.muva.chat:443 -servername simmerdown.muva.chat < /dev/null 2>&1 | grep -A 5 "subject="

# Expected:
# subject=CN = muva.chat
```

**Browser test:**

1. Visit `https://simmerdown.muva.chat` in browser
2. Click padlock icon in address bar
3. Verify:
   - Certificate issued by: Let's Encrypt
   - Valid for: `muva.chat` and `*.muva.chat`
   - Expiration date: ~90 days from issuance

### Test 6: Next.js Middleware Detection

**Create test endpoint** (temporary):

`src/app/api/test-subdomain/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const subdomain = request.headers.get('X-Tenant-Subdomain') || ''

  return NextResponse.json({
    subdomain: subdomain,
    host: request.headers.get('host'),
    nginx_header_present: request.headers.has('X-Tenant-Subdomain'),
  })
}
```

**Test endpoint:**

```bash
# Test subdomain detection
curl https://simmerdown.muva.chat/api/test-subdomain

# Expected output:
# {
#   "subdomain": "simmerdown",
#   "host": "simmerdown.muva.chat",
#   "nginx_header_present": true
# }

# Test root domain
curl https://muva.chat/api/test-subdomain

# Expected output:
# {
#   "subdomain": "",
#   "host": "muva.chat",
#   "nginx_header_present": true
# }
```

---

## Troubleshooting

### Issue 1: "nginx: [emerg] unknown directive ssl_certificate"

**Cause**: SSL module not compiled in Nginx.

**Solution**:

```bash
# Verify Nginx version and modules
nginx -V 2>&1 | grep -o with-http_ssl_module

# If empty, reinstall Nginx with SSL support
apt remove nginx
apt install nginx-full
```

---

### Issue 2: Certificate Not Found

**Error**: `nginx: [emerg] cannot load certificate "/etc/letsencrypt/live/muva.chat-0001/fullchain.pem"`

**Cause**: Certificate path incorrect or permissions issue.

**Solution**:

```bash
# Find actual certificate path
ls -la /etc/letsencrypt/live/

# Update nginx-subdomain.conf with correct path
# Example: If path is muva.chat-0002, change config:
ssl_certificate /etc/letsencrypt/live/muva.chat-0002/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/muva.chat-0002/privkey.pem;

# Reload Nginx
sudo systemctl reload nginx
```

---

### Issue 3: 502 Bad Gateway

**Cause**: Next.js app not running on localhost:3000.

**Solution**:

```bash
# Check if port 3000 is listening
sudo netstat -tlnp | grep :3000

# If empty, Next.js is not running. Start it:
cd /var/www/innpilot
pm2 start ecosystem.config.cjs

# Check PM2 logs
pm2 logs innpilot
```

---

### Issue 4: X-Tenant-Subdomain Header Not Present

**Cause**: Nginx config not loaded or regex not matching.

**Solution**:

```bash
# Verify Nginx config loaded
sudo nginx -t

# Check Nginx error logs
tail -f /var/log/nginx/innpilot-subdomain-error.log

# Verify regex captures subdomain
curl -v https://simmerdown.muva.chat 2>&1 | grep -i subdomain

# If still empty, check Nginx version (requires 1.7+)
nginx -v
```

---

### Issue 5: DNS Not Resolving

**Cause**: DNS propagation delay or wildcard record not set.

**Solution**:

```bash
# Check DNS from multiple locations
dig simmerdown.muva.chat @8.8.8.8 +short
dig simmerdown.muva.chat @1.1.1.1 +short

# If empty, verify Cloudflare wildcard record exists:
# Type: A, Name: *, Content: 195.200.6.216

# Wait 5-10 minutes for propagation, then retry
```

---

### Issue 6: Cloudflare SSL/TLS Mode Issues

**Error**: Too many redirects or SSL errors.

**Cause**: Cloudflare SSL/TLS mode misconfigured.

**Solution**:

```bash
# In Cloudflare dashboard:
# SSL/TLS → Overview → Encryption mode: Full (strict)

# Verify Let's Encrypt certificate is valid
openssl s_client -connect muva.chat:443 -servername muva.chat < /dev/null 2>&1 | grep "Verify return code"

# Expected: Verify return code: 0 (ok)
```

---

### Issue 7: Certificate Renewal Fails

**Error**: Certbot renewal fails with DNS validation error.

**Cause**: DNS API credentials expired or TXT record not updating.

**Solution**:

```bash
# Manual renewal with DNS challenge
certbot renew --manual --preferred-challenges dns

# Follow prompts to update TXT record in Cloudflare

# Verify renewal
certbot certificates

# Expected: Valid until date should be ~90 days in future
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  Guest Browser                                               │
│  https://simmerdown.muva.chat                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Cloudflare DNS (Proxy Enabled)                             │
│  *.muva.chat → 195.200.6.216                             │
│  SSL/TLS: Full (strict)                                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  VPS: 195.200.6.216 (Ubuntu 20.04)                         │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Nginx (Port 443)                                   │    │
│  │  - SSL Termination (Let's Encrypt wildcard cert)   │    │
│  │  - Subdomain extraction: simmerdown                 │    │
│  │  - Add header: X-Tenant-Subdomain: simmerdown      │    │
│  └────────────────────┬───────────────────────────────┘    │
│                       │                                      │
│                       ▼                                      │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Next.js App (Port 3000, PM2)                      │    │
│  │  - Middleware reads X-Tenant-Subdomain header      │    │
│  │  - Resolves subdomain → tenant_id (DB query)       │    │
│  │  - Sets cookie: tenant_subdomain=simmerdown        │    │
│  └────────────────────┬───────────────────────────────┘    │
│                       │                                      │
│                       ▼                                      │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Guest Chat Interface                               │    │
│  │  - Loads tenant-specific context                    │    │
│  │  - Multi-conversation architecture                  │    │
│  │  - Compliance module integration                    │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## Next Steps

After completing subdomain setup:

1. **FASE 1.3**: Implement Next.js Middleware subdomain detection
   - File: `src/middleware.ts`
   - See: `guest-portal-compliance-workflow.md` Prompt 1.3

2. **FASE 1.4**: Implement tenant resolver
   - File: `src/lib/tenant-resolver.ts`
   - Function: `resolveSubdomainToTenantId()`

3. **FASE 2**: Multi-conversation backend APIs
   - Database migrations
   - CRUD endpoints for conversations

---

## Security Considerations

1. **SSL/TLS**: Always use HTTPS (enforced by Nginx redirect)
2. **Certificate Auto-Renewal**: Certbot handles automatically
3. **Header Injection**: X-Tenant-Subdomain header added server-side (not client-modifiable)
4. **Tenant Validation**: Middleware validates subdomain exists in database
5. **Rate Limiting**: Consider adding Nginx rate limiting for production

**Example rate limiting** (add to nginx-subdomain.conf):

```nginx
# Define rate limit zone (10MB stores ~160k clients)
limit_req_zone $binary_remote_addr zone=guest_chat:10m rate=10r/s;

# Apply in location block
location /api/guest/ {
    limit_req zone=guest_chat burst=20 nodelay;
    proxy_pass http://localhost:3000;
}
```

---

## Support

For issues or questions:

- GitHub Issues: [MUVA Repository](https://github.com/yourusername/innpilot)
- Documentation: `docs/deployment/`
- Workflow: `guest-portal-compliance-workflow.md`

---

**Last Updated**: Oct 5, 2025
**Author**: MUVA Development Team
**Version**: 1.0.0
