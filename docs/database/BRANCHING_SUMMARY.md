# Supabase Branching - Resumen Rápido

**Fecha:** 2025-11-01  
**Documento Completo:** `SUPABASE_BRANCHING_ANALYSIS_COMPLETE.md`

---

## Estado Actual (2 Branches)

### Branch "dev" (iyeueszchbvlutlcmvcb) - DEFAULT

```
URL: https://iyeueszchbvlutlcmvcb.supabase.co
Status: MIGRATIONS_FAILED ⚠️
Datos: 6,641 registros ✅
Funciones: 90 ✅
Security: 0 issues ✅
Git Branch: dev (CONGELADA)
```

**Uso:** Branch principal con TODOS los datos de producción

### Branch "staging-v21" (rmrflrttpobzlffhctjt) - NUEVO

```
URL: https://rmrflrttpobzlffhctjt.supabase.co
Status: FUNCTIONS_DEPLOYED ✅
Datos: 0 registros ❌
Funciones: 204 ✅
Security: 17 issues ⚠️
Git Branch: staging (ACTIVA)
```

**Uso:** Pre-producción (VACÍO, necesita datos)

---

## Hallazgo Crítico

**NO existe "proyecto base" separado.**

`iyeueszchbvlutlcmvcb` es SIMULTÁNEAMENTE:
- El proyecto padre
- El branch "dev" (default)

Esto es comportamiento NORMAL de Supabase Branching.

---

## Problemas Principales

### 1. MIGRATIONS_FAILED en dev ⚠️
- Última migración tuvo problemas (2025-10-31)
- Funcionalidad NO afectada
- Solución: `supabase migration repair`

### 2. staging-v21 VACÍO ❌
- 0 registros en todas las tablas
- No se puede probar funcionalidad
- Solución: Recrear con `--with-data=true` o copiar datos

### 3. Security Warnings en staging-v21 ⚠️
- 17 warnings (vs 0 en dev)
- Extension `vector` en schema incorrecto
- Solución: Aplicar fixes de octubre 2025

### 4. Diferencia de 114 funciones 🤔
- dev: 90 funciones
- staging-v21: 204 funciones
- Necesita investigación

---

## Mapeo Git ↔ Supabase

| Git Branch | Supabase Branch | Project Ref | Datos | Status |
|------------|-----------------|-------------|-------|--------|
| dev (congelada) | dev (DEFAULT) | iyeueszchbvlutlcmvcb | ✅ 6,641 | MIGRATIONS_FAILED |
| staging (activa) | staging-v21 | rmrflrttpobzlffhctjt | ❌ 0 | FUNCTIONS_DEPLOYED |
| main | - | - | - | NO EXISTS |

---

## Próximos Pasos Inmediatos

### HOY (Crítico)

1. Investigar MIGRATIONS_FAILED en dev
2. Decidir: ¿Poblar o recrear staging-v21?

### ESTA SEMANA (Importante)

3. Resolver 17 security warnings en staging-v21
4. Documentar función de cada branch
5. Investigar 114 funciones extra

### 2 SEMANAS (Seguimiento)

6. Implementar seeding script
7. Normalizar ambos branches
8. Planear arquitectura 3-tier

---

## Arquitectura Recomendada (Futuro)

```
AHORA (Temporal):
├── dev (iyeueszchbvlutlcmvcb) → Desarrollo + datos producción
└── staging-v21 (rmrflrttpobzlffhctjt) → Pre-prod (vacío)

FUTURO (Ideal):
├── Proyecto nuevo → Producción real (main)
├── Branch staging → Pre-prod con datos production-like
└── Branch dev → Desarrollo con datos de prueba
```

---

## Comandos Útiles

```bash
# Listar branches
supabase branches list --project-ref iyeueszchbvlutlcmvcb

# Verificar migraciones
supabase migration list --project-ref iyeueszchbvlutlcmvcb

# Reparar migración fallida
supabase migration repair --project-ref iyeueszchbvlutlcmvcb

# Recrear staging con datos
supabase branches delete staging-v21 --project-ref iyeueszchbvlutlcmvcb
supabase branches create staging-v21 \
  --project-ref iyeueszchbvlutlcmvcb \
  --with-data=true \
  --git-branch=staging

# Verificar security advisors
supabase advisors --project-ref rmrflrttpobzlffhctjt --type=security
```

---

**Última Actualización:** 2025-11-01  
**Owner:** Database Agent
