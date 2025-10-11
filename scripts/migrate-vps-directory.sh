#!/bin/bash
# VPS Directory Migration: /var/www/innpilot → /var/www/muva-chat
# Project: InnPilot → MUVA Chat Rebrand
# Run this script ON THE VPS as root

set -e  # Exit on any error

echo "🚀 Starting VPS Directory Migration"
echo "========================================"
echo "⚠️  PRODUCTION OPERATION"
echo "⏱️  Expected downtime: ~30-60 seconds"
echo ""
echo "This script will:"
echo "  1. Stop PM2 process 'muva-chat'"
echo "  2. Rename /var/www/innpilot → /var/www/muva-chat"
echo "  3. Clean corrupted node_modules"
echo "  4. Update Nginx config"
echo "  5. Restart PM2 with new directory"
echo ""
read -p "Press ENTER to continue or Ctrl+C to abort..."
echo ""

# Step 1: Stop PM2 process
echo "🛑 Step 1/6: Stopping PM2 process..."
pm2 stop muva-chat || true
pm2 delete muva-chat || true
echo "✅ PM2 stopped"
echo ""

# Step 2: Rename directory
echo "📂 Step 2/6: Renaming directory..."
if [ -d "/var/www/innpilot" ]; then
    mv /var/www/innpilot /var/www/muva-chat
    echo "✅ Directory renamed: /var/www/muva-chat"
else
    echo "⚠️  /var/www/innpilot not found, assuming already renamed"
fi
echo ""

# Step 3: Clean node_modules
echo "🧹 Step 3/6: Cleaning node_modules..."
cd /var/www/muva-chat
rm -rf node_modules
rm -rf .next
echo "✅ node_modules and .next removed"
echo ""

# Step 4: Update Nginx config
echo "🔧 Step 4/6: Updating Nginx config..."
NGINX_CONFIG="/etc/nginx/sites-available/innpilot.io"
if [ -f "$NGINX_CONFIG" ]; then
    # Backup original
    cp "$NGINX_CONFIG" "$NGINX_CONFIG.backup-$(date +%Y%m%d-%H%M%S)"

    # Replace path in nginx config
    sed -i 's|/var/www/innpilot|/var/www/muva-chat|g' "$NGINX_CONFIG"

    # Test nginx config
    nginx -t

    # Reload nginx
    systemctl reload nginx

    echo "✅ Nginx config updated and reloaded"
else
    echo "⚠️  Nginx config not found at $NGINX_CONFIG"
fi
echo ""

# Step 5: Fresh npm install
echo "📦 Step 5/6: Installing dependencies..."
npm install --legacy-peer-deps
echo "✅ Dependencies installed"
echo ""

# Step 6: Build and start PM2
echo "🏗️  Step 6/6: Building and starting application..."
npm run build
pm2 start npm --name "muva-chat" -- start
pm2 save
echo "✅ Application started"
echo ""

# Verification
echo "========================================"
echo "🔍 VERIFICATION"
echo "========================================"
echo ""

echo "PM2 Status:"
pm2 status
echo ""

echo "Nginx Status:"
systemctl status nginx --no-pager | head -5
echo ""

echo "Testing endpoints..."
sleep 3

# Test main site
echo "Testing https://muva.chat..."
curl -I https://muva.chat 2>/dev/null | head -1
echo ""

# Test tenant
echo "Testing https://simmerdown.muva.chat..."
curl -I https://simmerdown.muva.chat 2>/dev/null | head -1
echo ""

echo "========================================"
echo "✅ Migration Complete!"
echo "========================================"
echo ""
echo "New directory: /var/www/muva-chat"
echo "PM2 process: muva-chat"
echo ""
echo "Monitor with:"
echo "  pm2 logs muva-chat"
echo "  pm2 status"
echo ""
