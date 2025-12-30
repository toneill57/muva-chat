# FASE 1: Setup Database VPS

**Agente:** @agent-database-agent
**Tareas:** 9
**Tiempo estimado:** 2-3h
**Dependencias:** Ninguna

---

## Prompt 1.1: Verificar conectividad y extensiones

**Agente:** `@agent-database-agent`

**PREREQUISITO:** Inicio del proyecto

**Contexto:**
Antes de migrar datos, necesitamos verificar que podemos conectarnos al PostgreSQL del VPS y que las extensiones necesarias (pgvector, uuid-ossp) están instaladas.

---

🔽 **COPIAR DESDE AQUÍ (Prompt 1.1)**

**📊 Contexto de Progreso:**

**Progreso General:** 0/38 tareas completadas (0%)

FASE 1 - Setup Database VPS (Progreso: 0/9)
- [ ] 1.1: Verificar conectividad y extensiones ← ESTAMOS AQUÍ
- [ ] 1.2: Exportar schema de Supabase
- [ ] 1.3: Exportar datos de Supabase
- [ ] 1.4: Crear schema en VPS DEV
- [ ] 1.5: Importar funciones RPC
- [ ] 1.6: Configurar RLS policies
- [ ] 1.7: Importar datos
- [ ] 1.8: Probar búsqueda vectorial
- [ ] 1.9: Replicar en TST y PRD

**Estado Actual:**
- 3 proyectos Supabase funcionando ✓
- 3 DBs VPS creadas (vacías) ✓
- Credenciales documentadas ✓
- Listo para verificar conectividad

---

**Tareas:**

1. **Probar conexión a VPS DEV** (5min):
   Conectar al PostgreSQL del VPS con las credenciales:
   - Host: 195.200.6.216
   - Puerto: 46101
   - Database: muva_dev
   - Usuario: muva_dev_user
   - Password: wKvsH0f9O!pACByk!2

   ```bash
   PGPASSWORD='wKvsH0f9O!pACByk!2' psql -h 195.200.6.216 -p 46101 -U muva_dev_user -d muva_dev -c "SELECT version();"
   ```

2. **Verificar extensión pgvector** (3min):
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'vector';
   -- Si no existe, crear:
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

3. **Verificar extensión uuid-ossp** (3min):
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'uuid-ossp';
   -- Si no existe, crear:
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   ```

4. **Verificar permisos del usuario** (5min):
   ```sql
   SELECT has_schema_privilege('muva_dev_user', 'public', 'CREATE');
   SELECT has_database_privilege('muva_dev_user', 'muva_dev', 'CREATE');
   ```

**Entregables:**
- Conexión exitosa a VPS DEV
- pgvector instalado y funcionando
- uuid-ossp instalado y funcionando
- Usuario con permisos correctos

**Criterios de Éxito:**
- ✅ Conexión sin errores
- ✅ `SELECT * FROM pg_extension` muestra vector y uuid-ossp
- ✅ Usuario puede crear tablas en schema public

**Estimado:** 15min

---

**🔍 Verificación Post-Ejecución:**

Una vez completadas todas las tareas anteriores, pregúntame:

"¿Consideras satisfactoria la ejecución del Prompt 1.1 (Verificar conectividad y extensiones)?
- Conexión a VPS DEV exitosa ✓
- pgvector instalado ✓
- uuid-ossp instalado ✓
- Permisos de usuario correctos ✓"

**Si mi respuesta es "Sí" o "Aprobado":**

1. **Actualizar TODO.md** - Marcar tarea 1.1 como completada:
   ```markdown
   ### 1.1 Verificar conectividad y extensiones
   - [x] Probar conexión desde local a VPS DEV (estimate: 15min)
   ```

2. **Actualizar "📍 CONTEXTO ACTUAL"** - Agregar logro:
   ```markdown
   ### Estado del Sistema
   - ✅ Conectividad VPS DEV verificada ← NUEVO
   - ✅ pgvector y uuid-ossp instalados ← NUEVO
   ```

3. **Informarme del progreso:**
   "✅ Tarea 1.1 completada y marcada en TODO.md

   **Progreso FASE 1:** 1/9 tareas completadas (11%)
   - [x] 1.1: Verificar conectividad y extensiones ✓
   - [ ] 1.2: Exportar schema de Supabase

   **Progreso General:** 1/38 tareas completadas (3%)

   **Siguiente paso:** Prompt 1.2 - Exportar schema de Supabase (30min)"

**Si mi respuesta es "No" o tengo observaciones:**
- Preguntar qué necesita ajustarse
- NO marcar como completado
- Iterar hasta aprobación

🔼 **COPIAR HASTA AQUÍ (Prompt 1.1)**

---

## Prompt 1.2: Exportar schema de Supabase

**Agente:** `@agent-database-agent`

**PREREQUISITO:** Prompt 1.1 completado

**Contexto:**
Necesitamos exportar el DDL (tablas, índices, constraints) desde Supabase para replicarlo en VPS.

---

🔽 **COPIAR DESDE AQUÍ (Prompt 1.2)**

**📊 Contexto de Progreso:**

**Progreso General:** 1/38 tareas completadas (3%)

FASE 1 - Setup Database VPS (Progreso: 1/9)
- [x] 1.1: Verificar conectividad y extensiones ✓
- [ ] 1.2: Exportar schema de Supabase ← ESTAMOS AQUÍ
- [ ] 1.3: Exportar datos de Supabase
- [ ] 1.4: Crear schema en VPS DEV
- [ ] 1.5: Importar funciones RPC
- [ ] 1.6: Configurar RLS policies
- [ ] 1.7: Importar datos
- [ ] 1.8: Probar búsqueda vectorial
- [ ] 1.9: Replicar en TST y PRD

**Estado Actual:**
- VPS DEV conectividad verificada ✓
- pgvector y uuid-ossp instalados ✓
- Listo para exportar schema de Supabase

---

**Tareas:**

1. **Crear script de exportación** (10min):
   Crear `scripts/migration/01-export-supabase.sh`:

   ```bash
   #!/bin/bash
   # Export Supabase DEV schema and data

   SUPABASE_DB_URL="postgresql://postgres.zpyxgkvonrxbhvmkuzlt:$SUPABASE_DB_PASSWORD@aws-0-us-west-1.pooler.supabase.com:6543/postgres"

   OUTPUT_DIR="scripts/migration/exports"
   mkdir -p $OUTPUT_DIR

   # Export schema only (DDL)
   pg_dump "$SUPABASE_DB_URL" \
     --schema=public \
     --schema-only \
     --no-owner \
     --no-privileges \
     > "$OUTPUT_DIR/schema.sql"

   echo "Schema exported to $OUTPUT_DIR/schema.sql"
   ```

2. **Obtener password de Supabase** (5min):
   El password de la DB está en Supabase Dashboard > Project Settings > Database > Connection string.

   Alternativamente, usar las migraciones existentes en `/migrations/` que ya tienen todo el DDL.

3. **Revisar migraciones existentes** (10min):
   Ya tenemos 50+ migraciones en `/migrations/`. Verificar que están completas:
   - `migrations/fresh-2025-11-01/` tiene el schema fresh
   - Todas las tablas están definidas
   - Funciones RPC están en 08-functions.sql

4. **Decidir estrategia** (5min):
   **Opción A:** Usar pg_dump desde Supabase (más completo pero requiere password)
   **Opción B:** Usar migraciones existentes (ya disponibles, probadas)

   **Recomendación:** Opción B si las migraciones están completas.

**Entregables:**
- Script de exportación creado O
- Confirmación de que migraciones existentes son suficientes
- Lista de archivos SQL a aplicar en VPS

**Criterios de Éxito:**
- ✅ DDL completo disponible para aplicar en VPS
- ✅ 53 tablas identificadas en el schema
- ✅ Funciones RPC identificadas

**Estimado:** 30min

---

**🔍 Verificación Post-Ejecución:**

Una vez completadas todas las tareas anteriores, pregúntame:

"¿Consideras satisfactoria la ejecución del Prompt 1.2 (Exportar schema de Supabase)?
- Schema DDL disponible ✓
- 53 tablas identificadas ✓
- Estrategia de migración definida ✓"

**Si mi respuesta es "Sí" o "Aprobado":**

1. **Actualizar TODO.md** - Marcar tarea 1.2 como completada
2. **Actualizar "📍 CONTEXTO ACTUAL"**
3. **Informarme del progreso**

🔼 **COPIAR HASTA AQUÍ (Prompt 1.2)**

---

## Prompt 1.3: Exportar datos de Supabase

**Agente:** `@agent-database-agent`

**PREREQUISITO:** Prompt 1.2 completado

---

🔽 **COPIAR DESDE AQUÍ (Prompt 1.3)**

**📊 Contexto de Progreso:**

**Progreso General:** 2/38 tareas completadas (5%)

FASE 1 - Setup Database VPS (Progreso: 2/9)
- [x] 1.1: Verificar conectividad y extensiones ✓
- [x] 1.2: Exportar schema de Supabase ✓
- [ ] 1.3: Exportar datos de Supabase ← ESTAMOS AQUÍ
- [ ] 1.4: Crear schema en VPS DEV
- [ ] 1.5: Importar funciones RPC
- [ ] 1.6: Configurar RLS policies
- [ ] 1.7: Importar datos
- [ ] 1.8: Probar búsqueda vectorial
- [ ] 1.9: Replicar en TST y PRD

**Estado Actual:**
- VPS DEV conectividad verificada ✓
- Schema DDL disponible ✓
- Listo para exportar datos

---

**Tareas:**

1. **Identificar tablas con datos importantes** (10min):
   Usar el script `.claude/db-query.js` para contar registros:
   ```bash
   node .claude/db-query.js "
   SELECT
     schemaname,
     relname as table,
     n_live_tup as row_count
   FROM pg_stat_user_tables
   WHERE schemaname = 'public'
   ORDER BY n_live_tup DESC
   "
   ```

2. **Exportar datos de catálogos SIRE** (5min):
   Estas tablas tienen datos estáticos críticos:
   - sire_countries (45 registros)
   - sire_cities
   - sire_document_types

   ```bash
   node .claude/db-query.js "SELECT * FROM sire_countries" > exports/sire_countries.json
   ```

3. **Exportar tenant_registry** (5min):
   ```bash
   node .claude/db-query.js "SELECT * FROM tenant_registry" > exports/tenant_registry.json
   ```

4. **Generar INSERT statements** (10min):
   Convertir JSON exports a INSERT SQL para importar en VPS.
   O usar pg_dump --data-only si tenemos acceso directo.

**Nota importante sobre auth.users:**
Los usuarios de Supabase Auth están en schema `auth`, no `public`.
Para staff auth, necesitaremos exportar los emails y crear nueva tabla.

**Entregables:**
- Lista de tablas con conteo de registros
- Datos de catálogos SIRE exportados
- Datos de tenant_registry exportados
- INSERTs listos para VPS

**Criterios de Éxito:**
- ✅ Datos de catálogos SIRE exportados
- ✅ tenant_registry exportado
- ✅ Formato listo para importar

**Estimado:** 30min

---

**🔍 Verificación Post-Ejecución:**

Pregúntame: "¿Consideras satisfactoria la ejecución del Prompt 1.3?"

🔼 **COPIAR HASTA AQUÍ (Prompt 1.3)**

---

## Prompt 1.4: Crear schema en VPS DEV

**Agente:** `@agent-database-agent`

**PREREQUISITO:** Prompts 1.2 y 1.3 completados

---

🔽 **COPIAR DESDE AQUÍ (Prompt 1.4)**

**📊 Contexto de Progreso:**

**Progreso General:** 3/38 tareas completadas (8%)

FASE 1 - Setup Database VPS (Progreso: 3/9)
- [x] 1.1-1.3 completados ✓
- [ ] 1.4: Crear schema en VPS DEV ← ESTAMOS AQUÍ
- [ ] 1.5: Importar funciones RPC
- [ ] 1.6: Configurar RLS policies
- [ ] 1.7: Importar datos
- [ ] 1.8: Probar búsqueda vectorial
- [ ] 1.9: Replicar en TST y PRD

---

**Tareas:**

1. **Crear script de importación** (10min):
   Crear `scripts/migration/02-import-vps.sh`:
   ```bash
   #!/bin/bash

   VPS_DEV="postgresql://muva_dev_user:wKvsH0f9O!pACByk!2@195.200.6.216:46101/muva_dev"

   # Aplicar migraciones en orden
   for file in migrations/fresh-2025-11-01/*.sql; do
     echo "Applying $file..."
     psql "$VPS_DEV" -f "$file"
   done
   ```

2. **Aplicar extensiones primero** (5min):
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   CREATE EXTENSION IF NOT EXISTS pg_trgm;
   ```

3. **Aplicar migraciones de schema** (20min):
   Aplicar en orden los archivos de `migrations/fresh-2025-11-01/`:
   1. 01-base-schema.sql
   2. 02-tables.sql
   3. 03-indexes.sql
   4. etc.

4. **Verificar tablas creadas** (10min):
   ```sql
   SELECT count(*) FROM pg_tables WHERE schemaname = 'public';
   -- Debe ser ~53
   ```

**Entregables:**
- Script de importación funcional
- 53 tablas creadas en muva_dev
- Índices aplicados

**Criterios de Éxito:**
- ✅ Todas las tablas creadas sin errores
- ✅ Conteo de tablas = 53
- ✅ Índices creados

**Estimado:** 45min

---

**🔍 Verificación Post-Ejecución:**

Pregúntame: "¿Consideras satisfactoria la ejecución del Prompt 1.4?"

🔼 **COPIAR HASTA AQUÍ (Prompt 1.4)**

---

## Prompt 1.5: Importar funciones RPC

**Agente:** `@agent-database-agent`

**PREREQUISITO:** Prompt 1.4 completado

---

🔽 **COPIAR DESDE AQUÍ (Prompt 1.5)**

**📊 Contexto de Progreso:**

FASE 1 - Setup Database VPS (Progreso: 4/9)
- [x] 1.1-1.4 completados ✓
- [ ] 1.5: Importar funciones RPC ← ESTAMOS AQUÍ
- [ ] 1.6-1.9 pendientes

---

**Tareas:**

1. **Identificar archivo de funciones** (5min):
   El archivo principal es: `migrations/fresh-2025-11-01/08-functions.sql`
   Contiene 86+ funciones RPC.

2. **Aplicar funciones al VPS** (15min):
   ```bash
   PGPASSWORD='wKvsH0f9O!pACByk!2' psql \
     -h 195.200.6.216 -p 46101 \
     -U muva_dev_user -d muva_dev \
     -f migrations/fresh-2025-11-01/08-functions.sql
   ```

3. **Verificar funciones creadas** (5min):
   ```sql
   SELECT routine_name
   FROM information_schema.routines
   WHERE routine_schema = 'public'
   AND routine_type = 'FUNCTION'
   ORDER BY routine_name;
   ```

4. **Probar función de ejemplo** (5min):
   ```sql
   -- Probar set_app_tenant_id
   SELECT set_app_tenant_id('00000000-0000-0000-0000-000000000000');

   -- Probar función de búsqueda (sin datos aún, solo verificar que no da error de sintaxis)
   SELECT * FROM match_documents(
     ARRAY[0.1, 0.2]::vector(2),
     0.5,
     5
   );
   ```

**Entregables:**
- 86+ funciones creadas
- Funciones ejecutables sin errores de sintaxis

**Criterios de Éxito:**
- ✅ Funciones creadas sin errores
- ✅ Funciones básicas ejecutables

**Estimado:** 30min

---

🔼 **COPIAR HASTA AQUÍ (Prompt 1.5)**

---

## Prompt 1.6: Configurar RLS policies

**Agente:** `@agent-database-agent`

**PREREQUISITO:** Prompt 1.5 completado

---

🔽 **COPIAR DESDE AQUÍ (Prompt 1.6)**

**📊 Contexto de Progreso:**

FASE 1 - Setup Database VPS (Progreso: 5/9)
- [x] 1.1-1.5 completados ✓
- [ ] 1.6: Configurar RLS policies ← ESTAMOS AQUÍ
- [ ] 1.7-1.9 pendientes

---

**Tareas:**

1. **Identificar archivo de RLS** (5min):
   Buscar en migraciones:
   - `migrations/fresh-2025-11-01/09-rls-policies.sql` o similar
   - `migrations/fixes/` puede tener optimizaciones

2. **Habilitar RLS en tablas** (10min):
   ```sql
   -- Habilitar RLS en tablas principales
   ALTER TABLE tenant_registry ENABLE ROW LEVEL SECURITY;
   ALTER TABLE guest_reservations ENABLE ROW LEVEL SECURITY;
   ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
   -- etc para todas las tablas que lo requieran
   ```

3. **Aplicar policies** (10min):
   Aplicar archivo de RLS policies.

   Patrón optimizado usado:
   ```sql
   CREATE POLICY "tenant_isolation" ON policies
   FOR ALL USING (
     tenant_id = (SELECT current_setting('app.tenant_id')::uuid)
   );
   ```

4. **Verificar policies** (5min):
   ```sql
   SELECT count(*) FROM pg_policies;
   -- Debe ser ~102
   ```

**Entregables:**
- RLS habilitado en tablas necesarias
- 102 policies aplicadas

**Criterios de Éxito:**
- ✅ RLS habilitado
- ✅ Policies aplicadas sin errores

**Estimado:** 30min

---

🔼 **COPIAR HASTA AQUÍ (Prompt 1.6)**

---

## Prompt 1.7: Importar datos

**Agente:** `@agent-database-agent`

**PREREQUISITO:** Prompt 1.6 completado

---

🔽 **COPIAR DESDE AQUÍ (Prompt 1.7)**

**📊 Contexto de Progreso:**

FASE 1 - Setup Database VPS (Progreso: 6/9)
- [x] 1.1-1.6 completados ✓
- [ ] 1.7: Importar datos ← ESTAMOS AQUÍ
- [ ] 1.8-1.9 pendientes

---

**Tareas:**

1. **Importar catálogos SIRE** (10min):
   Datos estáticos que son idénticos en todos los ambientes:
   ```sql
   -- Insertar sire_countries (45 registros)
   INSERT INTO sire_countries (code, name, ...) VALUES ...;

   -- Insertar sire_cities
   -- Insertar sire_document_types
   ```

2. **Importar tenant_registry** (5min):
   Los tenants configurados (ej: simmerdown).

3. **Importar datos de desarrollo** (10min):
   Si hay datos de prueba necesarios para DEV.

4. **Verificar integridad** (5min):
   ```sql
   -- Verificar FKs
   SELECT count(*) FROM sire_countries;
   SELECT count(*) FROM tenant_registry;

   -- Verificar no hay orphans
   SELECT * FROM guest_reservations WHERE tenant_id NOT IN (SELECT id FROM tenant_registry);
   ```

**Nota:** Para TST y PRD, probablemente solo necesitamos catálogos SIRE (datos estáticos). Los datos de negocio se migrarán después.

**Entregables:**
- Catálogos SIRE poblados
- tenant_registry poblado
- Integridad verificada

**Criterios de Éxito:**
- ✅ Datos importados sin errores
- ✅ Sin violaciones de FK

**Estimado:** 30min

---

🔼 **COPIAR HASTA AQUÍ (Prompt 1.7)**

---

## Prompt 1.8: Probar búsqueda vectorial

**Agente:** `@agent-database-agent`

**PREREQUISITO:** Prompt 1.7 completado

---

🔽 **COPIAR DESDE AQUÍ (Prompt 1.8)**

**📊 Contexto de Progreso:**

FASE 1 - Setup Database VPS (Progreso: 7/9)
- [x] 1.1-1.7 completados ✓
- [ ] 1.8: Probar búsqueda vectorial ← ESTAMOS AQUÍ
- [ ] 1.9: Replicar en TST y PRD

---

**Tareas:**

1. **Verificar tipo vector** (5min):
   ```sql
   -- Verificar que vector type existe
   SELECT typname FROM pg_type WHERE typname = 'vector';
   ```

2. **Verificar tablas con embeddings** (5min):
   ```sql
   -- accommodation_units_public tiene embedding
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'accommodation_units_public'
   AND column_name LIKE '%embedding%';
   ```

3. **Probar query vectorial básico** (5min):
   Si hay datos con embeddings:
   ```sql
   SELECT id, name, embedding <=> '[0.1, 0.2, ...]'::vector AS distance
   FROM accommodation_units_public
   WHERE embedding IS NOT NULL
   ORDER BY distance
   LIMIT 5;
   ```

   Si no hay datos aún, al menos verificar que la sintaxis es válida.

4. **Probar función match_documents** (si hay datos):
   ```sql
   SELECT * FROM match_documents(
     '[0.1, 0.2, ...]'::vector,
     0.5,  -- threshold
     5     -- limit
   );
   ```

**Entregables:**
- pgvector funcionando correctamente
- Queries vectoriales ejecutables

**Criterios de Éxito:**
- ✅ Tipo vector reconocido
- ✅ Queries vectoriales sin errores de sintaxis

**Estimado:** 15min

---

🔼 **COPIAR HASTA AQUÍ (Prompt 1.8)**

---

## Prompt 1.9: Replicar en TST y PRD

**Agente:** `@agent-database-agent`

**PREREQUISITO:** Prompt 1.8 completado

---

🔽 **COPIAR DESDE AQUÍ (Prompt 1.9)**

**📊 Contexto de Progreso:**

FASE 1 - Setup Database VPS (Progreso: 8/9)
- [x] 1.1-1.8 completados ✓
- [ ] 1.9: Replicar en TST y PRD ← ESTAMOS AQUÍ

---

**Tareas:**

1. **Aplicar schema a muva_tst** (15min):
   Repetir proceso de 1.4-1.6 pero conectando a:
   - Host: 127.0.0.1 (desde VPS)
   - Puerto: 46101
   - Database: muva_tst
   - Usuario: muva_tst_user

   **Nota:** TST usa 127.0.0.1 porque la app corre en el mismo VPS.
   Para aplicar desde local, necesitamos SSH tunnel o ejecutar scripts en VPS.

2. **Aplicar schema a muva_prd** (15min):
   Repetir proceso para muva_prd.

3. **Importar solo catálogos** (10min):
   TST y PRD solo necesitan:
   - sire_countries
   - sire_cities
   - sire_document_types

   Los datos de negocio (reservaciones, etc) se migrarán después o se mantendrán separados.

4. **Verificar los 3 ambientes** (5min):
   ```sql
   -- Para cada DB
   SELECT count(*) FROM pg_tables WHERE schemaname = 'public';
   SELECT count(*) FROM information_schema.routines WHERE routine_schema = 'public';
   SELECT count(*) FROM pg_policies;
   ```

**Entregables:**
- muva_dev, muva_tst, muva_prd con schema idéntico
- Catálogos SIRE en los 3 ambientes
- Verificación de consistencia

**Criterios de Éxito:**
- ✅ 3 DBs con mismo schema
- ✅ Mismas funciones RPC
- ✅ Mismas RLS policies

**Estimado:** 30min

---

**🔍 Verificación Post-Ejecución FASE 1 COMPLETA:**

Una vez completada la tarea 1.9, pregúntame:

"¿Consideras satisfactoria la ejecución de FASE 1 completa (Setup Database VPS)?

Resumen:
- VPS DEV conectividad verificada ✓
- pgvector y uuid-ossp instalados ✓
- 53 tablas creadas en 3 ambientes ✓
- 86+ funciones RPC aplicadas ✓
- 102 RLS policies configuradas ✓
- Catálogos SIRE importados ✓
- Búsqueda vectorial verificada ✓
- 3 ambientes (dev/tst/prd) idénticos ✓"

**Si aprobado:**
"✅ FASE 1 COMPLETADA

**Progreso FASE 1:** 9/9 tareas completadas (100%) ✅ COMPLETADA
**Progreso General:** 9/38 tareas completadas (24%)

**Siguiente:** FASE 2 - Migrar Conexión DB
Ver: `FASE-2-conexion-pg.md`"

🔼 **COPIAR HASTA AQUÍ (Prompt 1.9)**

---

## Checklist FASE 1

- [ ] 1.1 Verificar conectividad y extensiones
- [ ] 1.2 Exportar schema de Supabase
- [ ] 1.3 Exportar datos de Supabase
- [ ] 1.4 Crear schema en VPS DEV
- [ ] 1.5 Importar funciones RPC
- [ ] 1.6 Configurar RLS policies
- [ ] 1.7 Importar datos
- [ ] 1.8 Probar búsqueda vectorial
- [ ] 1.9 Replicar en TST y PRD

**Anterior:** N/A (Primera fase)
**Siguiente:** `FASE-2-conexion-pg.md`
