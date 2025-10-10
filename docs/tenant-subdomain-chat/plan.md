# Multi-Tenant Subdomain Chat - Plan de Implementación

**Proyecto:** Tenant Subdomain Chat
**Fecha Inicio:** October 9, 2025
**Estado:** 📋 Planificación

---

## 🎯 OVERVIEW

### Objetivo Principal

Implementar un sistema de chat multi-tenant donde cada cliente de InnPilot (hoteles, surf schools, agencias de turismo) tiene:

1. **Chat público** en `{tenant}.innpilot.io/chat-mobile-dev` (acceso sin login)
2. **Dashboard admin** en `{tenant}.innpilot.io` (requiere login)
3. **Knowledge base específica** por tenant (embeddings aislados)
4. **Branding lite** (logo + nombre del tenant, diseño InnPilot estándar)

### ¿Por qué?

- **Escalabilidad**: 20+ tenants iniciales (hoteles, tours, agencias)
- **Conocimiento aislado**: Cada tenant solo ve su documentación
- **UX Pública**: Usuarios finales pueden consultar sin fricción (no login)
- **Administración simple**: UI para subir docs, gestionar knowledge base
- **Infraestructura existente**: Aprovecha wildcard DNS + pgvector

### Alcance

**En Scope**:
- ✅ Subdomain detection (`simmerdown.innpilot.io` → tenant "simmerdown")
- ✅ Tenant-specific embeddings (tabla `tenant_knowledge_embeddings`)
- ✅ Chat API filtrado por tenant (solo documentación del tenant)
- ✅ Admin UI para upload de documentación (.md, .pdf, .txt)
- ✅ Public chat UI con branding del tenant (logo, nombre)
- ✅ Multi-tenant testing (2-3 tenants de prueba)

**Out of Scope** (para versión 1):
- ❌ Customización de colores/tipografía por tenant
- ❌ Scraping automático de páginas web
- ❌ Chat analytics/métricas por tenant
- ❌ Multi-idioma
- ❌ Integración con WhatsApp/terceros

---

## 📊 ESTADO ACTUAL

### Sistema Existente

- ✅ **Chat mobile-dev funcional** (`/chat-mobile-dev`)
  - Basado en RAG (Retrieval-Augmented Generation)
  - Usa pgvector para semantic search
  - 4,333 embeddings globales (código de InnPilot)

- ✅ **Multi-tenant architecture**
  - Tabla `tenants` con `tenant_id`
  - RLS policies para data isolation
  - Subdomain support (wildcard DNS configurado)

- ✅ **Authentication**
  - Supabase Auth
  - Tenant-scoped sessions
  - Admin roles

- ✅ **pgvector 0.8.0**
  - HNSW index funcional
  - Search performance < 2s
  - OpenAI embeddings (text-embedding-3-small, 1536 dims)

### Limitaciones Actuales

- ❌ **Chat tiene knowledge base global**: Todos los tenants ven la misma documentación
- ❌ **No subdomain detection**: Chat siempre usa `innpilot.io` (no `{tenant}.innpilot.io`)
- ❌ **No admin UI para docs**: No hay forma de subir documentación personalizada
- ❌ **No branding por tenant**: Chat es genérico InnPilot

---

## 🚀 ESTADO DESEADO

### Nueva Experiencia

#### **Para el Tenant Admin (ej: Simmerdown)**
1. Login en `simmerdown.innpilot.io`
2. Dashboard con sección "Knowledge Base"
3. Upload de archivos (`surf-classes.md`, `equipment-rental.md`, etc.)
4. Sistema procesa automáticamente (chunking + embeddings)
5. Preview del chat con su documentación

#### **Para el Usuario Final (ej: Turista)**
1. Visita `simmerdown.innpilot.io/chat-mobile-dev` (sin login)
2. Ve logo de Simmerdown + nombre del negocio
3. Pregunta: "¿Cuánto cuesta una clase de surf?"
4. Chat responde basado SOLO en docs de Simmerdown
5. No ve información de otros tenants (XYZ, Hotel Boutique, etc.)

### Características Clave

1. **Subdomain Routing**
   - Middleware detecta subdomain (`simmerdown`, `xyz`, etc.)
   - Lookup tenant en DB por subdomain
   - Inject `tenant_id` en toda la app

2. **Tenant-Specific Knowledge Base**
   - Nueva tabla `tenant_knowledge_embeddings`
   - RPC function `search_tenant_embeddings(tenant_id, query_embedding)`
   - RLS policy: `tenant_id = auth.jwt() ->> 'tenant_id'`

3. **Admin Dashboard**
   - File upload (drag & drop)
   - Processing status (chunking, embedding generation)
   - Knowledge base browser (ver docs subidas)
   - Tenant branding config (logo URL, nombre)

4. **Public Chat UI**
   - Muestra logo del tenant (avatar del chat)
   - Header con nombre del negocio
   - Diseño InnPilot estándar (no customizable)
   - Acceso público (no login)

5. **Multi-Tenant Testing**
   - Seed 2-3 tenants de prueba (simmerdown, xyz, hotel-boutique)
   - Upload docs diferentes por tenant
   - Verify isolation (tenant A no ve docs de tenant B)

---

## 📱 TECHNICAL STACK

### Frontend
- **Next.js 14** (App Router)
- **React** (components)
- **Tailwind CSS** (styling)
- **Shadcn/ui** (UI components)

### Backend
- **Next.js API Routes** (`/api/chat`, `/api/admin/upload`)
- **OpenAI API** (embeddings + chat completion)
- **Supabase Client** (database queries)

### Database
- **PostgreSQL 17.4** (Supabase)
- **pgvector 0.8.0** (vector similarity search)
- **RLS Policies** (tenant isolation)

### Infrastructure
- **Subdomain Detection**: Next.js middleware
- **Wildcard DNS**: `*.innpilot.io` → VPS
- **File Storage**: Supabase Storage (opcional) o local processing
- **VPS Deployment**: PM2 + Git

### AI/ML
- **OpenAI text-embedding-3-small** (1536 dims)
- **OpenAI gpt-4o-mini** (chat completion)
- **HNSW Index** (vector search)

---

## 🔧 DESARROLLO - FASES

### FASE 1: Database Schema (2-3h)

**Objetivo:** Crear infraestructura de base de datos para tenant-specific embeddings

**Entregables:**
- Tabla `tenant_knowledge_embeddings` con HNSW index
- RPC function `search_tenant_embeddings(tenant_id, query_embedding, match_threshold, match_count)`
- RLS policy para tenant isolation
- Migration aplicada y validada

**Archivos a crear/modificar:**
- `supabase/migrations/20251009140000_create_tenant_knowledge_embeddings.sql`

**Schema:**
```sql
CREATE TABLE tenant_knowledge_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  chunk_index integer NOT NULL,
  content text NOT NULL,
  embedding vector(1536) NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, file_path, chunk_index)
);

CREATE INDEX tenant_knowledge_vector_idx
ON tenant_knowledge_embeddings
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

CREATE INDEX tenant_knowledge_tenant_idx
ON tenant_knowledge_embeddings(tenant_id);
```

**Testing:**
- Verificar tabla creada con columnas correctas
- Verificar índices (HNSW + tenant_id)
- Insertar embedding de prueba
- Ejecutar RPC function y verificar resultados
- Verificar RLS policy (tenant A no ve embeddings de tenant B)

---

### FASE 2: Subdomain Detection (2h)

**Objetivo:** Implementar middleware para detectar subdomain y cargar tenant context

**Entregables:**
- Middleware Next.js para extraer subdomain
- Function `getTenantBySubdomain(subdomain)`
- Context provider para `tenant_id`
- Testing con subdominios locales

**Archivos a crear/modificar:**
- `src/middleware.ts` (modificar)
- `src/lib/tenant-utils.ts` (crear)
- `src/contexts/TenantContext.tsx` (crear)

**Lógica:**
```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const subdomain = getSubdomain(hostname); // "simmerdown" from "simmerdown.innpilot.io"

  if (subdomain && subdomain !== 'www') {
    // Inject subdomain in headers for server components
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-tenant-subdomain', subdomain);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}
```

**Testing:**
- Local: `simmerdown.localhost:3000` → detecta "simmerdown"
- Verify `getTenantBySubdomain()` returns correct tenant
- Verify context available en components
- Test fallback si subdomain no existe

---

### FASE 3: Chat API Modification (2-3h)

**Objetivo:** Modificar `/api/chat` para filtrar embeddings por tenant

**Entregables:**
- Chat API usa `search_tenant_embeddings()` en lugar de search global
- Tenant context injection en API route
- Error handling para tenant no encontrado
- Response generation con tenant-specific context

**Archivos a crear/modificar:**
- `src/app/api/chat/route.ts` (modificar)
- `src/lib/chat-utils.ts` (refactor para multi-tenant)

**Lógica:**
```typescript
// app/api/chat/route.ts
export async function POST(req: Request) {
  const subdomain = req.headers.get('x-tenant-subdomain');
  const tenant = await getTenantBySubdomain(subdomain);

  if (!tenant) {
    return new Response('Tenant not found', { status: 404 });
  }

  const { messages } = await req.json();
  const lastMessage = messages[messages.length - 1].content;

  // Generate query embedding
  const queryEmbedding = await generateEmbedding(lastMessage);

  // Search ONLY this tenant's embeddings
  const { data: relevantDocs } = await supabase.rpc('search_tenant_embeddings', {
    tenant_id: tenant.id,
    query_embedding: queryEmbedding,
    match_threshold: 0.7,
    match_count: 5
  });

  // Build context from tenant docs
  const context = relevantDocs.map(doc => doc.content).join('\n\n');

  // Generate response with OpenAI
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: `You are a helpful assistant for ${tenant.name}. Use this context: ${context}` },
      ...messages
    ]
  });

  return new Response(response.choices[0].message.content);
}
```

**Testing:**
- Seed 2 tenants con diferentes docs
- Query como tenant A → solo ve docs de A
- Query como tenant B → solo ve docs de B
- Verify no cross-contamination
- Performance < 2s

---

### FASE 4: Admin Dashboard (4-5h)

**Objetivo:** UI para que tenants suban documentación y configuren branding

**Entregables:**
- Admin page en `/{tenant}/admin/knowledge-base`
- File upload component (drag & drop)
- Processing pipeline (chunk → embed → store)
- Knowledge base browser (listar docs)
- Tenant branding config (logo URL, nombre de negocio)

**Archivos a crear/modificar:**
- `src/app/[tenant]/admin/knowledge-base/page.tsx` (crear)
- `src/components/admin/FileUpload.tsx` (crear)
- `src/components/admin/KnowledgeBaseBrowser.tsx` (crear)
- `src/components/admin/TenantBranding.tsx` (crear)
- `src/app/api/admin/upload-docs/route.ts` (crear)
- `src/app/api/admin/process-docs/route.ts` (crear)
- `scripts/process-tenant-docs.ts` (crear)

**UI Features:**
1. **File Upload**
   - Drag & drop o click to select
   - Formatos: `.md`, `.txt`, `.pdf`
   - Max 10MB por archivo
   - Batch upload (hasta 10 archivos)

2. **Processing Status**
   - Queue: "En cola (3 archivos)"
   - Processing: "Procesando surf-classes.md (2/5 chunks)"
   - Complete: "✅ 5 documentos procesados (42 chunks, 42 embeddings)"

3. **Knowledge Base Browser**
   - Tabla: File name | Chunks | Created | Actions
   - Preview de documento (modal)
   - Delete documento (confirm dialog)
   - Re-index documento

4. **Tenant Branding**
   - Logo URL (input + preview)
   - Nombre del negocio (input)
   - Save button
   - Preview del chat con branding

**Processing Pipeline:**
```typescript
// API: /api/admin/upload-docs
1. Receive file upload (multipart/form-data)
2. Validate file type and size
3. Save to temp storage
4. Trigger processing job

// Script: scripts/process-tenant-docs.ts
1. Read file content
2. Chunk content (max 500 tokens per chunk)
3. Generate embeddings (OpenAI API)
4. Insert into tenant_knowledge_embeddings
5. Update processing status
6. Cleanup temp files
```

**Testing:**
- Upload .md file → verify chunks created
- Upload .pdf → verify extraction + chunks
- Upload 5 files batch → verify all processed
- Delete doc → verify embeddings removed
- Update branding → verify changes in chat
- Auth: Solo admin del tenant puede acceder

---

### FASE 5: Public Chat UI (3-4h)

**Objetivo:** Chat público con branding del tenant (logo, nombre)

**Entregables:**
- Chat page en `/{tenant}/chat-mobile-dev`
- Header con logo + nombre del tenant
- Avatar del chat con logo del tenant
- Diseño InnPilot estándar (no customizable)
- Acceso público (no requiere login)

**Archivos a crear/modificar:**
- `src/app/[tenant]/chat-mobile-dev/page.tsx` (crear o modificar)
- `src/components/chat/TenantChatHeader.tsx` (crear)
- `src/components/chat/TenantChatAvatar.tsx` (crear)
- `src/lib/tenant-branding.ts` (crear)

**UI Components:**

1. **TenantChatHeader**
```tsx
<header className="sticky top-0 bg-white border-b">
  <div className="flex items-center gap-3 p-4">
    {tenant.logo_url && (
      <img src={tenant.logo_url} alt={tenant.name} className="w-10 h-10 rounded-full" />
    )}
    <div>
      <h1 className="font-semibold text-lg">{tenant.name}</h1>
      <p className="text-sm text-gray-500">Powered by InnPilot</p>
    </div>
  </div>
</header>
```

2. **TenantChatAvatar**
```tsx
// En cada mensaje del bot
<div className="flex items-start gap-3">
  <img
    src={tenant.logo_url || '/default-avatar.png'}
    alt="Assistant"
    className="w-8 h-8 rounded-full"
  />
  <div className="flex-1">
    {message.content}
  </div>
</div>
```

**Features:**
- ✅ Logo del tenant en header
- ✅ Nombre del tenant en header
- ✅ Avatar con logo en mensajes del bot
- ✅ Diseño mobile-first (iPhone 15, Pixel 8, Galaxy S24)
- ✅ Acceso público (no login gate)
- ✅ Fallback a logo default si tenant no tiene logo

**Testing:**
- Abrir `simmerdown.innpilot.io/chat-mobile-dev` → ver logo de Simmerdown
- Abrir `xyz.innpilot.io/chat-mobile-dev` → ver logo de XYZ
- Tenant sin logo → ver logo default InnPilot
- Mobile responsive (320px, 375px, 414px widths)
- Performance < 2s first load

---

### FASE 6: Deployment + Testing (2-3h)

**Objetivo:** Deploy en VPS, verificar DNS wildcard, testing multi-tenant E2E

**Entregables:**
- Deploy en VPS production
- Verificar wildcard DNS (`*.innpilot.io`)
- Seed 3 tenants de prueba (simmerdown, xyz, hotel-boutique)
- E2E testing multi-tenant
- Documentation final

**Archivos a crear/modificar:**
- `docs/tenant-subdomain-chat/DEPLOYMENT.md` (crear)
- `scripts/seed-test-tenants.ts` (crear)

**Deployment Steps:**
1. Commit all changes
2. Push to `dev` branch
3. SSH to VPS
4. Git pull + build
5. PM2 restart
6. Verify wildcard DNS

**Testing Checklist:**
- [ ] `simmerdown.innpilot.io` → login funciona
- [ ] `simmerdown.innpilot.io/admin/knowledge-base` → upload docs funciona
- [ ] `simmerdown.innpilot.io/chat-mobile-dev` → chat público funciona
- [ ] Chat responde con docs de Simmerdown (no XYZ)
- [ ] `xyz.innpilot.io/chat-mobile-dev` → chat responde con docs de XYZ
- [ ] Tenant isolation: A no ve docs de B
- [ ] Branding: Logo + nombre correcto por tenant
- [ ] Performance: < 2s chat response
- [ ] Mobile: Responsive en iPhone/Pixel/Galaxy

**Documentation:**
- README.md con arquitectura
- Setup guide para nuevos tenants
- API documentation
- Troubleshooting guide

---

## ✅ CRITERIOS DE ÉXITO

### Funcionalidad

- [ ] **Subdomain detection funciona** (simmerdown.innpilot.io → tenant "simmerdown")
- [ ] **Tenant isolation verificado** (tenant A no ve docs de tenant B)
- [ ] **Admin UI funcional** (upload docs, ver knowledge base, config branding)
- [ ] **Public chat funcional** (acceso sin login, responde con tenant docs)
- [ ] **Branding correcto** (logo + nombre del tenant en chat)
- [ ] **Multi-tenant tested** (2-3 tenants funcionando independientemente)

### Performance

- [ ] **Chat response < 2s** (desde query hasta respuesta)
- [ ] **Upload processing < 30s** (por documento de 5 páginas)
- [ ] **Embeddings search < 500ms** (RPC function tenant-filtered)
- [ ] **Page load < 1.5s** (chat public UI)

### Data Integrity

- [ ] **RLS policies enforcement** (tenant A no puede query embeddings de B via SQL)
- [ ] **Unique constraint** (tenant_id + file_path + chunk_index)
- [ ] **Cascade delete** (si tenant se borra, sus embeddings también)
- [ ] **UTF-8 encoding** (docs con caracteres especiales funcionan)

### UX/UI

- [ ] **Mobile responsive** (320px - 414px widths)
- [ ] **Logo preview en admin** (ver logo antes de guardar)
- [ ] **Upload progress indicator** (saber cuándo termina processing)
- [ ] **Error messages claros** ("Tenant not found", "File too large", etc.)
- [ ] **Acceso público sin fricción** (no redirect a login en /chat-mobile-dev)

### Security

- [ ] **Admin routes protegidas** (requieren auth + tenant ownership)
- [ ] **File upload validation** (tipo, tamaño, contenido)
- [ ] **SQL injection prevented** (parameterized queries)
- [ ] **XSS prevented** (sanitize user input)

### Scalability

- [ ] **HNSW index performance** (mantiene < 500ms con 20+ tenants, 1000+ embeddings each)
- [ ] **Connection pooling** (no timeout con múltiples tenants concurrentes)
- [ ] **Batch processing** (upload 10 docs simultáneamente)

---

## 🤖 AGENTES REQUERIDOS

### 1. **@agent-database-agent** (FASE 1)

**Responsabilidad:** Crear schema de base de datos, RPC functions, RLS policies

**Tareas:**
- FASE 1: Crear tabla `tenant_knowledge_embeddings`
- FASE 1: Crear RPC function `search_tenant_embeddings()`
- FASE 1: Implementar RLS policies para tenant isolation
- FASE 1: Crear índices (HNSW + tenant_id)

**Archivos:**
- `supabase/migrations/20251009140000_create_tenant_knowledge_embeddings.sql`

**Testing:**
- MCP: `mcp__supabase__list_tables()` para verificar tabla
- MCP: `mcp__supabase__execute_sql()` para test RPC function
- Script: `npx tsx scripts/test-tenant-embeddings.ts`

---

### 2. **@agent-backend-developer** (FASE 2-3)

**Responsabilidad:** Subdomain detection, tenant context, chat API modification

**Tareas:**
- FASE 2: Implementar middleware para subdomain extraction
- FASE 2: Crear `getTenantBySubdomain()` function
- FASE 2: Setup TenantContext provider
- FASE 3: Modificar `/api/chat` para tenant-filtering
- FASE 3: Refactor chat utils para multi-tenant

**Archivos:**
- `src/middleware.ts`
- `src/lib/tenant-utils.ts`
- `src/contexts/TenantContext.tsx`
- `src/app/api/chat/route.ts`
- `src/lib/chat-utils.ts`

**Testing:**
- Manual: `simmerdown.localhost:3000` → verify tenant detection
- Script: `npx tsx scripts/test-chat-api.ts`
- E2E: Seed 2 tenants, query both, verify isolation

---

### 3. **@agent-ux-interface** (FASE 4-5)

**Responsabilidad:** Admin UI, public chat UI con branding

**Tareas:**
- FASE 4: Crear admin page `/admin/knowledge-base`
- FASE 4: Implementar FileUpload component (drag & drop)
- FASE 4: Crear KnowledgeBaseBrowser component
- FASE 4: Implementar TenantBranding config UI
- FASE 5: Crear public chat page con branding
- FASE 5: Implementar TenantChatHeader component
- FASE 5: Implementar TenantChatAvatar component

**Archivos:**
- `src/app/[tenant]/admin/knowledge-base/page.tsx`
- `src/components/admin/FileUpload.tsx`
- `src/components/admin/KnowledgeBaseBrowser.tsx`
- `src/components/admin/TenantBranding.tsx`
- `src/app/[tenant]/chat-mobile-dev/page.tsx`
- `src/components/chat/TenantChatHeader.tsx`
- `src/components/chat/TenantChatAvatar.tsx`

**Testing:**
- Manual: Upload doc en admin, ver en browser
- Manual: Update branding, ver cambios en chat
- Responsive: Test en iPhone 15, Pixel 8, Galaxy S24
- Accessibility: WCAG 2.1 AA compliance

---

### 4. **@agent-deploy-agent** (FASE 6)

**Responsabilidad:** VPS deployment, DNS verification, E2E testing

**Tareas:**
- FASE 6: Commit changes siguiendo conventional commits
- FASE 6: Deploy en VPS production
- FASE 6: Verify wildcard DNS working
- FASE 6: Seed test tenants (simmerdown, xyz, hotel-boutique)
- FASE 6: Run E2E multi-tenant tests
- FASE 6: Create deployment documentation

**Archivos:**
- `docs/tenant-subdomain-chat/DEPLOYMENT.md`
- `scripts/seed-test-tenants.ts`

**Testing:**
- Production URLs: `simmerdown.innpilot.io`, `xyz.innpilot.io`
- E2E: Upload docs, chat queries, verify isolation
- Performance: Measure chat response times
- Monitoring: Check PM2 logs for errors

---

## 📂 ESTRUCTURA DE ARCHIVOS

```
/Users/oneill/Sites/apps/InnPilot/
├── src/
│   ├── middleware.ts                          # FASE 2: Subdomain detection
│   ├── app/
│   │   ├── [tenant]/
│   │   │   ├── admin/
│   │   │   │   └── knowledge-base/
│   │   │   │       └── page.tsx               # FASE 4: Admin dashboard
│   │   │   └── chat-mobile-dev/
│   │   │       └── page.tsx                   # FASE 5: Public chat
│   │   └── api/
│   │       ├── chat/
│   │       │   └── route.ts                   # FASE 3: Multi-tenant chat API
│   │       └── admin/
│   │           ├── upload-docs/
│   │           │   └── route.ts               # FASE 4: File upload
│   │           └── process-docs/
│   │               └── route.ts               # FASE 4: Doc processing
│   ├── components/
│   │   ├── admin/
│   │   │   ├── FileUpload.tsx                 # FASE 4
│   │   │   ├── KnowledgeBaseBrowser.tsx       # FASE 4
│   │   │   └── TenantBranding.tsx             # FASE 4
│   │   └── chat/
│   │       ├── TenantChatHeader.tsx           # FASE 5
│   │       └── TenantChatAvatar.tsx           # FASE 5
│   ├── lib/
│   │   ├── tenant-utils.ts                    # FASE 2: Tenant helpers
│   │   ├── chat-utils.ts                      # FASE 3: Refactored for multi-tenant
│   │   └── tenant-branding.ts                 # FASE 5: Branding helpers
│   └── contexts/
│       └── TenantContext.tsx                  # FASE 2: Tenant context
├── supabase/
│   └── migrations/
│       └── 20251009140000_create_tenant_knowledge_embeddings.sql  # FASE 1
├── scripts/
│   ├── process-tenant-docs.ts                 # FASE 4: Doc processing pipeline
│   ├── seed-test-tenants.ts                   # FASE 6: Test data
│   └── test-chat-api.ts                       # Testing helper
├── docs/
│   ├── tenant-subdomain-chat/
│   │   ├── plan.md                            # Este archivo
│   │   ├── TODO.md                            # Tareas específicas
│   │   ├── tenant-subdomain-chat-prompt-workflow.md  # Prompts
│   │   ├── fase-1/                            # Docs FASE 1
│   │   ├── fase-2/                            # Docs FASE 2
│   │   ├── fase-3/                            # Docs FASE 3
│   │   ├── fase-4/                            # Docs FASE 4
│   │   ├── fase-5/                            # Docs FASE 5
│   │   └── fase-6/                            # Docs FASE 6
│   └── tenants/                               # Knowledge bases
│       ├── simmerdown/
│       │   ├── surf-classes.md
│       │   └── equipment-rental.md
│       ├── xyz/
│       │   └── rooms.md
│       └── hotel-boutique/
│           └── amenities.md
```

---

## 📝 NOTAS IMPORTANTES

### Consideraciones Técnicas

1. **Subdomain en Localhost**
   - Desarrollo local: Usar `simmerdown.localhost:3000`
   - Agregar al `/etc/hosts` si es necesario
   - Alternativa: Usar headers en Postman/curl para testing

2. **File Processing Performance**
   - Chunking: Max 500 tokens por chunk (aprox 2000 caracteres)
   - OpenAI rate limits: 3,500 requests/min (tier 1)
   - Batch processing: 10 chunks por request (reduce API calls)
   - Estimated cost: $0.0001 per embedding → $0.01 por 100 chunks

3. **HNSW Index Tuning**
   - Parámetros actuales: `m=16`, `ef_construction=64`
   - Con 20 tenants x 50 docs x 5 chunks = 5,000 embeddings
   - Performance estimada: < 500ms (basado en tests con 4,333 embeddings)
   - Re-tune si > 10,000 embeddings totales

4. **RLS Policy Performance**
   - Filtrar por `tenant_id` usando index (no HNSW)
   - Avoid `USING (tenant_id = current_user_tenant())` → use session var
   - Test con EXPLAIN ANALYZE

5. **Branding Assets**
   - Logo: Recomendar 200x200px, max 100KB
   - Formatos: PNG, JPG, SVG
   - Storage: Supabase Storage o URL externa
   - Fallback: Logo InnPilot default

6. **Security Considerations**
   - File upload: Validate MIME type (not just extension)
   - Embeddings: Sanitize content before storing
   - Subdomain: Validate against SQL injection in tenant lookup
   - Admin auth: Verify `tenant_id` ownership before mutations

### Ejemplos de Tenants

**Simmerdown (Surf School)**:
- Subdomain: `simmerdown`
- Logo: Ola + tabla de surf
- Docs: `surf-classes.md`, `equipment-rental.md`, `beach-safety.md`, `schedule.md`
- Use case: Turista pregunta "¿Cuánto cuesta clase privada?" → Responde con precios de Simmerdown

**XYZ Hotel**:
- Subdomain: `xyz`
- Logo: Edificio moderno
- Docs: `rooms.md`, `amenities.md`, `cancellation-policy.md`, `restaurant-menu.md`
- Use case: Cliente pregunta "¿Tienen piscina?" → Responde con amenities de XYZ

**Hotel Boutique La Esperanza**:
- Subdomain: `hotel-boutique`
- Logo: Flor artesanal
- Docs: `romantic-packages.md`, `spa-services.md`, `breakfast-included.md`
- Use case: Pareja pregunta "¿Tienen paquete luna de miel?" → Responde con packages de La Esperanza

### Monitoreo y Mantenimiento

**Métricas a trackear**:
- Tenants activos (con docs subidas)
- Embeddings totales por tenant
- Chat queries por tenant/día
- Response time promedio por tenant
- Upload success rate
- Error rate por endpoint

**Alertas recomendadas**:
- Response time > 3s (degradación)
- Upload processing failed > 10% (bug en pipeline)
- RLS policy violation (security breach)
- Disk space < 20% (embeddings storage)

---

**Última actualización:** October 9, 2025
**Próximo paso:** Actualizar TODO.md con tareas específicas por fase
