# Single Line Command - Apply Data Migrations

## COMPLETE - All Data Files (10, 11, 12, 13) - CORRECT PASSWORD

```bash
psql "postgresql://postgres:rabbitMuscaria0+@db.ztfslsrkemlfqjpzksir.supabase.co:5432/postgres" -f migrations/backup-2025-10-31/10-data-foundation.sql && psql "postgresql://postgres:rabbitMuscaria0+@db.ztfslsrkemlfqjpzksir.supabase.co:5432/postgres" -f migrations/backup-2025-10-31/11-data-catalog.sql && psql "postgresql://postgres:rabbitMuscaria0+@db.ztfslsrkemlfqjpzksir.supabase.co:5432/postgres" -f migrations/backup-2025-10-31/12-data-operations.sql && psql "postgresql://postgres:rabbitMuscaria0+@db.ztfslsrkemlfqjpzksir.supabase.co:5432/postgres" -f migrations/backup-2025-10-31/13-data-reservations.sql && echo "✅ DONE! Tell Claude to validate FK integrity now"
```

## QUICK - Just File 13 (Critical)

```bash
psql "postgresql://postgres:rabbitMuscaria0+@db.ztfslsrkemlfqjpzksir.supabase.co:5432/postgres" -f migrations/backup-2025-10-31/13-data-reservations.sql
```

---

## After running, tell Claude: "validate FK integrity now"
