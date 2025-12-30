# CONTEXTO.md - Migración Supabase → PostgreSQL VPS

## Objetivo
Migrar completamente MUVA Chat desde Supabase (3 proyectos) hacia PostgreSQL auto-hospedado en VPS, incluyendo base de datos, autenticación de staff y storage de archivos, manteniendo funcionalidad completa y three-tier architecture (dev/tst/prd).

---

## Credenciales VPS PostgreSQL

| Ambiente | Host | Puerto | Database | Usuario | Password |
|----------|------|--------|----------|---------|----------|
| **DEV** | 195.200.6.216 | 46101 | muva_dev | muva_dev_user | `wKvsH0f9O!pACByk!2` |
| **TST** | 127.0.0.1 | 46101 | muva_tst | muva_tst_user | `s4Uc!OL7J1rGOdKaLx!p4` |
| **PRD** | 127.0.0.1 | 46101 | muva_prd | muva_prd_user | `C!R0t1SJq2!pKIeL1aI!7a2` |

**Nota:** TST y PRD usan 127.0.0.1 porque la app corre en el mismo VPS.

---

## Estado Actual (Supabase)

### Proyectos Supabase (A eliminar post-migración)
| Tier | Project ID | URL |
|------|------------|-----|
| DEV | `zpyxgkvonrxbhvmkuzlt` | Desarrollo local |
| TST | `bddcvjoeoiekzfetvxoe` | staging.muva.chat |
| PRD | `kprqghwdnaykxhostivv` | muva.chat |

### Base de Datos

**Tablas Públicas (53 tablas):**
```
accommodation_manual_analytics    calendar_event_conflicts
accommodation_manuals             calendar_events
accommodation_units               calendar_sync_logs
accommodation_units_manual        chat_conversations
accommodation_units_manual_chunks chat_messages
accommodation_units_public        code_embeddings
ai_usage_logs                     compliance_submissions
airbnb_motopress_comparison       conversation_attachments
airbnb_mphb_imported_reservations conversation_memory
guest_conversations               reservation_accommodations
guest_reservations                reservation_guests
hotel_operations                  sire_cities
hotels                            sire_content
ics_feed_configurations           sire_countries
integration_configs               sire_document_types
job_logs                          sire_document_uploads
migration_metadata                sire_export_guests
muva_content                      sire_export_logs
policies                          sire_exports
property_relationships            sire_submissions
prospective_sessions              staff_conversations
staff_messages                    super_admin_users
staff_users                       super_chat_sessions
super_admin_audit_log             sync_history
tenant_compliance_credentials     user_tenant_permissions
tenant_knowledge_embeddings       tenant_registry
tenant_muva_content
```

**Funciones RPC Custom (86+):**
- Vector search: `match_*` (20+ funciones)
- Tenant management: `get_tenant_*`, `set_app_tenant_id`
- SIRE compliance: `get_sire_*`, `check_sire_*`
- Accommodation: `get_accommodation_*`, `create_accommodation_*`
- Admin: `exec_sql`, `check_rls_*`, `list_rls_*`

**RLS Policies (102):**
- Patrón optimizado con subquery:
  ```sql
  tenant_id = (SELECT current_setting('app.tenant_id')::uuid)
  ```

**Extensions Requeridas:**
- `pgvector` - Búsqueda vectorial (embeddings 1024/1536/3072)
- `uuid-ossp` - Generación de UUIDs
- `pg_trgm` - Búsqueda fuzzy (si se usa)

### Autenticación

**1. Guest Auth (JWT Custom) - NO CAMBIAR**
- Ubicación: `src/lib/guest-auth.ts`
- Método: Check-in date + phone last 4
- Ya es independiente de Supabase ✅

**2. Super Admin Auth (Custom) - NO CAMBIAR**
- Ubicación: `src/lib/super-admin-auth.ts`
- Tabla: `super_admin_users`
- Ya es independiente de Supabase ✅

**3. Staff Auth (Supabase Auth) - MIGRAR**
- Actualmente usa: `auth.users` de Supabase
- FK en: `user_tenant_permissions.user_id`
- Migrará a: tabla local `staff_auth_users` + JWT propio

### Storage

**Bucket: `sire-documents`**
- Propósito: Documentos de identidad (pasaportes, visas, cédulas)
- Formatos: image/jpeg, image/png, image/gif, image/webp
- Max size: 10MB
- Referencias en: `sire_document_uploads.file_url`

**Migrará a:** MinIO (S3-compatible) en VPS

---

## Estado Deseado (VPS)

### Arquitectura Final

```
┌─────────────────────────────────────────────────────────────┐
│                     VPS PostgreSQL                           │
├─────────────────┬─────────────────┬─────────────────────────┤
│   muva_dev      │   muva_tst      │   muva_prd              │
│   (desarrollo)  │   (staging)     │   (producción)          │
├─────────────────┴─────────────────┴─────────────────────────┤
│                     pgvector enabled                         │
│                     53 tablas migradas                       │
│                     86+ funciones RPC                        │
│                     102 RLS policies                         │
│                     Nueva tabla: staff_auth_users           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     MinIO (S3-compatible)                    │
├─────────────────────────────────────────────────────────────┤
│   Bucket: sire-documents                                     │
│   Endpoint: http://localhost:9000 o https://minio.muva.chat │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     Next.js App                              │
├─────────────────────────────────────────────────────────────┤
│   Conexión: pg / postgres.js (directo)                      │
│   Sin supabase-js client                                    │
│   Staff Auth: JWT propio (como guest-auth)                  │
└─────────────────────────────────────────────────────────────┘
```

### Cambios en Código

**Archivos a Modificar (Conexión DB):**
| Archivo Actual | Usa Supabase | Cambio |
|----------------|--------------|--------|
| `src/lib/supabase/client.ts` | Sí | Reemplazar con pg pool |
| `src/lib/supabase/server.ts` | Sí | Reemplazar con pg pool |
| Todos los `createClient()` | Sí | Usar pool directo |

**Archivos con Storage:**
| Archivo | Operación | Cambio |
|---------|-----------|--------|
| `src/app/api/sire/extract-document/route.ts` | Upload | Usar MinIO SDK |
| Referencias a `storage.from('sire-documents')` | Download | Usar MinIO SDK |

**Archivos con Auth (Staff):**
| Archivo | Cambio |
|---------|--------|
| `src/lib/staff-auth.ts` (crear) | Nuevo sistema JWT |
| Rutas que usan `supabase.auth` | Migrar a staff-auth.ts |

---

## Flujo de Datos

### Actual (Supabase)
```
Next.js App
    │
    ├──[supabase-js]──→ Supabase API
    │                      │
    │                      ├──→ PostgreSQL (hosted)
    │                      ├──→ Auth (GoTrue)
    │                      └──→ Storage (S3)
    │
    └──[jose JWT]──→ Custom Auth (guest/super-admin)
```

### Deseado (VPS)
```
Next.js App
    │
    ├──[pg/postgres.js]──→ PostgreSQL VPS (directo)
    │                          │
    │                          └──→ pgvector
    │
    ├──[minio SDK]──→ MinIO (storage)
    │
    └──[jose JWT]──→ Custom Auth (guest/staff/super-admin)
```

---

## Archivos Clave del Proyecto

### Conexión DB (Reemplazar)
| Archivo | Propósito | Fase |
|---------|-----------|------|
| `src/lib/supabase/client.ts` | Cliente browser | 2 |
| `src/lib/supabase/server.ts` | Cliente server | 2 |
| `.env.local` | Variables Supabase | 2 |

### Migraciones (Ejecutar en VPS)
| Archivo | Propósito | Fase |
|---------|-----------|------|
| `migrations/*.sql` | 50 migraciones root | 1 |
| `migrations/fresh-2025-11-01/*.sql` | 15 schema fresh | 1 |

### Auth Staff (Crear nuevo)
| Archivo | Propósito | Fase |
|---------|-----------|------|
| `src/lib/staff-auth.ts` | Nuevo auth JWT | 3 |
| `src/app/api/auth/staff/*` | Endpoints login/logout | 3 |

### Storage (Migrar a MinIO)
| Archivo | Propósito | Fase |
|---------|-----------|------|
| `src/lib/storage/minio-client.ts` | Cliente MinIO | 4 |
| `src/app/api/sire/extract-document/route.ts` | Upload docs | 4 |

---

## Dependencias Entre Fases

```
FASE 1 (Setup DB VPS)
    │
    ├──→ FASE 2 (Migrar conexión pg)
    │         │
    │         └──→ FASE 5 (Testing integral)
    │
    ├──→ FASE 3 (Staff Auth JWT)
    │         │
    │         └──→ FASE 5 (Testing integral)
    │
    └──→ FASE 4 (MinIO Storage)
              │
              └──→ FASE 5 (Testing integral)

FASE 6 (Deploy + Cleanup) ← Requiere FASE 5 completada
```

| Fase | Depende de | Puede paralelizar con |
|------|------------|----------------------|
| 1 | Ninguna | - |
| 2 | 1 | 3, 4 |
| 3 | 1 | 2, 4 |
| 4 | 1 | 2, 3 |
| 5 | 2, 3, 4 | - |
| 6 | 5 | - |

---

## Esquema DB Relevante

### Nueva Tabla: staff_auth_users (FASE 3)
```sql
CREATE TABLE staff_auth_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    tenant_id UUID REFERENCES tenant_registry(id),
    role TEXT DEFAULT 'staff',
    email_verified BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migrar datos desde auth.users de Supabase
-- (solo los que tienen permisos en user_tenant_permissions)
```

### Modificar: user_tenant_permissions
```sql
-- Cambiar FK de auth.users a staff_auth_users
ALTER TABLE user_tenant_permissions
    DROP CONSTRAINT user_tenant_permissions_user_id_fkey,
    ADD CONSTRAINT user_tenant_permissions_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES staff_auth_users(id);
```

---

## Riesgos y Mitigaciones

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Pérdida de datos durante migración | Alto | Backup completo antes, verificación post-migración |
| Funciones RPC incompatibles | Medio | Probar cada función en VPS antes de cortar |
| Embeddings corruptos | Alto | Validar dimensiones pgvector, re-generar si necesario |
| Downtime extendido | Medio | Migración en horario bajo, rollback plan |
| MinIO mal configurado | Medio | Probar uploads/downloads antes de producción |

---

## Variables de Entorno (Nuevas)

```bash
# PostgreSQL VPS (reemplaza SUPABASE_*)
DATABASE_URL_DEV=postgresql://muva_dev_user:wKvsH0f9O!pACByk!2@195.200.6.216:46101/muva_dev
DATABASE_URL_TST=postgresql://muva_tst_user:s4Uc!OL7J1rGOdKaLx!p4@127.0.0.1:46101/muva_tst
DATABASE_URL_PRD=postgresql://muva_prd_user:C!R0t1SJq2!pKIeL1aI!7a2@127.0.0.1:46101/muva_prd

# MinIO (reemplaza Supabase Storage)
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=sire-documents
MINIO_USE_SSL=false

# Staff Auth (nuevo)
STAFF_JWT_SECRET=<generar-secret-seguro>
STAFF_JWT_EXPIRY=7d
```

---

## Checklist Pre-Migración

- [ ] Backup completo de los 3 proyectos Supabase
- [ ] Verificar pgvector instalado en VPS
- [ ] Configurar MinIO en VPS
- [ ] Crear bases de datos vacías en VPS
- [ ] Probar conectividad desde local a VPS (DEV)
- [ ] Documentar usuarios staff actuales en Supabase Auth

---

**Última actualización:** 2025-12-30
