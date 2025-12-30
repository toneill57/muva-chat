# TODO - Migración Supabase → PostgreSQL VPS

## 📍 CONTEXTO ACTUAL

**Proyecto:** migration-supabase-vps
**Última actualización:** 2025-12-30
**Fase actual:** FASE 1 - Setup Database VPS

### Estado del Sistema
- ✅ 3 proyectos Supabase funcionando (dev/tst/prd)
- ✅ pgvector instalado en VPS
- ✅ 3 bases de datos VPS creadas (vacías)
- ✅ Credenciales VPS documentadas
- 🔜 Migrar schema y datos a VPS (FASE 1)

### Limitaciones Actuales
- ❌ Todo tráfico DB pasa por Supabase
- ❌ Staff auth depende de Supabase GoTrue
- ❌ Storage de documentos en Supabase

### Archivos Clave
- `src/lib/supabase/client.ts` → Cliente browser actual
- `src/lib/supabase/server.ts` → Cliente server actual
- `src/lib/guest-auth.ts` → Auth JWT (ya independiente)
- `migrations/*.sql` → 50+ migraciones a aplicar

### Stack
- PostgreSQL 15+ con pgvector
- Next.js 15.5.9
- pg / postgres.js (nuevo)
- MinIO (S3-compatible)
- jose (JWT)

**Contexto técnico:** Ver `CONTEXTO.md`
**Plan completo:** Ver `plan.md` para arquitectura y especificaciones

---

## FASE 1: Setup Database VPS 🎯

### 1.1 Verificar conectividad y extensiones
- [ ] Probar conexión desde local a VPS DEV (estimate: 15min)
  - Conectar con credenciales: `psql -h 195.200.6.216 -p 46101 -U muva_dev_user -d muva_dev`
  - Verificar pgvector: `SELECT * FROM pg_extension WHERE extname = 'vector';`
  - Verificar uuid-ossp: `SELECT * FROM pg_extension WHERE extname = 'uuid-ossp';`
  - Agent: **@agent-database-agent**
  - Test: Conexión exitosa, extensiones listadas

### 1.2 Exportar schema de Supabase
- [ ] Exportar DDL completo de Supabase DEV (estimate: 30min)
  - Exportar todas las tablas: `pg_dump --schema-only`
  - Exportar funciones RPC
  - Exportar RLS policies
  - Exportar triggers
  - Files: `scripts/migration/01-export-supabase.sh`
  - Agent: **@agent-database-agent**
  - Test: Archivo SQL generado sin errores

### 1.3 Exportar datos de Supabase
- [ ] Exportar datos de tablas principales (estimate: 30min)
  - Usar `pg_dump --data-only` para tablas con datos
  - Excluir tablas de sistema Supabase
  - Manejar referencias a auth.users
  - Files: `scripts/migration/01-export-supabase.sh`
  - Agent: **@agent-database-agent**
  - Test: Dump de datos completo

### 1.4 Crear schema en VPS DEV
- [ ] Aplicar migraciones en muva_dev (estimate: 45min)
  - Crear extensiones: vector, uuid-ossp
  - Aplicar schema desde migrations/
  - Verificar 53 tablas creadas
  - Files: `scripts/migration/02-import-vps.sh`
  - Agent: **@agent-database-agent**
  - Test: `SELECT count(*) FROM pg_tables WHERE schemaname = 'public'` = 53

### 1.5 Importar funciones RPC
- [ ] Crear todas las funciones en VPS DEV (estimate: 30min)
  - Aplicar funciones desde migrations/fresh-2025-11-01/08-functions.sql
  - Verificar 86+ funciones creadas
  - Probar función de prueba: `SELECT match_documents(...)`
  - Agent: **@agent-database-agent**
  - Test: Funciones ejecutables sin error

### 1.6 Configurar RLS policies
- [ ] Aplicar RLS policies en VPS DEV (estimate: 30min)
  - Habilitar RLS en todas las tablas
  - Aplicar 102 policies
  - Verificar aislamiento multi-tenant
  - Agent: **@agent-database-agent**
  - Test: `SELECT * FROM pg_policies` muestra 102+ registros

### 1.7 Importar datos
- [ ] Cargar datos en VPS DEV (estimate: 30min)
  - Importar datos exportados
  - Verificar conteo de registros por tabla
  - Verificar integridad referencial
  - Agent: **@agent-database-agent**
  - Test: Conteos coinciden con Supabase

### 1.8 Probar búsqueda vectorial
- [ ] Verificar pgvector funcionando (estimate: 15min)
  - Ejecutar query de embeddings
  - Verificar índices HNSW/IVFFlat
  - Probar `match_documents()` con embedding real
  - Agent: **@agent-database-agent**
  - Test: Búsqueda retorna resultados similares a Supabase

### 1.9 Replicar en TST y PRD
- [ ] Aplicar mismo schema a muva_tst y muva_prd (estimate: 30min)
  - Repetir proceso para TST
  - Repetir proceso para PRD (sin datos de desarrollo)
  - Verificar 3 DBs idénticas en estructura
  - Agent: **@agent-database-agent**
  - Test: Schema idéntico en 3 ambientes

---

## FASE 2: Migrar Conexión DB ⚙️

### 2.1 Crear cliente pg con pool
- [ ] Implementar connection pooling (estimate: 45min)
  - Instalar dependencias: `pg` o `postgres.js`
  - Crear pool de conexiones con retry logic
  - Configurar SSL para conexiones remotas
  - Files: `src/lib/db/pool.ts`
  - Agent: **@agent-backend-developer**
  - Test: Pool conecta y ejecuta query

### 2.2 Crear wrapper de queries
- [ ] Crear helpers para queries comunes (estimate: 1h)
  - Helper para SELECT con RLS context
  - Helper para INSERT/UPDATE/DELETE
  - Helper para transacciones
  - Helper para RPC calls
  - Files: `src/lib/db/client.ts`, `src/lib/db/queries.ts`
  - Agent: **@agent-backend-developer**
  - Test: Queries funcionan con tenant context

### 2.3 Actualizar variables de entorno
- [ ] Configurar DATABASE_URL para cada ambiente (estimate: 15min)
  - Agregar DATABASE_URL_DEV, DATABASE_URL_TST, DATABASE_URL_PRD
  - Mantener SUPABASE_* temporalmente (rollback)
  - Documentar en .env.example
  - Files: `.env.local`, `.env.example`
  - Agent: **@agent-backend-developer**
  - Test: Variables cargadas correctamente

### 2.4 Migrar API routes
- [ ] Actualizar todas las rutas API (estimate: 2h)
  - Buscar todos los `createClient()` de Supabase
  - Reemplazar con nuevo cliente pg
  - Mantener misma lógica de negocio
  - Files: `src/app/api/**/*.ts` (~50 archivos)
  - Agent: **@agent-backend-developer**
  - Test: Cada endpoint responde correctamente

### 2.5 Migrar lib functions
- [ ] Actualizar funciones de librería (estimate: 1h)
  - Actualizar conversational-chat-engine.ts
  - Actualizar integrations/motopress/*
  - Actualizar cualquier uso de supabase client
  - Files: `src/lib/**/*.ts`
  - Agent: **@agent-backend-developer**
  - Test: `pnpm run build` sin errores

### 2.6 Verificar build completo
- [ ] Build exitoso sin Supabase (estimate: 30min)
  - Ejecutar `pnpm run build`
  - Resolver errores de TypeScript
  - Verificar no hay imports de @supabase/supabase-js
  - Agent: **@agent-backend-developer**
  - Test: Build exitoso

---

## FASE 3: Staff Auth JWT ✨

### 3.1 Crear tabla staff_auth_users
- [ ] Migración para nueva tabla de auth (estimate: 30min)
  - Crear tabla con campos necesarios
  - Agregar índices para email lookup
  - FK opcional a tenant_registry
  - Files: `migrations/20251230_staff_auth_users.sql`
  - Agent: **@agent-database-agent**
  - Test: Tabla creada en 3 ambientes

### 3.2 Exportar usuarios de Supabase Auth
- [ ] Extraer usuarios staff actuales (estimate: 30min)
  - Listar usuarios de auth.users en Supabase
  - Mapear con user_tenant_permissions
  - Generar INSERT statements
  - Agent: **@agent-database-agent**
  - Test: Lista de usuarios exportada

### 3.3 Crear sistema JWT staff
- [ ] Implementar staff-auth.ts (estimate: 1h)
  - Copiar patrón de guest-auth.ts
  - Adaptar para email/password
  - Funciones: createStaffToken, verifyStaffToken
  - Files: `src/lib/staff-auth.ts`
  - Agent: **@agent-backend-developer**
  - Test: Token generado y verificado

### 3.4 Crear endpoints de auth
- [ ] Implementar login/logout/verify (estimate: 1h)
  - POST /api/auth/staff/login
  - POST /api/auth/staff/logout
  - GET /api/auth/staff/verify
  - Files: `src/app/api/auth/staff/*/route.ts`
  - Agent: **@agent-backend-developer**
  - Test: Login funciona, sesión persiste

### 3.5 Actualizar middleware
- [ ] Proteger rutas staff con nuevo auth (estimate: 30min)
  - Actualizar middleware.ts si existe
  - Verificar token en rutas protegidas
  - Mantener compatibilidad con guest-auth
  - Agent: **@agent-backend-developer**
  - Test: Rutas protegidas rechazan sin token

### 3.6 Migrar user_tenant_permissions
- [ ] Actualizar FK a nueva tabla (estimate: 30min)
  - Cambiar FK de auth.users a staff_auth_users
  - Migrar datos de permisos
  - Verificar RLS sigue funcionando
  - Agent: **@agent-database-agent**
  - Test: Permisos funcionan con nuevo auth

---

## FASE 4: MinIO Storage 🎨

### 4.1 Instalar y configurar MinIO
- [ ] Setup MinIO en VPS (estimate: 30min)
  - Instalar MinIO (Docker o binario)
  - Configurar puerto y credenciales
  - Crear bucket sire-documents
  - Agent: **@agent-infrastructure-monitor** o manual
  - Test: MinIO console accesible

### 4.2 Crear cliente MinIO
- [ ] Implementar minio-client.ts (estimate: 30min)
  - Instalar @aws-sdk/client-s3
  - Configurar cliente S3-compatible
  - Funciones: uploadFile, getFileUrl, deleteFile
  - Files: `src/lib/storage/minio-client.ts`
  - Agent: **@agent-backend-developer**
  - Test: Upload/download funciona

### 4.3 Migrar archivos existentes
- [ ] Copiar archivos de Supabase a MinIO (estimate: 30min)
  - Listar archivos en sire-documents de Supabase
  - Descargar y subir a MinIO
  - Actualizar URLs en sire_document_uploads
  - Agent: **@agent-backend-developer**
  - Test: Archivos accesibles desde MinIO

### 4.4 Actualizar extract-document route
- [ ] Migrar upload de documentos SIRE (estimate: 30min)
  - Reemplazar supabase.storage con minio-client
  - Mantener misma lógica de OCR
  - Actualizar URLs guardadas
  - Files: `src/app/api/sire/extract-document/route.ts`
  - Agent: **@agent-backend-developer**
  - Test: Upload de documento SIRE funciona

### 4.5 Configurar CORS y acceso público
- [ ] Permitir acceso a archivos desde browser (estimate: 15min)
  - Configurar bucket policy en MinIO
  - Habilitar CORS si necesario
  - Generar presigned URLs si privado
  - Agent: **@agent-backend-developer**
  - Test: Imágenes cargan en browser

---

## FASE 5: Testing Integral 🧪

### 5.1 Test guest chat público
- [ ] Verificar /with-me funciona (estimate: 20min)
  - Enviar mensaje de prueba
  - Verificar respuesta de AI
  - Verificar búsqueda vectorial
  - Test: Chat responde correctamente

### 5.2 Test guest portal autenticado
- [ ] Verificar /my-stay funciona (estimate: 20min)
  - Login con check-in + phone
  - Verificar datos de reservación
  - Verificar chat contextual
  - Test: Portal funciona con auth

### 5.3 Test staff dashboard
- [ ] Verificar dashboard staff (estimate: 30min)
  - Login con nuevo staff auth
  - Ver reservaciones
  - Ver conversaciones
  - Test: Dashboard completamente funcional

### 5.4 Test SIRE compliance
- [ ] Verificar flujo SIRE completo (estimate: 30min)
  - Upload de documento
  - OCR y extracción
  - Guardar datos
  - Exportar TXT
  - Test: Flujo SIRE end-to-end

### 5.5 Test multi-tenant isolation
- [ ] Verificar aislamiento entre tenants (estimate: 30min)
  - Login como tenant A
  - Verificar no ve datos de tenant B
  - Probar RLS en queries directas
  - Test: Aislamiento perfecto

### 5.6 Test búsqueda vectorial
- [ ] Verificar embeddings funcionando (estimate: 20min)
  - Buscar alojamientos
  - Buscar actividades MUVA
  - Verificar relevancia de resultados
  - Test: Búsqueda retorna resultados correctos

### 5.7 Documentar resultados
- [ ] Crear TESTING-RESULTS.md (estimate: 20min)
  - Documentar todos los tests
  - Listar bugs encontrados
  - Comparativo de performance
  - Files: `docs/migration-supabase-vps/TESTING-RESULTS.md`
  - Test: Documento completo

---

## FASE 6: Deploy + Cleanup 🚀

### 6.1 Deploy a TST
- [ ] Desplegar rama tst con nuevos cambios (estimate: 30min)
  - Merge dev → tst
  - Verificar GitHub Action deploy
  - Verificar health check staging.muva.chat
  - Agent: **@agent-deploy-agent**
  - Test: `curl -s https://staging.muva.chat/api/health`

### 6.2 Smoke tests TST
- [ ] Verificar funcionalidad básica en TST (estimate: 30min)
  - Chat funciona
  - Auth funciona
  - Storage funciona
  - Test: Todo OK en staging

### 6.3 Deploy a PRD
- [ ] Desplegar a producción (estimate: 30min)
  - Merge tst → prd (requiere approval)
  - Verificar GitHub Action deploy
  - Verificar health check muva.chat
  - Agent: **@agent-deploy-agent**
  - Test: `curl -s https://muva.chat/api/health`

### 6.4 Smoke tests PRD
- [ ] Verificar funcionalidad en producción (estimate: 30min)
  - Chat funciona
  - Auth funciona
  - Storage funciona
  - Test: Todo OK en producción

### 6.5 Eliminar código Supabase
- [ ] Limpiar código obsoleto (estimate: 30min)
  - Eliminar src/lib/supabase/
  - Eliminar dependencias supabase-js
  - Actualizar package.json
  - Files: Eliminar archivos, actualizar imports
  - Agent: **@agent-backend-developer**
  - Test: Build sigue funcionando

### 6.6 Actualizar documentación
- [ ] Actualizar CLAUDE.md y docs (estimate: 30min)
  - Remover referencias a Supabase
  - Documentar nueva arquitectura
  - Actualizar troubleshooting
  - Files: `CLAUDE.md`, `docs/infrastructure/*`
  - Test: Documentación coherente

### 6.7 Archivar proyectos Supabase
- [ ] Desactivar proyectos Supabase (estimate: 15min)
  - Pausar proyectos (no eliminar aún)
  - Hacer backup final
  - Documentar fecha de eliminación (1 semana)
  - Test: Proyectos pausados

---

## 📊 PROGRESO

**Total Tasks:** 38
**Completed:** 0/38 (0%)

**Por Fase:**
- FASE 1: 0/9 tareas (0%) ← EN PROGRESO
- FASE 2: 0/6 tareas (0%)
- FASE 3: 0/6 tareas (0%)
- FASE 4: 0/5 tareas (0%)
- FASE 5: 0/7 tareas (0%)
- FASE 6: 0/7 tareas (0%)

---

**Última actualización:** 2025-12-30
