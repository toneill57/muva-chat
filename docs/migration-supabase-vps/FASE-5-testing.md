# FASE 5: Testing Integral

**Agente:** @agent-backend-developer + @agent-infrastructure-monitor
**Tareas:** 7
**Tiempo estimado:** 2-3h
**Dependencias:** FASE 2, 3, 4 completadas

---

## Prompt 5.1: Test guest chat público

**Agente:** `@agent-backend-developer`

**PREREQUISITO:** FASE 2, 3, 4 completadas

**Contexto:**
Ahora que toda la infraestructura está migrada, debemos verificar que todas las funcionalidades siguen funcionando correctamente. Empezamos con el chat público (ruta /with-me).

---

🔽 **COPIAR DESDE AQUÍ (Prompt 5.1)**

**📊 Contexto de Progreso:**

**Progreso General:** 26/38 tareas completadas (68%)

FASE 1-4 ✅ COMPLETADAS
FASE 5 - Testing Integral (Progreso: 0/7)
- [ ] 5.1: Test guest chat público ← ESTAMOS AQUÍ
- [ ] 5.2: Test guest portal autenticado
- [ ] 5.3: Test staff dashboard
- [ ] 5.4: Test SIRE compliance
- [ ] 5.5: Test multi-tenant isolation
- [ ] 5.6: Test búsqueda vectorial
- [ ] 5.7: Documentar resultados

**Estado Actual:**
- DB migrada a VPS ✓
- Conexión pg implementada ✓
- Staff auth JWT funcionando ✓
- MinIO storage configurado ✓
- Listo para testing integral

---

**Tareas:**

1. **Iniciar app localmente** (2min):
   ```bash
   pnpm run dev
   ```

2. **Acceder a chat público** (5min):
   - Abrir http://localhost:3000/with-me (o la ruta de chat público)
   - Verificar que la página carga
   - Verificar que no hay errores en consola

3. **Enviar mensaje de prueba** (5min):
   - Escribir: "Hola, ¿qué alojamientos tienen disponibles?"
   - Verificar que la respuesta llega
   - Verificar que menciona alojamientos reales

4. **Verificar búsqueda vectorial** (5min):
   - Preguntar algo específico: "¿Tienen alojamientos con piscina?"
   - Verificar que la respuesta es contextual
   - Verificar que busca en la DB correctamente

5. **Revisar logs** (3min):
   - Verificar que no hay errores de conexión a DB
   - Verificar que las queries ejecutan correctamente
   - Verificar latencia de respuesta

**Criterios de Éxito:**
- ✅ Chat carga sin errores
- ✅ Mensajes se envían y reciben
- ✅ AI responde con información real
- ✅ Sin errores de conexión DB
- ✅ Latencia aceptable (<3s para respuesta)

**Estimado:** 20min

---

🔼 **COPIAR HASTA AQUÍ (Prompt 5.1)**

---

## Prompt 5.2: Test guest portal autenticado

**Agente:** `@agent-backend-developer`

**PREREQUISITO:** Prompt 5.1 completado

---

🔽 **COPIAR DESDE AQUÍ (Prompt 5.2)**

**📊 Contexto de Progreso:**

FASE 5 - Testing Integral (Progreso: 1/7)
- [x] 5.1: Test guest chat público ✓
- [ ] 5.2: Test guest portal autenticado ← ESTAMOS AQUÍ
- [ ] 5.3-5.7 pendientes

---

**Tareas:**

1. **Obtener datos de reservación de prueba** (5min):
   ```sql
   SELECT
     id,
     guest_name,
     check_in,
     phone_last_4,
     tenant_id
   FROM guest_reservations
   WHERE check_in >= CURRENT_DATE
   LIMIT 1;
   ```

2. **Intentar login en /my-stay** (5min):
   - Abrir http://localhost:3000/my-stay
   - Ingresar fecha de check-in
   - Ingresar últimos 4 dígitos del teléfono
   - Verificar que autentica correctamente

3. **Verificar portal de huésped** (5min):
   - Verificar que muestra datos de la reservación
   - Verificar nombre del huésped
   - Verificar fechas de estadía
   - Verificar nombre del alojamiento

4. **Probar chat contextual** (5min):
   - Enviar mensaje en el chat
   - Verificar que responde con contexto de la reservación
   - Preguntar algo específico del alojamiento

5. **Verificar logout/sesión** (2min):
   - Cerrar sesión (si hay opción)
   - Verificar que requiere re-autenticación

**Criterios de Éxito:**
- ✅ Login con check-in + phone funciona
- ✅ Datos de reservación correctos
- ✅ Chat contextual funciona
- ✅ Sesión persiste correctamente

**Estimado:** 20min

---

🔼 **COPIAR HASTA AQUÍ (Prompt 5.2)**

---

## Prompt 5.3: Test staff dashboard

**Agente:** `@agent-backend-developer`

**PREREQUISITO:** Prompt 5.2 completado

---

🔽 **COPIAR DESDE AQUÍ (Prompt 5.3)**

**📊 Contexto de Progreso:**

FASE 5 - Testing Integral (Progreso: 2/7)
- [x] 5.1-5.2 completados ✓
- [ ] 5.3: Test staff dashboard ← ESTAMOS AQUÍ
- [ ] 5.4-5.7 pendientes

---

**Tareas:**

1. **Crear usuario staff de prueba** (5min):
   Si no existe usuario, crearlo:
   ```sql
   INSERT INTO staff_auth_users (email, password_hash, name, role, tenant_id)
   VALUES (
     'test@staff.com',
     '$2a$10$...', -- bcrypt hash de 'test123'
     'Test Staff',
     'staff',
     (SELECT id FROM tenant_registry LIMIT 1)
   );
   ```

   O usar la función:
   ```typescript
   import { hashPassword } from '@/lib/staff-auth';
   const hash = await hashPassword('test123');
   ```

2. **Probar login de staff** (5min):
   - Abrir página de login de staff
   - Ingresar credenciales
   - Verificar que autentica correctamente

3. **Verificar dashboard** (10min):
   - Lista de reservaciones visible
   - Datos de huéspedes correctos
   - Filtros funcionando
   - Navegación entre secciones

4. **Probar operaciones CRUD** (si aplica) (5min):
   - Crear/editar reservación
   - Ver detalles de huésped
   - Otras operaciones disponibles

5. **Verificar logout** (2min):
   - Cerrar sesión
   - Verificar que cookie se elimina
   - Verificar redirección a login

**Criterios de Éxito:**
- ✅ Login staff funciona con nuevo JWT
- ✅ Dashboard carga correctamente
- ✅ Datos de tenant correctos
- ✅ Operaciones funcionan
- ✅ Logout funciona

**Estimado:** 30min

---

🔼 **COPIAR HASTA AQUÍ (Prompt 5.3)**

---

## Prompt 5.4: Test SIRE compliance

**Agente:** `@agent-backend-developer`

**PREREQUISITO:** Prompt 5.3 completado

---

🔽 **COPIAR DESDE AQUÍ (Prompt 5.4)**

**📊 Contexto de Progreso:**

FASE 5 - Testing Integral (Progreso: 3/7)
- [x] 5.1-5.3 completados ✓
- [ ] 5.4: Test SIRE compliance ← ESTAMOS AQUÍ
- [ ] 5.5-5.7 pendientes

---

**Tareas:**

1. **Probar upload de documento** (10min):
   - Ir a sección SIRE
   - Subir imagen de documento de prueba (pasaporte/cédula)
   - Verificar que sube a MinIO correctamente
   - Verificar que URL se guarda en DB

2. **Probar OCR/extracción** (5min):
   - Verificar que Claude Vision procesa la imagen
   - Verificar campos extraídos (nombre, documento, país, etc.)
   - Verificar scores de confianza

3. **Probar guardado de datos SIRE** (5min):
   - Verificar que datos se guardan en sire_document_uploads
   - Verificar campos mapeados a códigos SIRE
   - Verificar relación con reservación

4. **Probar exportación TXT** (5min):
   - Ir a exportación SIRE
   - Seleccionar rango de fechas
   - Generar archivo TXT
   - Verificar formato correcto

5. **Verificar catálogos SIRE** (5min):
   ```sql
   SELECT count(*) FROM sire_countries; -- Debe ser 45
   SELECT count(*) FROM sire_document_types;
   SELECT count(*) FROM sire_cities;
   ```

**Criterios de Éxito:**
- ✅ Upload de documento funciona (MinIO)
- ✅ OCR extrae campos correctamente
- ✅ Datos se guardan en DB
- ✅ Export TXT genera archivo válido
- ✅ Catálogos SIRE completos

**Estimado:** 30min

---

🔼 **COPIAR HASTA AQUÍ (Prompt 5.4)**

---

## Prompt 5.5: Test multi-tenant isolation

**Agente:** `@agent-backend-developer`

**PREREQUISITO:** Prompt 5.4 completado

---

🔽 **COPIAR DESDE AQUÍ (Prompt 5.5)**

**📊 Contexto de Progreso:**

FASE 5 - Testing Integral (Progreso: 4/7)
- [x] 5.1-5.4 completados ✓
- [ ] 5.5: Test multi-tenant isolation ← ESTAMOS AQUÍ
- [ ] 5.6-5.7 pendientes

---

**Tareas:**

1. **Identificar tenants de prueba** (5min):
   ```sql
   SELECT id, subdomain, name
   FROM tenant_registry
   LIMIT 5;
   ```

2. **Probar aislamiento via API** (10min):
   - Login como staff de Tenant A
   - Intentar acceder datos de Tenant B
   - Verificar que RLS bloquea acceso

   ```typescript
   // Test directo de RLS
   const client = await createClient(tenantAId);
   const data = await client.query(`
     SELECT * FROM guest_reservations
     WHERE tenant_id = $1  -- Tenant B
   `, [tenantBId]);
   // Debe retornar vacío (RLS activo)
   ```

3. **Verificar set_app_tenant_id** (5min):
   ```sql
   -- Sin tenant context
   SELECT current_setting('app.tenant_id', true);
   -- Debe ser NULL o vacío

   -- Con tenant context
   SELECT set_config('app.tenant_id', 'tenant-uuid', true);
   SELECT * FROM guest_reservations;
   -- Solo debe mostrar datos del tenant configurado
   ```

4. **Probar cross-tenant query** (5min):
   Intentar query sin tenant context (debe fallar o retornar vacío):
   ```sql
   SELECT count(*) FROM guest_reservations;
   -- Con RLS activo y sin tenant_id, debe ser 0
   ```

5. **Verificar RLS policies activas** (5min):
   ```sql
   SELECT
     tablename,
     policyname,
     cmd,
     qual
   FROM pg_policies
   WHERE schemaname = 'public'
   ORDER BY tablename;
   ```

**Criterios de Éxito:**
- ✅ Tenant A no ve datos de Tenant B
- ✅ RLS policies activas en tablas críticas
- ✅ set_app_tenant_id funciona correctamente
- ✅ Sin acceso cross-tenant

**Estimado:** 30min

---

🔼 **COPIAR HASTA AQUÍ (Prompt 5.5)**

---

## Prompt 5.6: Test búsqueda vectorial

**Agente:** `@agent-backend-developer`

**PREREQUISITO:** Prompt 5.5 completado

---

🔽 **COPIAR DESDE AQUÍ (Prompt 5.6)**

**📊 Contexto de Progreso:**

FASE 5 - Testing Integral (Progreso: 5/7)
- [x] 5.1-5.5 completados ✓
- [ ] 5.6: Test búsqueda vectorial ← ESTAMOS AQUÍ
- [ ] 5.7: Documentar resultados

---

**Tareas:**

1. **Verificar embeddings existentes** (5min):
   ```sql
   SELECT
     id,
     name,
     embedding IS NOT NULL as has_embedding,
     vector_dims(embedding) as dims
   FROM accommodation_units_public
   WHERE embedding IS NOT NULL
   LIMIT 5;
   ```

2. **Probar función match_documents** (5min):
   Si hay embeddings, probar búsqueda:
   ```sql
   -- Obtener un embedding de referencia
   SELECT embedding
   FROM accommodation_units_public
   WHERE embedding IS NOT NULL
   LIMIT 1;

   -- Buscar similares
   SELECT * FROM match_accommodations_public(
     '[0.1, 0.2, ...]'::vector,  -- embedding de prueba
     0.5,  -- threshold
     5     -- limit
   );
   ```

3. **Probar búsqueda desde chat** (10min):
   - Abrir chat
   - Preguntar: "¿Qué alojamientos tienen cerca de la playa?"
   - Verificar que busca en embeddings
   - Verificar relevancia de resultados

4. **Medir latencia** (5min):
   ```sql
   \timing on
   SELECT * FROM match_accommodations_public(
     '[0.1, 0.2, ...]'::vector,
     0.5,
     10
   );
   -- Debe ser <500ms
   ```

5. **Verificar índices vectoriales** (5min):
   ```sql
   SELECT
     indexname,
     indexdef
   FROM pg_indexes
   WHERE tablename = 'accommodation_units_public'
   AND indexdef LIKE '%vector%';
   ```

**Criterios de Éxito:**
- ✅ Embeddings existentes en DB
- ✅ match_* functions ejecutan sin error
- ✅ Búsqueda retorna resultados relevantes
- ✅ Latencia <500ms
- ✅ Índices vectoriales creados

**Estimado:** 20min

---

🔼 **COPIAR HASTA AQUÍ (Prompt 5.6)**

---

## Prompt 5.7: Documentar resultados

**Agente:** `@agent-backend-developer`

**PREREQUISITO:** Prompts 5.1-5.6 completados

---

🔽 **COPIAR DESDE AQUÍ (Prompt 5.7)**

**📊 Contexto de Progreso:**

FASE 5 - Testing Integral (Progreso: 6/7)
- [x] 5.1-5.6 completados ✓
- [ ] 5.7: Documentar resultados ← ESTAMOS AQUÍ

---

**Tareas:**

1. **Crear TESTING-RESULTS.md** (20min):
   Crear `docs/migration-supabase-vps/TESTING-RESULTS.md`:

   ```markdown
   # Testing Results - Migración Supabase → VPS

   **Fecha:** 2025-12-30
   **Ambiente:** DEV (local)
   **Tester:** @agent-backend-developer

   ---

   ## Resumen Ejecutivo

   | Test | Status | Notas |
   |------|--------|-------|
   | Guest Chat Público | ✅ Pass | Latencia ~2s |
   | Guest Portal Auth | ✅ Pass | JWT funciona |
   | Staff Dashboard | ✅ Pass | Nuevo auth JWT |
   | SIRE Compliance | ✅ Pass | MinIO storage OK |
   | Multi-tenant Isolation | ✅ Pass | RLS funcionando |
   | Búsqueda Vectorial | ✅ Pass | <500ms |

   ---

   ## Detalle de Tests

   ### 1. Guest Chat Público (/with-me)
   - **Status:** ✅ Passed
   - **Latencia promedio:** 2.1s
   - **Errores encontrados:** Ninguno
   - **Notas:** Búsqueda vectorial funciona correctamente

   ### 2. Guest Portal Autenticado (/my-stay)
   - **Status:** ✅ Passed
   - **Auth method:** JWT (check-in + phone last 4)
   - **Errores encontrados:** Ninguno

   ### 3. Staff Dashboard
   - **Status:** ✅ Passed
   - **Auth method:** Nuevo staff-auth.ts con JWT
   - **Cookie:** staff-token (HTTP-only)
   - **Errores encontrados:** Ninguno

   ### 4. SIRE Compliance
   - **Status:** ✅ Passed
   - **Storage:** MinIO funcionando
   - **OCR:** Claude Vision OK
   - **Export TXT:** Formato correcto

   ### 5. Multi-tenant Isolation
   - **Status:** ✅ Passed
   - **RLS policies:** 102 activas
   - **Cross-tenant access:** Bloqueado correctamente

   ### 6. Búsqueda Vectorial
   - **Status:** ✅ Passed
   - **Latencia:** 450ms promedio
   - **Embeddings:** Dimensiones correctas (1024/1536/3072)

   ---

   ## Performance Comparativo

   | Métrica | Supabase (antes) | VPS (después) | Diferencia |
   |---------|------------------|---------------|------------|
   | Query simple | ~150ms | ~120ms | -20% |
   | Búsqueda vectorial | ~600ms | ~450ms | -25% |
   | Upload archivo | ~800ms | ~500ms | -37% |

   ---

   ## Issues Encontrados

   1. **Ninguno crítico**

   ### Issues Menores (si hay)
   - [ ] Issue 1: Descripción...
   - [ ] Issue 2: Descripción...

   ---

   ## Rollback Plan Verificado

   - [ ] Variables Supabase aún disponibles (comentadas)
   - [ ] Código de rollback documentado
   - [ ] Tiempo estimado de rollback: 15 minutos

   ---

   **Conclusión:** Migración exitosa. Todos los tests pasan. Ready for TST/PRD deployment.
   ```

2. **Listar issues encontrados** (5min):
   Documentar cualquier bug o issue menor.

3. **Comparar performance** (5min):
   Si es posible, medir latencias comparativas.

4. **Verificar plan de rollback** (5min):
   - Confirmar que variables Supabase siguen disponibles
   - Documentar pasos de rollback

**Entregables:**
- `docs/migration-supabase-vps/TESTING-RESULTS.md` completo
- Lista de issues (si hay)
- Performance comparativo
- Rollback plan documentado

**Criterios de Éxito:**
- ✅ Todos los tests documentados
- ✅ Issues priorizados
- ✅ Rollback plan verificado

**Estimado:** 20min

---

**🔍 Verificación Post-Ejecución FASE 5 COMPLETA:**

"¿Consideras satisfactoria la ejecución de FASE 5 completa?

Resumen:
- Guest chat público funciona ✓
- Guest portal autenticado funciona ✓
- Staff dashboard funciona ✓
- SIRE compliance funciona ✓
- Multi-tenant isolation verificado ✓
- Búsqueda vectorial funciona ✓
- Resultados documentados ✓"

**Si aprobado:**
"✅ FASE 5 COMPLETADA

**Progreso FASE 5:** 7/7 tareas completadas (100%) ✅ COMPLETADA
**Progreso General:** 33/38 tareas completadas (87%)

**Siguiente:** FASE 6 - Deploy + Cleanup
Ver: `FASE-6-deploy-cleanup.md`"

🔼 **COPIAR HASTA AQUÍ (Prompt 5.7)**

---

## Checklist FASE 5

- [ ] 5.1 Test guest chat público
- [ ] 5.2 Test guest portal autenticado
- [ ] 5.3 Test staff dashboard
- [ ] 5.4 Test SIRE compliance
- [ ] 5.5 Test multi-tenant isolation
- [ ] 5.6 Test búsqueda vectorial
- [ ] 5.7 Documentar resultados

**Anterior:** `FASE-4-minio-storage.md`
**Siguiente:** `FASE-6-deploy-cleanup.md`
