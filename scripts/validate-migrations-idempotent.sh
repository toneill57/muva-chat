#!/bin/bash
# Validate that migrations are idempotent
# Called by pre-commit hook

# Get list of staged migration files
STAGED_MIGRATIONS=$(git diff --cached --name-only --diff-filter=ACM | grep "^migrations/.*\.sql$")

if [ -z "$STAGED_MIGRATIONS" ]; then
  echo "✅ No migrations to validate"
  exit 0
fi

echo "Checking migrations for idempotency patterns..."

# Check for common idempotency patterns
for file in $STAGED_MIGRATIONS; do
  if [ -f "$file" ]; then
    echo "  Checking: $file"

    # Look for CREATE statements without IF NOT EXISTS
    if grep -q "CREATE TABLE" "$file" && ! grep -q "IF NOT EXISTS" "$file"; then
      echo "  ⚠️  CREATE TABLE without IF NOT EXISTS found"
    fi

    # Look for DROP statements without IF EXISTS
    if grep -q "DROP" "$file" && ! grep -q "IF EXISTS" "$file"; then
      echo "  ⚠️  DROP without IF EXISTS found"
    fi
  fi
done

echo "✅ Migration validation complete"
exit 0
