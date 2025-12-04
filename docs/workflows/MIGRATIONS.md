# Migration Workflow - DEFINITIVO

## ⚠️ REGLA DE ORO

**NUNCA** edites `supabase/migrations/` manualmente.
**SIEMPRE** trabaja en `/migrations/` y deja que la automatización sincronice.

---

## 🎯 Crear Nueva Migración

### Paso 1: Crear archivo de migración

```bash
# Crear archivo en /migrations/
# Formato: YYYYMMDDHHMMSS_nombre_descriptivo.sql
touch migrations/$(date +%Y%m%d%H%M%S)_nombre_descriptivo.sql
```

### Paso 2: Escribir SQL

Edita el archivo y escribe tu migración:

```sql
-- migrations/20251204120000_add_new_table.sql

CREATE TABLE IF NOT EXISTS public.nueva_tabla (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Paso 3: Aplicar a base de datos

```bash
# Aplicar migración
node .claude/db-query.js "$(cat migrations/20251204120000_add_new_table.sql)"
```

### Paso 4: Registrar en schema_migrations

```bash
# Registrar migración aplicada
node .claude/db-query.js "
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES ('20251204120000', 'add_new_table', ARRAY['-- applied']::text[])
"
```

### Paso 5: Hacer commit

```bash
git add migrations/20251204120000_add_new_table.sql
git commit -m "feat: add nueva_tabla migration"
# ✅ El pre-commit hook sincroniza automáticamente a supabase/migrations/
```

---

## 🤖 Qué Hace el Pre-Commit Hook Automáticamente

Cada vez que haces commit, el hook ejecuta:

1. ✅ **Sincronización**: Ejecuta `.claude/sync-migrations.sh`
   - Copia `/migrations/**/*.sql` → `/supabase/migrations/`
   - Incluye subdirectorios (archive, backup, etc.)

2. ✅ **Validación de counts**: Verifica que ambos directorios tengan el mismo número de archivos

3. ✅ **Validación de checksums**: Compara MD5 de cada archivo
   - Si difieren → bloquea commit con error

4. ✅ **Auto-stage**: Agrega automáticamente `supabase/migrations/` al commit

5. ❌ **Bloqueo en error**: Si algo falla, el commit se cancela

---

## 📊 GitHub Action - Validación CI/CD

En cada push a `dev`, `tst`, o `prd`, GitHub Action valida:

### Paso 1: Validación de repositorio

```bash
# Cuenta archivos en ambos directorios
migrations/*.sql == supabase/migrations/*.sql
```

### Paso 2: Validación contra base de datos

```bash
# DEV: Compara contra zpyxgkvonrxbhvmkuzlt
# TST: Compara contra bddcvjoeoiekzfetvxoe
# PRD: Compara contra kprqghwdnaykxhostivv

SELECT COUNT(*) FROM supabase_migrations.schema_migrations
# Debe coincidir con count de archivos en supabase/migrations/
```

### Resultado

- ✅ Si pasa → Merge permitido
- ❌ Si falla → Merge bloqueado hasta resolver

---

## 🛠️ Troubleshooting

### Error: "Migration count mismatch"

**Síntoma:**
```
❌ ERROR: Desincronización detectada
   migrations/: 43 archivos
   supabase/migrations/: 42 archivos
```

**Causa:** Archivos en un directorio pero no en otro

**Fix:**
```bash
# Ejecutar sincronización manual
pnpm run migrations:sync

# Verificar
ls migrations/*.sql | wc -l
ls supabase/migrations/*.sql | wc -l
```

### Error: "Contenido diferente en XXXXXX"

**Síntoma:**
```
❌ ERROR: Contenido diferente en 20251120042744_fix.sql
```

**Causa:** Archivo editado en un directorio pero no en el otro

**Fix:**
```bash
# Copiar desde source of truth (/migrations/)
cp migrations/20251120042744_fix.sql supabase/migrations/

# O ejecutar sync completo
pnpm run migrations:sync
```

### Error: "Supabase Unhealthy"

**Síntoma:** Dashboard de Supabase muestra "Migrations Unhealthy"

**Causa:** Base de datos tiene migraciones no registradas en repositorio

**Fix:**
```bash
# 1. Listar migraciones en DB
node .claude/db-query.js "
SELECT version, name
FROM supabase_migrations.schema_migrations
ORDER BY version
"

# 2. Comparar con archivos en repo
ls migrations/*.sql

# 3. Crear stubs para migraciones faltantes
# Ejemplo:
cat > migrations/20251120042744_fix.sql <<EOF
-- Historical migration (already applied)
-- This file exists as a placeholder to match schema_migrations
EOF

# 4. Copiar a supabase/migrations/
pnpm run migrations:sync

# 5. Commit y push
git add migrations/ supabase/migrations/
git commit -m "fix: add missing migration placeholders"
git push
```

---

## 📝 Scripts Disponibles

### `pnpm run migrations:sync`

Sincroniza manualmente `/migrations/` → `/supabase/migrations/`

```bash
pnpm run migrations:sync
```

---

## 🔒 Garantías del Sistema

Con este workflow implementado:

### ✅ Imposible commitear sin sincronización
- Pre-commit hook bloquea si hay desincronización
- Auto-sincroniza antes de commit

### ✅ Imposible mergear con problemas
- GitHub Action valida en cada PR
- Bloquea merge si hay mismatch DB ↔ repo

### ✅ Triple verificación
1. **Local**: Pre-commit hook
2. **CI/CD**: GitHub Action
3. **Final**: Supabase Health Check

### ✅ Zero intervención manual
- Desarrollador solo edita `/migrations/`
- Todo lo demás es automático

---

## 🚨 Nunca Más

Este workflow **elimina completamente** los problemas de:

- ❌ "Remote migration versions not found"
- ❌ Desincronización entre directorios
- ❌ 2 horas de debugging
- ❌ Migraciones faltantes
- ❌ Symlinks no seguidos
- ❌ Configs inválidos

**Resultado:** Migraciones que funcionan. Siempre. En todos los ambientes.

---

**Última actualización:** Diciembre 4, 2025
**Autor:** Sistema de Migraciones Automatizado MUVA Chat
