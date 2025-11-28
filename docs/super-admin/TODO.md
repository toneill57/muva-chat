# TODO - MUVA Super Admin Dashboard

**Proyecto:** Super Admin Dashboard
**Fecha:** 2025-11-26
**Plan:** Ver `plan.md` para contexto completo

---

## FASE 1: Database & Auth Setup ✅ COMPLETADA

### 1.1 Crear migración SQL super_admin
- [x] Crear migración con tabla `super_admin_users`, vistas, policies (estimate: 1h)
  - Tabla `super_admin_users` (username, password_hash, permissions JSONB)
  - Vista `v_platform_metrics` (agregados de tenants/conversations/users)
  - Vista `v_tenant_stats` (stats por tenant)
  - RLS policies (BYPASSRLS para super admin)
  - Files: `migrations/[timestamp]_super_admin_setup.sql`
  - Agent: **@agent-database-agent**
  - Test: `mcp__supabase__execute_sql` para verificar tabla creada

### 1.2 Implementar super admin auth library
- [x] Crear `src/lib/super-admin-auth.ts` con funciones de autenticación (estimate: 1h)
  - `loginSuperAdmin(username, password)` → JWT token
  - `verifySuperAdminToken(token)` → super admin data
  - `hashPassword()`, `verifyPassword()` usando bcrypt
  - JWT payload: `{ super_admin_id, username, role: 'super_admin', exp }`
  - Token expiry: 7 días
  - Files: `src/lib/super-admin-auth.ts`
  - Agent: **@agent-backend-developer**
  - Test: Login con credenciales → verificar JWT válido

### 1.3 Crear utility functions
- [x] Crear `src/lib/super-admin-utils.ts` con queries helper (estimate: 30min)
  - `getPlatformMetrics()` → query `v_platform_metrics`
  - `getTenantStats()` → query `v_tenant_stats`
  - `getTenantDetails(tenantId)` → full tenant info
  - `updateTenantStatus(tenantId, isActive)` → toggle active
  - Files: `src/lib/super-admin-utils.ts`
  - Agent: **@agent-backend-developer**
  - Test: Ejecutar `getPlatformMetrics()` → verificar datos correctos

### 1.4 Script de inicialización
- [x] Crear script para inicializar primer super admin (estimate: 30min)
  - Script: `scripts/init-super-admin.js`
  - Crear user con credenciales: username=oneill, password=rabbitHole0+
  - Hashear password con bcrypt
  - Insert en `super_admin_users`
  - Files: `scripts/init-super-admin.js`
  - Agent: **@agent-backend-developer**
  - Test: `node scripts/init-super-admin.js` → verificar user creado en DB

---

## FASE 2: Login Page & API ✅ COMPLETADA

### 2.1 Crear página de login
- [x] Implementar `/sign-in/page.tsx` con formulario (estimate: 1h)
  - Formulario: username + password (validación client-side)
  - Submit → POST `/api/super-admin/login`
  - Guardar JWT en localStorage: `super_admin_token`
  - Redirect a `/super-admin/dashboard` on success
  - MUVA branding (#0d9488), responsive
  - Files: `src/app/sign-in/page.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Navegar a `/sign-in` → form se muestra correctamente

### 2.2 Crear API de login
- [x] Implementar endpoint `/api/super-admin/login` (estimate: 45min)
  - POST handler: validar username/password
  - Llamar `loginSuperAdmin()` para generar JWT
  - Return token + expiresIn
  - Actualizar `last_login_at` en DB
  - 401 si credenciales inválidas
  - Files: `src/app/api/super-admin/login/route.ts`
  - Agent: **@agent-backend-developer**
  - Test: POST con credenciales correctas → JWT válido, POST con incorrectas → 401

### 2.3 Crear middleware de protección
- [x] Implementar middleware de autenticación para rutas super admin (estimate: 15min)
  - Verificar JWT en header `Authorization: Bearer <token>`
  - Si inválido → 401 Unauthorized
  - Si válido → attach `superAdmin` a request
  - Files: `src/middleware/super-admin.ts`, modificar `src/middleware.ts`
  - Agent: **@agent-backend-developer**
  - Test: Request sin token → 401, con token válido → pasa

---

## FASE 3: Dashboard Layout & Main Page ✅ COMPLETADA

### 3.1 Crear SuperAdminContext
- [x] Implementar context para estado global de super admin (estimate: 30min)
  - State: `superAdmin`, `platformMetrics`, `loading`
  - Funciones: `loadMetrics()`, `logout()`
  - Provider wrapping `/super-admin/*` routes
  - Files: `src/contexts/SuperAdminContext.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Verificar context accesible en componentes hijos

### 3.2 Crear SuperAdminSidebar
- [x] Implementar sidebar de navegación (estimate: 45min)
  - Logo MUVA + "Platform Admin"
  - Menu items: Dashboard, Tenants, Content, Analytics, Integrations, Settings
  - User info + Logout button
  - Responsive: collapse en mobile
  - Files: `src/components/SuperAdmin/SuperAdminSidebar.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Sidebar se muestra, navegación funciona, logout limpia token

### 3.3 Crear layout de super admin
- [x] Implementar `/super-admin/layout.tsx` (estimate: 30min)
  - Verificar auth (redirect a `/sign-in` si no autenticado)
  - SuperAdminContext provider
  - Layout: SuperAdminSidebar + main content area
  - Files: `src/app/super-admin/layout.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Sin token → redirect a `/sign-in`, con token → layout se muestra

### 3.4 Crear PlatformMetricsCards
- [x] Implementar cards de métricas globales (estimate: 45min)
  - 4 cards: Total Tenants, Conversaciones (30d), Usuarios Activos, Contenido MUVA
  - Icons + números grandes + trend indicator
  - Fetch desde `/api/super-admin/metrics`
  - Files: `src/components/SuperAdmin/PlatformMetricsCards.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Cards muestran datos correctos, loading states funcionan

### 3.5 Crear TenantQuickTable
- [x] Implementar tabla de últimos tenants activos (estimate: 30min)
  - Últimos 10 tenants activos
  - Columnas: Logo, Nombre, Subdomain, Plan, Última actividad
  - Link a `/super-admin/tenants`
  - Files: `src/components/SuperAdmin/TenantQuickTable.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Tabla muestra 10 tenants ordenados por actividad

### 3.6 Crear dashboard principal
- [x] Implementar `/super-admin/dashboard/page.tsx` (estimate: 15min)
  - Header: "Welcome back, [nombre]"
  - PlatformMetricsCards component
  - TenantQuickTable component
  - Files: `src/app/super-admin/dashboard/page.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Dashboard se muestra correctamente con todas las secciones

### 3.7 Crear API de métricas
- [x] Implementar endpoint `/api/super-admin/metrics` (estimate: 15min)
  - Verificar super admin token
  - Query `v_platform_metrics`
  - Return JSON con métricas
  - Files: `src/app/api/super-admin/metrics/route.ts`
  - Agent: **@agent-backend-developer**
  - Test: GET → métricas correctas en JSON

---

## FASE 4: Tenant Management Page ✅ COMPLETADA

### 4.1 Crear API de tenants
- [x] Implementar endpoint `/api/super-admin/tenants` (estimate: 30min)
  - GET: Lista de todos los tenants con stats (query `v_tenant_stats`)
  - Filtros: `?status=active`, `?tier=premium`, `?search=hotel`
  - Pagination: `?page=1&limit=50`
  - Sort: `?sort=last_activity&order=desc`
  - Files: `src/app/api/super-admin/tenants/route.ts`
  - Agent: **@agent-backend-developer**
  - Test: GET con filtros → resultados correctos

### 4.2 Crear TenantFilters
- [x] Implementar componente de filtros (estimate: 30min)
  - Filtro por status: All, Active, Inactive
  - Filtro por plan: All, Free, Basic, Premium, Enterprise
  - Búsqueda: input con debounce
  - Botón "Reset filters"
  - Files: `src/components/SuperAdmin/TenantFilters.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Filtros actualizan query string, reset funciona

### 4.3 Crear TenantsTable
- [x] Implementar tabla completa de tenants (estimate: 1h)
  - Columnas: Logo, Nombre, Subdomain (link), Plan (badge), Conversations, Última Actividad, Estado (toggle), Acciones
  - Sort por columnas (click en header)
  - Pagination controls
  - Skeleton loading state
  - Files: `src/components/SuperAdmin/TenantsTable.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Tabla muestra todos los tenants, sort funciona, pagination funciona

### 4.4 Crear TenantDetailsModal
- [x] Implementar modal de detalles de tenant (estimate: 45min)
  - Tabs: Overview, Stats, Integrations, Users
  - Mostrar info completa del tenant
  - Botón "Close"
  - Files: `src/components/SuperAdmin/TenantDetailsModal.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Modal se abre con datos correctos, tabs funcionan

### 4.5 Crear página de tenants
- [x] Implementar `/super-admin/tenants/page.tsx` (estimate: 30min)
  - Header: "Tenant Management"
  - TenantFilters component
  - TenantsTable component
  - State management para filtros/pagination
  - Files: `src/app/super-admin/tenants/page.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Página se muestra correctamente, componentes integrados

### 4.6 Crear API de tenant individual
- [x] Implementar endpoint `/api/super-admin/tenants/[id]` (estimate: 15min)
  - GET: Detalles completos de tenant
  - PATCH: Actualizar tenant (activar/desactivar, cambiar plan)
  - Verificar super admin auth
  - Files: `src/app/api/super-admin/tenants/[id]/route.ts`
  - Agent: **@agent-backend-developer**
  - Test: GET → detalles correctos, PATCH → actualiza DB

---

## FASE 5: Content Management (File Upload) ✅ COMPLETADA

### 5.1 Crear ContentUploader
- [x] Implementar componente de upload con drag & drop (estimate: 1.5h)
  - Drag & drop zone usando react-dropzone
  - Accept: `.md` files only, multiple allowed
  - Preview list de archivos seleccionados
  - Progress bar individual por archivo
  - States: idle, uploading, processing, completed, error
  - Categoría selector: actividades, accommodations, restaurants
  - Botón "Upload All", clear all button
  - Files: `src/components/SuperAdmin/ContentUploader.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Drag & drop funciona, progress bars se muestran

### 5.2 Crear API de upload
- [x] Implementar endpoint `/api/super-admin/content/upload` (estimate: 1.5h)
  - POST handler: recibir FormData con archivos
  - Guardar archivos en `_assets/muva/listings/{category}/`
  - Ejecutar `node scripts/database/populate-embeddings.js <filepath>` por cada archivo
  - Capturar output y errores (usar child_process.exec)
  - Return status por archivo
  - Error handling robusto
  - Files: `src/app/api/super-admin/content/upload/route.ts`
  - Agent: **@agent-backend-developer**
  - Test: Upload file → archivo guardado + embeddings creados

### 5.3 Crear ContentTable
- [x] Implementar tabla de contenido existente (estimate: 45min)
  - Columnas: Filename, Category, Title (YAML), Embeddings Count, Created At, Acciones
  - Filtro por category
  - Búsqueda por filename/title
  - Pagination
  - Files: `src/components/SuperAdmin/ContentTable.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Tabla muestra contenido existente, filtros funcionan

### 5.4 Crear API de list content
- [x] Implementar endpoint `/api/super-admin/content/list` (estimate: 15min)
  - Query `muva_content` table
  - Group by category
  - Return con metadata
  - Files: `src/app/api/super-admin/content/list/route.ts`
  - Agent: **@agent-backend-developer**
  - Test: GET → lista completa de contenido

### 5.5 Crear página de content management
- [x] Implementar `/super-admin/content/page.tsx` (estimate: 15min)
  - Header: "MUVA Content Management"
  - ContentUploader component
  - ContentTable component
  - Stats: Total listings por category
  - Files: `src/app/super-admin/content/page.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Página completa funcional, upload y listado integrados

---

## FASE 6: Analytics Page ✅ COMPLETADA

### 6.1 Crear API de usage analytics
- [x] Implementar endpoint `/api/super-admin/analytics/usage` (estimate: 30min)
  - Query conversations por día (últimos 30 días)
  - Query usuarios activos por día
  - Query embeddings queries por día
  - Return formato Recharts: `[{ date, conversations, users }, ...]`
  - Files: `src/app/api/super-admin/analytics/usage/route.ts`
  - Agent: **@agent-backend-developer**
  - Test: GET → datos formateados para Recharts

### 6.2 Crear UsageCharts
- [x] Implementar componente de gráficas de uso (estimate: 45min)
  - Line chart: Conversaciones por día (30 días)
  - Area chart: Usuarios activos por día
  - Bar chart: Tenants activos vs total (por semana)
  - Usando Recharts library, responsive
  - Files: `src/components/SuperAdmin/UsageCharts.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Gráficas renderizan correctamente, datos se visualizan

### 6.3 Crear API de top tenants
- [x] Implementar endpoint `/api/super-admin/analytics/top-tenants` (estimate: 15min)
  - Query top 10 tenants por conversaciones (30 días)
  - Include: nombre, subdomain, conversation_count, growth_percent
  - Files: `src/app/api/super-admin/analytics/top-tenants/route.ts`
  - Agent: **@agent-backend-developer**
  - Test: GET → top 10 tenants correctos

### 6.4 Crear TopTenantsChart
- [x] Implementar componente de top tenants (estimate: 30min)
  - Bar chart horizontal: Top 10 tenants
  - Mostrar nombre + conversation count
  - Link a tenant details
  - Files: `src/components/SuperAdmin/TopTenantsChart.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Chart se muestra, links funcionan

### 6.5 Crear página de analytics
- [x] Implementar `/super-admin/analytics/page.tsx` (estimate: 15min)
  - Header: "Platform Analytics"
  - Date range selector: 7d, 30d, 90d
  - UsageCharts component
  - TopTenantsChart component
  - Performance metrics cards
  - Files: `src/app/super-admin/analytics/page.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Página completa funcional, date range actualiza gráficas

---

## FASE 7: Integrations Monitor ✅ COMPLETADA

### 7.1 Crear API de integrations
- [x] Implementar endpoint `/api/super-admin/integrations` (estimate: 30min)
  - Query `integration_configs` joined con `sync_history`
  - Return: tenant, integration_type, last_sync, status, error_count
  - Filtros: por tenant, por tipo, por status
  - Files: `src/app/api/super-admin/integrations/route.ts`
  - Agent: **@agent-backend-developer**
  - Test: GET → todas las integraciones con status ✅

### 7.2 Crear IntegrationsTable
- [x] Implementar tabla de integraciones (estimate: 45min)
  - Columnas: Tenant, Integration (MotoPress/Airbnb), Status (badge), Last Sync, Errors, Acciones
  - Filtros: All, MotoPress, Airbnb, Errors Only
  - Sort por last_sync
  - Files: `src/components/SuperAdmin/IntegrationsTable.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Tabla muestra integraciones, filtros funcionan ✅

### 7.3 Crear SyncLogsModal
- [x] Implementar modal de logs de sincronización (estimate: 30min)
  - Mostrar últimos 50 logs de sync
  - Por cada log: timestamp, status, records_synced, errors
  - Expandable error details
  - Download logs as JSON
  - Files: `src/components/SuperAdmin/SyncLogsModal.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Modal se abre, logs se muestran, download funciona ✅

### 7.4 Crear página de integrations
- [x] Implementar `/super-admin/integrations/page.tsx` (estimate: 15min)
  - Header: "Integrations Monitor"
  - Global stats: Total syncs today, Error rate
  - IntegrationsTable component
  - Files: `src/app/super-admin/integrations/page.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Página completa funcional ✅

---

## FASE 8: Settings & Dark Mode ✅ COMPLETADA

### 8.1 Implementar Dark Mode System
- [x] Crear sistema de dark mode (estimate: 1h)
  - ThemeContext con state: `'light' | 'dark'`
  - ThemeToggle component (moon/sun icon)
  - Persiste preferencia en localStorage
  - Apply dark mode classes globally
  - Dark mode palette: slate-900, slate-800, slate-100, teal-600
  - Smooth transition entre modos
  - Files: `src/contexts/ThemeContext.tsx`, `src/components/SuperAdmin/ThemeToggle.tsx`, `src/app/globals.css`
  - Agent: **@agent-ux-interface**
  - Test: Toggle funciona, preferencia persiste, transitions suaves ✅

### 8.2 Crear GlobalSettings
- [x] Implementar componente de settings globales (estimate: 45min)
  - Toggle: Maintenance Mode
  - Input: Global announcement (banner)
  - Input: Max file upload size (MB)
  - Input: Default embeddings model
  - Save button → POST `/api/super-admin/settings`
  - Files: `src/components/SuperAdmin/GlobalSettings.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Settings se guardan correctamente ✅

### 8.3 Crear SuperAdminUsers
- [x] Implementar tabla de super admins (estimate: 45min)
  - Columnas: Username, Full Name, Last Login, Status
  - Acciones: Deactivate, Reset Password
  - Botón "Add Super Admin" (future)
  - Files: `src/components/SuperAdmin/SuperAdminUsers.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Tabla muestra admins correctamente ✅

### 8.4 Crear página de settings
- [x] Implementar `/super-admin/settings/page.tsx` (estimate: 30min)
  - Tabs: Global Settings, Super Admin Users, System Info, Appearance
  - Save notifications
  - Files: `src/app/super-admin/settings/page.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Página completa funcional, tabs funcionan, dark mode toggle integrado ✅

---

## FASE 9: Compliance Dashboard ✅ COMPLETADA

### 9.1 Crear API de compliance
- [x] Implementar endpoint `/api/super-admin/compliance` (estimate: 45min)
  - Query submissions SIRE por tenant
  - Agregar: total submissions, pending, completed, failed
  - Identificar tenants vencidos (>30 días sin submission)
  - Return: `{ tenant_id, subdomain, last_submission, status, days_since_last }`
  - Files: `src/app/api/super-admin/compliance/route.ts`
  - Agent: **@agent-backend-developer**
  - Test: GET → compliance status de todos los tenants ✅

### 9.2 Crear ComplianceOverview
- [x] Implementar cards de métricas de compliance (estimate: 45min)
  - Cards: Total Tenants Compliant, Total Submissions, Tenants At Risk, Success Rate
  - Color coding: verde (compliant), amarillo (warning), rojo (overdue)
  - Files: `src/components/SuperAdmin/ComplianceOverview.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Cards muestran métricas correctas, colores apropiados ✅

### 9.3 Crear ComplianceTable
- [x] Implementar tabla de compliance (estimate: 1h)
  - Columnas: Tenant, Last Submission, Status (badge), Submissions Count, Acciones
  - Filtros: All, Compliant, Warning, Overdue
  - Sort por last_submission
  - Files: `src/components/SuperAdmin/ComplianceTable.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Tabla muestra compliance status, filtros funcionan ✅

### 9.4 Crear ComplianceAlerts
- [x] Implementar componente de alertas (estimate: 15min)
  - Lista de tenants en riesgo
  - Mostrar días desde última submission
  - Link directo a tenant
  - Files: `src/components/SuperAdmin/ComplianceAlerts.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Alertas muestran tenants correctos ✅

### 9.5 Crear API de compliance report
- [x] Implementar endpoint de download de reporte (estimate: 15min)
  - Endpoint `/api/super-admin/compliance/report`
  - Export CSV con todas las submissions
  - Formato: tenant, submission_date, status, reservations_count
  - Files: `src/app/api/super-admin/compliance/report/route.ts`
  - Agent: **@agent-backend-developer**
  - Test: Download CSV con datos correctos ✅

### 9.6 Crear página de compliance
- [x] Implementar `/super-admin/compliance/page.tsx` (estimate: 15min)
  - Header: "Compliance Dashboard"
  - ComplianceOverview component
  - ComplianceAlerts component
  - ComplianceTable component
  - Files: `src/app/super-admin/compliance/page.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Página completa funcional ✅

---

## FASE 10: Audit Log ✅ COMPLETADA

### 10.1 Crear migración audit log
- [x] Crear tabla `super_admin_audit_log` con índices (estimate: 30min)
  - Tabla con: log_id, super_admin_id, action, target_type, target_id, changes (JSONB), ip_address, user_agent, created_at
  - Índices: idx_audit_log_admin, idx_audit_log_action, idx_audit_log_created
  - Files: `migrations/20251127000000_super_admin_audit_log.sql`
  - Agent: **@agent-database-agent**
  - Test: MCP verify tabla creada con índices ✅

### 10.2 Crear audit logger library
- [x] Implementar `src/lib/audit-logger.ts` (estimate: 30min)
  - Función `logAction(adminId, action, targetType, targetId, changes, request)`
  - Extrae IP y user-agent del request
  - Insert en `super_admin_audit_log`
  - Files: `src/lib/audit-logger.ts`
  - Agent: **@agent-backend-developer**
  - Test: Llamar `logAction()` → log creado en DB ✅

### 10.3 Crear AuditLogTable
- [x] Implementar tabla de audit logs (estimate: 45min)
  - Columnas: Timestamp, Super Admin, Action (badge), Target, Changes (expandable JSON), IP Address
  - Pagination (50 per page)
  - Expandable row para ver changes completo
  - Files: `src/components/SuperAdmin/AuditLogTable.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Tabla muestra logs, expandable funciona ✅

### 10.4 Crear AuditLogFilters
- [x] Implementar filtros de audit log (estimate: 15min)
  - Filtro por action type (dropdown)
  - Filtro por date range (date picker)
  - Filtro por super admin user
  - Búsqueda por target_id
  - Export CSV button
  - Files: `src/components/SuperAdmin/AuditLogFilters.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Filtros funcionan, export CSV funciona ✅

### 10.5 Integrar audit logging en endpoints
- [x] Agregar `logAction()` a endpoints críticos (estimate: 15min)
  - Endpoints: `/api/super-admin/tenants/[id]` (PATCH), `/content/upload`, `/settings`, `/login`
  - Loguear: antes de ejecutar acción (before) + después (after)
  - Files: Modificar endpoints existentes
  - Agent: **@agent-backend-developer**
  - Test: Ejecutar acción → verificar log creado con before/after ✅

### 10.6 Crear API de audit log
- [x] Implementar endpoint `/api/super-admin/audit-log` (estimate: 15min)
  - GET: Lista de logs con filtros
  - Pagination support
  - Files: `src/app/api/super-admin/audit-log/route.ts`
  - Agent: **@agent-backend-developer**
  - Test: GET con filtros → logs correctos ✅

### 10.7 Crear página de audit log
- [x] Implementar `/super-admin/audit-log/page.tsx` (estimate: 15min)
  - Header: "Audit Log"
  - AuditLogFilters component
  - AuditLogTable component
  - Files: `src/app/super-admin/audit-log/page.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Página completa funcional ✅

---

## FASE 11: AI Model Monitoring ✅ COMPLETADA

### 11.1 Crear migración AI usage tracking
- [x] Crear tabla `ai_usage_logs` y vista (estimate: 30min)
  - Tabla: usage_id, tenant_id, conversation_id, model, input_tokens, output_tokens, total_tokens (computed), estimated_cost, latency_ms, created_at
  - Vista `v_ai_usage_stats`: agregados por tenant y día
  - Índices: idx_ai_usage_tenant, idx_ai_usage_created
  - Files: `migrations/20251127010000_ai_usage_tracking.sql`
  - Agent: **@agent-database-agent**
  - Test: MCP verify tabla + vista creadas ✅

### 11.2 Crear AI usage tracker
- [x] Implementar `src/lib/track-ai-usage.ts` (estimate: 30min)
  - Función `trackAIUsage(tenantId, conversationId, model, usage, latency)`
  - Calcular costo estimado (Claude Sonnet 4.5: $3/MTok input, $15/MTok output)
  - Insert en `ai_usage_logs`
  - Files: `src/lib/track-ai-usage.ts`
  - Agent: **@agent-backend-developer**
  - Test: Llamar `trackAIUsage()` → log creado con costo correcto ✅

### 11.3 Crear AIUsageCharts
- [x] Implementar componente de gráficas de AI usage (estimate: 45min)
  - Line chart: Tokens consumidos por día (30 días)
  - Area chart: Costo acumulado por día
  - Bar chart: Latency promedio por día
  - Pie chart: Distribución de modelos usados
  - Files: `src/components/SuperAdmin/AIUsageCharts.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Gráficas renderizan correctamente ✅

### 11.4 Crear AITopConsumers
- [x] Implementar componente de top consumers (estimate: 15min)
  - Tabla: Top 10 tenants por consumo (30 días)
  - Columnas: Tenant, Total Tokens, Total Cost, Avg Latency
  - Files: `src/components/SuperAdmin/AITopConsumers.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Tabla muestra top 10 correctamente ✅

### 11.5 Crear API de AI monitoring
- [x] Implementar endpoint `/api/super-admin/ai-monitoring` (estimate: 15min)
  - Query `v_ai_usage_stats`
  - Calcular métricas agregadas
  - Files: `src/app/api/super-admin/ai-monitoring/route.ts`
  - Agent: **@agent-backend-developer**
  - Test: GET → métricas correctas ✅

### 11.6 Integrar tracking en chat endpoints
- [x] Agregar `trackAIUsage()` a endpoints de chat (estimate: 15min)
  - Endpoints: `/api/chat/*`, `/api/chat/super/*`, `/api/chat/muva/*`, `/api/chat/listings/*`
  - Capturar usage de Claude response
  - Calcular latency
  - Files: Modificar 5 archivos de chat endpoints + `src/lib/claude.ts`
  - Agent: **@agent-backend-developer**
  - Test: Ejecutar chat → verificar log de AI usage creado ✅

### 11.7 Crear página de AI monitoring
- [x] Implementar `/super-admin/ai-monitoring/page.tsx` (estimate: 15min)
  - Header: "AI Model Monitoring"
  - Cards: Total Tokens, Total Cost, Avg Latency, Requests Count
  - AIUsageCharts component (4 charts: Line, Area, Bar, Pie)
  - AITopConsumers component (Top 10 table con trophies)
  - Files: `src/app/super-admin/ai-monitoring/page.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Página completa funcional ✅

---

## 📊 PROGRESO

**Total Tasks:** 71
**Completed:** 71/71 (100%) 🎉

**Por Fase:**
- FASE 1: 4/4 tareas ✅ COMPLETADA (Database & Auth Setup)
- FASE 2: 3/3 tareas ✅ COMPLETADA (Login Page & API)
- FASE 3: 7/7 tareas ✅ COMPLETADA (Dashboard Layout & Main Page)
- FASE 4: 6/6 tareas ✅ COMPLETADA (Tenant Management Page)
- FASE 5: 5/5 tareas ✅ COMPLETADA (Content Management)
- FASE 6: 5/5 tareas ✅ COMPLETADA (Analytics Page)
- FASE 7: 4/4 tareas ✅ COMPLETADA (Integrations Monitor)
- FASE 8: 4/4 tareas ✅ COMPLETADA (Settings & Dark Mode)
- FASE 9: 6/6 tareas ✅ COMPLETADA (Compliance Dashboard)
- FASE 10: 7/7 tareas ✅ COMPLETADA (Audit Log)
- FASE 11: 7/7 tareas ✅ COMPLETADA (AI Model Monitoring)

**Tiempo Estimado Total:** 29 horas
**Tiempo Invertido:** 29h (TODAS LAS FASES)

---

**Última actualización:** 2025-11-27 🎉 PROYECTO COMPLETADO AL 100%
