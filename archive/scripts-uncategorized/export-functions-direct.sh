#!/bin/bash
set -a
source .env.local
set +a

# Build connection string for pg_dump
# Format: postgresql://[user[:password]@][host][:port][/dbname]
HOST="aws-0-us-west-1.pooler.supabase.com"
PORT="6543"
DB="postgres"
USER="postgres.ztfslsrkemlfqjpzksir"
PASSWORD="${SUPABASE_DB_PASSWORD}"

pg_dump \
  "postgresql://${USER}:${PASSWORD}@${HOST}:${PORT}/${DB}" \
  --schema=public \
  --schema-only \
  --section=post-data \
  --no-owner \
  --no-privileges \
  > /tmp/all-functions-raw.sql 2>/tmp/pg_dump-error.log

echo "Exported to /tmp/all-functions-raw.sql"
wc -l /tmp/all-functions-raw.sql
head -50 /tmp/all-functions-raw.sql
