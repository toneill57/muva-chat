# Branch Strategy - MUVA Platform

**Post-Stabilization 2025**

## Visual Overview

```
┌─────────────────────────────────────────────────────────┐
│                   BRANCH STRATEGY                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  STAGING (Git Branch: staging)                         │
│  ├─ Propósito: Experimentación, breaking changes       │
│  ├─ Supabase: Proyecto separado (smdhgcpojpurvgdppufo) │
│  ├─ VPS: muva-chat-staging (PM2 instance)             │
│  └─ Deploy: Manual, no CI/CD                           │
│                    ↓                                    │
│  DEV (Git Branch: dev) ← ACTUAL DEFAULT                │
│  ├─ Propósito: Desarrollo estable, features           │
│  ├─ Supabase: Proyecto principal (ooaumjzaztmutltifhoq)│
│  ├─ VPS: muva-chat (PM2 instance)                     │
│  └─ Deploy: Manual por ahora                           │
│                    ↓                                    │
│  MAIN (Git Branch: main) ← NO USAR POR AHORA          │
│  ├─ Propósito: Producción real (futuro)               │
│  ├─ Supabase: Proyecto principal (mismo que dev)      │
│  ├─ VPS: N/A (no separado aún)                        │
│  └─ Deploy: Reservado para el futuro                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Workflow de Desarrollo

### Nueva Feature o Experimento
```bash
# 1. Checkout staging
git checkout staging
git pull origin staging

# 2. Conectar a Supabase staging
npm run env:staging  # (script a crear en siguiente tarea)

# 3. Desarrollar
npm run dev
# Hacer cambios, probar, romper cosas OK
```

### Feature Estable → Dev
```bash
# 1. Merge a dev
git checkout dev
git merge staging

# 2. Conectar a Supabase production
npm run env:production

# 3. Build y test
npm run build && npm run test

# 4. Push
git push origin dev
```

### Deploy a VPS
```bash
# Dev deployment (script a crear)
./scripts/deploy-dev.sh

# NUNCA (por ahora) merge a main
# main está reservado para cuando tengamos producción real separada
```

## Ambientes Detallados

### STAGING
- **Git Branch:** staging
- **Supabase Project ID:** smdhgcpojpurvgdppufo
- **VPS Directory:** /var/www/muva-chat-staging
- **PM2 Process:** muva-chat-staging
- **Purpose:** Experimentación, breaking changes, features no estables
- **Deployment:** Manual
- **Isolation:** Base de datos separada (safe para romper)

### DEV
- **Git Branch:** dev (CURRENT DEFAULT)
- **Supabase Project ID:** ooaumjzaztmutltifhoq
- **VPS Directory:** /var/www/muva-chat
- **PM2 Process:** muva-chat
- **Purpose:** Desarrollo estable, features testeadas
- **Deployment:** Manual (scripts a crear)
- **Data:** Producción real (cuidado con cambios destructivos)

### MAIN
- **Git Branch:** main
- **Status:** RESERVED (no usar actualmente)
- **Future Purpose:** Producción cuando se separe de dev
- **Current State:** Mismo que dev, no deploy separado

## Reglas Importantes

1. **SIEMPRE** trabajar en staging primero para features riesgosas
2. **NUNCA** hacer breaking changes directamente en dev
3. **NUNCA** merge a main (por ahora)
4. **SIEMPRE** verificar ambiente antes de ejecutar migrations
5. **SIEMPRE** usar `npm run validate-env` antes de deploy

## Validación de Ambiente

Antes de cualquier operación importante:
```bash
# Verificar ambiente actual
npm run validate-env

# Output esperado:
# ✅ Ambiente: STAGING (o PRODUCTION)
# ✅ Todas las variables presentes
```

## Scripts de Gestión de Ambiente

### Toggle Entre Ambientes
```bash
# Cambiar entre staging y production
./scripts/toggle-env.sh

# El script detecta automáticamente el ambiente actual
# y ofrece cambiar al otro
```

### Validar Ambiente Actual
```bash
# Validar que todas las variables necesarias existen
./scripts/validate-env.sh

# Exit code 0 = OK
# Exit code 1 = Variables faltantes
```

## Troubleshooting

### Problema: No sé en qué ambiente estoy
```bash
./scripts/validate-env.sh
# Muestra: "Ambiente detectado: STAGING" o "PRODUCTION"
```

### Problema: Quiero cambiar de ambiente
```bash
./scripts/toggle-env.sh
# Hace backup automático de .env.local
# Toggle a .env.staging (si estabas en production)
# o .env.local (si estabas en staging)
```

### Problema: Variables faltantes después de toggle
```bash
./scripts/validate-env.sh
# Lista exactamente qué variables faltan
```

### Problema: Hice cambios destructivos en ambiente equivocado
```bash
# 1. Restaurar backup
ls -la .env.backups/
# Buscar backup más reciente: .env.local.backup.YYYYMMDD_HHMMSS

# 2. Restaurar
cp .env.backups/.env.local.backup.YYYYMMDD_HHMMSS .env.local

# 3. Validar
./scripts/validate-env.sh
```

## Migration Safety Checklist

Antes de ejecutar migrations:
- [ ] `./scripts/validate-env.sh` → Verificar ambiente
- [ ] ¿Es staging? → OK, proceder
- [ ] ¿Es production? → ¿Estás seguro? Revisar 2 veces
- [ ] ¿Hay backup reciente de la DB? → Verificar antes
- [ ] ¿La migration es reversible? → Si no, considerar staging primero

## Future Work

### Cuando Separemos Production de Dev:
1. Crear rama `production` separada de `main`
2. Setup CI/CD para `main` → VPS producción separado
3. Actualizar scripts para incluir ambiente `production` real
4. Actualizar esta documentación

---

**Versión:** 1.0
**Última actualización:** 2025-10-30
**Parte de:** Project Stabilization 2025 - FASE 2
