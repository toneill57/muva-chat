#!/bin/bash
set -a
source .env.local
set +a

# Test simple DDL execution
SQL_QUERY='CREATE OR REPLACE FUNCTION test_ddl_execution() RETURNS TEXT LANGUAGE SQL AS $$ SELECT '\''DDL works!'\'' $$;'

curl -X POST "https://api.supabase.com/v1/projects/ooaumjzaztmutltifhoq/database/query" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"${SQL_QUERY}\"}"

echo ""
echo ""
echo "Now testing if function was created..."

curl -X POST "https://api.supabase.com/v1/projects/ooaumjzaztmutltifhoq/database/query" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"query":"SELECT test_ddl_execution() as result"}'

echo ""
