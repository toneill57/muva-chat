#!/bin/bash

# MUVA Chat VPS Deployment Script
# Deploys latest changes from dev branch to production

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/var/www/innpilot"
PM2_APP_NAME="muva-chat"
BRANCH="dev"

echo -e "${GREEN}🚀 Starting MUVA Chat VPS Deployment${NC}"
echo ""

# Step 1: Navigate to app directory
echo -e "${YELLOW}📂 Navigating to app directory...${NC}"
cd "$APP_DIR" || { echo -e "${RED}❌ Failed to navigate to $APP_DIR${NC}"; exit 1; }
echo -e "${GREEN}✅ Current directory: $(pwd)${NC}"
echo ""

# Step 2: Pull latest changes
echo -e "${YELLOW}🔄 Pulling latest changes from $BRANCH...${NC}"
git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"
echo -e "${GREEN}✅ Git pull completed${NC}"
echo ""

# Step 3: Install dependencies (if package.json changed)
echo -e "${YELLOW}📦 Checking dependencies...${NC}"
if git diff --name-only HEAD@{1} HEAD | grep -q "package.json"; then
  echo "package.json changed, running npm install..."
  npm install --legacy-peer-deps
  echo -e "${GREEN}✅ Dependencies updated${NC}"
else
  echo "package.json unchanged, skipping npm install"
fi
echo ""

# Step 4: Build application
echo -e "${YELLOW}🏗️  Building application...${NC}"
npm run build
echo -e "${GREEN}✅ Build completed${NC}"
echo ""

# Step 5: Restart PM2
echo -e "${YELLOW}🔄 Restarting PM2...${NC}"
pm2 restart "$PM2_APP_NAME"
echo -e "${GREEN}✅ PM2 restarted${NC}"
echo ""

# Step 6: Show PM2 status
echo -e "${YELLOW}📊 PM2 Status:${NC}"
pm2 status
echo ""

# Step 7: Show recent logs
echo -e "${YELLOW}📋 Recent logs (last 30 lines):${NC}"
echo -e "${YELLOW}================================${NC}"
cat /root/.pm2/logs/muva-chat-out.log | tail -30 2>/dev/null || pm2 logs muva-chat --lines 30 --nostream
echo ""
echo -e "${YELLOW}================================${NC}"

# Step 8: Success message
echo ""
echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo ""
echo -e "${YELLOW}Test URLs:${NC}"
echo "  - https://simmerdown.muva.chat/admin"
echo "  - https://simmerdown.muva.chat/admin/knowledge-base"
echo "  - https://simmerdown.muva.chat/admin/settings"
echo ""
echo -e "${YELLOW}Monitor logs with:${NC}"
echo "  pm2 logs muva-chat --nostream --lines 50"
echo ""
