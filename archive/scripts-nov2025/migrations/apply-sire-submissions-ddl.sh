#!/bin/bash
set -e

# Load environment variables
set -a
source .env.local
set +a

echo "📦 Applying sire_submissions migration..."
echo "Database: $NEXT_PUBLIC_SUPABASE_URL"
echo ""

# Read the migration file
SQL_FILE="migrations/20251126180000_create_sire_submissions.sql"

if [ ! -f "$SQL_FILE" ]; then
    echo "❌ Migration file not found: $SQL_FILE"
    exit 1
fi

echo "📄 Reading migration file..."
SQL_CONTENT=$(cat "$SQL_FILE")

# Execute using Supabase Management API
echo "🚀 Executing migration..."

# Use the Supabase project URL to extract project ID
PROJECT_REF=$(echo "$NEXT_PUBLIC_SUPABASE_URL" | sed -E 's|https://([^.]+)\.supabase\.co|\1|')

echo "Project Reference: $PROJECT_REF"

# Execute the SQL using Supabase SQL endpoint
curl -X POST \
  "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/rpc/exec_sql" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(cat "$SQL_FILE" | jq -Rs .)}" \
  2>/dev/null || {
    echo ""
    echo "⚠️  Direct SQL execution not available, trying alternative method..."
    echo ""

    # Try using psql if available
    if command -v psql &> /dev/null; then
        echo "Using psql to execute migration..."
        psql "$DATABASE_URL" -f "$SQL_FILE"
    else
        echo "❌ Neither Supabase RPC nor psql available"
        echo "Please apply the migration manually via Supabase Dashboard"
        exit 1
    fi
}

echo ""
echo "✅ Migration applied successfully!"
