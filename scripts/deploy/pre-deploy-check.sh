#!/bin/bash
###############################################################################
# Pre-Deploy Check Script
#
# Purpose: Validate system health before deployment
# Prevents deploying with broken RPC functions or unhealthy systems
#
# Usage:
#   ./scripts/pre-deploy-check.sh
#   ./scripts/pre-deploy-check.sh staging
#   ./scripts/pre-deploy-check.sh production
#
# Exit codes:
#   0 = All checks passed - safe to deploy
#   1 = One or more checks failed - DO NOT DEPLOY
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Environment (default: staging)
ENV="${1:-staging}"

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "              🔍 PRE-DEPLOY VALIDATION - $ENV"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# Check 1: RPC Functions Validation
echo "📋 CHECK 1: Validating RPC Functions..."
echo "────────────────────────────────────────────────────────────────────"

if pnpm run validate:rpc -- --env=$ENV; then
  echo -e "${GREEN}✅ RPC Functions: VALID${NC}"
else
  echo -e "${RED}❌ RPC Functions: INVALID${NC}"
  echo ""
  echo "🔧 To fix, run:"
  echo "   pnpm run validate:rpc:fix -- --env=$ENV"
  echo ""
  exit 1
fi

echo ""

# Check 2: RPC Function Tests
echo "🧪 CHECK 2: Running RPC Function Tests..."
echo "────────────────────────────────────────────────────────────────────"

# Load environment variables
if [ -f .env.local ]; then
  set -a
  source .env.local
  set +a
fi

if pnpm run test:rpc; then
  echo -e "${GREEN}✅ RPC Tests: PASSED${NC}"
else
  echo -e "${RED}❌ RPC Tests: FAILED${NC}"
  echo ""
  echo "Fix the tests before deploying"
  echo ""
  exit 1
fi

echo ""

# Check 3: Health Endpoint
echo "🏥 CHECK 3: Checking Health Endpoints..."
echo "────────────────────────────────────────────────────────────────────"

if [ "$ENV" = "staging" ]; then
  HEALTH_URL="https://simmerdown.staging.muva.chat/api/health/database"
elif [ "$ENV" = "production" ]; then
  HEALTH_URL="https://simmerdown.muva.chat/api/health/database"
else
  HEALTH_URL="http://localhost:3000/api/health/database"
fi

# Try to fetch health endpoint
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✅ Health Endpoint: HEALTHY (HTTP $HTTP_CODE)${NC}"
  echo "   URL: $HEALTH_URL"
elif [ "$HTTP_CODE" = "503" ]; then
  echo -e "${RED}❌ Health Endpoint: UNHEALTHY (HTTP $HTTP_CODE)${NC}"
  echo "   URL: $HEALTH_URL"
  echo ""
  echo "Check the health endpoint for details"
  exit 1
else
  echo -e "${YELLOW}⚠️  Health Endpoint: UNREACHABLE (HTTP $HTTP_CODE)${NC}"
  echo "   URL: $HEALTH_URL"

  if [ "$ENV" = "dev" ] || [ "$ENV" = "development" ]; then
    echo -e "${YELLOW}   Note: Dev server might not be running - continuing...${NC}"
  else
    echo ""
    echo "Cannot reach health endpoint - environment might be down"
    exit 1
  fi
fi

echo ""

# Check 4: Monitoring Dashboard
echo "📊 CHECK 4: Running Monitoring Dashboard..."
echo "────────────────────────────────────────────────────────────────────"

pnpm dlx tsx scripts/monitoring-dashboard.ts --env=$ENV

echo ""

# All checks passed
echo "═══════════════════════════════════════════════════════════════════"
echo -e "${GREEN}✅ ALL CHECKS PASSED - SAFE TO DEPLOY${NC}"
echo "═══════════════════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. Review the monitoring dashboard output above"
echo "  2. If everything looks good, run:"
if [ "$ENV" = "staging" ]; then
  echo "     ./scripts/deploy-staging.sh"
elif [ "$ENV" = "production" ]; then
  echo "     ./scripts/deploy-production.sh"
fi
echo ""

exit 0
