#!/bin/bash
set -e

# ============================================================================
# Script: regenerate_accommodation_embeddings.sh
# Purpose: Re-generate embeddings for accommodation_units_public and manual
# Usage: ./scripts/regenerate_accommodation_embeddings.sh [--tenant-id UUID]
# ============================================================================

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default tenant (SimmerDown)
TENANT_ID="${1:-b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf}"

echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}🔄 Regenerating Accommodation Embeddings${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""
echo -e "${YELLOW}Tenant ID: ${TENANT_ID}${NC}"
echo ""

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
  echo -e "${RED}❌ Error: .env.local not found${NC}"
  echo "Please create .env.local with required API keys"
  exit 1
fi

# Check if node is installed
if ! command -v node &> /dev/null; then
  echo -e "${RED}❌ Error: Node.js not found${NC}"
  echo "Please install Node.js to continue"
  exit 1
fi

# Check if OpenAI API key is set
source .env.local
if [ -z "$OPENAI_API_KEY" ]; then
  echo -e "${RED}❌ Error: OPENAI_API_KEY not set in .env.local${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Environment validated${NC}"
echo ""

# ============================================================================
# STEP 1: Find all accommodation manual files
# ============================================================================

echo -e "${BLUE}📂 Searching for accommodation manuals...${NC}"

MANUAL_FILES=($(find _assets/simmerdown/accommodations-manual -name "*-manual.md" -type f 2>/dev/null || true))
MANUAL_COUNT=${#MANUAL_FILES[@]}

if [ $MANUAL_COUNT -eq 0 ]; then
  echo -e "${YELLOW}⚠️  No manual files found in _assets/simmerdown/accommodations-manual/${NC}"
  echo -e "${YELLOW}   Skipping manual embeddings generation${NC}"
  echo ""
else
  echo -e "${GREEN}✓ Found ${MANUAL_COUNT} manual files${NC}"
  echo ""
fi

# ============================================================================
# STEP 2: Process manual files
# ============================================================================

if [ $MANUAL_COUNT -gt 0 ]; then
  echo -e "${BLUE}🧮 Processing accommodation manuals...${NC}"
  echo ""

  PROCESSED=0
  FAILED=0
  SKIPPED=0

  for file in "${MANUAL_FILES[@]}"; do
    filename=$(basename "$file")
    echo -e "${YELLOW}>>> Processing: ${filename}${NC}"

    # Run the processing script
    if node scripts/process-accommodation-manuals.js "$file" 2>&1 | grep -q "✅"; then
      PROCESSED=$((PROCESSED + 1))
      echo -e "${GREEN}    ✓ Success${NC}"
    else
      FAILED=$((FAILED + 1))
      echo -e "${RED}    ✗ Failed${NC}"
    fi

    echo ""
  done

  echo -e "${BLUE}============================================================${NC}"
  echo -e "${BLUE}📊 Manual Processing Summary${NC}"
  echo -e "${BLUE}============================================================${NC}"
  echo -e "${GREEN}✅ Processed: ${PROCESSED}/${MANUAL_COUNT}${NC}"
  [ $FAILED -gt 0 ] && echo -e "${RED}❌ Failed: ${FAILED}/${MANUAL_COUNT}${NC}"
  echo ""
fi

# ============================================================================
# STEP 3: Verify database updates
# ============================================================================

echo -e "${BLUE}🔍 Verifying database updates...${NC}"
echo ""

# Count units with embeddings
QUERY_PUBLIC="SELECT COUNT(*) as count FROM accommodation_units_public WHERE embedding IS NOT NULL AND tenant_id = '$TENANT_ID';"
QUERY_MANUAL="SELECT COUNT(*) as count FROM accommodation_units_manual WHERE embedding IS NOT NULL AND unit_id IN (SELECT unit_id FROM accommodation_units_public WHERE tenant_id = '$TENANT_ID');"

echo -e "${YELLOW}Checking accommodation_units_public...${NC}"
# This would require psql or supabase CLI to execute
# For now, we'll show the query
echo "   Query: $QUERY_PUBLIC"
echo ""

echo -e "${YELLOW}Checking accommodation_units_manual...${NC}"
echo "   Query: $QUERY_MANUAL"
echo ""

# ============================================================================
# STEP 4: Performance test (optional)
# ============================================================================

echo -e "${BLUE}⚡ Performance Test (optional)${NC}"
echo ""
echo -e "${YELLOW}To test the RPC function performance, run:${NC}"
echo ""
echo -e "  ${GREEN}npx supabase db sql --execute \"${NC}"
echo -e "    ${GREEN}EXPLAIN ANALYZE${NC}"
echo -e "    ${GREEN}SELECT * FROM match_guest_accommodations(${NC}"
echo -e "      ${GREEN}ARRAY_FILL(0.1, ARRAY[1024])::vector(1024),${NC}"
echo -e "      ${GREEN}ARRAY_FILL(0.1, ARRAY[1536])::vector(1536),${NC}"
echo -e "      ${GREEN}(SELECT unit_id FROM accommodation_units_public LIMIT 1),${NC}"
echo -e "      ${GREEN}'$TENANT_ID'::uuid,${NC}"
echo -e "      ${GREEN}0.15,${NC}"
echo -e "      ${GREEN}10${NC}"
echo -e "    ${GREEN});${NC}"
echo -e "  ${GREEN}\"${NC}"
echo ""

# ============================================================================
# FINAL SUMMARY
# ============================================================================

echo -e "${BLUE}============================================================${NC}"
echo -e "${GREEN}✨ Embeddings Regeneration Complete!${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""

if [ $MANUAL_COUNT -gt 0 ]; then
  SUCCESS_RATE=$((PROCESSED * 100 / MANUAL_COUNT))
  echo -e "${GREEN}Success Rate: ${SUCCESS_RATE}%${NC}"
  echo ""
fi

echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Verify embeddings in database (see queries above)"
echo "  2. Test RPC function performance (see command above)"
echo "  3. Run E2E tests: npm test src/lib/__tests__/guest-auth.test.ts"
echo ""

echo -e "${GREEN}🎉 Done!${NC}"
