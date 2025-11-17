# FASE 3 - Apply Migrations to PRD (main)

**Project ID:** `kprqghwdnaykxhostivv`
**Database Host:** `db.kprqghwdnaykxhostivv.supabase.co`
**Status:** Ready to apply 18 migrations

## Required Information

You'll need the **database password** for the `postgres` user. This can be obtained from:
- Supabase Dashboard → Project Settings → Database → Connection String
- Or use the service role key as password

## Migration Application Steps

### Option A: Using Supabase CLI (RECOMMENDED - FASTEST)

```bash
# Install Supabase CLI if not already installed
brew install supabase/tap/supabase

# Login
supabase login

# Link to project
supabase link --project-ref kprqghwdnaykxhostivv

# Push all migrations
supabase db push

# Verify
supabase db list-migrations
```

###Option B: Using psql Directly

```bash
# Set environment variables
export PGPASSWORD="<your-database-password-here>"
export DB_HOST="db.kprqghwdnaykxhostivv.supabase.co"
export DB_PORT="5432"
export DB_NAME="postgres"
export DB_USER="postgres"

# Apply each migration in order
cd /Users/oneill/Sites/apps/muva-chat

for migration in supabase/migrations/*.sql; do
  echo "Applying: $(basename "$migration")"
  psql "postgresql://$DB_USER@$DB_HOST:$DB_PORT/$DB_NAME" -f "$migration"

  if [ $? -eq 0 ]; then
    echo "✅ Success: $(basename "$migration")"
  else
    echo "❌ Failed: $(basename "$migration")"
    break
  fi
done
```

### Option C: Single Command with Connection String

```bash
# Get your connection string from Supabase Dashboard
# Format: postgresql://postgres:[YOUR-PASSWORD]@db.kprqghwdnaykxhostivv.supabase.co:5432/postgres

export CONNECTION_STRING="postgresql://postgres:[PASSWORD]@db.kprqghwdnaykxhostivv.supabase.co:5432/postgres"

cd /Users/oneill/Sites/apps/muva-chat

for migration in $(ls supabase/migrations/*.sql | sort); do
  filename=$(basename "$migration")
  echo "📝 Applying: $filename"

  psql "$CONNECTION_STRING" -f "$migration" > /dev/null 2>&1

  if [ $? -eq 0 ]; then
    echo "   ✅ SUCCESS"
  else
    echo "   ❌ FAILED - Check error above"
    exit 1
  fi
done

echo ""
echo "✅ All 18 migrations applied successfully!"
```

## Post-Migration Validation

After applying migrations, validate the schema:

```bash
# Check migration count
psql "$CONNECTION_STRING" -c "SELECT COUNT(*) FROM supabase_migrations.schema_migrations;"

# Expected: 18

# Check table count
psql "$CONNECTION_STRING" -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"

# Expected: ~43 tables

# List all tables
psql "$CONNECTION_STRING" -c "\dt public.*"
```

## Verification Checklist

- [ ] 18 migrations applied
- [ ] 43 tables created in public schema
- [ ] `tenant_registry` table exists
- [ ] `hotels` schema exists
- [ ] `accommodation_units_public` view/table exists
- [ ] No critical advisors warnings

## Next Steps

After successful migration:
1. Run `mcp__supabase__list_migrations` to verify count
2. Run `mcp__supabase__list_tables` to verify tables
3. Run `mcp__supabase__get_advisors` for security/performance checks
4. Document completion in `FASE3_COMPLETION_REPORT.md`
5. Proceed to FASE 4 - Config Local

## Rollback (if needed)

If migrations fail, you can reset the database:

```bash
# WARNING: This will delete ALL data!
supabase db reset --linked
```

---

**Last Updated:** 2025-11-16
**Status:** Instructions prepared, awaiting user execution
