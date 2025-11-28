# MUVA Super Admin Dashboard - Plan de Implementación

**Proyecto:** Super Admin Dashboard
**Fecha Inicio:** 2025-11-26
**Estado:** 📋 Planificación

---

## 🎯 OVERVIEW

### Objetivo Principal
Crear un sistema de login y dashboard para el dueño de MUVA que permita:
- Login con credenciales de super admin (username/password)
- Dashboard centralizado para gestionar TODA la plataforma MUVA
- Ver y gestionar tenants (hoteles/negocios inscritos)
- Subir archivos `.md` para embedizar como contenido turístico
- Monitorear estadísticas de uso de la plataforma
- Gestionar configuraciones globales de MUVA

### ¿Por qué?
- Centralizar control administrativo de la plataforma multi-tenant
- Separar rol de "super admin" (dueño MUVA) vs "tenant admin" (dueño hotel)
- Facilitar gestión de contenido turístico de MUVA
- Monitorear salud y uso de la plataforma
- Control total sin depender de roles de tenant

### Alcance

**FASES CORE (1-8):**
- ✅ Sistema de autenticación super admin (username/password)
- ✅ Dashboard con métricas agregadas de toda la plataforma
- ✅ Gestión de tenants (ver, activar/desactivar, configurar)
- ✅ Subida batch de archivos `.md` con drag & drop
- ✅ Visualización de estadísticas de uso por tenant
- ✅ Monitoreo de integraciones (MotoPress, Airbnb)
- ✅ Gestión de contenido MUVA (listings turísticos)
- ✅ Settings globales + Dark mode toggle

**FASES ADICIONALES (9-11):**
- ✅ Compliance Dashboard (SIRE submissions monitoring)
- ✅ Audit Log (trazabilidad de acciones)
- ✅ AI Model Monitoring (tokens, costos Claude)

**FUERA DE ALCANCE:**
- ❌ Gestión granular de permisos de tenant
- ❌ Facturación/billing
- ❌ Tenant onboarding wizard (FASE 12, opcional)

**CREDENCIALES SUPER ADMIN:**
- Username: `oneill`
- Password: `rabbitHole0+`

---

## 📊 ESTADO ACTUAL

### Sistema Existente
- ✅ Multi-tenant architecture funcionando (subdomain-based)
- ✅ Tabla `tenant_registry` con todos los tenants
- ✅ Super Chat ya implementado en `/` (chat público MUVA)
- ✅ Script de embeddings funcionando (`populate-embeddings.js`)
- ✅ Componentes UI reutilizables (shadcn/ui)
- ✅ Sistema de autenticación para tenants (`staff_users`, Supabase Auth)
- ✅ Dashboard por tenant (`/[tenant]/dashboard`)

### Limitaciones Actuales
- ❌ No existe tabla `super_admin_users`
- ❌ No existe ruta `/super-admin/*` ni `/sign-in`
- ❌ No hay UI para ver todos los tenants agregados
- ❌ No hay interfaz para subir archivos de contenido MUVA
- ❌ No hay métricas consolidadas de toda la plataforma
- ❌ No hay control centralizado de configuraciones globales

---

## 🚀 ESTADO DESEADO

### Nueva Experiencia

**Flujo de Usuario (Dueño de MUVA):**

1. **Login:** Navegar a `http://localhost:3000/sign-in`
   - Formulario simple: username + password
   - Validación contra tabla `super_admin_users`
   - Genera JWT con rol `super_admin`
   - Redirect a `/super-admin/dashboard`

2. **Dashboard Principal:** `/super-admin/dashboard`
   - Header: "MUVA Platform Admin" con logo
   - Cards de métricas globales:
     - Total Tenants (activos/inactivos)
     - Total Conversaciones (últimos 30 días)
     - Total Usuarios Activos
     - Contenido MUVA (listings count)
   - Gráficas de uso (últimos 7 días)
   - Tabla de tenants con quick actions

3. **Gestión de Tenants:** `/super-admin/tenants`
   - Tabla completa con:
     - Nombre comercial
     - Subdomain
     - Plan/Tier
     - Estado (activo/inactivo)
     - Última actividad
     - Acciones: Ver detalles, Editar, Activar/Desactivar
   - Filtros: por estado, por plan, por fecha
   - Búsqueda por nombre/subdomain

4. **Gestión de Contenido:** `/super-admin/content`
   - Drag & drop para subir múltiples `.md`
   - Progress bar por archivo
   - Llamar `populate-embeddings.js` por cada archivo
   - Lista de contenido existente (tabla de `muva_content`)
   - Filtros por tipo: actividades, accommodations, restaurants, etc.

5. **Analytics:** `/super-admin/analytics`
   - Gráficas de uso agregado:
     - Conversaciones por día (últimos 30 días)
     - Tenants activos vs total
     - Uso de embeddings (queries por día)
   - Top 10 tenants por volumen de chat
   - Métricas de rendimiento (response time, uptime)

6. **Integraciones:** `/super-admin/integrations`
   - Estado de sincronizaciones MotoPress por tenant
   - Estado de sincronizaciones Airbnb
   - Logs de errores de integraciones
   - Configuración global de integraciones

### Características Clave
- **Single Super Admin:** Solo el dueño de MUVA puede acceder
- **Visión 360°:** Ver TODA la plataforma desde un solo lugar
- **Gestión Centralizada:** No depender de login por tenant
- **Batch Operations:** Subir múltiples archivos, activar/desactivar múltiples tenants
- **Real-time Metrics:** Stats actualizados automáticamente

---

## 📱 TECHNICAL STACK

### Frontend
- **Framework:** Next.js 15 (App Router)
- **UI:** shadcn/ui + Tailwind CSS
- **State:** React Context (SuperAdminContext)
- **Charts:** Recharts (ya usado en proyecto)
- **File Upload:** react-dropzone (ya usado)

### Backend
- **API Routes:** Next.js API Routes (`/api/super-admin/*`)
- **Database:** Supabase (rama `dev`)
- **Auth:** JWT tokens (custom, similar a `staff-auth.ts`)
- **File Processing:** Node.js child process para ejecutar `populate-embeddings.js`

### Database
- **Nueva tabla:** `super_admin_users`
- **RLS Policies:** Deshabilitar RLS para super admin (BYPASSRLS)
- **Nuevas vistas:** `v_platform_metrics`, `v_tenant_stats`

### Scripts
- **Reutilizar:** `scripts/database/populate-embeddings.js` (2,692 líneas)
- **Nuevo:** Script de inicialización de super admin

---

## 🔧 DESARROLLO - FASES

### FASE 1: Database & Auth Setup (3h)

**Objetivo:** Crear tabla de super admin y sistema de autenticación

**Entregables:**
- Migración con tabla `super_admin_users`
- RLS policies para super admin
- Vistas SQL para métricas agregadas
- Utility functions para super admin auth

**Archivos a crear:**
- `migrations/[timestamp]_super_admin_setup.sql`
- `src/lib/super-admin-auth.ts` (basado en `staff-auth.ts`)
- `src/lib/super-admin-utils.ts`

**Archivos a modificar:**
- Ninguno (todo nuevo)

**Tareas:**

1. **Crear migración SQL** (1h):
   ```sql
   -- Tabla super_admin_users
   CREATE TABLE public.super_admin_users (
     super_admin_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     username TEXT UNIQUE NOT NULL CHECK (length(username) >= 3),
     password_hash TEXT NOT NULL,
     full_name TEXT,
     email TEXT,
     permissions JSONB DEFAULT '{"platform_admin": true, "tenant_management": true, "content_management": true, "analytics_access": true}'::jsonb,
     is_active BOOLEAN DEFAULT true,
     last_login_at TIMESTAMPTZ,
     created_at TIMESTAMPTZ DEFAULT now(),
     updated_at TIMESTAMPTZ DEFAULT now()
   );

   -- RLS policies (BYPASSRLS for super admin)
   ALTER TABLE public.super_admin_users ENABLE ROW LEVEL SECURITY;

   CREATE POLICY "Super admins can view all"
     ON public.super_admin_users FOR SELECT
     USING (true); -- Controlled by API layer, not RLS

   -- Vista de métricas agregadas
   CREATE VIEW v_platform_metrics AS
   SELECT
     (SELECT COUNT(*) FROM tenant_registry WHERE is_active = true) as active_tenants,
     (SELECT COUNT(*) FROM tenant_registry) as total_tenants,
     (SELECT COUNT(*) FROM conversation_histories WHERE created_at > now() - interval '30 days') as conversations_30d,
     (SELECT COUNT(DISTINCT user_id) FROM guest_conversations WHERE created_at > now() - interval '30 days') as active_users_30d,
     (SELECT COUNT(*) FROM muva_content) as muva_listings_count;

   -- Vista de stats por tenant
   CREATE VIEW v_tenant_stats AS
   SELECT
     t.tenant_id,
     t.subdomain,
     t.nombre_comercial,
     t.subscription_tier,
     t.is_active,
     COUNT(DISTINCT ch.conversation_id) as conversation_count,
     MAX(ch.created_at) as last_activity,
     COUNT(DISTINCT au.unit_id) as accommodation_count
   FROM tenant_registry t
   LEFT JOIN conversation_histories ch ON ch.tenant_id = t.tenant_id
   LEFT JOIN accommodation_units au ON au.tenant_id = t.tenant_id
   GROUP BY t.tenant_id, t.subdomain, t.nombre_comercial, t.subscription_tier, t.is_active;
   ```

2. **Crear `src/lib/super-admin-auth.ts`** (1h):
   - Función `loginSuperAdmin(username, password)` → JWT token
   - Función `verifySuperAdminToken(token)` → super admin data
   - Función `hashPassword(password)` usando bcrypt
   - Función `verifyPassword(password, hash)`
   - JWT payload: `{ super_admin_id, username, role: 'super_admin', exp }`
   - Token expiry: 7 días (más largo que staff)

3. **Crear `src/lib/super-admin-utils.ts`** (30min):
   - Función `getPlatformMetrics()` → query `v_platform_metrics`
   - Función `getTenantStats()` → query `v_tenant_stats`
   - Función `getTenantDetails(tenantId)` → full tenant info
   - Función `updateTenantStatus(tenantId, isActive)` → toggle active

4. **Script de inicialización** (30min):
   - `scripts/init-super-admin.js`
   - Crear primer super admin con username/password
   - Ejecutar: `node scripts/init-super-admin.js --username=admin --password=<secure>`

**Testing:**
- `node scripts/init-super-admin.js --username=oneill --password=test123`
- MCP: `mcp__supabase__execute_sql` para verificar tabla
- MCP: `mcp__supabase__execute_sql` para verificar vistas

**Criterios de Éxito:**
- ✅ Tabla `super_admin_users` creada con primer super admin
- ✅ Vistas `v_platform_metrics` y `v_tenant_stats` funcionando
- ✅ `loginSuperAdmin()` genera JWT válido
- ✅ `verifySuperAdminToken()` valida token correctamente

---

### FASE 2: Login Page & API (2h)

**Objetivo:** Crear página de login y endpoint de autenticación

**Entregables:**
- Página `/sign-in` con formulario
- API endpoint `/api/super-admin/login`
- Middleware de protección para rutas super admin

**Archivos a crear:**
- `src/app/sign-in/page.tsx`
- `src/app/api/super-admin/login/route.ts`
- `src/middleware/super-admin.ts`

**Archivos a modificar:**
- `src/middleware.ts` (agregar super admin routes)

**Tareas:**

1. **Crear `/sign-in/page.tsx`** (1h):
   - Formulario con username + password
   - Validación client-side (required fields)
   - Submit → POST `/api/super-admin/login`
   - Guardar JWT en localStorage: `super_admin_token`
   - Redirect a `/super-admin/dashboard` on success
   - Mostrar errores de login
   - Design: MUVA branding (#0d9488), clean, mobile-responsive

2. **Crear `/api/super-admin/login/route.ts`** (45min):
   ```typescript
   export async function POST(request: Request) {
     const { username, password } = await request.json();

     // Validar contra super_admin_users
     const token = await loginSuperAdmin(username, password);

     if (!token) {
       return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
     }

     // Actualizar last_login_at
     // Return token
     return NextResponse.json({ token, expiresIn: '7d' });
   }
   ```

3. **Crear middleware de protección** (15min):
   - `src/middleware/super-admin.ts`
   - Verificar JWT en header `Authorization: Bearer <token>`
   - Si inválido → 401 Unauthorized
   - Si válido → attach `superAdmin` a request

**Testing:**
- Manual: Navegar a `/sign-in`, login con credenciales
- Verificar redirect a `/super-admin/dashboard`
- Verificar token en localStorage
- Probar credenciales incorrectas → error message

**Criterios de Éxito:**
- ✅ Formulario de login funcional y responsive
- ✅ API retorna JWT válido con credenciales correctas
- ✅ API retorna 401 con credenciales incorrectas
- ✅ Redirect funciona correctamente
- ✅ Token guardado en localStorage

---

### FASE 3: Dashboard Layout & Main Page (3h)

**Objetivo:** Crear layout del dashboard y página principal con métricas

**Entregables:**
- Layout `/super-admin/layout.tsx` con sidebar
- Dashboard principal `/super-admin/dashboard/page.tsx`
- Componente de sidebar con navegación
- Context para super admin state

**Archivos a crear:**
- `src/app/super-admin/layout.tsx`
- `src/app/super-admin/dashboard/page.tsx`
- `src/components/SuperAdmin/SuperAdminSidebar.tsx`
- `src/components/SuperAdmin/PlatformMetricsCards.tsx`
- `src/components/SuperAdmin/TenantQuickTable.tsx`
- `src/contexts/SuperAdminContext.tsx`
- `src/app/api/super-admin/metrics/route.ts`

**Archivos de referencia:**
- `src/components/admin/AdminSidebar.tsx` (patrón de sidebar)
- `src/components/Dashboard/Dashboard.tsx` (patrón de dashboard)
- `src/components/Chat/MetricsDashboard.tsx` (patrón de métricas)

**Tareas:**

1. **Crear SuperAdminContext** (30min):
   - State: `superAdmin`, `platformMetrics`, `loading`
   - Función: `loadMetrics()`, `logout()`
   - Provider wrapping `/super-admin/*` routes

2. **Crear SuperAdminSidebar** (45min):
   - Logo MUVA + "Platform Admin"
   - Menu items:
     - 📊 Dashboard
     - 🏢 Tenants
     - 📄 Content Management
     - 📈 Analytics
     - 🔌 Integrations
     - ⚙️ Settings
   - User info + Logout button
   - Responsive: collapse en mobile

3. **Crear `/super-admin/layout.tsx`** (30min):
   - Verificar auth (redirect a `/sign-in` si no autenticado)
   - SuperAdminContext provider
   - Layout: SuperAdminSidebar + main content area
   - Similar a `/[tenant]/layout.tsx` pero sin tenant context

4. **Crear PlatformMetricsCards** (45min):
   - 4 cards en grid:
     - Total Tenants (activos / total)
     - Conversaciones (últimos 30 días)
     - Usuarios Activos (últimos 30 días)
     - Contenido MUVA (listings count)
   - Icons + números grandes + trend indicator
   - Fetch desde `/api/super-admin/metrics`

5. **Crear TenantQuickTable** (30min):
   - Tabla con últimos 10 tenants activos
   - Columnas: Logo, Nombre, Subdomain, Plan, Última actividad
   - Link a `/super-admin/tenants` para ver todos
   - Ordenar por última actividad (más reciente primero)

6. **Crear `/super-admin/dashboard/page.tsx`** (15min):
   - Usar PlatformMetricsCards
   - Usar TenantQuickTable
   - Header: "Welcome back, [nombre]"

7. **Crear `/api/super-admin/metrics/route.ts`** (15min):
   - Verificar super admin token
   - Query `v_platform_metrics`
   - Return JSON

**Testing:**
- Login → verificar redirect a dashboard
- Verificar métricas se cargan correctamente
- Verificar tabla de tenants se muestra
- Test responsive (mobile, tablet, desktop)
- Test logout

**Criterios de Éxito:**
- ✅ Layout con sidebar funcional
- ✅ Dashboard muestra métricas correctamente
- ✅ Tabla de tenants muestra datos reales
- ✅ Navegación entre páginas funciona
- ✅ Logout limpia token y redirect a `/sign-in`
- ✅ Responsive en mobile/tablet/desktop

---

### FASE 4: Tenant Management Page (3h)

**Objetivo:** Página completa de gestión de tenants

**Entregables:**
- Página `/super-admin/tenants`
- Tabla completa de tenants con filtros
- Modal de detalles de tenant
- Funcionalidad activar/desactivar tenant

**Archivos a crear:**
- `src/app/super-admin/tenants/page.tsx`
- `src/components/SuperAdmin/TenantsTable.tsx`
- `src/components/SuperAdmin/TenantDetailsModal.tsx`
- `src/components/SuperAdmin/TenantFilters.tsx`
- `src/app/api/super-admin/tenants/route.ts`
- `src/app/api/super-admin/tenants/[id]/route.ts`

**Tareas:**

1. **Crear `/api/super-admin/tenants/route.ts`** (30min):
   - GET: Lista de todos los tenants con stats
   - Query `v_tenant_stats`
   - Filtros: `?status=active`, `?tier=premium`, `?search=hotel`
   - Pagination: `?page=1&limit=50`
   - Sort: `?sort=last_activity&order=desc`

2. **Crear TenantFilters** (30min):
   - Filtro por status: All, Active, Inactive
   - Filtro por plan: All, Free, Basic, Premium, Enterprise
   - Búsqueda: input con debounce
   - Botón "Reset filters"

3. **Crear TenantsTable** (1h):
   - Columnas:
     - Logo (thumbnail)
     - Nombre Comercial
     - Subdomain (link a `https://{subdomain}.muva.chat`)
     - Plan/Tier (badge con color)
     - Conversations (count)
     - Última Actividad (relative time)
     - Estado (toggle switch)
     - Acciones (View Details, Edit)
   - Sort por columnas (click en header)
   - Pagination controls
   - Skeleton loading state

4. **Crear TenantDetailsModal** (45min):
   - Mostrar al click en "View Details"
   - Tabs:
     - Overview (info general)
     - Stats (métricas detalladas)
     - Integrations (MotoPress, Airbnb status)
     - Users (users vinculados a este tenant)
   - Botón "Edit" → future feature
   - Botón "Close"

5. **Crear `/super-admin/tenants/page.tsx`** (30min):
   - Header: "Tenant Management" + "Add Tenant" button (disabled, future)
   - TenantFilters component
   - TenantsTable component
   - State management para filtros/pagination

6. **Crear `/api/super-admin/tenants/[id]/route.ts`** (15min):
   - GET: Detalles completos de tenant
   - PATCH: Actualizar tenant (activar/desactivar, cambiar plan)
   - Verificar super admin auth

**Testing:**
- Verificar tabla muestra todos los tenants
- Test filtros (status, plan, búsqueda)
- Test pagination
- Test sort por columnas
- Test toggle status (activar/desactivar)
- Test modal de detalles
- Test links a tenant subdomain

**Criterios de Éxito:**
- ✅ Tabla muestra todos los tenants con datos correctos
- ✅ Filtros funcionan correctamente
- ✅ Pagination funciona
- ✅ Sort por columnas funciona
- ✅ Toggle de status actualiza DB y UI
- ✅ Modal de detalles muestra info completa
- ✅ Responsive en todas las pantallas

---

### FASE 5: Content Management (File Upload) (4h)

**Objetivo:** Interfaz para subir archivos `.md` y embedizarlos

**Entregables:**
- Página `/super-admin/content`
- Drag & drop para subir múltiples archivos
- Progress tracking por archivo
- Ejecución del script `populate-embeddings.js`
- Tabla de contenido existente

**Archivos a crear:**
- `src/app/super-admin/content/page.tsx`
- `src/components/SuperAdmin/ContentUploader.tsx`
- `src/components/SuperAdmin/ContentTable.tsx`
- `src/app/api/super-admin/content/upload/route.ts`
- `src/app/api/super-admin/content/list/route.ts`
- `src/app/api/super-admin/content/delete/route.ts`

**Archivos de referencia:**
- `src/components/admin/FileUpload.tsx` (patrón de upload)
- `scripts/database/populate-embeddings.js` (script a ejecutar)

**Tareas:**

1. **Crear ContentUploader** (1.5h):
   - Drag & drop zone usando react-dropzone
   - Accept: `.md` files only
   - Multiple files allowed
   - Preview list de archivos seleccionados
   - Progress bar individual por archivo
   - States: idle, uploading, processing, completed, error
   - Botón "Upload All" → trigger batch upload
   - Categoría selector: actividades, accommodations, restaurants, etc.
   - Clear all button

2. **Crear `/api/super-admin/content/upload/route.ts`** (1.5h):
   ```typescript
   export async function POST(request: Request) {
     // Verificar super admin auth

     // Recibir FormData con archivos
     const formData = await request.formData();
     const files = formData.getAll('files');
     const category = formData.get('category');

     // Guardar archivos en _assets/muva/listings/{category}/
     // Para cada archivo:
     //   - Guardar en filesystem
     //   - Ejecutar: node scripts/database/populate-embeddings.js <filepath>
     //   - Capturar output y errores
     //   - Return status

     return NextResponse.json({
       success: true,
       results: [
         { filename: 'file1.md', status: 'completed', embeddings: 15 },
         { filename: 'file2.md', status: 'error', error: 'Invalid YAML' }
       ]
     });
   }
   ```
   - Usar `child_process.exec` para ejecutar script
   - Stream output para progress updates (opcional: SSE)
   - Error handling robusto

3. **Crear ContentTable** (45min):
   - Fetch desde `/api/super-admin/content/list`
   - Columnas:
     - Filename
     - Category
     - Title (del YAML frontmatter)
     - Embeddings Count
     - Created At
     - Acciones (View, Delete)
   - Filtro por category
   - Búsqueda por filename/title
   - Pagination

4. **Crear `/api/super-admin/content/list/route.ts`** (15min):
   - Query `muva_content` table
   - Group by category
   - Return con metadata

5. **Crear `/super-admin/content/page.tsx`** (15min):
   - Header: "MUVA Content Management"
   - ContentUploader component
   - ContentTable component
   - Stats: Total listings por category

**Testing:**
- Upload single `.md` file → verify embedding created
- Upload múltiples archivos → verify all processed
- Test error handling (invalid file, invalid YAML)
- Verify files saved in correct directory
- Verify `populate-embeddings.js` ejecutado correctamente
- Test delete content
- Test filtros en tabla

**Criterios de Éxito:**
- ✅ Drag & drop funciona para múltiples archivos
- ✅ Archivos se guardan en `_assets/muva/listings/{category}/`
- ✅ Script `populate-embeddings.js` se ejecuta por cada archivo
- ✅ Progress tracking muestra estado por archivo
- ✅ Tabla muestra contenido existente correctamente
- ✅ Filtros y búsqueda funcionan
- ✅ Delete content funciona (elimina archivo + embeddings)

---

### FASE 6: Analytics Page (2h)

**Objetivo:** Página de analytics con gráficas de uso de la plataforma

**Entregables:**
- Página `/super-admin/analytics`
- Gráficas de uso (conversaciones, usuarios activos)
- Top tenants por volumen
- Métricas de rendimiento

**Archivos a crear:**
- `src/app/super-admin/analytics/page.tsx`
- `src/components/SuperAdmin/UsageCharts.tsx`
- `src/components/SuperAdmin/TopTenantsChart.tsx`
- `src/app/api/super-admin/analytics/usage/route.ts`
- `src/app/api/super-admin/analytics/top-tenants/route.ts`

**Archivos de referencia:**
- `src/components/admin/AnalyticsCharts.tsx` (patrón de charts)
- `src/components/Chat/MetricsDashboard.tsx` (Recharts usage)

**Tareas:**

1. **Crear `/api/super-admin/analytics/usage/route.ts`** (30min):
   - Query conversations por día (últimos 30 días)
   - Query usuarios activos por día
   - Query embeddings queries por día
   - Return formato para Recharts: `[{ date, conversations, users }, ...]`

2. **Crear UsageCharts** (45min):
   - Line chart: Conversaciones por día (últimos 30 días)
   - Area chart: Usuarios activos por día
   - Bar chart: Tenants activos vs total (por semana)
   - Usando Recharts library
   - Responsive

3. **Crear `/api/super-admin/analytics/top-tenants/route.ts`** (15min):
   - Query top 10 tenants por conversaciones (últimos 30 días)
   - Include: nombre, subdomain, conversation_count, growth_percent

4. **Crear TopTenantsChart** (30min):
   - Bar chart horizontal: Top 10 tenants
   - Mostrar nombre + conversation count
   - Link a tenant details

5. **Crear `/super-admin/analytics/page.tsx`** (15min):
   - Header: "Platform Analytics"
   - Date range selector: 7d, 30d, 90d
   - UsageCharts component
   - TopTenantsChart component
   - Performance metrics cards (avg response time, uptime)

**Testing:**
- Verificar gráficas se renderizan correctamente
- Test date range selector
- Verificar datos en gráficas son correctos
- Test responsive
- Verificar links a tenant details

**Criterios de Éxito:**
- ✅ Gráficas muestran datos correctos
- ✅ Date range selector funciona
- ✅ Top tenants chart muestra datos reales
- ✅ Responsive en todas las pantallas
- ✅ Performance metrics se calculan correctamente

---

### FASE 7: Integrations Monitor (2h)

**Objetivo:** Página para monitorear integraciones (MotoPress, Airbnb)

**Entregables:**
- Página `/super-admin/integrations`
- Lista de integraciones por tenant
- Status de última sincronización
- Logs de errores

**Archivos a crear:**
- `src/app/super-admin/integrations/page.tsx`
- `src/components/SuperAdmin/IntegrationsTable.tsx`
- `src/components/SuperAdmin/SyncLogsModal.tsx`
- `src/app/api/super-admin/integrations/route.ts`

**Tareas:**

1. **Crear `/api/super-admin/integrations/route.ts`** (30min):
   - Query `integration_configs` joined con `sync_history`
   - Return: tenant, integration_type, last_sync, status, error_count
   - Filtros: por tenant, por tipo, por status

2. **Crear IntegrationsTable** (45min):
   - Columnas:
     - Tenant
     - Integration (MotoPress / Airbnb)
     - Status (badge: synced, error, never_synced)
     - Last Sync (relative time)
     - Errors (count + link)
     - Acciones (View Logs, Force Sync)
   - Filtros: All, MotoPress, Airbnb, Errors Only
   - Sort por last_sync

3. **Crear SyncLogsModal** (30min):
   - Mostrar últimos 50 logs de sincronización
   - Por cada log: timestamp, status, records_synced, errors
   - Expandable error details
   - Download logs as JSON

4. **Crear `/super-admin/integrations/page.tsx`** (15min):
   - Header: "Integrations Monitor"
   - Global stats: Total syncs today, Error rate
   - IntegrationsTable component

**Testing:**
- Verificar tabla muestra todas las integraciones
- Test filtros
- Test modal de logs
- Verificar error count correcto
- Test force sync (futuro)

**Criterios de Éxito:**
- ✅ Tabla muestra todas las integraciones por tenant
- ✅ Status badges correctos
- ✅ Logs modal funciona
- ✅ Error count es preciso
- ✅ Filtros funcionan correctamente

---

### FASE 8: Settings & Dark Mode (3h)

**Objetivo:** Página de settings, features adicionales, y dark mode toggle

**Entregables:**
- Página `/super-admin/settings`
- Dark mode toggle (persiste en localStorage)
- Gestión de super admin users
- Configuraciones globales

**Archivos a crear:**
- `src/app/super-admin/settings/page.tsx`
- `src/components/SuperAdmin/GlobalSettings.tsx`
- `src/components/SuperAdmin/SuperAdminUsers.tsx`
- `src/components/SuperAdmin/ThemeToggle.tsx`
- `src/contexts/ThemeContext.tsx`
- `src/styles/dark-mode.css`

**Tareas:**

1. **Implementar Dark Mode System** (1h):
   - Crear ThemeContext con state: `'light' | 'dark'`
   - ThemeToggle component (moon/sun icon)
   - Persiste preferencia en localStorage
   - Apply dark mode classes globally
   - Dark mode palette:
     - Background: `#0f172a` (slate-900)
     - Cards: `#1e293b` (slate-800)
     - Text: `#f1f5f9` (slate-100)
     - Accent: `#0d9488` (teal-600) - mantener MUVA branding
   - Smooth transition entre modos

2. **Crear GlobalSettings** (45min):
   - Toggle: Maintenance Mode (deshabilita todos los tenants temporalmente)
   - Input: Global announcement (banner en todos los chats)
   - Input: Max file upload size (MB)
   - Input: Default embeddings model
   - Save button → POST `/api/super-admin/settings`

3. **Crear SuperAdminUsers** (45min):
   - Tabla de super admins
   - Columnas: Username, Full Name, Last Login, Status
   - Acciones: Deactivate, Reset Password
   - Botón "Add Super Admin" (future)

4. **Crear `/super-admin/settings/page.tsx`** (30min):
   - Tabs:
     - Global Settings
     - Super Admin Users
     - System Info (versión, uptime, DB size)
     - Appearance (Dark Mode toggle, accent color picker)
   - Save notifications

**Testing:**
- Test dark mode toggle (switch light/dark)
- Verificar persistencia en localStorage
- Verificar settings se guardan correctamente
- Test toggle maintenance mode
- Verificar tabla de super admins
- Test system info

**Criterios de Éxito:**
- ✅ Dark mode funciona en todo el dashboard
- ✅ Preferencia persiste entre sesiones
- ✅ Settings se guardan y aplican correctamente
- ✅ Maintenance mode funciona
- ✅ Tabla de super admins muestra datos correctos
- ✅ System info es preciso
- ✅ Transiciones suaves entre light/dark

---

### FASE 9: Compliance Dashboard (3h)

**Objetivo:** Monitoreo centralizado de SIRE compliance para todos los tenants

**Entregables:**
- Página `/super-admin/compliance`
- Vista agregada de submissions SIRE
- Alertas de compliance vencido
- Reportes consolidados

**Archivos a crear:**
- `src/app/super-admin/compliance/page.tsx`
- `src/components/SuperAdmin/ComplianceOverview.tsx`
- `src/components/SuperAdmin/ComplianceTable.tsx`
- `src/components/SuperAdmin/ComplianceAlerts.tsx`
- `src/app/api/super-admin/compliance/route.ts`
- `src/app/api/super-admin/compliance/report/route.ts`

**Tareas:**

1. **Crear `/api/super-admin/compliance/route.ts`** (45min):
   - Query submissions SIRE por tenant
   - Agregar: total submissions, últimos 30 días, pending, completed, failed
   - Identificar tenants con compliance vencido (>30 días sin submission)
   - Return: `{ tenant_id, subdomain, last_submission, status, days_since_last }`

2. **Crear ComplianceOverview** (45min):
   - Cards de métricas:
     - Total Tenants Compliant (últimos 30 días)
     - Total Submissions (mes actual)
     - Tenants At Risk (>20 días sin submission)
     - Submission Success Rate (%)
   - Color coding: verde (compliant), amarillo (warning), rojo (overdue)

3. **Crear ComplianceTable** (1h):
   - Columnas:
     - Tenant (nombre + subdomain)
     - Last Submission (date + relative time)
     - Status (badge: compliant, warning, overdue)
     - Submissions Count (últimos 30 días)
     - Acciones (View Details, Download Report)
   - Filtros: All, Compliant, Warning, Overdue
   - Sort por last_submission

4. **Crear ComplianceAlerts** (15min):
   - Lista de tenants en riesgo
   - Mostrar días desde última submission
   - Link directo a tenant para contactarlos

5. **Crear download report** (15min):
   - Endpoint `/api/super-admin/compliance/report`
   - Export CSV con todas las submissions
   - Formato: tenant, submission_date, status, reservations_count

**Testing:**
- Verificar métricas son correctas
- Test filtros (compliant, warning, overdue)
- Test download de reporte CSV
- Verificar alertas muestran tenants correctos

**Criterios de Éxito:**
- ✅ Dashboard muestra compliance status de todos los tenants
- ✅ Alertas identifican tenants en riesgo
- ✅ Filtros funcionan correctamente
- ✅ Reporte CSV se descarga con datos correctos
- ✅ Color coding claro (verde/amarillo/rojo)

---

### FASE 10: Audit Log (2h)

**Objetivo:** Trazabilidad completa de acciones de super admin para seguridad

**Entregables:**
- Página `/super-admin/audit-log`
- Tabla de logs con todas las acciones
- Filtros por acción, fecha, super admin user
- Export de logs

**Archivos a crear:**
- `migrations/[timestamp]_audit_log.sql`
- `src/app/super-admin/audit-log/page.tsx`
- `src/components/SuperAdmin/AuditLogTable.tsx`
- `src/components/SuperAdmin/AuditLogFilters.tsx`
- `src/app/api/super-admin/audit-log/route.ts`
- `src/lib/audit-logger.ts`

**Tareas:**

1. **Crear migración audit log** (30min):
   ```sql
   CREATE TABLE super_admin_audit_log (
     log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     super_admin_id UUID REFERENCES super_admin_users,
     action TEXT NOT NULL, -- 'tenant.deactivate', 'content.upload', etc.
     target_type TEXT, -- 'tenant', 'content', 'settings', 'user'
     target_id UUID,
     changes JSONB, -- { before: {...}, after: {...} }
     ip_address TEXT,
     user_agent TEXT,
     created_at TIMESTAMPTZ DEFAULT now()
   );

   CREATE INDEX idx_audit_log_admin ON super_admin_audit_log(super_admin_id);
   CREATE INDEX idx_audit_log_action ON super_admin_audit_log(action);
   CREATE INDEX idx_audit_log_created ON super_admin_audit_log(created_at DESC);
   ```

2. **Crear `src/lib/audit-logger.ts`** (30min):
   - Función `logAction(adminId, action, targetType, targetId, changes, request)`
   - Extrae IP y user-agent del request
   - Insert en `super_admin_audit_log`
   - Usar en TODOS los endpoints de super admin

3. **Crear AuditLogTable** (45min):
   - Columnas:
     - Timestamp (relative + absolute)
     - Super Admin (username)
     - Action (badge con icon)
     - Target (type + ID)
     - Changes (expandable JSON diff)
     - IP Address
   - Pagination (50 per page)
   - Expandable row para ver changes completo

4. **Crear AuditLogFilters** (15min):
   - Filtro por action type (dropdown)
   - Filtro por date range (date picker)
   - Filtro por super admin user
   - Búsqueda por target_id
   - Export CSV button

5. **Integrar audit logging** (modifica endpoints existentes):
   - Agregar `logAction()` call en:
     - `/api/super-admin/tenants/[id]` (PATCH)
     - `/api/super-admin/content/upload`
     - `/api/super-admin/settings`
     - `/api/super-admin/login` (solo logins exitosos)

**Testing:**
- Realizar acción (ej: desactivar tenant) → verificar log creado
- Test filtros funcionan
- Test export CSV
- Verificar changes JSON muestra before/after

**Criterios de Éxito:**
- ✅ Tabla `super_admin_audit_log` creada
- ✅ Todas las acciones de super admin se logean
- ✅ Tabla muestra logs correctamente
- ✅ Filtros funcionan
- ✅ Export CSV funciona
- ✅ Changes JSON muestra diff claro

---

### FASE 11: AI Model Monitoring (2h)

**Objetivo:** Monitorear consumo de tokens y costos de Claude API

**Entregables:**
- Página `/super-admin/ai-monitoring`
- Métricas de consumo de tokens
- Estimación de costos
- Top tenants por consumo

**Archivos a crear:**
- `migrations/[timestamp]_ai_usage_tracking.sql`
- `src/app/super-admin/ai-monitoring/page.tsx`
- `src/components/SuperAdmin/AIUsageCharts.tsx`
- `src/components/SuperAdmin/AITopConsumers.tsx`
- `src/app/api/super-admin/ai-monitoring/route.ts`
- `src/lib/track-ai-usage.ts`

**Tareas:**

1. **Crear migración AI usage tracking** (30min):
   ```sql
   CREATE TABLE ai_usage_logs (
     usage_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     tenant_id UUID REFERENCES tenant_registry,
     conversation_id UUID,
     model TEXT, -- 'claude-sonnet-4-5', etc.
     input_tokens INT NOT NULL,
     output_tokens INT NOT NULL,
     total_tokens INT GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
     estimated_cost NUMERIC(10,6), -- en USD
     latency_ms INT,
     created_at TIMESTAMPTZ DEFAULT now()
   );

   CREATE INDEX idx_ai_usage_tenant ON ai_usage_logs(tenant_id);
   CREATE INDEX idx_ai_usage_created ON ai_usage_logs(created_at DESC);

   -- Vista agregada
   CREATE VIEW v_ai_usage_stats AS
   SELECT
     tenant_id,
     DATE(created_at) as usage_date,
     SUM(input_tokens) as total_input_tokens,
     SUM(output_tokens) as total_output_tokens,
     SUM(total_tokens) as total_tokens,
     SUM(estimated_cost) as total_cost,
     AVG(latency_ms) as avg_latency,
     COUNT(*) as request_count
   FROM ai_usage_logs
   GROUP BY tenant_id, DATE(created_at);
   ```

2. **Crear `src/lib/track-ai-usage.ts`** (30min):
   - Función `trackAIUsage(tenantId, conversationId, model, usage, latency)`
   - Calcular costo estimado:
     - Claude Sonnet 4.5: $3/MTok input, $15/MTok output
   - Insert en `ai_usage_logs`
   - Llamar desde `/api/chat/*` endpoints

3. **Crear AIUsageCharts** (45min):
   - Line chart: Tokens consumidos por día (últimos 30 días)
   - Area chart: Costo acumulado por día
   - Bar chart: Latency promedio por día
   - Pie chart: Distribución de modelos usados

4. **Crear AITopConsumers** (15min):
   - Tabla: Top 10 tenants por consumo (últimos 30 días)
   - Columnas: Tenant, Total Tokens, Total Cost, Avg Latency

5. **Crear `/super-admin/ai-monitoring/page.tsx`** (15min):
   - Header: "AI Model Monitoring"
   - Cards:
     - Total Tokens (mes actual)
     - Total Cost (mes actual)
     - Avg Latency
     - Requests Count
   - AIUsageCharts
   - AITopConsumers

**Testing:**
- Realizar conversación → verificar log creado en `ai_usage_logs`
- Verificar cálculo de costo es correcto
- Test gráficas muestran datos correctos
- Test top consumers table

**Criterios de Éxito:**
- ✅ Tabla `ai_usage_logs` creada
- ✅ Tracking se ejecuta en cada conversación
- ✅ Cálculo de costos es preciso
- ✅ Gráficas muestran datos correctos
- ✅ Top consumers identifica tenants correctamente
- ✅ Métricas ayudan a optimizar costos

---

## ✅ CRITERIOS DE ÉXITO GLOBAL

### Funcionalidad (FASES 1-11)
- [ ] Login como super admin funciona (FASE 2)
- [ ] Dashboard muestra métricas de toda la plataforma (FASE 3)
- [ ] Gestión de tenants completa (ver, activar/desactivar) (FASE 4)
- [ ] Subida de archivos `.md` funciona y ejecuta embeddings (FASE 5)
- [ ] Analytics muestran datos agregados correctos (FASE 6)
- [ ] Monitoreo de integraciones funcional (FASE 7)
- [ ] Settings guardados y aplicados (FASE 8)
- [ ] Dark mode funciona globalmente (FASE 8)
- [ ] Compliance dashboard monitorea SIRE submissions (FASE 9)
- [ ] Audit log registra todas las acciones (FASE 10)
- [ ] AI monitoring trackea tokens y costos (FASE 11)

### Performance
- [ ] Dashboard carga en < 2 segundos
- [ ] Upload de archivos muestra progress en tiempo real
- [ ] Gráficas renderizan smooth sin lag
- [ ] Tabla de tenants soporta > 100 tenants sin pagination lag
- [ ] Dark mode toggle es instantáneo

### Seguridad
- [ ] Solo super admin puede acceder a `/super-admin/*`
- [ ] JWT tokens con expiry y validación
- [ ] Passwords hasheados con bcrypt (credenciales: oneill / rabbitHole0+)
- [ ] RLS policies correctas para super admin
- [ ] File upload valida tipos y tamaños
- [ ] Audit log registra IP y user-agent
- [ ] Todas las acciones críticas logueadas

### UX/UI
- [ ] Diseño consistente con MUVA branding (#0d9488)
- [ ] Responsive en mobile/tablet/desktop
- [ ] Loading states en todas las operaciones async
- [ ] Error messages claros y útiles
- [ ] Success notifications para acciones importantes
- [ ] Dark mode con palette completa (slate + teal)
- [ ] Smooth transitions entre light/dark mode

---

## 🤖 AGENTES REQUERIDOS

### 1. **@agent-database-agent** (FASES 1, 10, 11)
**Responsabilidad:** Crear tablas, vistas SQL, y RLS policies

**Tareas:**
- FASE 1: Crear migración `super_admin_users`, `v_platform_metrics`, `v_tenant_stats`, policies
- FASE 1: Ejecutar migración en rama `dev` de Supabase
- FASE 1: Validar con MCP tools que todo funciona
- FASE 10: Crear migración `super_admin_audit_log` con índices
- FASE 11: Crear migración `ai_usage_logs` con vista `v_ai_usage_stats`

**Archivos:**
- `migrations/[timestamp]_super_admin_setup.sql`
- `migrations/[timestamp]_audit_log.sql`
- `migrations/[timestamp]_ai_usage_tracking.sql`

---

### 2. **@agent-backend-developer** (FASES 1-11)
**Responsabilidad:** Crear API endpoints, lógica de autenticación, y tracking

**Tareas:**
- FASE 1: `src/lib/super-admin-auth.ts`, `src/lib/super-admin-utils.ts`, `scripts/init-super-admin.js`
- FASE 2: `/api/super-admin/login/route.ts`, `src/middleware/super-admin.ts`
- FASE 3: `/api/super-admin/metrics/route.ts`
- FASE 4: `/api/super-admin/tenants/route.ts`, `/api/super-admin/tenants/[id]/route.ts`
- FASE 5: `/api/super-admin/content/upload/route.ts`, `/api/super-admin/content/list/route.ts`, `/api/super-admin/content/delete/route.ts`
- FASE 6: `/api/super-admin/analytics/usage/route.ts`, `/api/super-admin/analytics/top-tenants/route.ts`
- FASE 7: `/api/super-admin/integrations/route.ts`
- FASE 8: `/api/super-admin/settings/route.ts`
- FASE 9: `/api/super-admin/compliance/route.ts`, `/api/super-admin/compliance/report/route.ts`
- FASE 10: `src/lib/audit-logger.ts`, `/api/super-admin/audit-log/route.ts` + integrar en todos los endpoints
- FASE 11: `src/lib/track-ai-usage.ts`, `/api/super-admin/ai-monitoring/route.ts` + integrar en `/api/chat/*`

**Archivos:**
- Todos los archivos en `src/lib/super-admin-*`, `src/lib/audit-logger.ts`, `src/lib/track-ai-usage.ts`
- Todos los endpoints en `/api/super-admin/*`
- Middleware y scripts

---

### 3. **@agent-ux-interface** (FASES 2-11)
**Responsabilidad:** Crear todas las páginas, componentes UI, y dark mode

**Tareas:**
- FASE 2: `/sign-in/page.tsx`
- FASE 3: `/super-admin/layout.tsx`, `/super-admin/dashboard/page.tsx`
- FASE 3: Componentes: SuperAdminSidebar, PlatformMetricsCards, TenantQuickTable, SuperAdminContext
- FASE 4: `/super-admin/tenants/page.tsx` + TenantsTable, TenantDetailsModal, TenantFilters
- FASE 5: `/super-admin/content/page.tsx` + ContentUploader, ContentTable
- FASE 6: `/super-admin/analytics/page.tsx` + UsageCharts, TopTenantsChart
- FASE 7: `/super-admin/integrations/page.tsx` + IntegrationsTable, SyncLogsModal
- FASE 8: `/super-admin/settings/page.tsx` + GlobalSettings, SuperAdminUsers, ThemeToggle, ThemeContext, dark-mode.css
- FASE 9: `/super-admin/compliance/page.tsx` + ComplianceOverview, ComplianceTable, ComplianceAlerts
- FASE 10: `/super-admin/audit-log/page.tsx` + AuditLogTable, AuditLogFilters
- FASE 11: `/super-admin/ai-monitoring/page.tsx` + AIUsageCharts, AITopConsumers

**Archivos:**
- Todas las páginas en `/super-admin/*`
- Todos los componentes en `src/components/SuperAdmin/*`
- Contexts: `SuperAdminContext.tsx`, `ThemeContext.tsx`
- Styles: `src/styles/dark-mode.css`

---

## 📂 ESTRUCTURA DE ARCHIVOS

```
/Users/oneill/Sites/apps/muva-chat/
├── src/
│   ├── app/
│   │   ├── sign-in/
│   │   │   └── page.tsx                          # FASE 2: Login page
│   │   ├── super-admin/
│   │   │   ├── layout.tsx                        # FASE 3: Super admin layout
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx                      # FASE 3: Main dashboard
│   │   │   ├── tenants/
│   │   │   │   └── page.tsx                      # FASE 4: Tenant management
│   │   │   ├── content/
│   │   │   │   └── page.tsx                      # FASE 5: Content upload
│   │   │   ├── analytics/
│   │   │   │   └── page.tsx                      # FASE 6: Analytics
│   │   │   ├── integrations/
│   │   │   │   └── page.tsx                      # FASE 7: Integrations
│   │   │   └── settings/
│   │   │       └── page.tsx                      # FASE 8: Settings
│   │   └── api/
│   │       └── super-admin/
│   │           ├── login/route.ts                # FASE 2: Login API
│   │           ├── metrics/route.ts              # FASE 3: Metrics API
│   │           ├── tenants/
│   │           │   ├── route.ts                  # FASE 4: List tenants
│   │           │   └── [id]/route.ts             # FASE 4: Tenant details/update
│   │           ├── content/
│   │           │   ├── upload/route.ts           # FASE 5: Upload files
│   │           │   ├── list/route.ts             # FASE 5: List content
│   │           │   └── delete/route.ts           # FASE 5: Delete content
│   │           ├── analytics/
│   │           │   ├── usage/route.ts            # FASE 6: Usage data
│   │           │   └── top-tenants/route.ts      # FASE 6: Top tenants
│   │           ├── integrations/route.ts         # FASE 7: Integrations status
│   │           └── settings/route.ts             # FASE 8: Global settings
│   ├── components/
│   │   └── SuperAdmin/
│   │       ├── SuperAdminSidebar.tsx             # FASE 3: Sidebar nav
│   │       ├── PlatformMetricsCards.tsx          # FASE 3: Metrics display
│   │       ├── TenantQuickTable.tsx              # FASE 3: Quick tenant list
│   │       ├── TenantsTable.tsx                  # FASE 4: Full tenant table
│   │       ├── TenantDetailsModal.tsx            # FASE 4: Tenant details
│   │       ├── TenantFilters.tsx                 # FASE 4: Filters component
│   │       ├── ContentUploader.tsx               # FASE 5: File upload
│   │       ├── ContentTable.tsx                  # FASE 5: Content list
│   │       ├── UsageCharts.tsx                   # FASE 6: Usage charts
│   │       ├── TopTenantsChart.tsx               # FASE 6: Top tenants chart
│   │       ├── IntegrationsTable.tsx             # FASE 7: Integrations table
│   │       ├── SyncLogsModal.tsx                 # FASE 7: Sync logs
│   │       ├── GlobalSettings.tsx                # FASE 8: Settings form
│   │       └── SuperAdminUsers.tsx               # FASE 8: Admin users table
│   ├── contexts/
│   │   └── SuperAdminContext.tsx                 # FASE 3: Super admin context
│   ├── lib/
│   │   ├── super-admin-auth.ts                   # FASE 1: Auth functions
│   │   └── super-admin-utils.ts                  # FASE 1: Utility functions
│   └── middleware/
│       └── super-admin.ts                        # FASE 2: Auth middleware
├── scripts/
│   └── init-super-admin.js                       # FASE 1: Init script
├── migrations/
│   └── [timestamp]_super_admin_setup.sql         # FASE 1: DB migration
└── docs/
    └── super-admin/
        ├── ARCHITECTURE.md                       # Architecture overview
        ├── API.md                                # API documentation
        └── USER_GUIDE.md                         # User guide for super admin
```

---

## 📝 SUGERENCIAS ADICIONALES PARA EL DASHBOARD

Basándome en el análisis del codebase y las mejores prácticas, aquí están las sugerencias adicionales:

### 1. **Compliance Dashboard** (Alta prioridad)
**¿Por qué?** MUVA tiene integración SIRE (compliance colombiano). Como super admin necesitas monitorear el cumplimiento de TODOS los tenants.

**Features:**
- Vista agregada de submissions SIRE por mes
- Tenants con compliance vencido (alertas)
- Download de reportes de compliance consolidados
- Estadísticas: % de tenants compliant vs non-compliant

**Ubicación:** `/super-admin/compliance`

---

### 2. **User Activity Monitor** (Media prioridad)
**¿Por qué?** Detectar anomalías, bots, o abuse patterns.

**Features:**
- Lista de usuarios más activos (por tenant)
- Patrones sospechosos (ej: 100+ mensajes en 1 hora)
- Conversaciones reportadas/flagged
- IP tracking (opcional, para seguridad)

**Ubicación:** `/super-admin/users` o tab en Analytics

---

### 3. **Revenue Dashboard** (Futura - Alta prioridad)
**¿Por qué?** Cuando implementes billing, necesitarás ver revenue por tenant.

**Features:**
- MRR (Monthly Recurring Revenue)
- Churn rate
- Upgrade/downgrade trends
- Revenue por plan (Free, Basic, Premium, Enterprise)
- Payment failures tracking

**Ubicación:** `/super-admin/revenue`

**Nota:** Requiere integración con Stripe/payment provider (fuera de alcance actual)

---

### 4. **AI Model Monitoring** (Media prioridad)
**¿Por qué?** MUVA usa Claude AI. Monitorear costos y performance es crítico.

**Features:**
- Total tokens consumidos (por día/mes)
- Costo estimado de API calls
- Latency promedio de respuestas
- Error rate de Claude API
- Top tenants por consumo de tokens

**Ubicación:** Tab en `/super-admin/analytics` o `/super-admin/ai-monitoring`

---

### 5. **Tenant Onboarding Pipeline** (Baja prioridad)
**¿Por qué?** Facilitar el proceso de agregar nuevos tenants.

**Features:**
- Wizard para crear nuevo tenant:
  1. Info básica (nombre, subdomain, NIT)
  2. Branding (logo, colores)
  3. Plan selection
  4. Credentials (MotoPress, Airbnb, SIRE)
  5. Initial setup (accommodations, staff users)
- Checklist de onboarding (% completado)
- Email automático con credenciales

**Ubicación:** Botón "Add Tenant" en `/super-admin/tenants`

---

### 6. **System Health Monitor** (Media prioridad)
**¿Por qué?** Detectar problemas antes que afecten usuarios.

**Features:**
- Database size y growth rate
- API response time (p50, p95, p99)
- Error logs agregados (últimas 24h)
- Uptime por servicio (Next.js, Supabase, Claude API)
- Alerts configurables (email/SMS cuando hay downtime)

**Ubicación:** `/super-admin/health` o tab en Settings

---

### 7. **Bulk Operations** (Media prioridad)
**¿Por qué?** Eficiencia al gestionar múltiples tenants.

**Features:**
- Selección múltiple en tabla de tenants
- Acciones bulk:
  - Activar/desactivar múltiples tenants
  - Cambiar plan de múltiples tenants
  - Enviar announcement a múltiples tenants
  - Export data (CSV) de tenants seleccionados

**Ubicación:** Checkboxes en `/super-admin/tenants`

---

### 8. **Audit Log** (Alta prioridad - Seguridad)
**¿Por qué?** Trazabilidad de todas las acciones de super admin.

**Features:**
- Log de TODAS las acciones:
  - Login/logout
  - Cambios en tenants (activar/desactivar, cambio de plan)
  - Uploads de contenido
  - Cambios en settings
- Filtros: por super admin user, por acción, por fecha
- Export logs como JSON/CSV

**Ubicación:** `/super-admin/audit-log`

**DB:**
```sql
CREATE TABLE super_admin_audit_log (
  log_id UUID PRIMARY KEY,
  super_admin_id UUID REFERENCES super_admin_users,
  action TEXT, -- 'tenant.deactivate', 'content.upload', etc.
  target_type TEXT, -- 'tenant', 'content', 'settings'
  target_id UUID,
  changes JSONB, -- before/after
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 9. **Quick Actions Widget** (Baja prioridad - UX)
**¿Por qué?** Acceso rápido a acciones comunes sin navegar.

**Features:**
- Widget en dashboard con botones:
  - "Add Tenant" (wizard)
  - "Upload Content" (modal rápido)
  - "Run Sync" (forzar sync de todas las integraciones)
  - "View Recent Errors" (últimos 10 errores)

**Ubicación:** Card en `/super-admin/dashboard`

---

### 10. **Documentation & Help Center** (Baja prioridad)
**¿Por qué?** Auto-ayuda para recordar cómo usar el dashboard.

**Features:**
- Tooltips en features complejas
- Help modal con FAQs
- Video tutorials embebidos (futuro)
- Link a documentación técnica (API docs)

**Ubicación:** Icon "?" en header, modal overlay

---

### Resumen de Prioridades

| Feature | Prioridad | Esfuerzo | Impacto | Fase Sugerida |
|---------|-----------|----------|---------|---------------|
| Compliance Dashboard | Alta | 3h | Alto | FASE 9 |
| Audit Log | Alta | 2h | Alto | FASE 9 |
| AI Model Monitoring | Media | 2h | Medio | FASE 10 |
| System Health Monitor | Media | 2h | Medio | FASE 10 |
| Bulk Operations | Media | 2h | Medio | FASE 11 |
| User Activity Monitor | Media | 2h | Bajo | FASE 11 |
| Quick Actions Widget | Baja | 1h | Bajo | FASE 12 |
| Tenant Onboarding | Baja | 4h | Alto (futuro) | FASE 12 |
| Revenue Dashboard | Futura | 4h | Alto (futuro) | Post-MVP |
| Help Center | Baja | 1h | Bajo | Post-MVP |

---

## 📊 PROGRESO ESTIMADO

**Total Core (FASES 1-8):** 22 horas
**Features Adicionales (FASES 9-11):** +7 horas
**TOTAL PROYECTO:** 29 horas

**Por Fase:**
- FASE 1: Database & Auth Setup (3h)
- FASE 2: Login Page & API (2h)
- FASE 3: Dashboard Layout & Main Page (3h)
- FASE 4: Tenant Management Page (3h)
- FASE 5: Content Management (File Upload) (4h)
- FASE 6: Analytics Page (2h)
- FASE 7: Integrations Monitor (2h)
- FASE 8: Settings & Dark Mode (3h) ← +1h por dark mode
- **FASE 9:** Compliance Dashboard (3h) ← INCLUIDO
- **FASE 10:** Audit Log (2h) ← INCLUIDO
- **FASE 11:** AI Model Monitoring (2h) ← INCLUIDO

**Alcance Final:** 11 FASES implementadas
**FASES Futuras (no incluidas):**
- FASE 12: Bulk Operations + User Activity Monitor (4h)
- FASE 13: Tenant Onboarding Wizard (5h)
- FASE 14: Revenue Dashboard (4h)

---

## 🚨 NOTAS IMPORTANTES

### Seguridad
- **CRÍTICO:** Super admin tiene acceso TOTAL. Proteger credenciales con 2FA (futuro).
- JWT secret debe ser robusto (256-bit random)
- Rate limiting en `/api/super-admin/login` (max 5 intentos por IP)
- Audit log OBLIGATORIO para compliance

### Performance
- Pagination OBLIGATORIA en tablas con > 50 rows
- Lazy loading de gráficas (solo cargar cuando visible)
- Cache de métricas agregadas (Redis futuro, o table cache)
- Índices en DB para queries frecuentes

### UX
- Loading states en TODAS las operaciones async
- Error boundaries para evitar crashes
- Optimistic updates para mejor UX (ej: toggle status)
- Keyboard shortcuts (futuro): `Cmd+K` para búsqueda global

### Escalabilidad
- Diseñar para > 1000 tenants
- Considerar sharding si DB > 100GB (futuro muy lejano)
- CDN para assets estáticos
- Server-side rendering para SEO (no crítico para admin)

---

**Última actualización:** 2025-11-26
**Próximo paso:** Crear documentación de proyecto (plan.md, TODO.md, workflow.md)
