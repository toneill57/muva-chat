#!/bin/bash

# Fix sire_submissions table - clean recreation
# This drops and recreates the table cleanly

set -e

echo "🔧 Reparando tabla sire_submissions..."
echo ""

# Load environment
set -a
source .env.local
set +a

# Apply fix
pnpm dlx tsx scripts/database/execute-ddl-via-api.ts fix-sire-submissions.sql

echo ""
echo "✅ Tabla reparada exitosamente!"
echo ""
echo "Ahora prueba: http://localhost:3000/super-admin/compliance"
