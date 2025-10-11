# VPS Setup Guide - MUVA Deployment

**Target Environment:** Hostinger VPS (Ubuntu 22.04 LTS)
**Domain:** muva.chat
**Stack:** Node.js 20.x + PM2 + Nginx + Let's Encrypt SSL

---

## Prerequisites

Before starting, ensure you have:
- ✅ VPS access credentials from Hostinger
- ✅ SSH key pair generated locally
- ✅ Domain muva.chat DNS pointed to VPS IP
- ✅ GitHub repository access
- ✅ All environment variables (Supabase, OpenAI, Anthropic, JWT)

---

## 1. Configuración Inicial del Servidor

### 1.1 Conectar al VPS via SSH

```bash
# Connect to VPS (replace with your VPS IP)
ssh root@your-vps-ip

# Update system packages
sudo apt update && sudo apt upgrade -y
```

### 1.2 Crear Usuario para la Aplicación

```bash
# Create deploy user
sudo adduser deploy
sudo usermod -aG sudo deploy

# Switch to deploy user
su - deploy
```

⚠️ **Security Note:** Never run Node.js apps as root. Always use a dedicated user.

### 1.3 Configurar SSH Key Authentication

```bash
# On your LOCAL machine, copy SSH key to VPS
ssh-copy-id deploy@your-vps-ip

# Test connection
ssh deploy@your-vps-ip
```

### 1.4 Instalar Node.js 20.x LTS

```bash
# Install Node.js via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x
```

### 1.5 Instalar PM2 Globalmente

```bash
# Install PM2 process manager
sudo npm install -g pm2

# Verify installation
pm2 --version

# Configure PM2 startup script
pm2 startup systemd
# Run the command PM2 outputs (starts with sudo)

# Save PM2 configuration
pm2 save
```

### 1.6 Instalar Git

```bash
# Install Git
sudo apt install -y git

# Configure Git
git config --global user.name "Deploy Bot"
git config --global user.email "deploy@muva.chat"
```

**Verification:**
```bash
# Check all installations
node --version && npm --version && pm2 --version && git --version
```

Expected output:
```
v20.x.x
10.x.x
5.x.x
git version 2.x.x
```

---

## 2. Configuración de Aplicación

### 2.1 Clonar Repositorio

```bash
# Navigate to deployment directory
cd /home/deploy

# Clone repository
git clone https://github.com/toneill57/innpilot.git
cd innpilot

# Checkout main branch
git checkout main
```

### 2.2 Instalar Dependencias

```bash
# Install production dependencies
npm ci --production=false

# Verify installation
npm list --depth=0
```

⚠️ **Important:** Use `npm ci` instead of `npm install` for reproducible builds.

### 2.3 Configurar Variables de Entorno

```bash
# Create .env.local file
nano .env.local
```

Add the following content (replace with your actual values):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI APIs
OPENAI_API_KEY=sk-proj-your-openai-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key

# Authentication
JWT_SECRET_KEY=your-jwt-secret-minimum-32-chars

# Node Environment
NODE_ENV=production
```

**Security Check:**
```bash
# Verify .env.local is in .gitignore
grep -q "^.env.local$" .gitignore && echo "✅ .env.local ignored" || echo "❌ Add .env.local to .gitignore"

# Set proper permissions
chmod 600 .env.local
```

### 2.4 Build de Producción

```bash
# Build Next.js application
npm run build

# Verify build output
ls -la .next/
```

Expected output: `.next/` directory with `standalone` and `static` folders.

**Verification:**
```bash
# Test production build locally
npm start

# In another terminal, test endpoint
curl http://localhost:3000/api/health
# Should return: {"status":"ok","timestamp":"..."}
```

⚠️ **Stop the test server** before continuing: Press `Ctrl+C`

---

## 3. Configuración de PM2

### 3.1 Crear PM2 Ecosystem File

```bash
# Create PM2 configuration
nano ecosystem.config.js
```

Add the following configuration:

```javascript
module.exports = {
  apps: [{
    name: 'innpilot',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    cwd: '/home/deploy/innpilot',
    instances: 2,
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/home/deploy/innpilot/logs/pm2-error.log',
    out_file: '/home/deploy/innpilot/logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
}
```

### 3.2 Crear Directorio de Logs

```bash
# Create logs directory
mkdir -p /home/deploy/innpilot/logs

# Set permissions
chmod 755 /home/deploy/innpilot/logs
```

### 3.3 Iniciar Aplicación con PM2

```bash
# Start application
pm2 start ecosystem.config.js

# Verify process is running
pm2 status

# Check logs
pm2 logs muva-chat --lines 50
```

### 3.4 Comandos PM2 Útiles

```bash
# View real-time logs
pm2 logs muva-chat

# Monitor resources
pm2 monit

# Restart app
pm2 restart muva-chat

# Stop app
pm2 stop muva-chat

# View detailed info
pm2 show innpilot

# Reload app (zero-downtime)
pm2 reload muva-chat
```

**Verification:**
```bash
# Test app is responding
curl http://localhost:3000/api/health

# Check PM2 process
pm2 list
# Status should be "online" with uptime > 0s
```

---

## 4. Configuración de Nginx

### 4.1 Instalar Nginx

```bash
# Install Nginx
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Verify installation
nginx -v
sudo systemctl status nginx
```

### 4.2 Configurar Virtual Host

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/innpilot.conf
```

Add the following configuration:

```nginx
# Rate limiting zone
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

# Upstream Next.js app
upstream muva_app {
    least_conn;
    server localhost:3000 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

server {
    listen 80;
    listen [::]:80;
    server_name muva.chat www.muva.chat;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logs
    access_log /var/log/nginx/innpilot-access.log;
    error_log /var/log/nginx/muva-chat-error.log;

    # Client max body size
    client_max_body_size 10M;

    # Compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript
               application/json application/javascript application/xml+rss
               application/rss+xml font/truetype font/opentype
               application/vnd.ms-fontobject image/svg+xml;

    # Proxy settings
    location / {
        proxy_pass http://muva_app;
        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;
        proxy_read_timeout 60s;
        proxy_connect_timeout 60s;
    }

    # Rate limiting for API endpoints
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;

        proxy_pass http://muva_app;
        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_cache_bypass $http_upgrade;
    }

    # Static files caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://muva_app;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Next.js static files
    location /_next/static/ {
        proxy_pass http://muva_app;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 4.3 Habilitar Sitio y Verificar

```bash
# Create symbolic link to enable site
sudo ln -s /etc/nginx/sites-available/innpilot.conf /etc/nginx/sites-enabled/

# Remove default site
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

Expected output from `nginx -t`:
```
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

**Verification:**
```bash
# Test HTTP access
curl -I http://muva.chat

# Should return: HTTP/1.1 200 OK
```

---

## 5. SSL Setup con Let's Encrypt

### 5.1 Instalar Certbot

```bash
# Install Certbot and Nginx plugin
sudo apt install -y certbot python3-certbot-nginx

# Verify installation
certbot --version
```

### 5.2 Obtener Certificado SSL

```bash
# Run Certbot with Nginx plugin
sudo certbot --nginx -d muva.chat -d www.muva.chat

# Follow prompts:
# 1. Enter email address (for renewal notifications)
# 2. Agree to Terms of Service: Y
# 3. Share email with EFF (optional): N
# 4. Redirect HTTP to HTTPS: 2 (Yes, redirect)
```

⚠️ **Important:** Ensure DNS is properly configured before running Certbot. Both `muva.chat` and `www.muva.chat` must resolve to your VPS IP.

### 5.3 Configurar Renovación Automática

```bash
# Test renewal process
sudo certbot renew --dry-run

# Verify renewal timer
sudo systemctl status certbot.timer

# View renewal configuration
sudo cat /etc/letsencrypt/renewal/muva.chat.conf
```

Let's Encrypt certificates expire after 90 days. Certbot automatically renews them via systemd timer.

### 5.4 Verificar Configuración SSL

```bash
# Check Nginx configuration includes SSL
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

**Verification:**
```bash
# Test HTTPS access
curl -I https://muva.chat

# Should return: HTTP/2 200 OK

# Test HTTP redirect
curl -I http://muva.chat
# Should return: HTTP/1.1 301 Moved Permanently
# Location: https://muva.chat/
```

### 5.5 SSL Security Test

Visit https://www.ssllabs.com/ssltest/analyze.html?d=muva.chat

**Target rating:** A or A+

---

## 6. Post-Setup Verification

### 6.1 Comprehensive Health Check

```bash
# Test all critical endpoints
curl -s https://muva.chat/api/health | jq
curl -s https://muva.chat/api/health/ready | jq

# Expected response:
# {
#   "status": "ok",
#   "timestamp": "2025-10-04T..."
# }
```

### 6.2 PM2 Monitoring

```bash
# Check PM2 status
pm2 status

# View real-time metrics
pm2 monit

# Expected:
# - Status: online
# - CPU: < 50%
# - Memory: < 1GB
```

### 6.3 Nginx Access Logs

```bash
# View recent access logs
sudo tail -f /var/log/nginx/innpilot-access.log

# Check for errors
sudo tail -f /var/log/nginx/muva-chat-error.log
```

### 6.4 System Resources

```bash
# Check system resources
htop

# Check disk usage
df -h

# Check memory usage
free -h
```

---

## 7. Troubleshooting

### Common Issues

**Issue 1: PM2 process crashes**
```bash
# Check PM2 logs
pm2 logs muva-chat --err

# Check Node.js memory
pm2 show innpilot

# Increase memory limit in ecosystem.config.js
max_memory_restart: '2G'
pm2 restart muva-chat
```

**Issue 2: Nginx 502 Bad Gateway**
```bash
# Check PM2 is running
pm2 status

# Check Nginx error logs
sudo tail -50 /var/log/nginx/muva-chat-error.log

# Restart services
pm2 restart muva-chat
sudo systemctl restart nginx
```

**Issue 3: SSL certificate not renewing**
```bash
# Test renewal manually
sudo certbot renew --dry-run

# Check certbot timer
sudo systemctl status certbot.timer

# Force renewal (if needed)
sudo certbot renew --force-renewal
```

**Issue 4: High memory usage**
```bash
# Check PM2 memory
pm2 monit

# Reduce PM2 instances in ecosystem.config.js
instances: 1  # Instead of 2

# Restart PM2
pm2 restart muva-chat
```

---

## 8. Maintenance Commands

### Daily Operations

```bash
# View application logs
pm2 logs muva-chat

# Restart application (zero downtime)
pm2 reload muva-chat

# Update application from Git
cd /home/deploy/innpilot
git pull origin main
npm ci
npm run build
pm2 reload muva-chat
```

### Weekly Checks

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Clean PM2 logs
pm2 flush

# Check SSL certificate expiry
sudo certbot certificates
```

### Emergency Rollback

```bash
# If deployment fails, rollback to previous commit
cd /home/deploy/innpilot
git log --oneline -5  # Find previous stable commit
git checkout <commit-hash>
npm ci
npm run build
pm2 restart muva-chat
```

---

## 9. Success Criteria Checklist

- [ ] VPS accessible via SSH with key authentication
- [ ] Node.js 20.x installed and working
- [ ] PM2 process running in cluster mode
- [ ] Nginx reverse proxy configured
- [ ] SSL certificate valid (A/A+ rating)
- [ ] https://muva.chat returns 200 OK
- [ ] API endpoints responding correctly
- [ ] Response time ≤ 0.500s
- [ ] PM2 auto-restart on failure
- [ ] Certbot auto-renewal configured
- [ ] Logs accessible and clean
- [ ] System resources < 50% usage

---

## 10. Next Steps

After completing VPS setup:

1. **Configure GitHub Actions** - Set up automated deployment
2. **Add GitHub Secrets** - Store VPS credentials securely
3. **Test Deployment Pipeline** - Push to main and verify auto-deploy
4. **Configure Monitoring** - Set up uptime monitoring (UptimeRobot, etc.)
5. **Backup Strategy** - Configure automated backups

See `DEPLOYMENT_WORKFLOW.md` for CI/CD setup instructions.

---

**Setup Time:** ~3 hours
**Last Updated:** October 4, 2025
**Maintained by:** Deploy Team

For issues or questions, refer to `TROUBLESHOOTING.md`
