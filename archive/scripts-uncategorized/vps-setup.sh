#!/bin/bash

# VPS Setup Script for InnPilot
# Installs: Node.js 20.x, PM2, Nginx, Certbot, Git
# Target: Ubuntu 22.04 LTS

set -e  # Exit on error

echo "================================================"
echo "  InnPilot VPS Setup Script"
echo "  Target: Ubuntu 22.04 LTS"
echo "================================================"
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "❌ This script must be run as root (use sudo)" 
   exit 1
fi

echo "📦 Updating system packages..."
apt update && apt upgrade -y

echo ""
echo "📦 Installing Git..."
apt install -y git
git --version
echo "✅ Git installed"

echo ""
echo "📦 Installing Node.js 20.x LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node --version
npm --version
echo "✅ Node.js installed"

echo ""
echo "📦 Installing PM2 globally..."
npm install -g pm2
pm2 --version
echo "✅ PM2 installed"

echo ""
echo "📦 Installing Nginx..."
apt install -y nginx
systemctl start nginx
systemctl enable nginx
nginx -v
echo "✅ Nginx installed and started"

echo ""
echo "📦 Installing Certbot (Let's Encrypt)..."
apt install -y certbot python3-certbot-nginx
certbot --version
echo "✅ Certbot installed"

echo ""
echo "📦 Configurando Firewall (UFW)..."
apt install -y ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
echo "y" | ufw enable
ufw status verbose
echo "✅ Firewall configured"

echo ""
echo "================================================"
echo "  ✅ VPS Setup Complete!"
echo "================================================"
echo ""
echo "📋 Installed components:"
echo "  - Node.js: $(node --version)"
echo "  - npm: $(npm --version)"
echo "  - PM2: $(pm2 --version)"
echo "  - Nginx: $(nginx -v 2>&1 | grep -oP 'nginx/\K[0-9.]+')"
echo "  - Certbot: $(certbot --version 2>&1 | grep -oP 'certbot \K[0-9.]+')"
echo "  - Git: $(git --version | grep -oP 'git version \K[0-9.]+')"
echo ""
echo "📝 Next steps:"
echo "  1. Create deploy user: adduser deploy"
echo "  2. Add to sudo group: usermod -aG sudo deploy"
echo "  3. Setup SSH keys for deploy user"
echo "  4. Clone repository: git clone https://github.com/toneill57/innpilot.git"
echo "  5. Configure PM2: pm2 start ecosystem.config.js"
echo "  6. Configure Nginx: copy nginx-innpilot.conf"
echo "  7. Setup SSL: certbot --nginx -d innpilot.io -d www.innpilot.io"
echo ""
echo "📖 Full guide: docs/deployment/VPS_SETUP_GUIDE.md"
echo "================================================"
