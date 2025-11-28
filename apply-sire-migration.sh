#!/bin/bash

# Apply only the sire_submissions migration
# This fixes the compliance endpoint error

set -e

echo "🔧 Aplicando migración sire_submissions..."
echo ""

# Load environment
set -a
source .env.local
set +a

# Apply migration
pnpm dlx tsx scripts/database/execute-ddl-via-api.ts migrations/20251126180000_create_sire_submissions.sql

echo ""
echo "✅ Migración completada!"
echo ""
echo "Ahora prueba: http://localhost:3000/super-admin/compliance"
