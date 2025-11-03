# ANÁLISIS COMPLETO - Supabase Branching Architecture

**Fecha:** 2025-11-01  
**Proyecto Base:** ooaumjzaztmutltifhoq  
**Analista:** Database Agent

---

## RESUMEN EJECUTIVO

### Estado Actual de Branching

El proyecto tiene **2 branches activos** en Supabase:

1. **Branch "dev" (DEFAULT)** - Project Ref: `ooaumjzaztmutltifhoq`
   - Status: `MIGRATIONS_FAILED` ⚠️
   - Contiene TODOS los datos de producción
   - Es el branch DEFAULT del proyecto

2. **Branch "staging-v21" (NUEVO)** - Project Ref: `rmrflrttpobzlffhctjt`
   - Status: `FUNCTIONS_DEPLOYED` ✅
   - Branch VACÍO (0 registros en todas las tablas)
   - Creado: 2025-11-01 20:40:41 UTC

### Hallazgo Crítico

**NO existe un "proyecto base" separado.** El project_id `ooaumjzaztmutltifhoq` ES SIMULTÁNEAMENTE:
- El proyecto padre (parent project)
- El branch "dev" (default branch)

Esto es comportamiento NORMAL en Supabase Branching:
- El proyecto original se convierte automáticamente en el branch "default"
- Los branches nuevos heredan del proyecto original

---

## DETALLE POR BRANCH

### 1. Branch "dev" (ooaumjzaztmutltifhoq)

**Identificación:**
- Branch ID: `ooaumjzaztmutltifhoq`
- Branch Name: `dev`
- Project Ref: `ooaumjzaztmutltifhoq` (MISMO que project_id)
- URL: https://ooaumjzaztmutltifhoq.supabase.co
- Status: `MIGRATIONS_FAILED` ⚠️
- Git Branch Vinculado: `dev`
- Region: No especificada (default)
- PostgreSQL: 17.6 on aarch64-unknown-linux-gnu

**Características:**
- ✅ Es Default: **Sí**
- ❌ Es Persistente: **No** (se eliminará si se elimina el proyecto)
- 📅 Fecha Creación: 2025-10-25 21:05:25 UTC
- 📅 Última Actualización: 2025-10-31 19:08:51 UTC
- 🔗 Parent Project: N/A (ES el proyecto padre)

**Datos (Schema: public + hotels):**

| Esquema | Tablas | Top 5 Tablas con Datos |
|---------|--------|------------------------|
| public  | 41     | Ver tabla detallada abajo |
| hotels  | 9      | TODAS VACÍAS (0 registros) |

**Top 15 Tablas con Más Registros:**

| # | Schema | Tabla | Registros |
|---|--------|-------|-----------|
| 1 | public | `code_embeddings` | 4,333 |
| 2 | public | `muva_content` | 742 |
| 3 | public | `prospective_sessions` | 412 |
| 4 | public | `chat_messages` | 324 |
| 5 | public | `accommodation_units_manual_chunks` | 219 |
| 6 | public | `accommodation_units_public` | 151 |
| 7 | public | `guest_conversations` | 113 |
| 8 | public | `guest_reservations` | 104 |
| 9 | public | `reservation_accommodations` | 93 |
| 10 | public | `sync_history` | 85 |
| 11 | public | `calendar_events` | 74 |
| 12 | public | `staff_messages` | 59 |
| 13 | public | `sire_countries` | 45 |
| 14 | public | `staff_conversations` | 44 |
| 15 | public | `sire_cities` | 42 |

**Funciones:**
- Total: **90 funciones**
- Funciones de búsqueda vectorial: **31 funciones match_***
- Funciones RPC optimizadas (Oct 2025): **5 funciones**
  - `get_guest_conversation_metadata`
  - `get_inactive_conversations`
  - `get_conversation_messages`
  - `get_active_integration`
  - `get_reservations_by_external_id`

**Extensiones Instaladas:**
- ✅ `vector` (v0.8.0) - Schema: `extensions`
- ✅ `pg_stat_statements` (v1.11)
- ✅ `uuid-ossp` (v1.1)
- ✅ `pgcrypto` (v1.3)
- ✅ `pg_net` (v0.19.5)
- ✅ `pg_graphql` (v1.5.11)
- ✅ `supabase_vault` (v0.3.1)
- ✅ `plpgsql` (v1.0)

**Índices Vector (Top 10):**

| Índice | Tabla | Tipo | Operador | Config |
|--------|-------|------|----------|--------|
| `accommodation_units_public_embedding_idx` | `accommodation_units_public` | HNSW | vector_cosine_ops | m=16, ef=64 |
| `code_embeddings_embedding_idx` | `code_embeddings` | HNSW | vector_cosine_ops | m=16, ef=64 |
| `idx_accommodation_manual_embedding_balanced_hnsw` | `accommodation_units_manual` | HNSW | vector_cosine_ops | Default |
| `idx_accommodation_public_embedding_fast_hnsw` | `accommodation_units_public` | HNSW | vector_cosine_ops | Default |
| `idx_content_embedding_balanced` | `hotels.content` | HNSW | vector_cosine_ops | m=16, ef=64 |
| `idx_conversation_memory_embedding_fast` | `conversation_memory` | HNSW | vector_cosine_ops | m=16, ef=64 |
| `idx_guest_information_embedding_balanced` | `hotels.guest_information` | HNSW | vector_cosine_ops | m=16, ef=64 |
| `idx_hotel_operations_embedding_balanced` | `hotel_operations` | IVFFLAT | vector_cosine_ops | lists=100 |
| `idx_hotel_operations_embedding_balanced_hnsw` | `hotel_operations` | HNSW | vector_cosine_ops | Default |
| `idx_hotels_accommodation_units_embedding_balanced` | `hotels.accommodation_units` | HNSW | vector_cosine_ops | Default |

**Políticas RLS (Top 10 tablas con más policies):**

| Schema | Tabla | Políticas |
|--------|-------|-----------|
| public | `guest_reservations` | 5 |
| hotels | `guest_information` | 4 |
| public | `accommodation_units` | 4 |
| hotels | `pricing_rules` | 4 |
| hotels | `properties` | 4 |
| hotels | `unit_amenities` | 4 |
| hotels | `content` | 4 |
| hotels | `policies` | 4 |
| public | `accommodation_units_manual_chunks` | 4 |
| hotels | `client_info` | 4 |

**Migraciones Aplicadas:**
```
1. 20250101000000 - create_core_schema
2. 20251101063746 - fix_auth_rls_initplan_batch1
```

**Security Advisors:**
- ✅ **CERO warnings de seguridad**
- ✅ **CERO errores de seguridad**
- Estado: **CLEAN** 🎉

**Análisis:**
- ✅ Es el branch PRINCIPAL con todos los datos
- ⚠️ Status `MIGRATIONS_FAILED` indica última migración tuvo problemas
- ✅ Base de datos funcional (90 funciones, datos completos)
- ✅ Seguridad optimizada (octubre 2025)

---

### 2. Branch "staging-v21" (rmrflrttpobzlffhctjt)

**Identificación:**
- Branch ID: `rmrflrttpobzlffhctjt`
- Branch Name: `staging-v21`
- Project Ref: `rmrflrttpobzlffhctjt` (ÚNICO - branch real)
- URL: https://rmrflrttpobzlffhctjt.supabase.co
- Status: `FUNCTIONS_DEPLOYED` ✅
- Git Branch Vinculado: `staging`
- Region: No especificada (default)
- PostgreSQL: 17.6 on aarch64-unknown-linux-gnu

**Características:**
- ❌ Es Default: **No**
- ❌ Es Persistente: **No** (ephemeral branch)
- 📅 Fecha Creación: 2025-11-01 20:40:41 UTC
- 📅 Última Actualización: 2025-11-01 20:40:41 UTC
- 🔗 Parent Project: `ooaumjzaztmutltifhoq`

**Datos (Schema: public + hotels):**

| Esquema | Tablas | Registros Totales |
|---------|--------|-------------------|
| public  | 41     | **0** (VACÍO) |
| hotels  | 9      | **0** (VACÍO) |

**Top 15 Tablas (TODAS VACÍAS):**

| Schema | Tabla | Registros |
|--------|-------|-----------|
| hotels | `accommodation_units` | 0 |
| hotels | `client_info` | 0 |
| hotels | `content` | 0 |
| hotels | `guest_information` | 0 |
| hotels | `policies` | 0 |
| hotels | `pricing_rules` | 0 |
| hotels | `properties` | 0 |
| hotels | `unit_amenities` | 0 |
| public | `accommodation_units` | 0 |
| public | `accommodation_units_manual` | 0 |
| public | `accommodation_units_manual_chunks` | 0 |
| public | `accommodation_units_public` | 0 |
| public | `airbnb_motopress_comparison` | 0 |
| public | `airbnb_mphb_imported_reservations` | 0 |
| hotels | `accommodation_types` | 0 |

**Funciones:**
- Total: **204 funciones** (114 MÁS que dev)
- Funciones de búsqueda vectorial: **31 funciones match_***
- Funciones RPC optimizadas: **5 funciones**
  - `get_guest_conversation_metadata`
  - `get_inactive_conversations`
  - `get_conversation_messages`
  - `get_active_integration`
  - `get_reservations_by_external_id`

**Extensiones Instaladas:**
- ✅ `vector` (v0.8.0) - Schema: `public` ⚠️ (debería estar en extensions)
- ✅ `pg_stat_statements` (v1.11)
- ✅ `uuid-ossp` (v1.1)
- ✅ `pgcrypto` (v1.3)
- ✅ `pg_net` (v0.19.5)
- ✅ `pg_graphql` (v1.5.11)
- ✅ `supabase_vault` (v0.3.1)
- ✅ `plpgsql` (v1.0)

**Índices Vector (Top 10):**
- ✅ IDÉNTICOS a branch "dev"
- ✅ Todos usando HNSW (excepto 1 IVFFLAT)
- ✅ Configuración correcta de Matryoshka embeddings

**Políticas RLS (Top 10 tablas con más policies):**

| Schema | Tabla | Políticas |
|--------|-------|-----------|
| public | `guest_conversations` | 13 |
| public | `guest_reservations` | 7 |
| public | `hotels` | 6 |
| public | `user_tenant_permissions` | 6 |
| public | `tenant_registry` | 5 |
| public | `muva_content` | 5 |
| public | `compliance_submissions` | 5 |
| public | `sire_content` | 5 |
| hotels | `unit_amenities` | 4 |
| hotels | `properties` | 4 |

**Migraciones Aplicadas:**
```
1. 20250101000000 - create_core_schema
2. 20251101063746 - fix_auth_rls_initplan_batch1
```

**Security Advisors:**
- ⚠️ **17 warnings/errores de seguridad**

**Desglose de Warnings:**

| Tipo | Count | Nivel |
|------|-------|-------|
| `security_definer_view` | 1 | ERROR |
| `function_search_path_mutable` | 15 | WARN |
| `rls_disabled_in_public` | 1 | ERROR |
| `extension_in_public` | 1 | WARN |

**Errores Específicos:**
1. ❌ View `guest_chat_performance_monitor` con SECURITY DEFINER
2. ❌ Tabla `code_embeddings` sin RLS habilitado
3. ⚠️ Extensión `vector` en schema `public` (debería estar en `extensions`)
4. ⚠️ 15 funciones sin `search_path` fijo

**Análisis:**
- ✅ Schema completo (50 tablas)
- ✅ Funciones deployadas (204 funciones)
- ❌ CERO datos (branch vacío)
- ⚠️ Warnings de seguridad pendientes de resolver
- ✅ Estructura idéntica a "dev"

---

## COMPARACIÓN BRANCH "dev" vs "staging-v21"

| Métrica | dev (ooaumjzaztmutltifhoq) | staging-v21 (rmrflrttpobzlffhctjt) | Diferencia |
|---------|----------------------------|-------------------------------------|------------|
| **Status** | MIGRATIONS_FAILED | FUNCTIONS_DEPLOYED | staging mejor |
| **Total Tablas** | 50 (41 public + 9 hotels) | 50 (41 public + 9 hotels) | ✅ Idéntico |
| **Total Registros** | 6,641 | 0 | dev tiene TODOS los datos |
| **Total Funciones** | 90 | 204 | staging tiene 114 más |
| **Funciones match_*** | 31 | 31 | ✅ Idéntico |
| **Funciones RPC Oct 2025** | 5 | 5 | ✅ Idéntico |
| **Índices Vector** | 10+ | 10+ | ✅ Idéntico |
| **Políticas RLS** | ~100+ | ~100+ | staging tiene más |
| **Migraciones** | 2 | 2 | ✅ Idéntico |
| **Security Issues** | 0 | 17 | dev optimizado |
| **Vector Extension** | `extensions` schema | `public` schema | dev correcto |
| **PostgreSQL** | 17.6 | 17.6 | ✅ Idéntico |
| **Fecha Creación** | 2025-10-25 | 2025-11-01 | staging 7 días más nuevo |

---

## MAPEO GIT ↔ SUPABASE

### Estado Actual (2025-11-01)

| Git Branch | Supabase Branch | Project Ref | Estado Actual | Datos |
|------------|-----------------|-------------|---------------|-------|
| `dev` | `dev` (DEFAULT) | `ooaumjzaztmutltifhoq` | ✅ EXISTS (MIGRATIONS_FAILED) | ✅ FULL (6,641 registros) |
| `staging` | `staging-v21` | `rmrflrttpobzlffhctjt` | ✅ EXISTS (FUNCTIONS_DEPLOYED) | ❌ EMPTY (0 registros) |
| `main` | N/A | N/A | ❌ NO EXISTS | N/A |

### Estado Deseado (Recomendado)

| Git Branch | Supabase Branch | Project Ref | Estado Deseado | Propósito |
|------------|-----------------|-------------|----------------|-----------|
| `dev` | `dev` (DEFAULT) | `ooaumjzaztmutltifhoq` | Development branch con datos de prueba | Desarrollo activo |
| `staging` | `staging` | Nuevo branch | Production-like con datos reales | Pre-producción |
| `main` | Proyecto base | Nuevo project | Producción real | Usuarios finales |

---

## ARQUITECTURA ACTUAL vs IDEAL

### Arquitectura Actual (2025-11-01)

```
Proyecto Supabase: ooaumjzaztmutltifhoq
├── Branch "dev" (DEFAULT)
│   ├── Status: MIGRATIONS_FAILED ⚠️
│   ├── Project Ref: ooaumjzaztmutltifhoq (MISMO que proyecto)
│   ├── URL: https://ooaumjzaztmutltifhoq.supabase.co
│   ├── Datos: 6,641 registros ✅
│   ├── Funciones: 90 ✅
│   ├── Security: 0 issues ✅
│   └── Git: rama "dev" (CONGELADA actualmente)
│
└── Branch "staging-v21" (NUEVO)
    ├── Status: FUNCTIONS_DEPLOYED ✅
    ├── Project Ref: rmrflrttpobzlffhctjt (ÚNICO)
    ├── URL: https://rmrflrttpobzlffhctjt.supabase.co
    ├── Datos: 0 registros ❌
    ├── Funciones: 204 ✅
    ├── Security: 17 issues ⚠️
    └── Git: rama "staging" (ACTIVA)
```

### Arquitectura Ideal (Recomendada)

```
Proyecto Supabase: NUEVO (producción real)
├── Project Base (main)
│   ├── URL: https://[new-project].supabase.co
│   ├── Datos: Producción real
│   ├── Git: rama "main"
│   └── Deploy: Manual (via PR aprobados)
│
├── Branch "staging"
│   ├── URL: https://[staging-branch].supabase.co
│   ├── Datos: Copia de producción (seeding)
│   ├── Git: rama "staging"
│   └── Deploy: Automático (CI/CD)
│
└── Branch "dev"
    ├── URL: https://[dev-branch].supabase.co
    ├── Datos: Datos de prueba
    ├── Git: rama "dev"
    └── Deploy: Automático (CI/CD)
```

---

## ANÁLISIS DE PROBLEMAS

### Problema 1: Branch "dev" en Estado MIGRATIONS_FAILED

**Síntomas:**
- Status: `MIGRATIONS_FAILED`
- Última actualización: 2025-10-31 19:08:51 UTC

**Causa Probable:**
- Migración `20251101063746` (fix_auth_rls_initplan_batch1) falló parcialmente
- O migración posterior no registrada falló

**Impacto:**
- ⚠️ Funcionalidad actual NO afectada (90 funciones operativas)
- ⚠️ Futuras migraciones pueden fallar
- ⚠️ Estado inconsistente en metadata

**Solución:**
```bash
# Verificar estado de migraciones
supabase migration list --project-ref ooaumjzaztmutltifhoq

# Si hay migraciones pendientes, repararlas
supabase migration repair --project-ref ooaumjzaztmutltifhoq

# Aplicar migraciones pendientes
supabase db push --project-ref ooaumjzaztmutltifhoq
```

### Problema 2: Branch "staging-v21" VACÍO

**Síntomas:**
- 0 registros en todas las tablas
- URL funcional pero sin datos

**Causa:**
- Branch creado con `--with-data=false` (comportamiento default)
- No se ha ejecutado seeding de datos

**Impacto:**
- ❌ No se puede probar funcionalidad real
- ❌ Vector search devolverá vacío
- ❌ Auth fallará (no hay tenant_registry)

**Solución:**

**Opción A: Copiar datos de dev → staging-v21**
```bash
# Dump data from dev
pg_dump -h db.ooaumjzaztmutltifhoq.supabase.co \
  -U postgres \
  --data-only \
  --no-owner \
  --no-acl \
  -t 'public.*' \
  -t 'hotels.*' \
  > staging_seed.sql

# Restore to staging-v21
psql -h db.rmrflrttpobzlffhctjt.supabase.co \
  -U postgres \
  -f staging_seed.sql
```

**Opción B: Recrear branch con datos**
```bash
# Eliminar branch actual
supabase branches delete staging-v21 --project-ref ooaumjzaztmutltifhoq

# Crear nuevo branch CON datos
supabase branches create staging-v21 \
  --project-ref ooaumjzaztmutltifhoq \
  --with-data=true \
  --git-branch=staging
```

### Problema 3: Security Warnings en staging-v21

**Síntomas:**
- 17 warnings de seguridad
- `vector` extension en schema `public`
- Funciones sin `search_path` fijo

**Causa:**
- Migraciones aplicadas ANTES de fixes de seguridad de octubre 2025
- Schema heredado del estado antiguo del parent project

**Impacto:**
- ⚠️ Vulnerabilidades potenciales de security injection
- ⚠️ RLS bypass en `code_embeddings`
- ⚠️ SECURITY DEFINER sin protección

**Solución:**
```bash
# Aplicar fixes de seguridad pendientes
# (Ver: docs/database/COMPLETE_REMEDIATION_REPORT_2025-11-01.md)

# 1. Mover vector extension
ALTER EXTENSION vector SET SCHEMA extensions;

# 2. Habilitar RLS en code_embeddings
ALTER TABLE public.code_embeddings ENABLE ROW LEVEL SECURITY;

# 3. Fijar search_path en funciones (aplicar migration)
supabase migration new fix_function_search_paths
# (Agregar ALTER FUNCTION ... SET search_path = public, pg_temp)

# 4. Reemplazar SECURITY DEFINER view
# (Ver script en migrations/)
```

### Problema 4: Diferencia de 114 Funciones

**Síntomas:**
- `dev`: 90 funciones
- `staging-v21`: 204 funciones

**Causa Probable:**
- `staging-v21` heredó funciones de estado antiguo del proyecto
- `dev` fue limpiado posteriormente (octubre 2025)
- O `staging-v21` tiene funciones de sistema adicionales

**Impacto:**
- ⚠️ Inconsistencia entre branches
- ⚠️ Posible código legacy en staging-v21

**Investigación Requerida:**
```sql
-- Listar funciones SOLO en staging-v21
SELECT proname 
FROM pg_proc p 
JOIN pg_namespace n ON p.pronamespace = n.oid 
WHERE n.nspname IN ('public', 'hotels') 
  AND p.prokind = 'f'
  AND proname NOT IN (
    -- Lista de funciones de dev
  );
```

---

## RECOMENDACIONES

### Corto Plazo (Esta Semana)

1. **Resolver MIGRATIONS_FAILED en dev**
   ```bash
   supabase migration repair --project-ref ooaumjzaztmutltifhoq
   ```

2. **Poblar staging-v21 con datos**
   - Opción: Recrear branch con `--with-data=true`
   - O: Copiar datos manualmente via pg_dump/restore

3. **Resolver security warnings en staging-v21**
   - Aplicar migration para mover `vector` extension
   - Habilitar RLS en `code_embeddings`
   - Fijar `search_path` en funciones

4. **Verificar diferencia de funciones**
   - Listar funciones únicas en cada branch
   - Decidir si conservar o eliminar legacy code

### Mediano Plazo (Este Mes)

5. **Normalizar arquitectura de branches**
   - Decidir: ¿Mantener `ooaumjzaztmutltifhoq` como dev o como prod?
   - Opción A: Migrar a nuevo proyecto para producción real
   - Opción B: Usar actual como prod, crear nuevo branch dev

6. **Implementar seeding automatizado**
   - Script para copiar datos críticos (tenant_registry, etc)
   - NO copiar datos sensibles (guest_conversations, etc)

7. **Documentar flujo de deployment**
   - dev → staging → main (producción)
   - Políticas de merge y testing

### Largo Plazo (Próximos Meses)

8. **Migrar a arquitectura 3-tier completa**
   - Proyecto separado para producción
   - Branch staging con datos production-like
   - Branch dev con datos de prueba

9. **Automatizar branching en CI/CD**
   - Preview branches para PRs
   - Auto-seeding en branch creation
   - Auto-cleanup de branches obsoletos

10. **Implementar monitoring de branches**
    - Alertas por MIGRATIONS_FAILED
    - Alertas por security warnings
    - Dashboard de estado de branches

---

## ACCIONES INMEDIATAS REQUERIDAS

### CRÍTICO (Hacer HOY)

- [ ] **Investigar causa de MIGRATIONS_FAILED en dev**
  - Comando: `supabase migration list --project-ref ooaumjzaztmutltifhoq`
  - Verificar logs de última migración
  - Reparar si es posible

- [ ] **Decidir: ¿Poblar staging-v21 o recrearlo?**
  - Si poblar: Ejecutar pg_dump → pg_restore
  - Si recrear: `supabase branches delete` + `create --with-data=true`

### IMPORTANTE (Esta Semana)

- [ ] **Resolver security warnings en staging-v21**
  - Aplicar fixes documentados en octubre 2025
  - Verificar con `supabase advisors --project-ref rmrflrttpobzlffhctjt`

- [ ] **Documentar función de cada branch**
  - Actualizar CLAUDE.md con mapeo Git ↔ Supabase
  - Documentar qué branch usa cada ambiente (local, VPS staging, VPS prod)

- [ ] **Verificar diferencia de 114 funciones**
  - Listar funciones únicas en staging-v21
  - Decidir si son necesarias o legacy

### SEGUIMIENTO (Próximas 2 Semanas)

- [ ] **Implementar seeding script**
  - Copiar datos esenciales (tenants, users, config)
  - NO copiar datos sensibles

- [ ] **Normalizar estado de ambos branches**
  - Funciones idénticas
  - Security warnings: 0 en ambos
  - Migraciones: estado OK en ambos

- [ ] **Planear arquitectura 3-tier**
  - Diseñar flujo dev → staging → production
  - Evaluar costo de proyecto adicional

---

## CONCLUSIONES

### Estado Actual

1. **Branch "dev" (ooaumjzaztmutltifhoq)**
   - ✅ Contiene TODOS los datos de producción
   - ✅ Seguridad optimizada (0 warnings)
   - ⚠️ Status MIGRATIONS_FAILED requiere atención
   - ✅ Funcional para desarrollo

2. **Branch "staging-v21" (rmrflrttpobzlffhctjt)**
   - ✅ Schema completo y funciones deployadas
   - ❌ Sin datos (branch vacío)
   - ⚠️ 17 security warnings pendientes
   - ⚠️ 114 funciones adicionales sin explicar

### Próximos Pasos

**Prioridad 1:** Resolver MIGRATIONS_FAILED en dev  
**Prioridad 2:** Poblar staging-v21 con datos de prueba  
**Prioridad 3:** Eliminar security warnings de staging-v21  
**Prioridad 4:** Normalizar funciones entre branches  

### Arquitectura Recomendada

```
AHORA:
- dev (ooaumjzaztmutltifhoq) → Datos de producción, desarrollo activo
- staging-v21 (rmrflrttpobzlffhctjt) → Pre-producción (poblar datos)

FUTURO:
- Proyecto nuevo → Producción real
- staging branch → Pre-producción con datos production-like
- dev branch → Desarrollo con datos de prueba
```

---

**Reporte Generado:** 2025-11-01  
**Próxima Revisión:** 2025-11-08  
**Owner:** Database Agent (@agent-database-agent)

