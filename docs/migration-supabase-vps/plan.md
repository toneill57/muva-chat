# Migración Supabase → PostgreSQL VPS - Plan de Implementación

**Proyecto:** migration-supabase-vps
**Fecha Inicio:** 2025-12-30
**Estado:** 📋 Planificación

**Contexto técnico:** Ver `CONTEXTO.md` para detalles de DB, APIs y flujos.

---

## 🎯 OVERVIEW

### Objetivo Principal
Migrar completamente MUVA Chat desde Supabase hacia PostgreSQL auto-hospedado en VPS, eliminando dependencia de servicios Supabase y reduciendo costos operativos.

### ¿Por qué?
- **Reducir costos:** Supabase escala en precio, VPS es costo fijo
- **Mayor control:** Acceso root, configuración personalizada, sin límites de API
- **Independencia:** Sin vendor lock-in, datos 100% propios

### Alcance
- ✅ Migrar 53 tablas con datos
- ✅ Migrar 86+ funciones RPC
- ✅ Migrar 102 RLS policies
- ✅ Crear sistema Staff Auth (JWT propio)
- ✅ Configurar MinIO para storage
- ✅ Actualizar conexión DB en toda la app
- ✅ Mantener three-tier architecture (dev/tst/prd)

---

## 📊 ESTADO ACTUAL

### Sistema Existente
- ✅ 3 proyectos Supabase funcionando (dev/tst/prd)
- ✅ Guest Auth con JWT propio (no depende de Supabase)
- ✅ Super Admin Auth con JWT propio (no depende de Supabase)
- ✅ pgvector instalado en VPS
- ✅ 3 bases de datos creadas en VPS (vacías)

### Limitaciones Actuales
- ❌ Costo mensual Supabase creciente
- ❌ Staff Auth depende de Supabase GoTrue
- ❌ Storage depende de Supabase Storage
- ❌ Toda conexión DB pasa por supabase-js

---

## 🚀 ESTADO DESEADO

### Nueva Experiencia
Aplicación corriendo 100% en infraestructura propia, con:
- PostgreSQL + pgvector en VPS
- MinIO para storage de archivos
- Sistema de auth unificado (todo JWT propio)
- Conexión directa pg/postgres.js (más rápido)

### Características Clave
- **Zero Supabase:** Eliminar todas las dependencias
- **Mismo flujo:** UX idéntica para usuarios
- **Mejor performance:** Conexión directa, sin proxy
- **Backup propio:** Control total de datos

---

## 📱 TECHNICAL STACK

### Actual (Supabase)
- supabase-js client
- Supabase Auth (GoTrue)
- Supabase Storage (S3)
- Supabase PostgreSQL (hosted)

### Nuevo (VPS)
- **DB Client:** pg / postgres.js
- **ORM:** None (SQL directo, como ahora)
- **Auth:** JWT propio con jose (extender guest-auth pattern)
- **Storage:** MinIO SDK (@aws-sdk/client-s3)
- **Extensions:** pgvector, uuid-ossp

---

## 🔧 DESARROLLO - FASES

### FASE 1: Setup Database VPS (2-3h)
**Objetivo:** Preparar las 3 bases de datos en VPS con schema completo

**Dependencias:** Ninguna
**Puede paralelizar con:** Ninguna

**Entregables:**
- Schema completo aplicado a muva_dev, muva_tst, muva_prd
- pgvector verificado funcionando
- Funciones RPC migradas
- RLS policies activas
- Datos migrados desde Supabase

**Archivos a crear/modificar:**
- `scripts/migration/01-export-supabase.sh`
- `scripts/migration/02-import-vps.sh`
- `scripts/migration/03-verify-migration.sql`

**Testing:**
- Verificar conteo de registros por tabla
- Ejecutar funciones RPC de prueba
- Probar búsqueda vectorial

---

### FASE 2: Migrar Conexión DB (3-4h)
**Objetivo:** Reemplazar supabase-js con cliente pg directo

**Dependencias:** FASE 1 completada
**Puede paralelizar con:** FASE 3, FASE 4

**Entregables:**
- Nuevo cliente pg con connection pooling
- Wrapper compatible con patrones actuales
- Todas las queries funcionando
- Variables de entorno actualizadas

**Archivos a crear/modificar:**
- `src/lib/db/pool.ts` (nuevo)
- `src/lib/db/client.ts` (nuevo)
- `src/lib/db/queries.ts` (nuevo)
- `.env.local`, `.env.tst`, `.env.prd`
- ~50+ archivos que usan `createClient()`

**Testing:**
- `pnpm run build` sin errores
- API endpoints respondiendo
- Chat funcionando

---

### FASE 3: Staff Auth JWT (2-3h)
**Objetivo:** Crear sistema de autenticación para staff independiente de Supabase

**Dependencias:** FASE 1 completada
**Puede paralelizar con:** FASE 2, FASE 4

**Entregables:**
- Nueva tabla `staff_auth_users`
- Sistema JWT para staff (como guest-auth)
- Migración de usuarios desde Supabase Auth
- Endpoints login/logout/verify

**Archivos a crear/modificar:**
- `src/lib/staff-auth.ts` (nuevo)
- `src/app/api/auth/staff/login/route.ts` (nuevo)
- `src/app/api/auth/staff/logout/route.ts` (nuevo)
- `migrations/20251230_staff_auth_users.sql` (nuevo)
- Archivos que usan `supabase.auth`

**Testing:**
- Login staff funciona
- Sesión persiste
- Logout limpia tokens
- RLS respeta user_id

---

### FASE 4: MinIO Storage (2h)
**Objetivo:** Configurar MinIO y migrar archivos desde Supabase Storage

**Dependencias:** FASE 1 completada
**Puede paralelizar con:** FASE 2, FASE 3

**Entregables:**
- MinIO corriendo en VPS
- Bucket `sire-documents` creado
- Archivos migrados desde Supabase
- SDK integrado en app

**Archivos a crear/modificar:**
- `src/lib/storage/minio-client.ts` (nuevo)
- `src/app/api/sire/extract-document/route.ts`
- `docker-compose.yml` (si MinIO en Docker)
- `.env.*` con credenciales MinIO

**Testing:**
- Upload de archivo funciona
- Download de archivo funciona
- OCR de documentos SIRE funciona

---

### FASE 5: Testing Integral (2-3h)
**Objetivo:** Verificar toda la aplicación funcionando con nueva infraestructura

**Dependencias:** FASE 2, 3, 4 completadas
**Puede paralelizar con:** Ninguna

**Entregables:**
- Checklist de funcionalidades verificadas
- Bugs encontrados documentados
- Performance comparativo
- Rollback plan probado

**Archivos a crear/modificar:**
- `docs/migration-supabase-vps/TESTING-RESULTS.md`
- Scripts de verificación

**Testing:**
- [ ] Guest chat público (/with-me)
- [ ] Guest portal autenticado (/my-stay)
- [ ] Staff dashboard
- [ ] Super admin panel
- [ ] SIRE document upload + OCR
- [ ] SIRE export
- [ ] Reservations sync (Motopress)
- [ ] Búsqueda vectorial
- [ ] Multi-tenant isolation

---

### FASE 6: Deploy + Cleanup (2h)
**Objetivo:** Desplegar a TST/PRD y eliminar Supabase

**Dependencias:** FASE 5 completada
**Puede paralelizar con:** Ninguna

**Entregables:**
- TST corriendo en VPS
- PRD corriendo en VPS
- Supabase projects archivados/eliminados
- Documentación actualizada

**Archivos a crear/modificar:**
- `CLAUDE.md` (actualizar referencias)
- `.github/workflows/*.yml` (si necesario)
- Eliminar archivos Supabase obsoletos

**Testing:**
- Health checks pasando
- Smoke tests en producción
- Monitoreo activo

---

## ✅ CRITERIOS DE ÉXITO

### Funcionalidad
- [ ] 100% de features funcionando igual que con Supabase
- [ ] Cero regresiones en flujos críticos
- [ ] Multi-tenant isolation funcionando

### Performance
- [ ] Latencia DB igual o mejor que Supabase
- [ ] Búsqueda vectorial <500ms
- [ ] Uploads <2s para archivos 10MB

### Seguridad
- [ ] RLS policies activas y probadas
- [ ] JWT tokens seguros
- [ ] Conexiones SSL/TLS

### Operacional
- [ ] Backup automatizado configurado
- [ ] Monitoreo de DB activo
- [ ] Documentación actualizada

---

## 🤖 AGENTES REQUERIDOS

### 1. **@agent-database-agent** (Principal)
**Responsabilidad:** Migraciones, schema, funciones RPC, RLS

**Tareas:**
- FASE 1: Export Supabase, import VPS, verificar schema
- FASE 3: Crear tabla staff_auth_users

**Archivos:**
- `migrations/*.sql`
- `scripts/migration/*.sh`

---

### 2. **@agent-backend-developer** (Principal)
**Responsabilidad:** Conexión DB, autenticación, storage

**Tareas:**
- FASE 2: Cliente pg, queries, connection pool
- FASE 3: Staff auth JWT system
- FASE 4: MinIO client integration

**Archivos:**
- `src/lib/db/*.ts`
- `src/lib/staff-auth.ts`
- `src/lib/storage/minio-client.ts`

---

### 3. **@agent-deploy-agent** (Secundario)
**Responsabilidad:** Despliegue y verificación

**Tareas:**
- FASE 6: Deploy a TST/PRD

**Archivos:**
- `.github/workflows/*.yml`
- Configuración PM2

---

### 4. **@agent-infrastructure-monitor** (Secundario)
**Responsabilidad:** Monitoreo post-migración

**Tareas:**
- FASE 5: Verificar health
- FASE 6: Monitoreo continuo

---

## 📂 ESTRUCTURA DE ARCHIVOS

```
/Users/oneill/Sites/apps/muva-chat/
├── src/
│   └── lib/
│       ├── db/                      # NUEVO - Conexión PG
│       │   ├── pool.ts
│       │   ├── client.ts
│       │   └── queries.ts
│       ├── storage/                 # NUEVO - MinIO
│       │   └── minio-client.ts
│       ├── staff-auth.ts            # NUEVO - Auth JWT
│       └── supabase/                # ELIMINAR post-migración
│           ├── client.ts
│           └── server.ts
├── scripts/
│   └── migration/                   # NUEVO
│       ├── 01-export-supabase.sh
│       ├── 02-import-vps.sh
│       └── 03-verify-migration.sql
├── migrations/
│   └── 20251230_staff_auth_users.sql  # NUEVO
└── docs/
    └── migration-supabase-vps/      # Documentación proyecto
        ├── CONTEXTO.md
        ├── plan.md
        ├── TODO.md
        ├── FASE-1-setup-db-vps.md
        ├── FASE-2-conexion-pg.md
        ├── FASE-3-staff-auth.md
        ├── FASE-4-minio-storage.md
        ├── FASE-5-testing.md
        └── FASE-6-deploy-cleanup.md
```

---

## 📝 NOTAS IMPORTANTES

### Consideraciones Técnicas
- **pgvector:** Verificar versión compatible (0.5.0+)
- **Connection pooling:** Usar pool de conexiones para evitar agotamiento
- **SSL:** Configurar SSL para conexiones remotas (DEV usa IP pública)
- **Backups:** Configurar pg_dump automático antes de eliminar Supabase

### Rollback Plan
1. Mantener Supabase activo durante 1 semana post-migración
2. Env vars con flag `USE_SUPABASE=true` para rollback rápido
3. Script de sync bidireccional si es necesario

### Credenciales Sensibles
- Passwords de DB en secrets de GitHub Actions
- No commitear `.env.local` con credenciales reales
- Rotar credenciales después de migración

---

## ⏱️ ESTIMACIÓN TOTAL

| Fase | Estimado | Acumulado |
|------|----------|-----------|
| FASE 1 | 2-3h | 3h |
| FASE 2 | 3-4h | 7h |
| FASE 3 | 2-3h | 10h |
| FASE 4 | 2h | 12h |
| FASE 5 | 2-3h | 15h |
| FASE 6 | 2h | 17h |

**Total estimado:** 15-17 horas de trabajo

---

**Última actualización:** 2025-12-30
**Próximo paso:** Ver TODO.md para tareas detalladas
