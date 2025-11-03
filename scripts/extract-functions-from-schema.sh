#!/bin/bash

# Extract all functions from core schema
INPUT="/Users/oneill/Sites/apps/muva-chat/supabase/migrations/20250101000000_create_core_schema.sql"
OUTPUT="/tmp/extracted-functions.sql"

# Extract functions using awk
awk '
  /^CREATE.*FUNCTION/ {capture=1}
  capture {print}
  /^\$\$;$/ && capture {capture=0; print ""}
' "$INPUT" > "$OUTPUT"

echo "Extracted functions to $OUTPUT"
wc -l "$OUTPUT"
grep -c "CREATE.*FUNCTION" "$OUTPUT"
