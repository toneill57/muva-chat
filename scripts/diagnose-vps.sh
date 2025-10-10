#!/bin/bash

# VPS Multi-Tenant Diagnostic Script
# Diagnoses subdomain routing, Nginx config, PM2 status, and tenant loading

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  InnPilot VPS Multi-Tenant Diagnostics${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# ========================================
# 1. NGINX CONFIGURATION CHECK
# ========================================
echo -e "${YELLOW}[1/6] Checking Nginx Configuration...${NC}"
echo ""

NGINX_CONFIG="/etc/nginx/sites-available/innpilot"
if [ -f "$NGINX_CONFIG" ]; then
  echo -e "${GREEN}✅ Nginx config found: $NGINX_CONFIG${NC}"

  # Check for critical subdomain extraction lines
  if grep -q "X-Tenant-Subdomain" "$NGINX_CONFIG"; then
    echo -e "${GREEN}✅ X-Tenant-Subdomain header configured${NC}"
  else
    echo -e "${RED}❌ CRITICAL: X-Tenant-Subdomain header NOT found in config${NC}"
    echo -e "${YELLOW}   Run: sudo cp docs/deployment/nginx-subdomain.conf $NGINX_CONFIG${NC}"
  fi

  # Check for wildcard subdomain support
  if grep -q "*.innpilot.io" "$NGINX_CONFIG"; then
    echo -e "${GREEN}✅ Wildcard subdomain support configured${NC}"
  else
    echo -e "${RED}❌ WARNING: Wildcard subdomain (*.innpilot.io) NOT found${NC}"
  fi

  # Test Nginx syntax
  echo ""
  echo -e "${YELLOW}Testing Nginx syntax...${NC}"
  if sudo nginx -t 2>&1 | grep -q "syntax is ok"; then
    echo -e "${GREEN}✅ Nginx syntax OK${NC}"
  else
    echo -e "${RED}❌ Nginx syntax error detected${NC}"
    sudo nginx -t
  fi
else
  echo -e "${RED}❌ CRITICAL: Nginx config NOT found at $NGINX_CONFIG${NC}"
fi
echo ""

# ========================================
# 2. PM2 STATUS CHECK
# ========================================
echo -e "${YELLOW}[2/6] Checking PM2 Application Status...${NC}"
echo ""

if command -v pm2 &> /dev/null; then
  pm2 status | grep -E "innpilot|Status|online|stopped"

  APP_STATUS=$(pm2 jlist | jq -r '.[] | select(.name=="innpilot") | .pm2_env.status')
  if [ "$APP_STATUS" == "online" ]; then
    echo -e "${GREEN}✅ PM2 app 'innpilot' is online${NC}"
  else
    echo -e "${RED}❌ PM2 app 'innpilot' status: $APP_STATUS${NC}"
  fi
else
  echo -e "${RED}❌ PM2 not found${NC}"
fi
echo ""

# ========================================
# 3. ENVIRONMENT VARIABLES CHECK
# ========================================
echo -e "${YELLOW}[3/6] Checking Environment Variables...${NC}"
echo ""

APP_DIR="/var/www/innpilot"
if [ -f "$APP_DIR/.env.local" ]; then
  echo -e "${GREEN}✅ .env.local found${NC}"

  # Check critical env vars (without showing values)
  ENV_VARS=("SUPABASE_URL" "SUPABASE_ANON_KEY" "OPENAI_API_KEY" "ANTHROPIC_API_KEY")
  for var in "${ENV_VARS[@]}"; do
    if grep -q "^$var=" "$APP_DIR/.env.local"; then
      echo -e "${GREEN}✅ $var configured${NC}"
    else
      echo -e "${RED}❌ $var NOT found${NC}"
    fi
  done
else
  echo -e "${RED}❌ CRITICAL: .env.local NOT found at $APP_DIR${NC}"
fi
echo ""

# ========================================
# 4. MIDDLEWARE LOGS CHECK
# ========================================
echo -e "${YELLOW}[4/6] Recent Middleware Logs (last 20 lines)...${NC}"
echo ""

PM2_LOG="/root/.pm2/logs/innpilot-out-0.log"
if [ -f "$PM2_LOG" ]; then
  echo -e "${BLUE}Looking for middleware subdomain detection...${NC}"
  grep -i "middleware" "$PM2_LOG" | tail -20 || echo -e "${YELLOW}No middleware logs found${NC}"
else
  echo -e "${RED}❌ PM2 log file not found at $PM2_LOG${NC}"
fi
echo ""

# ========================================
# 5. HEALTH CHECK TEST
# ========================================
echo -e "${YELLOW}[5/6] Testing Health Check Endpoint...${NC}"
echo ""

HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://innpilot.io/api/health)
if [ "$HEALTH_RESPONSE" == "200" ]; then
  echo -e "${GREEN}✅ Health check returned 200${NC}"
  curl -s https://innpilot.io/api/health | jq '.'
else
  echo -e "${RED}❌ Health check returned $HEALTH_RESPONSE${NC}"
  echo -e "${YELLOW}Response body:${NC}"
  curl -s https://innpilot.io/api/health | jq '.'
fi
echo ""

# ========================================
# 6. SUBDOMAIN ROUTING TEST
# ========================================
echo -e "${YELLOW}[6/6] Testing Subdomain Routing...${NC}"
echo ""

SUBDOMAINS=("simmerdown" "demo")
for subdomain in "${SUBDOMAINS[@]}"; do
  echo -e "${BLUE}Testing: ${subdomain}.innpilot.io${NC}"

  # Test subdomain detection endpoint
  SUBDOMAIN_TEST=$(curl -s "https://${subdomain}.innpilot.io/api/test-subdomain")
  DETECTED=$(echo "$SUBDOMAIN_TEST" | jq -r '.subdomain')

  if [ "$DETECTED" == "$subdomain" ]; then
    echo -e "${GREEN}✅ Subdomain '${subdomain}' detected correctly${NC}"
  else
    echo -e "${RED}❌ Subdomain detection failed. Expected: $subdomain, Got: $DETECTED${NC}"
    echo -e "${YELLOW}Full response:${NC}"
    echo "$SUBDOMAIN_TEST" | jq '.'
  fi
  echo ""
done

# ========================================
# SUMMARY
# ========================================
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  Diagnostic Summary${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo -e "${YELLOW}If you see any ❌ errors above:${NC}"
echo ""
echo -e "1. ${YELLOW}Nginx X-Tenant-Subdomain missing:${NC}"
echo -e "   sudo cp docs/deployment/nginx-subdomain.conf /etc/nginx/sites-available/innpilot"
echo -e "   sudo nginx -t && sudo systemctl reload nginx"
echo ""
echo -e "2. ${YELLOW}PM2 app stopped:${NC}"
echo -e "   pm2 restart innpilot"
echo ""
echo -e "3. ${YELLOW}Environment variables missing:${NC}"
echo -e "   cd $APP_DIR && cat .env.local (verify all required vars)"
echo ""
echo -e "4. ${YELLOW}Health check failing:${NC}"
echo -e "   Check PM2 logs: pm2 logs innpilot --lines 50"
echo ""
echo -e "5. ${YELLOW}Subdomain routing failing:${NC}"
echo -e "   Verify Nginx config + restart PM2"
echo ""
echo -e "${GREEN}Monitor logs in real-time:${NC}"
echo -e "pm2 logs innpilot --nostream --lines 100"
echo ""
