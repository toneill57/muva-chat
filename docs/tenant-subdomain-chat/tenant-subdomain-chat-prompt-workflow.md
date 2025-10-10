# PROMPTS WORKFLOW - Multi-Tenant Subdomain Chat

**Proyecto:** Tenant Subdomain Chat
**Archivos de referencia:** `plan.md` (788 líneas) + `TODO.md` (670 líneas)
**Última actualización:** October 10, 2025

---

## 🎯 CONTEXTO GLOBAL

**Usar SIEMPRE al inicio de nuevas conversaciones con agentes:**

```
CONTEXTO DEL PROYECTO: Multi-Tenant Subdomain Chat

Estoy trabajando en implementar un sistema de chat multi-tenant donde cada cliente de InnPilot (hoteles, surf schools, agencias de turismo) tiene su propio chat público con knowledge base aislada.

ARCHIVOS CLAVE:
- docs/tenant-subdomain-chat/plan.md → Plan completo del proyecto (788 líneas)
- docs/tenant-subdomain-chat/TODO.md → 60 tareas organizadas en 6 fases (670 líneas)
- docs/tenant-subdomain-chat/tenant-subdomain-chat-prompt-workflow.md → Este archivo

OBJETIVO:
Chat público en `{tenant}.innpilot.io/chat` donde cada tenant solo ve su documentación, con branding lite (logo + nombre), acceso sin login, y admin UI para gestionar knowledge base.

STACK TÉCNICO:
- Next.js 14 (App Router)
- Supabase PostgreSQL 17.4 + pgvector 0.8.0
- OpenAI embeddings (text-embedding-3-small, 1536 dims)
- OpenAI gpt-4o-mini (chat completion)
- Wildcard DNS: *.innpilot.io
- VPS deployment via PM2 + Git

ESTADO ACTUAL (October 10, 2025 - 5:30 AM):
✅ FASE 1: Database Schema (6/6 tareas) - COMPLETADA
  - Tabla: tenant_knowledge_embeddings con HNSW index
  - RPC: search_tenant_embeddings()
  - RLS policies para tenant isolation
  - Settings fields added (business_name, social_media, SEO metadata)
  - Ver: docs/tenant-subdomain-chat/MIGRATION_REPORT_tenant_knowledge_embeddings.md

✅ FASE 2: Subdomain Detection (5/5 tareas) - COMPLETADA
  - Middleware: src/middleware.ts (subdomain extraction)
  - Utils: src/lib/tenant-utils.ts (getTenantBySubdomain)
  - Context: src/contexts/TenantContext.tsx (React provider)
  - Columna: subdomain en tenant_registry table
  - Ver: docs/tenant-subdomain-chat/PHASE_2_MIDDLEWARE_IMPLEMENTATION.md

✅ FASE 3: Chat API Modification (5/5 tareas) - COMPLETADA
  - Chat API tenant filtering implementado
  - Tenant isolation en API endpoints
  - Testing con 2 tenants verificado

✅ FASE 4D: Admin Dashboard - PARCIALMENTE COMPLETADA (3/6 tareas)
  - ✅ Task 4D.1: Subdomain routing rewrites (next.config.ts)
  - ✅ Task 4D.2: Knowledge base manager page (/admin/knowledge-base)
    - FileUpload component con drag & drop
    - KnowledgeBaseBrowser para listar docs
    - TenantBranding para configurar logo/nombre
  - ✅ Task 4D.6: Settings page (/admin/settings)
    - Business info form + social media + SEO config
  - ⏸️ Task 4D.3: Branding editor page - NOT STARTED
  - ⏸️ Task 4D.4: Content editor page - NOT STARTED
  - ⏸️ Task 4D.5: Analytics dashboard page - NOT STARTED

✅ CRITICAL FIX APPLIED (October 10, 2025):
  - **Issue**: URL duplication in admin sidebar (/admin/admin/knowledge-base)
  - **Root Cause**: Next.js subdomain rewrites transparent to client
  - **Solution**: Removed tenant slug from hrefs (rewrite handles it server-side)
  - **Files Fixed**: AdminSidebar.tsx, AdminBreadcrumbs.tsx, admin layout, admin page
  - **Status**: Verified - All existing admin pages return 200 OK

🔜 PENDIENTE:
- FASE 4D: Complete remaining admin pages (3 tareas) - 4.5h estimado
- FASE 5: Public Chat UI (7 tareas) - 3-4h estimado
- FASE 6: Deployment + Testing (9 tareas) - 2-3h estimado

PROGRESO TOTAL: 20/60 tareas (33.3%)
TIEMPO INVERTIDO: ~8h
TIEMPO RESTANTE: ~13-18h

FASES ARQUITECTURA:
1. ✅ Database Schema (2-3h) → tenant_knowledge_embeddings + RPC
2. ✅ Subdomain Detection (2h) → Middleware + context
3. ✅ Chat API Modification (2-3h) → Filtrado por tenant
4. 🔜 Admin Dashboard (12-16h) → Landing + Branding + Admin UI
5. 🔜 Public Chat UI (3-4h) → Branding del tenant
6. 🔜 Deployment + Testing (2-3h) → VPS + E2E tests

Por favor, confirma que entiendes el contexto antes de continuar.
```

---

## ✅ FASES COMPLETADAS - desde la 1 a la 3, ahora empezaremos con la 4

---

## 📝 FASE 4: Admin Dashboard (PENDIENTE - Parcialmente Completada)

**Objetivo:** Landing pública SEO-optimized + branding system + admin UI para knowledge base management.

**Agente:** @agent-ux-interface + @agent-backend-developer
**Duración estimada:** 11.25-15.25h (restante, 0.75h completada)
**Tareas:** 22 (1 completada via tarea 3.6, 21 pendientes)

**Nota:** La tarea 3.6 (File Upload API) ya fue completada y documentada. Las siguientes tareas asumen que ese endpoint ya existe.

---

### Prompt 4D.3: Branding Editor Page (/admin/branding)

**AGENTE:** @agent-ux-interface

**COPY-PASTE DESDE AQUÍ:**

```
TAREA: Crear página standalone de admin para editar branding del tenant

CONTEXTO:
- Proyecto: Multi-Tenant Subdomain Chat (ver plan.md)
- Ruta: `/admin/branding` (standalone page, NO tab)
- Objetivo: Admin page dedicada para configurar logo + nombre del negocio
- Componentes: Reusa TenantBranding component (ya creado en Prompt 4.6)

PREREQUISITOS:
- ✅ TenantBranding component exists (`src/components/admin/TenantBranding.tsx`)
- ✅ Branding API endpoint exists (`src/app/api/admin/branding/route.ts`)
- ✅ AdminSidebar exists with "Branding" nav item
- ✅ Subdomain rewrites configured (next.config.ts)

ARCHIVOS:
- Crear: `src/app/admin/branding/page.tsx`

ESPECIFICACIONES:

```typescript
// src/app/admin/branding/page.tsx
import { headers } from 'next/headers';
import { getTenantBySubdomain } from '@/lib/tenant-utils';
import { TenantBranding } from '@/components/admin/TenantBranding';
import { redirect } from 'next/navigation';

export default async function BrandingPage() {
  const headersList = headers();
  const subdomain = headersList.get('x-tenant-subdomain');

  if (!subdomain) {
    redirect('/');
  }

  const tenant = await getTenantBySubdomain(subdomain);

  if (!tenant) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Tenant not found. Please check your subdomain configuration.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Branding Settings
        </h1>
        <p className="text-gray-600">
          Customize how your chat appears to visitors with your logo and business name.
        </p>
      </div>

      {/* Info banner */}
      <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded">
        <p className="text-sm">
          <strong>Live Preview:</strong> Changes will be reflected immediately in the chat interface
          at <code className="bg-blue-100 px-2 py-1 rounded">{subdomain}.innpilot.io/chat</code>
        </p>
      </div>

      {/* Branding component */}
      <TenantBranding tenant={tenant} />

      {/* Additional guidelines */}
      <div className="mt-8 border-t pt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Branding Guidelines
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Logo Requirements</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Format: PNG or JPG (PNG recommended for transparency)</li>
              <li>• Size: 200x200px or larger (square format)</li>
              <li>• File size: Max 100KB</li>
              <li>• Hosted publicly (Imgur, Cloudinary, your website)</li>
            </ul>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Best Practices</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Use high-contrast logos for visibility</li>
              <li>• Keep business name short (max 30 characters)</li>
              <li>• Test logo on both light and dark backgrounds</li>
              <li>• Use HTTPS URLs for security</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
```

PAGE STRUCTURE:
1. **Header Section**: Title + description
2. **Info Banner**: Live preview link to chat
3. **TenantBranding Component**: Main editing interface (reused)
4. **Guidelines Section**: Logo requirements + best practices

STYLING:
- Max width: 7xl (1280px) centered
- Padding: p-6 for breathing room
- Grid layout for guidelines (responsive)
- Color scheme: Blue for info, gray for neutral content

TEST:
1. Navigate to `/admin/branding` → Page loads with tenant data
2. Edit logo URL → See preview update in TenantBranding component
3. Edit business name → See preview update
4. Save changes → Verify persisted in DB
5. Visit `{tenant}.innpilot.io/chat` → See updated branding
6. Invalid tenant subdomain → See error message

SIGUIENTE: Prompt 4D.4 para Content Editor Page
```

---

### Prompt 4D.4: Content Editor Page (/admin/content)

**AGENTE:** @agent-backend-developer + @agent-ux-interface

**COPY-PASTE DESDE AQUÍ:**

```
TAREA: Crear página de admin para editar contenido de landing page del tenant

CONTEXTO:
- Proyecto: Multi-Tenant Subdomain Chat (ver plan.md)
- Ruta: `/admin/content` (standalone page)
- Objetivo: Rich text editor para gestionar secciones de landing page
- Sections: Hero, About, Services, Gallery, Contact
- Editor: TipTap o Lexical (elegir TipTap para simplicidad)

PREREQUISITOS:
- ✅ AdminSidebar exists with "Content" nav item
- ✅ Subdomain rewrites configured

ARCHIVOS:
- Crear: `src/app/admin/content/page.tsx`
- Crear: `src/components/admin/ContentEditor.tsx`
- Crear: `src/app/api/admin/content/route.ts` (GET + PUT endpoints)
- Modificar: `supabase/migrations/*.sql` (add landing_page_content JSONB column)

ESPECIFICACIONES:

1. Database migration para landing page content:
```sql
-- supabase/migrations/[timestamp]_add_landing_page_content.sql
ALTER TABLE tenant_registry
ADD COLUMN IF NOT EXISTS landing_page_content JSONB DEFAULT '{
  "hero": {
    "title": "",
    "subtitle": "",
    "cta_text": "Get Started",
    "cta_link": "/chat"
  },
  "about": {
    "title": "About Us",
    "content": ""
  },
  "services": {
    "title": "Our Services",
    "items": []
  },
  "gallery": {
    "title": "Gallery",
    "images": []
  },
  "contact": {
    "title": "Contact Us",
    "email": "",
    "phone": "",
    "address": ""
  }
}'::jsonb;

COMMENT ON COLUMN tenant_registry.landing_page_content IS 'JSONB structure for tenant landing page sections';
```

2. API endpoint para content CRUD:
```typescript
// src/app/api/admin/content/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get('tenant_id');

  if (!tenantId) {
    return NextResponse.json({ error: 'tenant_id required' }, { status: 400 });
  }

  const supabase = createClient();

  const { data, error } = await supabase
    .from('tenant_registry')
    .select('landing_page_content')
    .eq('id', tenantId)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ content: data.landing_page_content || {} });
}

export async function PUT(req: NextRequest) {
  const { tenant_id, content } = await req.json();

  if (!tenant_id || !content) {
    return NextResponse.json({ error: 'tenant_id and content required' }, { status: 400 });
  }

  const supabase = createClient();

  const { error } = await supabase
    .from('tenant_registry')
    .update({ landing_page_content: content })
    .eq('id', tenant_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
```

3. Content editor component (TipTap):
```typescript
// src/components/admin/ContentEditor.tsx
'use client';

import { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bold, Italic, List, ListOrdered } from 'lucide-react';

interface LandingPageContent {
  hero: {
    title: string;
    subtitle: string;
    cta_text: string;
    cta_link: string;
  };
  about: {
    title: string;
    content: string;
  };
  services: {
    title: string;
    items: Array<{ title: string; description: string }>;
  };
  contact: {
    title: string;
    email: string;
    phone: string;
    address: string;
  };
}

export function ContentEditor({ tenantId }: { tenantId: string }) {
  const [content, setContent] = useState<LandingPageContent | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // TipTap editor for About section
  const editor = useEditor({
    extensions: [StarterKit],
    content: content?.about.content || '',
    onUpdate: ({ editor }) => {
      if (content) {
        setContent({
          ...content,
          about: { ...content.about, content: editor.getHTML() }
        });
      }
    }
  });

  useEffect(() => {
    loadContent();
  }, [tenantId]);

  async function loadContent() {
    setLoading(true);
    const response = await fetch(`/api/admin/content?tenant_id=${tenantId}`);
    const data = await response.json();
    setContent(data.content);
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    const response = await fetch('/api/admin/content', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_id: tenantId, content })
    });

    if (response.ok) {
      alert('Content saved successfully!');
    } else {
      alert('Failed to save content');
    }

    setSaving(false);
  }

  if (loading) {
    return <div className="text-center py-8">Loading content...</div>;
  }

  if (!content) {
    return <div className="text-center py-8 text-red-600">Failed to load content</div>;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="hero" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="hero">Hero</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
        </TabsList>

        {/* Hero Section */}
        <TabsContent value="hero" className="space-y-4">
          <div>
            <Label htmlFor="hero-title">Hero Title</Label>
            <Input
              id="hero-title"
              value={content.hero.title}
              onChange={(e) => setContent({
                ...content,
                hero: { ...content.hero, title: e.target.value }
              })}
              placeholder="Welcome to Our Hotel"
            />
          </div>
          <div>
            <Label htmlFor="hero-subtitle">Hero Subtitle</Label>
            <Input
              id="hero-subtitle"
              value={content.hero.subtitle}
              onChange={(e) => setContent({
                ...content,
                hero: { ...content.hero, subtitle: e.target.value }
              })}
              placeholder="Experience luxury and comfort"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cta-text">CTA Button Text</Label>
              <Input
                id="cta-text"
                value={content.hero.cta_text}
                onChange={(e) => setContent({
                  ...content,
                  hero: { ...content.hero, cta_text: e.target.value }
                })}
                placeholder="Get Started"
              />
            </div>
            <div>
              <Label htmlFor="cta-link">CTA Button Link</Label>
              <Input
                id="cta-link"
                value={content.hero.cta_link}
                onChange={(e) => setContent({
                  ...content,
                  hero: { ...content.hero, cta_link: e.target.value }
                })}
                placeholder="/chat"
              />
            </div>
          </div>
        </TabsContent>

        {/* About Section */}
        <TabsContent value="about" className="space-y-4">
          <div>
            <Label htmlFor="about-title">Section Title</Label>
            <Input
              id="about-title"
              value={content.about.title}
              onChange={(e) => setContent({
                ...content,
                about: { ...content.about, title: e.target.value }
              })}
              placeholder="About Us"
            />
          </div>
          <div>
            <Label>Content (Rich Text)</Label>
            <div className="border rounded-lg">
              {/* TipTap Toolbar */}
              <div className="border-b p-2 flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                  className={editor?.isActive('bold') ? 'bg-gray-200' : ''}
                >
                  <Bold className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                  className={editor?.isActive('italic') ? 'bg-gray-200' : ''}
                >
                  <Italic className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor?.chain().focus().toggleBulletList().run()}
                  className={editor?.isActive('bulletList') ? 'bg-gray-200' : ''}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                  className={editor?.isActive('orderedList') ? 'bg-gray-200' : ''}
                >
                  <ListOrdered className="h-4 w-4" />
                </Button>
              </div>
              {/* TipTap Editor */}
              <EditorContent editor={editor} className="prose max-w-none p-4 min-h-[200px]" />
            </div>
          </div>
        </TabsContent>

        {/* Services Section */}
        <TabsContent value="services" className="space-y-4">
          <div>
            <Label htmlFor="services-title">Section Title</Label>
            <Input
              id="services-title"
              value={content.services.title}
              onChange={(e) => setContent({
                ...content,
                services: { ...content.services, title: e.target.value }
              })}
              placeholder="Our Services"
            />
          </div>
          <div className="text-sm text-gray-600">
            <p className="mb-2">Note: Service items editing coming in Phase 2.</p>
            <p>For now, this section can be configured via Settings → SEO metadata.</p>
          </div>
        </TabsContent>

        {/* Contact Section */}
        <TabsContent value="contact" className="space-y-4">
          <div>
            <Label htmlFor="contact-title">Section Title</Label>
            <Input
              id="contact-title"
              value={content.contact.title}
              onChange={(e) => setContent({
                ...content,
                contact: { ...content.contact, title: e.target.value }
              })}
              placeholder="Contact Us"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contact-email">Email</Label>
              <Input
                id="contact-email"
                type="email"
                value={content.contact.email}
                onChange={(e) => setContent({
                  ...content,
                  contact: { ...content.contact, email: e.target.value }
                })}
                placeholder="info@yourhotel.com"
              />
            </div>
            <div>
              <Label htmlFor="contact-phone">Phone</Label>
              <Input
                id="contact-phone"
                value={content.contact.phone}
                onChange={(e) => setContent({
                  ...content,
                  contact: { ...content.contact, phone: e.target.value }
                })}
                placeholder="+1 234 567 8900"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="contact-address">Address</Label>
            <Input
              id="contact-address"
              value={content.contact.address}
              onChange={(e) => setContent({
                ...content,
                contact: { ...content.contact, address: e.target.value }
              })}
              placeholder="123 Main St, City, Country"
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Save button */}
      <div className="flex justify-end pt-4 border-t">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? 'Saving...' : 'Save All Changes'}
        </Button>
      </div>
    </div>
  );
}
```

4. Admin page:
```typescript
// src/app/admin/content/page.tsx
import { headers } from 'next/headers';
import { getTenantBySubdomain } from '@/lib/tenant-utils';
import { ContentEditor } from '@/components/admin/ContentEditor';
import { redirect } from 'next/navigation';

export default async function ContentPage() {
  const headersList = headers();
  const subdomain = headersList.get('x-tenant-subdomain');

  if (!subdomain) {
    redirect('/');
  }

  const tenant = await getTenantBySubdomain(subdomain);

  if (!tenant) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Tenant not found. Please check your subdomain configuration.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Landing Page Content
        </h1>
        <p className="text-gray-600">
          Edit the content that appears on your public landing page at{' '}
          <code className="bg-gray-100 px-2 py-1 rounded text-sm">
            {subdomain}.innpilot.io
          </code>
        </p>
      </div>

      <ContentEditor tenantId={tenant.id} />
    </div>
  );
}
```

DEPENDENCIES:
```bash
npm install @tiptap/react @tiptap/starter-kit
```

TEST:
1. Navigate to `/admin/content` → Page loads with existing content
2. Edit Hero section → Changes reflected in state
3. Use TipTap editor in About → Rich text formatting works
4. Save changes → Verify persisted in DB
5. Refresh page → Content loads correctly
6. Multiple tabs → Switch between sections without losing data

SIGUIENTE: Prompt 4D.5 para Analytics Dashboard Page
```

---

### Prompt 4D.5: Analytics Dashboard Page (/admin/analytics)

**AGENTE:** @agent-ux-interface

**COPY-PASTE DESDE AQUÍ:**

```
TAREA: Crear página de admin con métricas básicas del chat

CONTEXTO:
- Proyecto: Multi-Tenant Subdomain Chat (ver plan.md)
- Ruta: `/admin/analytics` (standalone page)
- Objetivo: Dashboard con métricas de uso del chat (MVP: mock data acceptable)
- Charts: Line chart (conversations over time), Bar chart (top queries)
- Metrics: Total chats, avg response time, engagement score

PREREQUISITOS:
- ✅ AdminSidebar exists with "Analytics" nav item
- ✅ Subdomain rewrites configured

ARCHIVOS:
- Crear: `src/app/admin/analytics/page.tsx`
- Crear: `src/components/admin/AnalyticsCharts.tsx`
- Crear: `src/app/api/admin/analytics/route.ts` (GET endpoint - mock data)

ESPECIFICACIONES:

1. API endpoint con mock data:
```typescript
// src/app/api/admin/analytics/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get('tenant_id');

  if (!tenantId) {
    return NextResponse.json({ error: 'tenant_id required' }, { status: 400 });
  }

  // TODO: Replace with real DB queries in Phase 2
  // For now, return mock data for UI development
  const mockData = {
    summary: {
      total_chats: 1247,
      total_messages: 8934,
      avg_response_time_ms: 1850,
      engagement_score: 87.5 // percentage
    },
    conversations_over_time: [
      { date: '2025-10-01', count: 42 },
      { date: '2025-10-02', count: 38 },
      { date: '2025-10-03', count: 51 },
      { date: '2025-10-04', count: 47 },
      { date: '2025-10-05', count: 55 },
      { date: '2025-10-06', count: 62 },
      { date: '2025-10-07', count: 58 },
      { date: '2025-10-08', count: 64 },
      { date: '2025-10-09', count: 71 },
      { date: '2025-10-10', count: 68 }
    ],
    top_queries: [
      { query: 'What are your room rates?', count: 187 },
      { query: 'Do you offer surfing lessons?', count: 143 },
      { query: 'What time is check-in?', count: 129 },
      { query: 'Is breakfast included?', count: 98 },
      { query: 'Can I book for next week?', count: 76 }
    ]
  };

  return NextResponse.json(mockData);
}
```

2. Charts component (using recharts):
```typescript
// src/components/admin/AnalyticsCharts.tsx
'use client';

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AnalyticsData {
  summary: {
    total_chats: number;
    total_messages: number;
    avg_response_time_ms: number;
    engagement_score: number;
  };
  conversations_over_time: Array<{ date: string; count: number }>;
  top_queries: Array<{ query: string; count: number }>;
}

export function AnalyticsCharts({ data }: { data: AnalyticsData }) {
  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Chats</CardDescription>
            <CardTitle className="text-3xl">{data.summary.total_chats.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">Since launch</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Messages</CardDescription>
            <CardTitle className="text-3xl">{data.summary.total_messages.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">All conversations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Response Time</CardDescription>
            <CardTitle className="text-3xl">{(data.summary.avg_response_time_ms / 1000).toFixed(2)}s</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">Per message</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Engagement Score</CardDescription>
            <CardTitle className="text-3xl">{data.summary.engagement_score}%</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">User satisfaction</p>
          </CardContent>
        </Card>
      </div>

      {/* Conversations over time (Line chart) */}
      <Card>
        <CardHeader>
          <CardTitle>Conversations Over Time</CardTitle>
          <CardDescription>Daily chat volume for the last 10 days</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.conversations_over_time}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return `${date.getMonth() + 1}/${date.getDate()}`;
                }}
              />
              <YAxis />
              <Tooltip
                labelFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString();
                }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top queries (Bar chart) */}
      <Card>
        <CardHeader>
          <CardTitle>Top 5 User Queries</CardTitle>
          <CardDescription>Most frequently asked questions</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.top_queries} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis
                type="category"
                dataKey="query"
                width={200}
                tick={{ fontSize: 12 }}
              />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
```

3. Admin page:
```typescript
// src/app/admin/analytics/page.tsx
import { headers } from 'next/headers';
import { getTenantBySubdomain } from '@/lib/tenant-utils';
import { AnalyticsCharts } from '@/components/admin/AnalyticsCharts';
import { redirect } from 'next/navigation';

async function getAnalyticsData(tenantId: string) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/admin/analytics?tenant_id=${tenantId}`,
    { cache: 'no-store' }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch analytics data');
  }

  return response.json();
}

export default async function AnalyticsPage() {
  const headersList = headers();
  const subdomain = headersList.get('x-tenant-subdomain');

  if (!subdomain) {
    redirect('/');
  }

  const tenant = await getTenantBySubdomain(subdomain);

  if (!tenant) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Tenant not found. Please check your subdomain configuration.
        </div>
      </div>
    );
  }

  const analyticsData = await getAnalyticsData(tenant.id);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Analytics Dashboard
        </h1>
        <p className="text-gray-600">
          Monitor chat performance and user engagement metrics
        </p>
      </div>

      {/* Mock data notice */}
      <div className="mb-6 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
        <p className="text-sm">
          <strong>Note:</strong> Currently showing mock data for UI development.
          Real analytics will be integrated in Phase 2 with conversation tracking.
        </p>
      </div>

      <AnalyticsCharts data={analyticsData} />

      {/* Future enhancements section */}
      <div className="mt-8 border-t pt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Coming Soon
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Real-time Updates</h3>
            <p className="text-sm text-gray-600">
              Live dashboard with WebSocket updates for instant metrics
            </p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Custom Date Ranges</h3>
            <p className="text-sm text-gray-600">
              Filter analytics by custom date ranges (last 7/30/90 days)
            </p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Export Reports</h3>
            <p className="text-sm text-gray-600">
              Download CSV/PDF reports of analytics data
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

DEPENDENCIES:
```bash
npm install recharts
```

STYLING:
- Responsive grid for summary cards (1 col mobile, 4 cols desktop)
- Charts with consistent blue color (#3b82f6)
- Card components for visual hierarchy
- Yellow notice banner for mock data disclaimer

TEST:
1. Navigate to `/admin/analytics` → Page loads with mock data
2. Summary cards → Display correct formatted numbers
3. Line chart → Shows 10 days of conversation data
4. Bar chart → Shows top 5 queries (horizontal bars)
5. Responsive design → Charts adapt to mobile/desktop
6. Hover tooltips → Show detailed data on hover

SIGUIENTE: FASE 5 - Public Chat UI (Prompt 5.1)
```

---

### Prompt 4.4: Document processing script

**AGENTE:** @agent-backend-developer

**COPY-PASTE DESDE AQUÍ:**

```
TAREA: Crear script para procesar archivos subidos (chunking + embeddings)

CONTEXTO:
- Proyecto: Multi-Tenant Subdomain Chat (ver plan.md)
- Input: Archivos en `data/temp/{tenant_id}/`
- Output: Chunks + embeddings en `tenant_knowledge_embeddings` table
- Flow: Read file → Chunk (max 500 tokens) → Generate embeddings → Store in DB

PREREQUISITOS:
- ✅ File upload API exists (`src/app/api/admin/upload-docs/route.ts`)
- ✅ Files saved to `data/temp/{tenant_id}/{filename}`
- ✅ Table `tenant_knowledge_embeddings` exists

ARCHIVOS:
- Crear: `scripts/process-tenant-docs.ts`

ESPECIFICACIONES:

```typescript
// scripts/process-tenant-docs.ts
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { createClient } from '@/lib/supabase/server';
import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface ChunkResult {
  content: string;
  chunkIndex: number;
}

/**
 * Split text into chunks (max 500 tokens ≈ 2000 chars)
 */
function chunkText(text: string, maxChars: number = 2000): ChunkResult[] {
  const chunks: ChunkResult[] = [];
  const paragraphs = text.split(/\n\n+/);

  let currentChunk = '';
  let chunkIndex = 0;

  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length > maxChars) {
      if (currentChunk.length > 0) {
        chunks.push({ content: currentChunk.trim(), chunkIndex });
        chunkIndex++;
      }
      currentChunk = paragraph;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push({ content: currentChunk.trim(), chunkIndex });
  }

  return chunks;
}

/**
 * Generate embedding for text via OpenAI
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
    dimensions: 1536
  });

  return response.data[0].embedding;
}

/**
 * Process all files for a tenant
 */
async function processTenantDocs(tenantId: string) {
  const tempDir = join(process.cwd(), 'data', 'temp', tenantId);
  const supabase = createClient();

  console.log(`📂 Processing documents for tenant: ${tenantId}\n`);

  // Read all files in temp directory
  const files = await readdir(tempDir);
  const docFiles = files.filter(f => f.endsWith('.md') || f.endsWith('.txt'));

  console.log(`Found ${docFiles.length} document(s)\n`);

  for (const filename of docFiles) {
    console.log(`📄 Processing: ${filename}`);

    const filePath = join(tempDir, filename);
    const content = await readFile(filePath, 'utf-8');

    // Chunk content
    const chunks = chunkText(content);
    console.log(`  → Split into ${chunks.length} chunk(s)`);

    // Generate embeddings and insert
    for (const chunk of chunks) {
      console.log(`  → Generating embedding for chunk ${chunk.chunkIndex + 1}/${chunks.length}`);

      const embedding = await generateEmbedding(chunk.content);

      const { error } = await supabase.from('tenant_knowledge_embeddings').insert({
        tenant_id: tenantId,
        file_path: filename,
        chunk_index: chunk.chunkIndex,
        content: chunk.content,
        embedding: embedding,
        metadata: {
          originalLength: content.length,
          chunkLength: chunk.content.length,
          processedAt: new Date().toISOString()
        }
      });

      if (error) {
        console.error(`  ❌ Error inserting chunk ${chunk.chunkIndex}:`, error);
      } else {
        console.log(`  ✅ Chunk ${chunk.chunkIndex + 1} stored`);
      }
    }

    console.log(`✅ Completed: ${filename}\n`);
  }

  console.log(`🎉 All documents processed for tenant ${tenantId}`);
}

// CLI usage
const tenantId = process.argv[2];

if (!tenantId) {
  console.error('Usage: npx tsx scripts/process-tenant-docs.ts <tenant_id>');
  process.exit(1);
}

processTenantDocs(tenantId);
```

USAGE:
```bash
# Upload file first
curl -X POST http://localhost:3000/api/admin/upload-docs \
  -F "file=@docs/surf-classes.md" \
  -F "tenant_id=uuid-tenant-a"

# Process uploaded file
set -a && source .env.local && set +a && npx tsx scripts/process-tenant-docs.ts uuid-tenant-a
```

Expected output:
```
📂 Processing documents for tenant: uuid-tenant-a

Found 1 document(s)

📄 Processing: surf-classes.md
  → Split into 3 chunk(s)
  → Generating embedding for chunk 1/3
  ✅ Chunk 1 stored
  → Generating embedding for chunk 2/3
  ✅ Chunk 2 stored
  → Generating embedding for chunk 3/3
  ✅ Chunk 3 stored
✅ Completed: surf-classes.md

🎉 All documents processed for tenant uuid-tenant-a
```

TEST:
1. Upload test.md → Run script → Verify embeddings in DB
2. Upload 5 files → Run script → Verify all processed
3. Upload large file (10MB) → Verify chunking works
4. Measure cost: ~$0.0001 per embedding → $0.01 per 100 chunks

SIGUIENTE: Prompt 4.5 para KnowledgeBaseBrowser component
```

---

### Prompt 4.5: KnowledgeBaseBrowser component

**AGENTE:** @agent-ux-interface

**COPY-PASTE DESDE AQUÍ:**

```
TAREA: Crear component para listar/preview/delete documentos

CONTEXTO:
- Proyecto: Multi-Tenant Subdomain Chat (ver plan.md)
- Usage: Admin page tab "Browse Knowledge Base"
- Features: Table view, chunk count, preview modal, delete action

ARCHIVOS:
- Crear: `src/components/admin/KnowledgeBaseBrowser.tsx`
- Crear: `src/app/api/admin/knowledge-base/route.ts` (GET endpoint)

ESPECIFICACIONES:

1. API endpoint para listar documentos:
```typescript
// src/app/api/admin/knowledge-base/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get('tenant_id');

  if (!tenantId) {
    return NextResponse.json({ error: 'tenant_id required' }, { status: 400 });
  }

  const supabase = createClient();

  // Aggregate chunks per file
  const { data, error } = await supabase
    .from('tenant_knowledge_embeddings')
    .select('file_path, chunk_index, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Group by file_path
  const fileMap = new Map();

  data.forEach(row => {
    if (!fileMap.has(row.file_path)) {
      fileMap.set(row.file_path, {
        file_path: row.file_path,
        chunks: 1,
        created_at: row.created_at
      });
    } else {
      fileMap.get(row.file_path).chunks++;
    }
  });

  const files = Array.from(fileMap.values());

  return NextResponse.json({ files });
}

export async function DELETE(req: NextRequest) {
  const { tenant_id, file_path } = await req.json();

  if (!tenant_id || !file_path) {
    return NextResponse.json({ error: 'tenant_id and file_path required' }, { status: 400 });
  }

  const supabase = createClient();

  const { error } = await supabase
    .from('tenant_knowledge_embeddings')
    .delete()
    .eq('tenant_id', tenant_id)
    .eq('file_path', file_path);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
```

2. React component:
```typescript
// src/components/admin/KnowledgeBaseBrowser.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trash2, Eye } from 'lucide-react';

interface KnowledgeFile {
  file_path: string;
  chunks: number;
  created_at: string;
}

export function KnowledgeBaseBrowser({ tenantId }: { tenantId: string }) {
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFiles();
  }, [tenantId]);

  async function loadFiles() {
    setLoading(true);

    const response = await fetch(`/api/admin/knowledge-base?tenant_id=${tenantId}`);
    const data = await response.json();

    setFiles(data.files || []);
    setLoading(false);
  }

  async function handleDelete(filePath: string) {
    if (!confirm(`Delete ${filePath}? This will remove all ${files.find(f => f.file_path === filePath)?.chunks} chunk(s).`)) {
      return;
    }

    const response = await fetch('/api/admin/knowledge-base', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_id: tenantId, file_path: filePath })
    });

    if (response.ok) {
      alert('File deleted successfully');
      loadFiles();
    } else {
      alert('Failed to delete file');
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg mb-2">No documents uploaded yet</p>
        <p className="text-sm">Go to "Upload Documents" tab to add your first knowledge base file.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Knowledge Base Files</h3>
        <p className="text-sm text-gray-600">
          {files.length} file(s), {files.reduce((sum, f) => sum + f.chunks, 0)} total chunk(s)
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>File Name</TableHead>
            <TableHead>Chunks</TableHead>
            <TableHead>Uploaded</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {files.map((file) => (
            <TableRow key={file.file_path}>
              <TableCell className="font-medium">{file.file_path}</TableCell>
              <TableCell>{file.chunks}</TableCell>
              <TableCell>{new Date(file.created_at).toLocaleDateString()}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" title="Preview">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(file.file_path)}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

TEST:
1. Upload docs → Refresh → See files in table
2. Delete doc → Confirm → File removed, table updates
3. No docs → See empty state message
4. Multiple docs → See correct chunk counts

SIGUIENTE: Prompt 4.6 para TenantBranding component
```

---

### Prompt 4.6: TenantBranding component

**AGENTE:** @agent-ux-interface

**COPY-PASTE DESDE AQUÍ:**

```
TAREA: Crear component para configurar branding del tenant

CONTEXTO:
- Proyecto: Multi-Tenant Subdomain Chat (ver plan.md)
- Usage: Admin page tab "Branding"
- Features: Logo URL input, business name input, preview, save to DB

ARCHIVOS:
- Crear: `src/components/admin/TenantBranding.tsx`
- Crear: `src/app/api/admin/branding/route.ts` (PUT endpoint)

ESPECIFICACIONES:

1. API endpoint:
```typescript
// src/app/api/admin/branding/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PUT(req: NextRequest) {
  const { tenant_id, logo_url, business_name } = await req.json();

  if (!tenant_id) {
    return NextResponse.json({ error: 'tenant_id required' }, { status: 400 });
  }

  const supabase = createClient();

  const updateData: any = {};
  if (logo_url !== undefined) updateData.logo_url = logo_url;
  if (business_name !== undefined) updateData.business_name = business_name;

  const { error } = await supabase
    .from('tenant_registry')
    .update(updateData)
    .eq('id', tenant_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
```

2. React component:
```typescript
// src/components/admin/TenantBranding.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Tenant {
  id: string;
  name: string;
  logo_url: string | null;
  business_name: string | null;
}

export function TenantBranding({ tenant }: { tenant: Tenant }) {
  const [logoUrl, setLogoUrl] = useState(tenant.logo_url || '');
  const [businessName, setBusinessName] = useState(tenant.business_name || tenant.name);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);

    const response = await fetch('/api/admin/branding', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: tenant.id,
        logo_url: logoUrl,
        business_name: businessName
      })
    });

    if (response.ok) {
      alert('Branding saved successfully!');
    } else {
      alert('Failed to save branding');
    }

    setSaving(false);
  }

  return (
    <div className="grid grid-cols-2 gap-6">
      <div className="space-y-6">
        <div>
          <Label htmlFor="business-name">Business Name</Label>
          <Input
            id="business-name"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Simmerdown Surf School"
          />
          <p className="text-sm text-gray-500 mt-1">
            This name appears in the chat header and messages
          </p>
        </div>

        <div>
          <Label htmlFor="logo-url">Logo URL</Label>
          <Input
            id="logo-url"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://example.com/logo.png"
          />
          <p className="text-sm text-gray-500 mt-1">
            Recommended: 200x200px, PNG or JPG, max 100KB
          </p>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? 'Saving...' : 'Save Branding'}
        </Button>
      </div>

      <div>
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>How your chat will look</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-4 bg-gray-50">
              {/* Chat header preview */}
              <div className="flex items-center gap-3 pb-4 border-b">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Logo"
                    className="w-10 h-10 rounded-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = '/default-avatar.png';
                    }}
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-semibold">
                    {businessName.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="font-semibold">{businessName}</p>
                  <p className="text-xs text-gray-500">Powered by InnPilot</p>
                </div>
              </div>

              {/* Bot message preview */}
              <div className="mt-4 flex items-start gap-3">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Bot"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm">
                    AI
                  </div>
                )}
                <div className="bg-white rounded-lg p-3 text-sm">
                  Hi! I'm here to help you with any questions about {businessName}.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

TEST:
1. Change business name → See preview update
2. Add logo URL → See logo in preview
3. Invalid logo URL → Fallback to initials
4. Save → Verify updated in DB
5. Refresh page → Verify changes persisted

SIGUIENTE: FASE 5 - Public Chat UI
```

---

## 📝 FASE 5: Public Chat UI (PENDIENTE)

**Objetivo:** Chat público con branding del tenant (logo + nombre) en ruta `/chat`.

**Agente:** @agent-ux-interface
**Duración estimada:** 3-4h
**Tareas:** 7

**Nota importante:** La ruta `/chat-mobile-dev` existente NO se modifica (es para testing). Esta fase crea una NUEVA ruta `/chat` con multi-tenant system.

---

### Prompt 5.1: Create tenant chat page (/chat)

**COPY-PASTE DESDE AQUÍ:**

```

**Nota importante:** La ruta `/chat-mobile-dev` existente NO se modifica (es para testing). Esta fase crea una NUEVA ruta `/chat` con multi-tenant system.


TAREA: Implementar NUEVA ruta pública de chat con tenant branding

CONTEXTO:
- Proyecto: Multi-Tenant Subdomain Chat (ver plan.md líneas 388-405)
- Ruta: `src/app/(public-tenant)/chat/page.tsx` (NUEVA, usar Route Group)
- Objetivo: Chat público accesible en `{tenant}.innpilot.io/chat`
- ⚠️ NO modificar `/chat-mobile-dev` existente (solo para testing)

PREREQUISITOS:
- ✅ TenantContext exists (`src/contexts/TenantContext.tsx`)
- ✅ Chat API modificada para tenant filtering (FASE 3)
- ✅ Branding data en tenant_registry (logo_url, business_name)

ARCHIVOS:
- Crear: `src/app/(public-tenant)/chat/page.tsx`
- Crear: `src/app/(public-tenant)/chat/layout.tsx`
- Crear: `src/app/(public-tenant)/layout.tsx` (si no existe)

ESPECIFICACIONES:

```typescript
// src/app/(public-tenant)/layout.tsx
import { headers } from 'next/headers';
import { getTenantBySubdomain } from '@/lib/tenant-utils';
import { TenantProvider } from '@/contexts/TenantContext';

export default async function PublicTenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = headers();
  const subdomain = headersList.get('x-tenant-subdomain');
  const tenant = await getTenantBySubdomain(subdomain);

  if (!tenant) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Tenant Not Found</h1>
          <p className="text-gray-600">
            Please verify your URL and try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <TenantProvider tenant={tenant}>
      {children}
    </TenantProvider>
  );
}
```

```typescript
// src/app/(public-tenant)/chat/layout.tsx
export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      {children}
    </div>
  );
}
```

```typescript
// src/app/(public-tenant)/chat/page.tsx
'use client';

import { useState } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { TenantChatHeader } from '@/components/chat/TenantChatHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function TenantChatPage() {
  const { tenant } = useTenant();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage]
        })
      });

      const data = await response.json();

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.message || data.error || 'Sorry, something went wrong.'
      }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <TenantChatHeader tenant={tenant} />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-12">
            <p className="text-lg mb-2">
              Hi! I'm here to help with {tenant?.business_name || tenant?.name}.
            </p>
            <p className="text-sm">Ask me anything!</p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                msg.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3 text-gray-500">
              Typing...
            </div>
          </div>
        )}
      </div>

      <div className="border-t p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={loading}
          />
          <Button type="submit" disabled={loading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </>
  );
}
```

TEST:
1. Visit `simmerdown.localhost:3000/chat` → Chat loads with tenant branding
2. Send message → Receives response
3. Verify header shows tenant logo + name
4. Verify `/chat-mobile-dev` still works (no breaking changes)

SIGUIENTE: Prompt 5.2 para TenantChatHeader component
```

---

### Prompt 5.2: Create TenantChatHeader component

**COPY-PASTE DESDE AQUÍ:**

```
TAREA: Implementar header con tenant logo y nombre

CONTEXTO:
- Proyecto: Multi-Tenant Subdomain Chat (ver plan.md líneas 408-421)
- Component: Header sticky en top del chat
- Display: Logo + nombre del negocio + "Powered by InnPilot"

ARCHIVOS:
- Crear: `src/components/chat/TenantChatHeader.tsx`

ESPECIFICACIONES:

```typescript
// src/components/chat/TenantChatHeader.tsx
interface Tenant {
  id: string;
  name: string;
  business_name: string | null;
  logo_url: string | null;
  subdomain: string;
}

interface TenantChatHeaderProps {
  tenant: Tenant | null;
}

export function TenantChatHeader({ tenant }: TenantChatHeaderProps) {
  if (!tenant) {
    return (
      <header className="sticky top-0 bg-white border-b p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-300" />
          <div>
            <h1 className="font-semibold text-lg">Chat</h1>
            <p className="text-sm text-gray-500">Powered by InnPilot</p>
          </div>
        </div>
      </header>
    );
  }

  const displayName = tenant.business_name || tenant.name;

  return (
    <header className="sticky top-0 bg-white border-b p-4 shadow-sm z-10">
      <div className="max-w-4xl mx-auto flex items-center gap-3">
        {tenant.logo_url ? (
          <img
            src={tenant.logo_url}
            alt={`${displayName} logo`}
            className="w-10 h-10 rounded-full object-cover"
            onError={(e) => {
              // Fallback to initials if image fails to load
              e.currentTarget.style.display = 'none';
              const fallback = e.currentTarget.nextElementSibling as HTMLElement;
              if (fallback) fallback.style.display = 'flex';
            }}
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-lg">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Hidden fallback for image load errors */}
        {tenant.logo_url && (
          <div
            className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 items-center justify-center text-white font-semibold text-lg"
            style={{ display: 'none' }}
          >
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="flex-1">
          <h1 className="font-semibold text-lg leading-tight">{displayName}</h1>
          <p className="text-sm text-gray-500">Powered by InnPilot</p>
        </div>
      </div>
    </header>
  );
}
```

STYLING NOTES:
- Sticky header (stays at top when scrolling)
- Shadow for depth
- Logo: 40x40px rounded circle
- Fallback: Gradient circle con initial
- Mobile-first responsive

TEST:
1. Tenant with logo → Shows logo in header
2. Tenant without logo → Shows initials in gradient circle
3. Invalid logo URL → Fallback to initials
4. Long business name → Truncates elegantly
5. Scroll chat → Header stays at top

SIGUIENTE: Prompt 5.3 para TenantChatAvatar component (bot messages)
```

---

### Prompt 5.3: Create TenantChatAvatar component

**COPY-PASTE DESDE AQUÍ:**

```
TAREA: Implementar avatar del bot con logo del tenant

CONTEXTO:
- Proyecto: Multi-Tenant Subdomain Chat (ver plan.md líneas 423-437)
- Component: Avatar pequeño que aparece en mensajes del bot
- Display: Logo del tenant o fallback a icono AI

ARCHIVOS:
- Crear: `src/components/chat/TenantChatAvatar.tsx`

ESPECIFICACIONES:

```typescript
// src/components/chat/TenantChatAvatar.tsx
interface Tenant {
  id: string;
  name: string;
  business_name: string | null;
  logo_url: string | null;
}

interface TenantChatAvatarProps {
  tenant: Tenant | null;
  size?: 'sm' | 'md' | 'lg';
}

export function TenantChatAvatar({ tenant, size = 'sm' }: TenantChatAvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg'
  };

  const displayName = tenant?.business_name || tenant?.name || 'AI';

  if (tenant?.logo_url) {
    return (
      <div className="relative">
        <img
          src={tenant.logo_url}
          alt={`${displayName} assistant`}
          className={`${sizeClasses[size]} rounded-full object-cover`}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
            if (fallback) fallback.style.display = 'flex';
          }}
        />
        {/* Hidden fallback */}
        <div
          className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-blue-500 to-blue-600 items-center justify-center text-white font-semibold`}
          style={{ display: 'none' }}
        >
          {displayName.charAt(0).toUpperCase()}
        </div>
      </div>
    );
  }

  return (
    <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold`}>
      {displayName.charAt(0).toUpperCase()}
    </div>
  );
}
```

USAGE in chat page:
```typescript
// src/app/(public-tenant)/chat/page.tsx (modify message rendering)
{messages.map((msg, idx) => (
  <div
    key={idx}
    className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
  >
    {msg.role === 'assistant' && <TenantChatAvatar tenant={tenant} />}

    <div
      className={`max-w-[80%] rounded-lg p-3 ${
        msg.role === 'user'
          ? 'bg-blue-500 text-white'
          : 'bg-gray-100 text-gray-900'
      }`}
    >
      {msg.content}
    </div>
  </div>
))}
```

TEST:
1. Bot message → Shows tenant logo/initial
2. User message → No avatar (right-aligned)
3. Invalid logo → Fallback to initial
4. Different sizes (sm/md/lg) → Correct sizing

SIGUIENTE: Prompt 5.4 para tenant branding utilities
```

---

## 📝 FASE 6: Deployment + Testing (PENDIENTE)

**Objetivo:** Deploy en VPS, wildcard DNS verification, E2E testing multi-tenant.

**Agente:** @agent-deploy-agent
**Duración estimada:** 2-3h
**Tareas:** 9

---

### Prompts 6.1-6.9: Deployment workflow

**Nota:** Por brevedad, estos prompts están resumidos. Consultar `plan.md` líneas 455-495 para detalles completos.

**6.1:** Create deployment documentation → `docs/tenant-subdomain-chat/DEPLOYMENT.md`
**6.2:** Seed script for test tenants → `scripts/seed-test-tenants.ts` (simmerdown, xyz, hotel-boutique)
**6.3:** Commit changes → Conventional commits format
**6.4:** Deploy to VPS → PM2 restart, build verification
**6.5:** Verify wildcard DNS → `dig simmerdown.innpilot.io`, `nslookup xyz.innpilot.io`
**6.6:** E2E multi-tenant tests → 3 tenants, upload docs, chat queries, verify isolation
**6.7:** Performance testing → Chat response < 2s, upload processing < 30s
**6.8:** Security audit → RLS policies, auth guards, tenant isolation
**6.9:** New tenant onboarding guide → `docs/tenant-subdomain-chat/NEW_TENANT_GUIDE.md`

---

## 📋 DOCUMENTACIÓN FINAL

### Prompt: Documentar FASE completada

**Usar DESPUÉS de completar cada fase:**

```
He completado FASE {N} del proyecto Multi-Tenant Subdomain Chat. Necesito:

1. Crear documentación en docs/tenant-subdomain-chat/
   - FASE_{N}_IMPLEMENTATION.md (qué se implementó)
   - FASE_{N}_CHANGES.md (archivos creados/modificados)
   - FASE_{N}_TESTS.md (tests ejecutados y resultados)
   - FASE_{N}_ISSUES.md (problemas encontrados, si los hay)

2. Actualizar TODO.md:
   - Marcar con [x] SOLO las tareas que pasaron tests
   - Dejar [ ] si tests fallaron o no se ejecutaron
   - Agregar notas en tareas con issues pendientes
   - Actualizar métricas de progreso (completadas/total, tiempo invertido)

3. Mostrar resumen de progreso:
   - Tareas completadas en esta fase
   - Progreso total del proyecto (X/60 tareas, Y%)
   - Tiempo real vs estimado

4. Siguiente paso: ¿Continuar con FASE {N+1} o corregir issues?
```

**Ejemplo de uso:**

```
He completado FASE 3 del proyecto Multi-Tenant Subdomain Chat. Necesito:

[resto del prompt igual]
```

---

## 🎯 PROGRESO ACTUAL

**Última actualización:** October 10, 2025

**Completadas:**
- ✅ FASE 1: Database Schema (6/6 tareas) - 2.5h
- ✅ FASE 2: Subdomain Detection (5/5 tareas) - 1.75h
- ✅ FASE 3: Chat API Modification (5/5 tareas) - 2.5h
- ✅ FASE 4D: Admin Dashboard (3/6 tareas parcial) - 1.25h
  - Task 4D.1: Subdomain routing rewrites
  - Task 4D.2: Knowledge base manager page
  - Task 4D.6: Settings page
  - **Critical Fix**: URL routing duplication bug fixed

**Pendientes:**
- 🔜 FASE 4D: Complete admin pages (3 tareas) - 4.5h estimado
  - Task 4D.3: Branding editor page
  - Task 4D.4: Content editor page
  - Task 4D.5: Analytics dashboard page
- 🔜 FASE 5: Public Chat UI (7 tareas) - 3-4h
- 🔜 FASE 6: Deployment + Testing (9 tareas) - 2-3h

**Total:** 20/60 tareas (33.3%) | ~8h invertidas | ~13-18h restantes

---

**Fin del documento**
