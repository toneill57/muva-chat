# Migration Authentication Fix - Analysis & Solutions

**Fecha:** 2025-11-02
**Problema:** Migrations fallando con "FATAL: Tenant or user not found"

---

## 🔍 Root Cause Analysis

### El Problema

Script `apply-migrations-staging-v2.ts` usa `SERVICE_ROLE_KEY` como password de PostgreSQL:

```typescript
// LÍNEA 34 - INCORRECTO
const CONNECTION_STRING = `postgresql://postgres.${STAGING_PROJECT_ID}:${STAGING_SERVICE_KEY}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`;
```

**Error resultante:**
```
psql: error: connection to server failed: FATAL: Tenant or user not found
```

### Por Qué Falla

Hay **DOS tipos de credenciales** en Supabase:

| Credencial | Tipo | Uso | Longitud |
|-----------|------|-----|----------|
| `SERVICE_ROLE_KEY` | JWT | Supabase API (REST, Auth, Storage) | ~220 chars |
| `DB_PASSWORD` | String | PostgreSQL directo (psql, pg_dump) | ~88 chars |

**SERVICE_ROLE_KEY NO funciona** como password de PostgreSQL - es un JWT para la API.

### Evidencia

1. **Scripts exitosos usan DB_PASSWORD:**
   - `backup-production-db.ts` → `PGPASSWORD="${DB_PASSWORD}"`
   - `rollback-production.ts` → `PGPASSWORD="${DB_PASSWORD}"`
   - `apply-data-via-psql.sh` → `PGPASSWORD="mlmYAxOr..."`

2. **Longitudes diferentes:**
   - SERVICE_ROLE_KEY staging: 219 caracteres
   - DB_PASSWORD en scripts: 88 caracteres

3. **Test de conexión falló:**
   - Intentar psql con SERVICE_ROLE_KEY → Connection hung/timeout

---

## 🎯 Soluciones Propuestas

### Opción A: Usar DB_PASSWORD Real (RECOMENDADO)

**Pros:**
- ✅ Correcto según documentación Supabase
- ✅ Consistente con otros scripts (`backup-production-db.ts`)
- ✅ Más seguro (JWT vs password)
- ✅ Standard PostgreSQL

**Contras:**
- ⚠️ Requiere obtener password de Supabase Dashboard
- ⚠️ Requiere agregar secret a GitHub Actions

**Implementación:**

1. **Obtener DB Password:**
   ```
   Supabase Dashboard → Project rvjmwwvkhglcuqwcznph
   → Settings → Database → Connection string
   → Copiar password
   ```

2. **Agregar a GitHub Secrets:**
   ```
   Repo → Settings → Secrets → Actions
   → New repository secret
   → Name: SUPABASE_STAGING_DB_PASSWORD
   → Value: [password from step 1]
   ```

3. **Script ya actualizado:**
   ```typescript
   const STAGING_DB_PASSWORD = process.env.SUPABASE_STAGING_DB_PASSWORD;
   const CONNECTION_STRING = `postgresql://postgres.${STAGING_PROJECT_ID}:${STAGING_DB_PASSWORD}@...`;
   ```

4. **Workflow ya actualizado:**
   ```yaml
   env:
     SUPABASE_STAGING_DB_PASSWORD: ${{ secrets.SUPABASE_STAGING_DB_PASSWORD }}
   ```

### Opción B: SERVICE_ROLE_KEY en URL + Pooler Transaction Mode

**Pros:**
- ✅ No requiere secret adicional
- ✅ Ya existe SERVICE_ROLE_KEY en secrets

**Contras:**
- ❌ NO confirmado que funcione con Supabase
- ❌ Inconsistente con otros scripts
- ❌ JWT no es el método correcto para psql

**Implementación (NO RECOMENDADA):**
```typescript
// Usar service key directamente en URL (método alternativo de Supabase)
const CONNECTION_STRING = `postgresql://postgres:${STAGING_SERVICE_KEY}@aws-0-us-east-1.pooler.supabase.com:6543/postgres?options=-c%20search_path%3Dpublic`;
```

---

## ✅ Recomendación: OPCIÓN A

**Razón:** Opción A es el método estándar, documentado y probado.

### Action Items

1. **Obtener DB Password** (Usuario debe hacer esto):
   - Ir a Supabase Dashboard
   - Proyecto staging (`rvjmwwvkhglcuqwcznph`)
   - Settings → Database → Connection string
   - Copiar password

2. **Agregar a GitHub Secrets:**
   - Repository Settings → Secrets → Actions
   - Nombre: `SUPABASE_STAGING_DB_PASSWORD`
   - Valor: password del paso 1

3. **Código ya está actualizado:**
   - ✅ `scripts/apply-migrations-staging-v2.ts`
   - ✅ `scripts/rollback-migration-staging-v2.ts`
   - ✅ `.github/workflows/deploy-staging.yml`

4. **Test del fix:**
   ```bash
   # Push cambios a staging
   git add .
   git commit -m "fix(ci): use DB_PASSWORD for staging migrations"
   git push origin staging

   # Monitorear GitHub Actions
   # Migrations ahora deberían pasar ✅
   ```

---

## 🔄 Para Production (FASE 4)

Mismos pasos pero para producción:

1. **Obtener DB Password:**
   - Proyecto production (`iyeueszchbvlutlcmvcb`)
   - Settings → Database → Connection string

2. **Secret name:** `SUPABASE_PRODUCTION_DB_PASSWORD`

3. **Ya implementado en:**
   - `scripts/apply-migrations-production.ts`
   - `scripts/backup-production-db.ts`
   - `scripts/rollback-production.ts`

---

## 📚 Referencias

- **Supabase Docs:** https://supabase.com/docs/guides/database/connecting-to-postgres
- **Connection strings:** Use DB password, not API keys
- **Scripts corregidos:** `scripts/apply-migrations-staging-v2.ts:26-41`

---

**Status:** ✅ FIX IMPLEMENTADO en código
**Pending:** Agregar `SUPABASE_STAGING_DB_PASSWORD` a GitHub Secrets
**Next:** Usuario debe obtener password y agregarlo

