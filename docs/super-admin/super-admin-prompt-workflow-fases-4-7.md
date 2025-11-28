# PROMPTS WORKFLOW - MUVA Super Admin Dashboard (FASES 4-7)

**Archivo:** Continuación de super-admin-prompt-workflow.md
**FASES:** 4 (Tenant Management), 5 (Content), 6 (Analytics), 7 (Integrations)

---

## FASE 4: Tenant Management Page (3h)

### Prompt 4.1: Crear Página Completa de Gestión de Tenants

**Agente:** `@agent-ux-interface` + `@agent-backend-developer`

**PREREQUISITO:** FASE 3 completada (dashboard funcional)

**Contexto:**
FASE 4 completa que crea la página de gestión de tenants con tabla completa, filtros, modal de detalles, y funcionalidad de activar/desactivar tenants.

---

🔽 **COPIAR DESDE AQUÍ (Prompt 4.1 - FASE 4 COMPLETA)**

**📊 Contexto de Progreso:**

**Progreso General:** 14/71 tareas (19.7%)

FASE 1: ✅ COMPLETADA (4/4)
FASE 2: ✅ COMPLETADA (3/3)
FASE 3: ✅ COMPLETADA (7/7)
FASE 4 - Tenant Management (0/6) ← ESTAMOS AQUÍ
- [ ] 4.1: Crear API de tenants
- [ ] 4.2: Crear TenantFilters
- [ ] 4.3: Crear TenantsTable
- [ ] 4.4: Crear TenantDetailsModal
- [ ] 4.5: Crear página de tenants
- [ ] 4.6: Crear API de tenant individual

**Estado Actual:**
- Dashboard funcional con sidebar ✓
- Métricas agregadas funcionando ✓
- Listo para página de gestión de tenants

---

**Tareas FASE 4:**

**PARTE A - API Backend (@agent-backend-developer):**

1. **Crear `/api/super-admin/tenants/route.ts`** (30min):

   ```typescript
   import { NextResponse } from 'next/server';
   import { createClient } from '@/lib/supabase/server';

   export async function GET(request: Request) {
     try {
       const { searchParams } = new URL(request.url);
       const status = searchParams.get('status'); // 'active' | 'inactive'
       const tier = searchParams.get('tier'); // 'free' | 'basic' | 'premium' | 'enterprise'
       const search = searchParams.get('search'); // text search
       const page = parseInt(searchParams.get('page') || '1');
       const limit = parseInt(searchParams.get('limit') || '50');
       const sort = searchParams.get('sort') || 'last_activity';
       const order = searchParams.get('order') || 'desc';

       const supabase = createClient();

       // Query v_tenant_stats con filtros
       let query = supabase.from('v_tenant_stats').select('*', { count: 'exact' });

       // Aplicar filtros
       if (status === 'active') query = query.eq('is_active', true);
       if (status === 'inactive') query = query.eq('is_active', false);
       if (tier) query = query.eq('subscription_tier', tier);
       if (search) {
         query = query.or(`nombre_comercial.ilike.%${search}%,subdomain.ilike.%${search}%`);
       }

       // Sort
       query = query.order(sort, { ascending: order === 'asc' });

       // Pagination
       const offset = (page - 1) * limit;
       query = query.range(offset, offset + limit - 1);

       const { data, error, count } = await query;

       if (error) throw error;

       return NextResponse.json({
         tenants: data,
         total: count,
         page,
         limit,
         totalPages: Math.ceil((count || 0) / limit)
       });

     } catch (error) {
       console.error('Get tenants error:', error);
       return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
     }
   }
   ```

2. **Crear `/api/super-admin/tenants/[id]/route.ts`** (15min):

   ```typescript
   import { NextResponse } from 'next/server';
   import { createClient } from '@/lib/supabase/server';
   import { updateTenantStatus } from '@/lib/super-admin-utils';

   export async function GET(
     request: Request,
     { params }: { params: { id: string } }
   ) {
     try {
       const supabase = createClient();

       // Query tenant con todos los joins
       const { data: tenant, error } = await supabase
         .from('tenant_registry')
         .select(`
           *,
           integration_configs (*),
           user_tenant_permissions (
             user_id,
             role,
             is_active
           )
         `)
         .eq('tenant_id', params.id)
         .single();

       if (error) throw error;

       return NextResponse.json({ tenant });

     } catch (error) {
       console.error('Get tenant error:', error);
       return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
     }
   }

   export async function PATCH(
     request: Request,
     { params }: { params: { id: string } }
   ) {
     try {
       const body = await request.json();
       const { is_active, subscription_tier } = body;

       const supabase = createClient();

       const updates: any = {};
       if (typeof is_active === 'boolean') updates.is_active = is_active;
       if (subscription_tier) updates.subscription_tier = subscription_tier;
       updates.updated_at = new Date().toISOString();

       const { data, error } = await supabase
         .from('tenant_registry')
         .update(updates)
         .eq('tenant_id', params.id)
         .select()
         .single();

       if (error) throw error;

       return NextResponse.json({ tenant: data });

     } catch (error) {
       console.error('Update tenant error:', error);
       return NextResponse.json({ error: 'Update failed' }, { status: 500 });
     }
   }
   ```

**PARTE B - UI Components (@agent-ux-interface):**

3. **Crear `src/components/SuperAdmin/TenantFilters.tsx`** (30min):

   Componente con:
   - Select para status: All, Active, Inactive
   - Select para tier: All, Free, Basic, Premium, Enterprise
   - Input de búsqueda con debounce (300ms)
   - Botón "Reset Filters"
   - onChange actualiza URL search params

4. **Crear `src/components/SuperAdmin/TenantsTable.tsx`** (1h):

   Tabla con columnas:
   - Logo (thumbnail de logo_url si existe, placeholder si no)
   - Nombre Comercial (bold, primary text)
   - Subdomain (link clickeable a `https://{subdomain}.muva.chat`, opens in new tab)
   - Plan/Tier (badge con color: free=gray, basic=blue, premium=purple, enterprise=gold)
   - Conversations (número con formato, ej: 1,234)
   - Última Actividad (relative time: "2 days ago", "1 hour ago")
   - Estado (toggle switch que llama PATCH /api/tenants/[id] con is_active)
   - Acciones (botón "View Details" abre modal, botón "Edit" disabled con tooltip "Coming soon")

   Features:
   - Sort por columnas: click en header alterna asc/desc
   - Pagination: Previous/Next buttons + page numbers
   - Skeleton loading state mientras carga
   - Empty state si no hay tenants
   - Hover effect en rows

5. **Crear `src/components/SuperAdmin/TenantDetailsModal.tsx`** (45min):

   Modal (shadcn Dialog) con:
   - Header: Logo + Nombre del tenant + subdomain
   - Tabs:
     - **Overview:** Info general (NIT, razón social, dirección, contacto, created_at)
     - **Stats:** Métricas (total conversations, active users, accommodation count, average response time)
     - **Integrations:** Lista de integraciones (MotoPress, Airbnb) con status badges
     - **Users:** Tabla de users vinculados (from user_tenant_permissions) con roles
   - Footer: Botón "Close"

6. **Crear `src/app/super-admin/tenants/page.tsx`** (30min):

   Página con:
   - Header: "Tenant Management" + botón "Add Tenant" (disabled, future feature)
   - TenantFilters component
   - TenantsTable component
   - State management:
     ```typescript
     const [filters, setFilters] = useState({ status: 'all', tier: 'all', search: '' });
     const [page, setPage] = useState(1);
     const [tenants, setTenants] = useState([]);
     const [loading, setLoading] = useState(true);
     ```
   - useEffect que fetches `/api/super-admin/tenants` cuando cambian filters o page
   - TenantDetailsModal state (selectedTenant, isOpen)

**Entregables:**
- API de tenants con filtros, pagination, sort
- API de tenant individual (GET para detalles, PATCH para update)
- Página `/super-admin/tenants` funcional
- Tabla completa con todas las columnas
- Filtros funcionando
- Modal de detalles con tabs
- Toggle de status funcional

**Criterios de Éxito:**
- ✅ Navegar a `/super-admin/tenants` → tabla muestra todos los tenants
- ✅ Filtrar por status "Active" → solo muestra tenants activos
- ✅ Buscar "hotel" → filtra por nombre/subdomain
- ✅ Click en header de columna → sort funciona
- ✅ Toggle status switch → actualiza DB y UI optimistically
- ✅ Click "View Details" → modal se abre con tabs funcionando
- ✅ Pagination funciona (Next/Previous)

**Estimado:** 3h

---

**🔍 Verificación Post-Ejecución:**

"¿Consideras satisfactoria FASE 4 COMPLETA?
- API /api/super-admin/tenants funciona con filtros ✓
- Tabla muestra todos los tenants correctamente ✓
- Filtros funcionan (status, tier, search) ✓
- Sort por columnas funciona ✓
- Toggle status actualiza DB ✓
- Modal de detalles muestra info completa ✓
- Pagination funciona ✓
- Responsive en mobile/tablet/desktop ✓"

**Si "Sí":**

Marcar 6 tareas en TODO.md (4.1-4.6), actualizar:
```markdown
**Completed:** 20/71 (28.2%)
- FASE 4: 6/6 tareas ✅ COMPLETADA
```

Informar:
"✅ FASE 4 COMPLETADA

**✨ Logros:**
- Sistema completo de gestión de tenants
- Filtros avanzados + pagination + sort
- Modal de detalles con tabs
- Toggle status en tiempo real

**Progreso:** 20/71 (28.2%)
**Siguiente:** FASE 5 - Content Management (4h)"

🔼 **COPIAR HASTA AQUÍ (Prompt 4.1)**

---

## FASE 5: Content Management (File Upload) (4h)

### Prompt 5.1: Crear Sistema Completo de Upload y Gestión de Contenido

**Agente:** `@agent-ux-interface` + `@agent-backend-developer`

**PREREQUISITO:** FASE 4 completada

---

🔽 **COPIAR DESDE AQUÍ (Prompt 5.1 - FASE 5 COMPLETA)**

**📊 Progreso:** 20/71 → 25/71 (35.2%)

FASES 1-4: ✅ COMPLETADAS
FASE 5 - Content Management (0/5) ← AQUÍ

**Tareas:**

**PARTE A - Upload Component (@agent-ux-interface):**

1. **Crear `src/components/SuperAdmin/ContentUploader.tsx`** (1.5h):

   Usar react-dropzone:
   ```typescript
   import { useDropzone } from 'react-dropzone';

   const { getRootProps, getInputProps, isDragActive } = useDropzone({
     accept: { 'text/markdown': ['.md'] },
     multiple: true,
     onDrop: (acceptedFiles) => {
       setFiles(acceptedFiles.map(file => ({
         file,
         progress: 0,
         status: 'pending', // 'pending' | 'uploading' | 'processing' | 'completed' | 'error'
         error: null
       })));
     }
   });
   ```

   UI:
   - Drag & drop zone (dashed border, teal-600 when drag active)
   - Categoría selector (Select): actividades, accommodations, restaurants, rentals, spots, culture
   - Preview list de archivos con:
     - Filename + size
     - Progress bar individual (0-100%)
     - Status badge (pending=gray, uploading=blue, processing=purple, completed=green, error=red)
     - Remove button (X) si pending
   - Botones:
     - "Upload All" (primary, disabled si no hay files pending)
     - "Clear All" (secondary)

   Upload logic:
   ```typescript
   const uploadAll = async () => {
     for (const fileItem of files) {
       if (fileItem.status !== 'pending') continue;

       setFileStatus(fileItem.file.name, 'uploading', 0);

       const formData = new FormData();
       formData.append('file', fileItem.file);
       formData.append('category', selectedCategory);

       try {
         const response = await fetch('/api/super-admin/content/upload', {
           method: 'POST',
           headers: {
             'Authorization': `Bearer ${token}`
           },
           body: formData
         });

         if (response.ok) {
           const result = await response.json();
           setFileStatus(fileItem.file.name, 'completed', 100);
         } else {
           const error = await response.json();
           setFileStatus(fileItem.file.name, 'error', 0, error.message);
         }
       } catch (error) {
         setFileStatus(fileItem.file.name, 'error', 0, error.message);
       }
     }
   };
   ```

**PARTE B - Upload API (@agent-backend-developer):**

2. **Crear `/api/super-admin/content/upload/route.ts`** (1.5h):

   **CRÍTICO:** Este endpoint ejecuta el script `populate-embeddings.js`

   ```typescript
   import { NextResponse } from 'next/server';
   import { writeFile, mkdir } from 'fs/promises';
   import { exec } from 'child_process';
   import { promisify } from 'util';
   import path from 'path';

   const execPromise = promisify(exec);

   export async function POST(request: Request) {
     try {
       const formData = await request.formData();
       const file = formData.get('file') as File;
       const category = formData.get('category') as string;

       if (!file || !category) {
         return NextResponse.json({ error: 'Missing file or category' }, { status: 400 });
       }

       // Validar extensión
       if (!file.name.endsWith('.md')) {
         return NextResponse.json({ error: 'Only .md files allowed' }, { status: 400 });
       }

       // Path donde guardar
       const uploadDir = path.join(process.cwd(), '_assets', 'muva', 'listings', category);
       await mkdir(uploadDir, { recursive: true });

       const filePath = path.join(uploadDir, file.name);

       // Guardar archivo
       const bytes = await file.arrayBuffer();
       const buffer = Buffer.from(bytes);
       await writeFile(filePath, buffer);

       // Ejecutar populate-embeddings.js
       const scriptPath = path.join(process.cwd(), 'scripts', 'database', 'populate-embeddings.js');

       try {
         const { stdout, stderr } = await execPromise(
           `node "${scriptPath}" "${filePath}"`,
           { timeout: 60000 } // 60 segundos timeout
         );

         // Parse output para extraer embeddings count
         const embeddingsMatch = stdout.match(/(\d+) embeddings created/);
         const embeddingsCount = embeddingsMatch ? parseInt(embeddingsMatch[1]) : 0;

         return NextResponse.json({
           success: true,
           filename: file.name,
           category,
           embeddings: embeddingsCount,
           message: 'File uploaded and processed successfully'
         });

       } catch (execError) {
         console.error('Embeddings script error:', execError);
         return NextResponse.json({
           success: false,
           filename: file.name,
           error: 'Failed to process embeddings',
           details: execError.message
         }, { status: 500 });
       }

     } catch (error) {
       console.error('Upload error:', error);
       return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
     }
   }
   ```

**PARTE C - Content Table (@agent-ux-interface):**

3. **Crear `src/components/SuperAdmin/ContentTable.tsx`** (45min):

   Tabla de contenido existente:
   - Columnas: Filename, Category (badge), Title (del YAML), Embeddings Count, Created At, Acciones
   - Filtro por category (dropdown)
   - Búsqueda por filename/title
   - Pagination (50 per page)
   - Botón "Delete" en acciones (con confirmación)

4. **APIs adicionales:**

   `/api/super-admin/content/list/route.ts` (15min):
   - Query `muva_content` table
   - Group by category
   - Return array de content items

   `/api/super-admin/content/delete/route.ts` (opcional, 15min):
   - DELETE endpoint que elimina archivo del filesystem Y registros de embeddings

5. **Crear `/super-admin/content/page.tsx`** (15min):

   Página con:
   - Header: "MUVA Content Management"
   - Stats cards: Total listings por category
   - ContentUploader component
   - ContentTable component

**Entregables:**
- Upload component con drag & drop funcional
- API que guarda archivos Y ejecuta populate-embeddings.js
- Tabla de contenido existente
- Progress tracking por archivo

**Criterios de Éxito:**
- ✅ Drag & drop .md files → preview list se muestra
- ✅ Select category → actualiza
- ✅ Click "Upload All" → archivos suben, progress bars actualizan
- ✅ Script populate-embeddings.js se ejecuta por cada archivo
- ✅ Archivos guardados en `_assets/muva/listings/{category}/`
- ✅ Embeddings creados en tabla `muva_content`
- ✅ ContentTable muestra contenido existente
- ✅ Error handling: archivos inválidos muestran error

**Estimado:** 4h

---

**🔍 Verificación:**

"¿FASE 5 satisfactoria?
- Upload drag & drop funciona ✓
- Progress tracking por archivo ✓
- Script populate-embeddings.js ejecuta correctamente ✓
- Archivos guardados en ubicación correcta ✓
- Embeddings creados en DB ✓
- Tabla de contenido muestra items ✓"

**Si "Sí":** 25/71 (35.2%)

🔼 **FIN Prompt 5.1**

---

## FASE 6: Analytics Page (3h)

### Prompt 6.1: Crear Página Completa de Analytics con Gráficas

**Agente:** `@agent-ux-interface` + `@agent-backend-developer`

**PREREQUISITO:** FASE 5 completada

**Contexto:**
FASE 6 completa que crea la página de analytics con gráficas de uso (Recharts), métricas de plataforma, y análisis de top tenants.

---

🔽 **COPIAR DESDE AQUÍ (Prompt 6.1 - FASE 6 COMPLETA)**

**📊 Contexto de Progreso:**

**Progreso General:** 25/71 tareas (35.2%)

FASES 1-5: ✅ COMPLETADAS
FASE 6 - Analytics Page (0/5) ← ESTAMOS AQUÍ
- [ ] 6.1: Crear API de usage analytics
- [ ] 6.2: Crear UsageCharts
- [ ] 6.3: Crear API de top tenants
- [ ] 6.4: Crear TopTenantsChart
- [ ] 6.5: Crear página de analytics

**Estado Actual:**
- Dashboard, Tenants, Content funcionando ✓
- Listo para página de analytics con gráficas

---

**Tareas FASE 6:**

**PARTE A - Analytics APIs (@agent-backend-developer):**

1. **Crear `/api/super-admin/analytics/usage/route.ts`** (30min):

   ```typescript
   import { NextResponse } from 'next/server';
   import { createClient } from '@/lib/supabase/server';

   export async function GET(request: Request) {
     try {
       const { searchParams } = new URL(request.url);
       const days = parseInt(searchParams.get('days') || '30'); // 7, 30, 90

       const supabase = createClient();

       // Query conversations por día (últimos N días)
       const { data: conversationsData, error: convError } = await supabase
         .from('conversations')
         .select('created_at')
         .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
         .order('created_at');

       if (convError) throw convError;

       // Query usuarios activos por día (últimos N días)
       const { data: usersData, error: usersError } = await supabase
         .from('conversations')
         .select('created_at, guest_id')
         .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
         .order('created_at');

       if (usersError) throw usersError;

       // Agrupar por día
       const usageByDay: Record<string, { date: string; conversations: number; users: Set<string> }> = {};

       conversationsData?.forEach(conv => {
         const date = new Date(conv.created_at).toISOString().split('T')[0];
         if (!usageByDay[date]) {
           usageByDay[date] = { date, conversations: 0, users: new Set() };
         }
         usageByDay[date].conversations++;
       });

       usersData?.forEach(conv => {
         const date = new Date(conv.created_at).toISOString().split('T')[0];
         if (usageByDay[date] && conv.guest_id) {
           usageByDay[date].users.add(conv.guest_id);
         }
       });

       // Formato para Recharts: array de objetos con { date, conversations, activeUsers }
       const chartData = Object.values(usageByDay).map(day => ({
         date: day.date,
         conversations: day.conversations,
         activeUsers: day.users.size
       })).sort((a, b) => a.date.localeCompare(b.date));

       return NextResponse.json({ data: chartData });

     } catch (error) {
       console.error('Analytics usage error:', error);
       return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
     }
   }
   ```

2. **Crear `/api/super-admin/analytics/top-tenants/route.ts`** (15min):

   ```typescript
   import { NextResponse } from 'next/server';
   import { createClient } from '@/lib/supabase/server';

   export async function GET(request: Request) {
     try {
       const { searchParams } = new URL(request.url);
       const days = parseInt(searchParams.get('days') || '30');

       const supabase = createClient();

       // Query top 10 tenants por conversaciones (últimos N días)
       const { data, error } = await supabase.rpc('get_top_tenants_by_conversations', {
         days_param: days
       });

       if (error) {
         // Fallback: query manual si RPC no existe
         const { data: conversations, error: convError } = await supabase
           .from('conversations')
           .select('tenant_id, tenant_registry!inner(nombre_comercial, subdomain)')
           .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

         if (convError) throw convError;

         // Agrupar y contar por tenant
         const tenantCounts: Record<string, any> = {};
         conversations?.forEach(conv => {
           const tenantId = conv.tenant_id;
           if (!tenantCounts[tenantId]) {
             tenantCounts[tenantId] = {
               tenant_id: tenantId,
               nombre_comercial: conv.tenant_registry?.nombre_comercial,
               subdomain: conv.tenant_registry?.subdomain,
               conversation_count: 0
             };
           }
           tenantCounts[tenantId].conversation_count++;
         });

         const topTenants = Object.values(tenantCounts)
           .sort((a, b) => b.conversation_count - a.conversation_count)
           .slice(0, 10);

         return NextResponse.json({ data: topTenants });
       }

       return NextResponse.json({ data: data?.slice(0, 10) });

     } catch (error) {
       console.error('Top tenants error:', error);
       return NextResponse.json({ error: 'Failed to fetch top tenants' }, { status: 500 });
     }
   }
   ```

**PARTE B - Charts Components (@agent-ux-interface):**

3. **Instalar Recharts library:**

   ```bash
   pnpm add recharts
   ```

4. **Crear `src/components/SuperAdmin/UsageCharts.tsx`** (45min):

   Componente con 3 gráficas usando Recharts:

   ```typescript
   import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

   // Line Chart: Conversaciones por día
   <ResponsiveContainer width="100%" height={300}>
     <LineChart data={usageData}>
       <CartesianGrid strokeDasharray="3 3" />
       <XAxis dataKey="date" />
       <YAxis />
       <Tooltip />
       <Legend />
       <Line type="monotone" dataKey="conversations" stroke="#0d9488" strokeWidth={2} />
     </LineChart>
   </ResponsiveContainer>

   // Area Chart: Usuarios activos por día
   <ResponsiveContainer width="100%" height={300}>
     <AreaChart data={usageData}>
       <CartesianGrid strokeDasharray="3 3" />
       <XAxis dataKey="date" />
       <YAxis />
       <Tooltip />
       <Legend />
       <Area type="monotone" dataKey="activeUsers" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
     </AreaChart>
   </ResponsiveContainer>

   // Bar Chart: Tenants activos (últimos 7 días)
   <ResponsiveContainer width="100%" height={300}>
     <BarChart data={tenantsData}>
       <CartesianGrid strokeDasharray="3 3" />
       <XAxis dataKey="date" />
       <YAxis />
       <Tooltip />
       <Legend />
       <Bar dataKey="activeTenantsCount" fill="#0d9488" />
     </BarChart>
   </ResponsiveContainer>
   ```

   Features:
   - Dark mode support (colores adaptativos)
   - Responsive (100% width)
   - Tooltips con formato legible
   - Loading skeleton mientras carga datos
   - Empty state si no hay datos

5. **Crear `src/components/SuperAdmin/TopTenantsChart.tsx`** (30min):

   Bar chart horizontal con top 10 tenants:

   ```typescript
   import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

   <ResponsiveContainer width="100%" height={400}>
     <BarChart
       data={topTenants}
       layout="vertical"
       margin={{ left: 100 }}
     >
       <XAxis type="number" />
       <YAxis type="category" dataKey="nombre_comercial" width={120} />
       <Tooltip />
       <Bar dataKey="conversation_count" fill="#0d9488">
         {topTenants.map((entry, index) => (
           <Cell key={`cell-${index}`} fill={index < 3 ? '#0d9488' : '#14b8a6'} />
         ))}
       </Bar>
     </BarChart>
   </ResponsiveContainer>
   ```

   Features:
   - Top 3 destacados con color más oscuro
   - Click en bar → navega a tenant details
   - Tooltip muestra subdomain + count
   - Nombres truncados si son muy largos

6. **Crear `/super-admin/analytics/page.tsx`** (15min):

   Página completa con:

   ```typescript
   'use client';

   import { useState, useEffect } from 'react';
   import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
   import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
   import { UsageCharts } from '@/components/SuperAdmin/UsageCharts';
   import { TopTenantsChart } from '@/components/SuperAdmin/TopTenantsChart';
   import { TrendingUp, Users, MessageSquare, Building2 } from 'lucide-react';

   export default function AnalyticsPage() {
     const [dateRange, setDateRange] = useState<'7' | '30' | '90'>('30');
     const [usageData, setUsageData] = useState([]);
     const [topTenants, setTopTenants] = useState([]);
     const [loading, setLoading] = useState(true);
     const [metrics, setMetrics] = useState({
       totalConversations: 0,
       totalUsers: 0,
       activeTenantsCount: 0,
       avgConversationsPerDay: 0
     });

     useEffect(() => {
       fetchAnalytics();
     }, [dateRange]);

     const fetchAnalytics = async () => {
       setLoading(true);
       try {
         const [usageRes, tenantsRes] = await Promise.all([
           fetch(`/api/super-admin/analytics/usage?days=${dateRange}`),
           fetch(`/api/super-admin/analytics/top-tenants?days=${dateRange}`)
         ]);

         const usageData = await usageRes.json();
         const tenantsData = await tenantsRes.json();

         setUsageData(usageData.data);
         setTopTenants(tenantsData.data);

         // Calcular métricas agregadas
         const totalConv = usageData.data.reduce((sum, day) => sum + day.conversations, 0);
         const totalUsers = usageData.data.reduce((sum, day) => sum + day.activeUsers, 0);
         const avgConv = Math.round(totalConv / usageData.data.length);

         setMetrics({
           totalConversations: totalConv,
           totalUsers: totalUsers,
           activeTenantsCount: tenantsData.data.length,
           avgConversationsPerDay: avgConv
         });

       } catch (error) {
         console.error('Error fetching analytics:', error);
       } finally {
         setLoading(false);
       }
     };

     return (
       <div className="space-y-6">
         {/* Header */}
         <div className="flex items-center justify-between">
           <div>
             <h1 className="text-3xl font-bold">Platform Analytics</h1>
             <p className="text-muted-foreground mt-1">
               Monitor usage trends and performance metrics
             </p>
           </div>

           {/* Date Range Selector */}
           <Select value={dateRange} onValueChange={(val) => setDateRange(val as any)}>
             <SelectTrigger className="w-[180px]">
               <SelectValue />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="7">Last 7 days</SelectItem>
               <SelectItem value="30">Last 30 days</SelectItem>
               <SelectItem value="90">Last 90 days</SelectItem>
             </SelectContent>
           </Select>
         </div>

         {/* Metrics Cards */}
         <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
           <Card>
             <CardHeader className="flex flex-row items-center justify-between pb-2">
               <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
               <MessageSquare className="h-4 w-4 text-muted-foreground" />
             </CardHeader>
             <CardContent>
               <div className="text-2xl font-bold">{metrics.totalConversations.toLocaleString()}</div>
               <p className="text-xs text-muted-foreground">
                 Last {dateRange} days
               </p>
             </CardContent>
           </Card>

           <Card>
             <CardHeader className="flex flex-row items-center justify-between pb-2">
               <CardTitle className="text-sm font-medium">Active Users</CardTitle>
               <Users className="h-4 w-4 text-muted-foreground" />
             </CardHeader>
             <CardContent>
               <div className="text-2xl font-bold">{metrics.totalUsers.toLocaleString()}</div>
               <p className="text-xs text-muted-foreground">
                 Unique users
               </p>
             </CardContent>
           </Card>

           <Card>
             <CardHeader className="flex flex-row items-center justify-between pb-2">
               <CardTitle className="text-sm font-medium">Active Tenants</CardTitle>
               <Building2 className="h-4 w-4 text-muted-foreground" />
             </CardHeader>
             <CardContent>
               <div className="text-2xl font-bold">{metrics.activeTenantsCount}</div>
               <p className="text-xs text-muted-foreground">
                 With activity
               </p>
             </CardContent>
           </Card>

           <Card>
             <CardHeader className="flex flex-row items-center justify-between pb-2">
               <CardTitle className="text-sm font-medium">Avg. Daily Conversations</CardTitle>
               <TrendingUp className="h-4 w-4 text-muted-foreground" />
             </CardHeader>
             <CardContent>
               <div className="text-2xl font-bold">{metrics.avgConversationsPerDay}</div>
               <p className="text-xs text-muted-foreground">
                 Per day average
               </p>
             </CardContent>
           </Card>
         </div>

         {/* Usage Charts */}
         <UsageCharts data={usageData} loading={loading} />

         {/* Top Tenants */}
         <Card>
           <CardHeader>
             <CardTitle>Top Tenants by Activity</CardTitle>
             <CardDescription>
               Most active hotels in the last {dateRange} days
             </CardDescription>
           </CardHeader>
           <CardContent>
             <TopTenantsChart data={topTenants} loading={loading} />
           </CardContent>
         </Card>
       </div>
     );
   }
   ```

**Entregables:**
- 2 APIs de analytics (usage + top tenants)
- UsageCharts component con 3 gráficas (Line, Area, Bar)
- TopTenantsChart component (Bar horizontal)
- Página `/super-admin/analytics` completa
- Date range selector funcional
- Métricas agregadas en cards

**Criterios de Éxito:**
- ✅ Navegar a `/super-admin/analytics` → página carga
- ✅ Line chart muestra conversaciones por día
- ✅ Area chart muestra usuarios activos
- ✅ Top Tenants bar chart muestra top 10
- ✅ Date range selector actualiza gráficas (7d, 30d, 90d)
- ✅ Metrics cards muestran totales correctos
- ✅ Gráficas responsive en mobile/tablet/desktop
- ✅ Dark mode funciona en gráficas

**Estimado:** 3h

---

**🔍 Verificación Post-Ejecución:**

"¿Consideras satisfactoria FASE 6 COMPLETA?
- APIs de analytics funcionan (usage + top tenants) ✓
- UsageCharts renderiza correctamente (3 gráficas) ✓
- TopTenantsChart muestra top 10 ✓
- Date range selector actualiza datos ✓
- Metrics cards muestran totales correctos ✓
- Responsive en todos los tamaños ✓
- Dark mode funciona ✓"

**Si "Sí":**

Marcar 5 tareas en TODO.md (6.1-6.5), actualizar:
```markdown
**Completed:** 30/71 (42.3%)
- FASE 6: 5/5 tareas ✅ COMPLETADA
```

Informar:
"✅ FASE 6 COMPLETADA

**✨ Logros:**
- Sistema completo de analytics con Recharts
- 3 gráficas de uso (Line, Area, Bar)
- Top 10 tenants por actividad
- Date range selector funcional

**Progreso:** 30/71 (42.3%)
**Siguiente:** FASE 7 - Integrations Monitor (2h)"

🔼 **COPIAR HASTA AQUÍ (Prompt 6.1)**

---

## FASE 7: Integrations Monitor (2h)

### Prompt 7.1: Crear Sistema de Monitoreo de Integraciones

**Agente:** `@agent-ux-interface` + `@agent-backend-developer`

**PREREQUISITO:** FASE 6 completada

**Contexto:**
FASE 7 completa que crea la página de monitoreo de integraciones (MotoPress, Airbnb) con tabla de status, logs de sincronización, y detección de errores.

---

🔽 **COPIAR DESDE AQUÍ (Prompt 7.1 - FASE 7 COMPLETA)**

**📊 Contexto de Progreso:**

**Progreso General:** 30/71 tareas (42.3%)

FASES 1-6: ✅ COMPLETADAS
FASE 7 - Integrations Monitor (0/4) ← ESTAMOS AQUÍ
- [ ] 7.1: Crear API de integrations
- [ ] 7.2: Crear IntegrationsTable
- [ ] 7.3: Crear SyncLogsModal
- [ ] 7.4: Crear página de integrations

**Estado Actual:**
- Dashboard, Tenants, Content, Analytics funcionando ✓
- Listo para página de monitoreo de integraciones

---

**Tareas FASE 7:**

**PARTE A - Integrations API (@agent-backend-developer):**

1. **Crear `/api/super-admin/integrations/route.ts`** (30min):

   ```typescript
   import { NextResponse } from 'next/server';
   import { createClient } from '@/lib/supabase/server';

   export async function GET(request: Request) {
     try {
       const { searchParams } = new URL(request.url);
       const filterType = searchParams.get('type'); // 'motopress' | 'airbnb'
       const filterStatus = searchParams.get('status'); // 'error' | 'synced' | 'never_synced'
       const tenant = searchParams.get('tenant'); // tenant_id

       const supabase = createClient();

       // Query integration_configs con join a sync_history
       let query = supabase
         .from('integration_configs')
         .select(`
           *,
           tenant_registry!inner(
             tenant_id,
             nombre_comercial,
             subdomain
           ),
           sync_history(
             sync_id,
             sync_status,
             sync_started_at,
             sync_ended_at,
             records_synced,
             error_message,
             created_at
           )
         `)
         .order('created_at', { ascending: false });

       // Aplicar filtros
       if (filterType) {
         query = query.eq('provider', filterType);
       }

       if (tenant) {
         query = query.eq('tenant_id', tenant);
       }

       const { data: integrations, error } = await query;

       if (error) throw error;

       // Enriquecer con datos de último sync
       const enrichedData = integrations?.map(integration => {
         const lastSync = integration.sync_history?.[0]; // Más reciente
         const errorCount = integration.sync_history?.filter(
           (sync: any) => sync.sync_status === 'error'
         ).length || 0;

         let status: 'synced' | 'error' | 'never_synced' = 'never_synced';
         if (lastSync) {
           status = lastSync.sync_status === 'completed' ? 'synced' : 'error';
         }

         return {
           integration_id: integration.integration_id,
           tenant_id: integration.tenant_id,
           tenant_name: integration.tenant_registry?.nombre_comercial,
           subdomain: integration.tenant_registry?.subdomain,
           provider: integration.provider,
           status,
           last_sync: lastSync?.created_at || null,
           last_sync_status: lastSync?.sync_status || null,
           records_synced: lastSync?.records_synced || 0,
           error_count: errorCount,
           error_message: lastSync?.error_message || null,
           is_active: integration.is_active,
           sync_frequency_hours: integration.sync_frequency_hours
         };
       });

       // Aplicar filtro de status (después de enriquecer)
       let filteredData = enrichedData;
       if (filterStatus === 'error') {
         filteredData = enrichedData?.filter(i => i.status === 'error');
       } else if (filterStatus === 'synced') {
         filteredData = enrichedData?.filter(i => i.status === 'synced');
       } else if (filterStatus === 'never_synced') {
         filteredData = enrichedData?.filter(i => i.status === 'never_synced');
       }

       return NextResponse.json({
         integrations: filteredData,
         total: filteredData?.length || 0
       });

     } catch (error) {
       console.error('Integrations error:', error);
       return NextResponse.json({ error: 'Failed to fetch integrations' }, { status: 500 });
     }
   }
   ```

**PARTE B - UI Components (@agent-ux-interface):**

2. **Crear `src/components/SuperAdmin/IntegrationsTable.tsx`** (45min):

   Tabla de integraciones con columnas:
   - **Tenant:** Nombre del tenant (link a tenant details)
   - **Integration:** Badge con tipo (MotoPress/Airbnb) + íconos
   - **Status:** Badge de color (synced=green, error=red, never_synced=gray)
   - **Last Sync:** Relative time ("2 hours ago") o "Never"
   - **Records Synced:** Número de registros sincronizados
   - **Errors:** Count de errores (badge rojo si > 0)
   - **Acciones:** Botón "View Logs" (abre SyncLogsModal)

   ```typescript
   interface IntegrationsTableProps {
     integrations: Integration[];
     loading: boolean;
     onViewLogs: (integrationId: string) => void;
   }

   const getStatusBadge = (status: string) => {
     const variants = {
       synced: { variant: 'default', color: 'bg-green-100 text-green-800', label: 'Synced' },
       error: { variant: 'destructive', label: 'Error' },
       never_synced: { variant: 'secondary', label: 'Never Synced' }
     };
     return variants[status] || variants.never_synced;
   };

   const getProviderIcon = (provider: string) => {
     return provider === 'motopress'
       ? <Building className="h-4 w-4" />
       : <Home className="h-4 w-4" />;
   };
   ```

   Features:
   - Filtros: Dropdown para tipo (All, MotoPress, Airbnb)
   - Filtro de status: All, Errors Only, Synced, Never Synced
   - Sort por last_sync (más reciente primero)
   - Highlight row si error_count > 0
   - Skeleton loading state
   - Empty state con mensaje

3. **Crear `src/components/SuperAdmin/SyncLogsModal.tsx`** (30min):

   Modal que muestra historial de sincronizaciones:

   ```typescript
   interface SyncLogsModalProps {
     integrationId: string | null;
     isOpen: boolean;
     onClose: () => void;
   }

   export function SyncLogsModal({ integrationId, isOpen, onClose }: SyncLogsModalProps) {
     const [logs, setLogs] = useState<SyncLog[]>([]);
     const [loading, setLoading] = useState(true);

     useEffect(() => {
       if (integrationId && isOpen) {
         fetchLogs();
       }
     }, [integrationId, isOpen]);

     const fetchLogs = async () => {
       const response = await fetch(`/api/super-admin/integrations/${integrationId}/logs`);
       const data = await response.json();
       setLogs(data.logs);
       setLoading(false);
     };

     const downloadLogs = () => {
       const json = JSON.stringify(logs, null, 2);
       const blob = new Blob([json], { type: 'application/json' });
       const url = URL.createObjectURL(blob);
       const a = document.createElement('a');
       a.href = url;
       a.download = `sync-logs-${integrationId}.json`;
       a.click();
     };

     return (
       <Dialog open={isOpen} onOpenChange={onClose}>
         <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
           <DialogHeader>
             <DialogTitle>Synchronization Logs</DialogTitle>
             <DialogDescription>
               Last 50 synchronization attempts
             </DialogDescription>
           </DialogHeader>

           <div className="space-y-2">
             {logs.map((log) => (
               <Collapsible key={log.sync_id}>
                 <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg border hover:bg-muted/50">
                   <div className="flex items-center gap-4">
                     <Badge variant={log.sync_status === 'completed' ? 'default' : 'destructive'}>
                       {log.sync_status}
                     </Badge>
                     <span className="text-sm">
                       {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                     </span>
                     <span className="text-sm text-muted-foreground">
                       {log.records_synced} records
                     </span>
                   </div>
                   <ChevronDown className="h-4 w-4" />
                 </CollapsibleTrigger>

                 <CollapsibleContent className="p-4 bg-muted/30 rounded-b-lg">
                   <div className="space-y-2 text-sm">
                     <div>
                       <strong>Started:</strong> {new Date(log.sync_started_at).toLocaleString()}
                     </div>
                     <div>
                       <strong>Ended:</strong> {new Date(log.sync_ended_at).toLocaleString()}
                     </div>
                     <div>
                       <strong>Duration:</strong> {calculateDuration(log.sync_started_at, log.sync_ended_at)}
                     </div>
                     {log.error_message && (
                       <div className="mt-2 p-2 bg-red-100 dark:bg-red-900 rounded">
                         <strong>Error:</strong>
                         <pre className="mt-1 text-xs overflow-x-auto">{log.error_message}</pre>
                       </div>
                     )}
                   </div>
                 </CollapsibleContent>
               </Collapsible>
             ))}
           </div>

           <DialogFooter>
             <Button variant="outline" onClick={downloadLogs}>
               <Download className="mr-2 h-4 w-4" />
               Download JSON
             </Button>
             <Button onClick={onClose}>Close</Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
     );
   }
   ```

   Features:
   - Últimos 50 logs ordenados por fecha
   - Collapsible rows para ver detalles
   - Muestra: timestamp, status, records synced, duration
   - Si error: muestra error_message expandido
   - Botón "Download as JSON"
   - Scroll interno si > 50 logs

4. **Crear API de logs individual:**

   `/api/super-admin/integrations/[id]/logs/route.ts` (15min):

   ```typescript
   import { NextResponse } from 'next/server';
   import { createClient } from '@/lib/supabase/server';

   export async function GET(
     request: Request,
     { params }: { params: { id: string } }
   ) {
     try {
       const supabase = createClient();

       const { data: logs, error } = await supabase
         .from('sync_history')
         .select('*')
         .eq('integration_id', params.id)
         .order('created_at', { ascending: false })
         .limit(50);

       if (error) throw error;

       return NextResponse.json({ logs });

     } catch (error) {
       console.error('Sync logs error:', error);
       return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
     }
   }
   ```

5. **Crear `/super-admin/integrations/page.tsx`** (15min):

   Página con:

   ```typescript
   'use client';

   import { useState, useEffect } from 'react';
   import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
   import { IntegrationsTable } from '@/components/SuperAdmin/IntegrationsTable';
   import { SyncLogsModal } from '@/components/SuperAdmin/SyncLogsModal';
   import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
   import { CheckCircle2, AlertCircle, Clock } from 'lucide-react';

   export default function IntegrationsPage() {
     const [integrations, setIntegrations] = useState([]);
     const [loading, setLoading] = useState(true);
     const [filterType, setFilterType] = useState('all');
     const [filterStatus, setFilterStatus] = useState('all');
     const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
     const [modalOpen, setModalOpen] = useState(false);

     const [stats, setStats] = useState({
       totalIntegrations: 0,
       syncedToday: 0,
       errorRate: 0
     });

     useEffect(() => {
       fetchIntegrations();
     }, [filterType, filterStatus]);

     const fetchIntegrations = async () => {
       setLoading(true);
       try {
         const params = new URLSearchParams({
           ...(filterType !== 'all' && { type: filterType }),
           ...(filterStatus !== 'all' && { status: filterStatus })
         });

         const response = await fetch(`/api/super-admin/integrations?${params}`);
         const data = await response.json();

         setIntegrations(data.integrations);

         // Calcular stats
         const total = data.integrations.length;
         const synced = data.integrations.filter(i =>
           i.last_sync && new Date(i.last_sync).toDateString() === new Date().toDateString()
         ).length;
         const errors = data.integrations.filter(i => i.status === 'error').length;

         setStats({
           totalIntegrations: total,
           syncedToday: synced,
           errorRate: total > 0 ? Math.round((errors / total) * 100) : 0
         });

       } catch (error) {
         console.error('Error fetching integrations:', error);
       } finally {
         setLoading(false);
       }
     };

     const handleViewLogs = (integrationId: string) => {
       setSelectedIntegration(integrationId);
       setModalOpen(true);
     };

     return (
       <div className="space-y-6">
         {/* Header */}
         <div>
           <h1 className="text-3xl font-bold">Integrations Monitor</h1>
           <p className="text-muted-foreground mt-1">
             Monitor MotoPress and Airbnb synchronization status
           </p>
         </div>

         {/* Stats Cards */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           <Card>
             <CardHeader className="flex flex-row items-center justify-between pb-2">
               <CardTitle className="text-sm font-medium">Total Integrations</CardTitle>
               <Clock className="h-4 w-4 text-muted-foreground" />
             </CardHeader>
             <CardContent>
               <div className="text-2xl font-bold">{stats.totalIntegrations}</div>
               <p className="text-xs text-muted-foreground">Active connections</p>
             </CardContent>
           </Card>

           <Card>
             <CardHeader className="flex flex-row items-center justify-between pb-2">
               <CardTitle className="text-sm font-medium">Synced Today</CardTitle>
               <CheckCircle2 className="h-4 w-4 text-green-600" />
             </CardHeader>
             <CardContent>
               <div className="text-2xl font-bold">{stats.syncedToday}</div>
               <p className="text-xs text-muted-foreground">Successful syncs</p>
             </CardContent>
           </Card>

           <Card>
             <CardHeader className="flex flex-row items-center justify-between pb-2">
               <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
               <AlertCircle className="h-4 w-4 text-red-600" />
             </CardHeader>
             <CardContent>
               <div className="text-2xl font-bold">{stats.errorRate}%</div>
               <p className="text-xs text-muted-foreground">Failed syncs</p>
             </CardContent>
           </Card>
         </div>

         {/* Filters */}
         <div className="flex gap-4">
           <Select value={filterType} onValueChange={setFilterType}>
             <SelectTrigger className="w-[180px]">
               <SelectValue placeholder="Filter by type" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="all">All Types</SelectItem>
               <SelectItem value="motopress">MotoPress</SelectItem>
               <SelectItem value="airbnb">Airbnb</SelectItem>
             </SelectContent>
           </Select>

           <Select value={filterStatus} onValueChange={setFilterStatus}>
             <SelectTrigger className="w-[180px]">
               <SelectValue placeholder="Filter by status" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="all">All Status</SelectItem>
               <SelectItem value="error">Errors Only</SelectItem>
               <SelectItem value="synced">Synced</SelectItem>
               <SelectItem value="never_synced">Never Synced</SelectItem>
             </SelectContent>
           </Select>
         </div>

         {/* Integrations Table */}
         <Card>
           <CardHeader>
             <CardTitle>Integration Status</CardTitle>
             <CardDescription>
               All MotoPress and Airbnb integrations across tenants
             </CardDescription>
           </CardHeader>
           <CardContent>
             <IntegrationsTable
               integrations={integrations}
               loading={loading}
               onViewLogs={handleViewLogs}
             />
           </CardContent>
         </Card>

         {/* Sync Logs Modal */}
         <SyncLogsModal
           integrationId={selectedIntegration}
           isOpen={modalOpen}
           onClose={() => {
             setModalOpen(false);
             setSelectedIntegration(null);
           }}
         />
       </div>
     );
   }
   ```

**Entregables:**
- API de integrations con filtros
- API de logs por integration
- IntegrationsTable con filtros
- SyncLogsModal con expandable logs
- Página `/super-admin/integrations` completa
- Stats cards (total, synced today, error rate)

**Criterios de Éxito:**
- ✅ Navegar a `/super-admin/integrations` → tabla muestra integraciones
- ✅ Filtrar por tipo (MotoPress/Airbnb) → funciona
- ✅ Filtrar por status (Errors Only) → solo muestra con errores
- ✅ Click "View Logs" → modal se abre con últimos 50 logs
- ✅ Expandir log → muestra detalles + error message si existe
- ✅ Download JSON → descarga logs como archivo
- ✅ Stats cards muestran datos correctos
- ✅ Responsive en mobile/tablet/desktop

**Estimado:** 2h

---

**🔍 Verificación Post-Ejecución:**

"¿Consideras satisfactoria FASE 7 COMPLETA?
- API /api/super-admin/integrations funciona ✓
- IntegrationsTable muestra todas las integraciones ✓
- Filtros funcionan (tipo, status) ✓
- SyncLogsModal se abre y muestra logs ✓
- Logs expandibles con detalles ✓
- Download JSON funciona ✓
- Stats cards correctas ✓"

**Si "Sí":**

Marcar 4 tareas en TODO.md (7.1-7.4), actualizar:
```markdown
**Completed:** 34/71 (47.9%)
- FASE 7: 4/4 tareas ✅ COMPLETADA
```

Informar:
"✅ FASE 7 COMPLETADA

**✨ Logros:**
- Sistema completo de monitoreo de integraciones
- Tabla con filtros por tipo y status
- Modal de logs con historial de 50 syncs
- Download de logs como JSON

**Progreso:** 34/71 (47.9%)
**Siguiente:** FASE 8 - Settings & Dark Mode (3h)"

🔼 **COPIAR HASTA AQUÍ (Prompt 7.1)**

---

**Última actualización:** 2025-11-26
