#!/bin/bash
set -a
source .env.local
set +a

# Extract database connection details
DB_URL="${SUPABASE_DB_URL}"

# Use pg_dump to export ONLY functions
PGPASSWORD="${SUPABASE_DB_PASSWORD}" pg_dump \
  "${DB_URL}" \
  --schema=public \
  --schema-only \
  --no-owner \
  --no-privileges \
  --no-tablespaces \
  --no-comments \
  | grep -A 500 "CREATE FUNCTION\|CREATE OR REPLACE FUNCTION" \
  > /tmp/all-functions-raw.sql

echo "Exported functions to /tmp/all-functions-raw.sql"
wc -l /tmp/all-functions-raw.sql
