#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BACKUP_DIR="/Users/oneill/Sites/apps/muva-chat/docs/three-tier-unified/backups"
mkdir -p "$BACKUP_DIR"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📦 FASE 2 - Data Migration${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Source project connection string
SOURCE_PROJECT="hoaiwcueleiemeplrurv"
SOURCE_URL="postgresql://postgres.hoaiwcueleiemeplrurv:Avispado5698@aws-0-us-west-1.pooler.supabase.com:6543/postgres"

# Target projects
DEV_PROJECT="azytxnyiizldljxrapoe"
DEV_URL="postgresql://postgres.azytxnyiizldljxrapoe:Avispado5698@aws-0-us-west-1.pooler.supabase.com:6543/postgres"

TST_PROJECT="bddcvjoeoiekzfetvxoe"
TST_URL="postgresql://postgres.bddcvjoeoiekzfetvxoe:Avispado5698@aws-0-us-west-1.pooler.supabase.com:6543/postgres"

# Tables to migrate (data only, schema already exists)
TABLES=(
  "public.hotels"
  "hotels.accommodation_units"
  "public.guest_reservations"
  "public.reservation_accommodations"
  "public.accommodation_units_public"
  "public.accommodation_units_manual_chunks"
  "public.accommodation_manuals"
  "public.accommodation_manual_analytics"
  "public.integration_configs"
  "public.sync_history"
  "public.staff_users"
  "public.staff_conversations"
  "public.staff_messages"
  "public.guest_conversations"
  "public.chat_messages"
  "public.prospective_sessions"
)

echo -e "${GREEN}📥 Exporting data from source...${NC}"
for table in "${TABLES[@]}"; do
  echo "  → $table"
  pg_dump "$SOURCE_URL" \
    --data-only \
    --table="$table" \
    --file="$BACKUP_DIR/${table//./_}.sql" \
    --no-owner \
    --no-privileges \
    2>/dev/null || echo "    ⚠️  No data or error"
done

echo ""
echo -e "${GREEN}📤 Importing to DEV ($DEV_PROJECT)...${NC}"
for table in "${TABLES[@]}"; do
  file="$BACKUP_DIR/${table//./_}.sql"
  if [ -f "$file" ] && [ -s "$file" ]; then
    echo "  → $table"
    psql "$DEV_URL" -f "$file" -q 2>/dev/null || echo "    ⚠️  Import error (may already exist)"
  fi
done

echo ""
echo -e "${GREEN}📤 Importing to TST ($TST_PROJECT)...${NC}"
for table in "${TABLES[@]}"; do
  file="$BACKUP_DIR/${table//./_}.sql"
  if [ -f "$file" ] && [ -s "$file" ]; then
    echo "  → $table"
    psql "$TST_URL" -f "$file" -q 2>/dev/null || echo "    ⚠️  Import error (may already exist)"
  fi
done

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}📊 Verification${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo ""
echo "SOURCE:"
psql "$SOURCE_URL" -t -c "SELECT 
  'tenant_registry: ' || COUNT(*) FROM tenant_registry UNION ALL
  SELECT 'accommodation_units: ' || COUNT(*) FROM hotels.accommodation_units UNION ALL
  SELECT 'guest_reservations: ' || COUNT(*) FROM guest_reservations"

echo ""
echo "DEV:"
psql "$DEV_URL" -t -c "SELECT 
  'tenant_registry: ' || COUNT(*) FROM tenant_registry UNION ALL
  SELECT 'accommodation_units: ' || COUNT(*) FROM hotels.accommodation_units UNION ALL
  SELECT 'guest_reservations: ' || COUNT(*) FROM guest_reservations"

echo ""
echo "TST:"
psql "$TST_URL" -t -c "SELECT 
  'tenant_registry: ' || COUNT(*) FROM tenant_registry UNION ALL
  SELECT 'accommodation_units: ' || COUNT(*) FROM hotels.accommodation_units UNION ALL
  SELECT 'guest_reservations: ' || COUNT(*) FROM guest_reservations"

echo ""
echo -e "${GREEN}✅ FASE 2 COMPLETE${NC}"
