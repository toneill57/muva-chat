# Sincronización Git ↔ Supabase Branches

**Created:** November 1, 2025  
**Status:** Active  
**Purpose:** Mapeo entre ramas Git y branches Supabase para ambientes de desarrollo

---

## Mapeo de Ambientes

| Git Branch | Supabase Branch | Project Ref | URL | Archivo .env | Records | Status |
|------------|-----------------|-------------|-----|--------------|---------|--------|
| dev | dev | ooaumjzaztmutltifhoq | https://ooaumjzaztmutltifhoq.supabase.co | `.env.dev` | 7,757 | ✅ Activo |
| staging | staging | rvjmwwvkhglcuqwcznph | https://rvjmwwvkhglcuqwcznph.supabase.co | `.env.staging` | 6,576 | ✅ Activo |
| main | (base project) | ooaumjzaztmutltifhoq | https://ooaumjzaztmutltifhoq.supabase.co | `.env.production` | 7,757 | ✅ Producción |

---

## Uso

### Desarrollo Local (Branch dev)

```bash
# Copiar configuración de dev
cp .env.dev .env.local

# Iniciar servidor de desarrollo
./scripts/dev-with-keys.sh
# o
pnpm run dev
```

### Testing Staging (Branch staging)

```bash
# GitHub Actions usa automáticamente .env.staging
git checkout staging
git push origin staging

# El deploy se ejecuta automáticamente:
# - Build con credenciales staging-v21
# - Deploy a VPS /var/www/muva-chat-staging
# - Conecta a https://rmrflrttpobzlffhctjt.supabase.co
```

### Deploy a Production (Branch main)

```bash
# GitHub Actions usa automáticamente .env.production
git checkout main
git merge staging  # Solo después de validar staging
git push origin main

# El deploy se ejecuta automáticamente:
# - Build con credenciales production
# - Deploy a VPS /var/www/muva-chat
# - Conecta a https://ooaumjzaztmutltifhoq.supabase.co
```

---

## Tests de Conexión

### Test Manual

```bash
# Dev
curl -s https://ooaumjzaztmutltifhoq.supabase.co/rest/v1/ \
  -H "apikey: $(grep NEXT_PUBLIC_SUPABASE_ANON_KEY .env.dev | cut -d'=' -f2)" \
  -H "Content-Type: application/json"

# Staging
curl -s https://rvjmwwvkhglcuqwcznph.supabase.co/rest/v1/ \
  -H "apikey: $(grep NEXT_PUBLIC_SUPABASE_ANON_KEY .env.staging | cut -d'=' -f2)" \
  -H "Content-Type: application/json"

# Production
curl -s https://ooaumjzaztmutltifhoq.supabase.co/rest/v1/ \
  -H "apikey: $(grep NEXT_PUBLIC_SUPABASE_ANON_KEY .env.production | cut -d'=' -f2)" \
  -H "Content-Type: application/json"
```

**Expected:** HTTP 200 OK

### Resultados de Tests (Nov 1, 2025)

- ✅ Dev: HTTP 200 OK
- ✅ Staging-v21: HTTP 200 OK
- ✅ Production: HTTP 200 OK

---

## Notas Importantes

### Branch Staging

- **Purpose:** Ambiente de staging para testing pre-production
- **Records:** 6,576 registros copiados de dev (November 2025)
- **Usage:** Testing pre-production, QA validation, feature testing
- **Created:** 2025-11-01 desde dev branch
- **IMPORTANT:** Datos deben sincronizarse periódicamente desde dev

### Branch Dev

- **Purpose:** Development activo, datos en evolución (IS production)
- **Records:** 7,757 registros (November 2025)
- **Usage:** Desarrollo local, testing de features
- **OK:** Ejecutar migraciones, agregar datos de prueba

### Production

- **Purpose:** Ambiente de producción
- **Same Project:** Usa el mismo project_id que dev (ooaumjzaztmutltifhoq)
- **Diferencia:** Branch main vs branch dev
- **CRITICAL:** Solo deployar código validado en staging

---

## Workflow CI/CD

### GitHub Actions

```yaml
# .github/workflows/deploy-staging.yml
on:
  push:
    branches: [staging]
env:
  # Carga .env.staging automáticamente
  SUPABASE_PROJECT_ID: rvjmwwvkhglcuqwcznph
  SUPABASE_URL: https://rvjmwwvkhglcuqwcznph.supabase.co
  # ... resto de variables de .env.staging

# .github/workflows/deploy-production.yml
on:
  push:
    branches: [main]
env:
  # Carga .env.production automáticamente
  SUPABASE_PROJECT_ID: ooaumjzaztmutltifhoq
  SUPABASE_URL: https://ooaumjzaztmutltifhoq.supabase.co
  # ... resto de variables de .env.production
```

### Deploy Manual

Si necesitas deployar manualmente:

```bash
# Staging
ssh user@vps
cd /var/www/muva-chat-staging
git pull origin staging
cp .env.staging .env.local
pnpm install --frozen-lockfile
pnpm run build
pm2 restart muva-staging

# Production
ssh user@vps
cd /var/www/muva-chat
git pull origin main
cp .env.production .env.local
pnpm install --frozen-lockfile
pnpm run build
pm2 restart muva-production
```

---

## Troubleshooting

### Error: "Invalid API Key"

**Causa:** Archivo .env incorrecto copiado a .env.local

**Solución:**
```bash
# Verificar qué branch estás usando
git branch --show-current

# Copiar el .env correspondiente
cp .env.dev .env.local     # Para dev branch
cp .env.staging .env.local # Para staging testing
```

### Error: "Table not found"

**Causa:** Conectando a un branch que no tiene las tablas esperadas

**Solución:**
```bash
# Verificar el project_id en .env.local
grep SUPABASE_PROJECT_ID .env.local

# Debe coincidir con:
# - ooaumjzaztmutltifhoq → dev/production
# - rvjmwwvkhglcuqwcznph → staging
```

### Error: "Authentication failed"

**Causa:** JWT_SECRET incorrecto para el ambiente

**Solución:**
```bash
# Cada ambiente tiene su propio JWT_SECRET
# Dev/Production: LGqZ/SgchZzT8Oee99uPP5FljEewJFC+2pUSEzEAc6firJoKk2JBxWNicAf7Hm6aZ25pTZDQE7nWaSfC/Ndidg==
# Staging: staging_jwt_secret_muva_2025_staging_v21_rmrflrttpobzlffhctjt

# Tokens generados en un ambiente NO funcionan en otro
# Esto es por diseño para seguridad
```

---

## Archivos Relacionados

- `/Users/oneill/Sites/apps/muva-chat/.env.dev` - Credenciales branch dev
- `/Users/oneill/Sites/apps/muva-chat/.env.staging` - Credenciales staging-v21
- `/Users/oneill/Sites/apps/muva-chat/.env.production` - Credenciales production
- `/Users/oneill/Sites/apps/muva-chat/.env.local` - Archivo local (git ignored)
- `/.github/workflows/deploy-staging.yml` - CI/CD staging
- `/.github/workflows/deploy-production.yml` - CI/CD production

---

## Cambios Recientes

### November 1, 2025
- ✅ Creado `.env.dev` para branch dev (ooaumjzaztmutltifhoq)
- ✅ Creado nuevo branch staging (rvjmwwvkhglcuqwcznph) reemplazando staging-v21
- ✅ Actualizado `.env.staging` con credenciales del nuevo branch
- ✅ Confirmado `.env.production` para main branch (ooaumjzaztmutltifhoq)
- ✅ Copiados 6,576 registros de dev a staging (94.6%)
- ✅ Verificados tests de conexión: todos 200 OK
- ✅ Documentado mapeo completo Git ↔ Supabase
- ✅ Creados scripts de copia de datos: `copy-dev-to-staging.ts`, `copy-missing-tables.ts`

---

**Last Updated:** November 1, 2025  
**Maintained By:** Database Agent  
**Review Frequency:** Monthly or on environment changes
