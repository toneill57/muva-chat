# PROMPTS WORKFLOW - Guest Portal Multi-Conversation + Compliance Module

**Proyecto:** Guest Portal Multi-Conversation Architecture with Integrated Compliance
**Archivos de referencia:** `plan.md` (1047 líneas) + `TODO.md` (680 líneas, 57 tareas)

---

## 🎯 Contexto General (Usar SIEMPRE primero en nuevas conversaciones)

```
CONTEXTO DEL PROYECTO: Guest Portal Multi-Conversation + Compliance Module

Estoy trabajando en el proyecto "Guest Portal Multi-Conversation Architecture with Integrated Compliance" para transformar el Guest Chat actual (single-conversation) en una experiencia revolucionaria multi-conversation con módulo de compliance integrado (SIRE + TRA).

ARCHIVOS CLAVE:
- plan.md → Plan completo del proyecto (1047 líneas, 7 fases)
- TODO.md → 57 tareas organizadas por fases
- guest-portal-compliance-workflow.md → Este archivo (prompts ejecutables)

OBJETIVO:
Crear un Guest Portal moderno estilo Claude AI / ChatGPT con:
1. Sidebar con múltiples conversaciones (como Staff Chat)
2. Compliance module integrado conversacional (SIRE + TRA)
3. Subdomain architecture (simmerdown.innpilot.io)
4. Confirmación pre-submit para evitar errores
5. Staff notifications y dashboard

STACK TÉCNICO:
- Frontend: Next.js 15.5.3, React, Tailwind CSS
- Backend: Node.js 20.x, Supabase PostgreSQL + pgvector
- AI: Anthropic Claude (conversational-chat-engine.ts)
- Embeddings: OpenAI text-embedding-3-large (Matryoshka Tier 1+2)
- Compliance: Puppeteer (SIRE), REST API (TRA MinCIT)
- Infrastructure: Nginx, Let's Encrypt SSL, VPS Hostinger

ESTADO ACTUAL:
- ✅ Planning completada (plan.md, TODO.md creados)
- ✅ Guest Chat funcionando (single-conversation, Tier 1+2 embeddings)
- ✅ Entity tracking + Follow-up suggestions
- ✅ FASE 1: Subdomain Infrastructure COMPLETADA (Oct 5, 2025)
- 🔜 FASE 2.2: Backend API - Conversations CRUD ✅ COMPLETADA (Oct 5, 2025)
- 🔜 FASE 2.3: UI Components - Sidebar (próxima)

DECISIONES CRÍTICAS:
- ❌ NO cambiar backend embeddings (ya óptimo con Tier 1+2)
- ✅ SÍ copiar UI del Staff Chat (sidebar multi-conversation)
- ✅ SÍ compliance conversacional (no formulario standalone)
- ✅ SÍ SIRE + TRA simultáneo (un solo flujo)
- ✅ SÍ confirmación pre-submit (evitar errores)

Por favor, confirma que entiendes el contexto antes de continuar.
```

---

## FASE 1: Subdomain Infrastructure 🌐 (3-4h)

### Prompt 1.1: Configurar DNS Wildcard + SSL ✅ COMPLETADO (Oct 5, 2025)

**AGENTE:** @backend-developer

**COPY-PASTE DESDE AQUÍ:**

```
TAREA: Configurar DNS wildcard y SSL wildcard en VPS Hostinger

CONTEXTO:
- Proyecto: Guest Portal Multi-Conversation (ver plan.md)
- Objetivo FASE 1: `simmerdown.innpilot.io` funcionando con SSL
- VPS actual: 195.200.6.216 (Debian 11, Nginx 1.18.0)
- Dominio: innpilot.io (ya configurado)

ESPECIFICACIONES:

1. DNS Wildcard (Hostinger Panel):
   - Login a https://hpanel.hostinger.com
   - DNS Zone Editor → innpilot.io
   - Crear record: `*.innpilot.io A 195.200.6.216`
   - TTL: 3600 (1 hour)
   - Verificar propagación: `host simmerdown.innpilot.io`

2. SSL Wildcard (Let's Encrypt):
   - SSH al VPS: `ssh root@innpilot.io`
   - Comando: `sudo certbot certonly --manual --preferred-challenges dns -d *.innpilot.io -d innpilot.io`
   - Agregar TXT record en Hostinger DNS cuando Certbot lo pida:
     - Name: `_acme-challenge.innpilot.io`
     - Type: TXT
     - Value: [el que provea Certbot]
   - Esperar propagación (~5min): `dig TXT _acme-challenge.innpilot.io`
   - Presionar Enter en Certbot
   - Certificado guardado en: `/etc/letsencrypt/live/innpilot.io/`

3. Auto-renovación SSL:
   - Verificar certbot timer: `systemctl status certbot.timer`
   - Si no existe, agregar crontab: `0 0 * * * certbot renew --quiet`

ARCHIVOS:
- N/A (configuración en Hostinger panel y VPS)

TESTING:
- `host simmerdown.innpilot.io` → 195.200.6.216
- `openssl x509 -in /etc/letsencrypt/live/innpilot.io/fullchain.pem -text | grep CN` → CN=*.innpilot.io
- `curl -I https://simmerdown.innpilot.io` → SSL error (expected, Nginx no configurado aún)

SIGUIENTE: Prompt 1.2 para configurar Nginx subdomain routing
```

---

### Prompt 1.2: Nginx Subdomain Routing ✅ COMPLETADO (Oct 5, 2025)

**AGENTE:** @backend-developer

**COPY-PASTE DESDE AQUÍ:**

```
TAREA: Configurar Nginx para subdomain routing con SSL

CONTEXTO:
- DNS wildcard configurado ✅ (Prompt 1.1)
- SSL wildcard configurado ✅ (Prompt 1.1)
- Objetivo: Nginx detecta subdomain y proxy a Next.js con custom header

ESPECIFICACIONES:

1. Crear archivo de configuración Nginx:
   - Path local: `docs/deployment/nginx-subdomain.conf`
   - Contenido:
```nginx
# Wildcard subdomain configuration
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name *.innpilot.io innpilot.io;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/innpilot.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/innpilot.io/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Extract subdomain from Host header
    set $subdomain "";
    if ($host ~* ^([^.]+)\.innpilot\.io$) {
        set $subdomain $1;
    }

    # Add custom header with subdomain
    proxy_set_header X-Tenant-Subdomain $subdomain;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # Proxy to Next.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name *.innpilot.io innpilot.io;
    return 301 https://$host$request_uri;
}
```

2. Copiar a VPS y activar:
   - `scp docs/deployment/nginx-subdomain.conf root@innpilot.io:/etc/nginx/sites-available/`
   - SSH: `ssh root@innpilot.io`
   - Symlink: `ln -sf /etc/nginx/sites-available/nginx-subdomain.conf /etc/nginx/sites-enabled/`
   - Test: `sudo nginx -t`
   - Reload: `sudo systemctl reload nginx`

3. Crear guía de setup:
   - Path: `docs/deployment/SUBDOMAIN_SETUP_GUIDE.md`
   - Incluir: Pasos DNS, SSL, Nginx, troubleshooting

ARCHIVOS:
- Crear: `docs/deployment/nginx-subdomain.conf`
- Crear: `docs/deployment/SUBDOMAIN_SETUP_GUIDE.md`

TESTING:
- `curl -I https://simmerdown.innpilot.io` → 200 OK (Next.js responde)
- `curl -H "Host: simmerdown.innpilot.io" -I https://195.200.6.216` → 200 OK
- Verificar header: `curl -v https://simmerdown.innpilot.io 2>&1 | grep X-Tenant-Subdomain` → Debe aparecer

SIGUIENTE: Prompt 1.3 para Next.js middleware subdomain detection
```

---

### Prompt 1.3: Next.js Middleware + Tenant Resolver ✅ COMPLETADO (Oct 5, 2025)

**AGENTE:** @backend-developer

**COPY-PASTE DESDE AQUÍ:**

```
TAREA: Modificar Next.js middleware y tenant-resolver para subdomain support

CONTEXTO:
- Nginx configurado ✅ (Prompt 1.2)
- Header `X-Tenant-Subdomain` disponible en requests
- Objetivo: Next.js detecta subdomain y resuelve tenant_id

ESPECIFICACIONES:

1. Modificar `src/middleware.ts`:
```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // 1. Check for subdomain header from Nginx
  const subdomainHeader = request.headers.get('x-tenant-subdomain')

  // 2. Fallback: Parse from hostname (for local dev)
  let subdomain = subdomainHeader
  if (!subdomain && request.nextUrl.hostname !== 'localhost') {
    const hostParts = request.nextUrl.hostname.split('.')
    if (hostParts.length > 2) {
      subdomain = hostParts[0]
    }
  }

  // 3. Set cookie with subdomain for client-side access
  if (subdomain && subdomain !== 'www') {
    response.cookies.set('tenant_subdomain', subdomain, {
      httpOnly: false, // Accessible by client JS
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })
  }

  console.log('[middleware] Subdomain detected:', subdomain || 'none')

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
```

2. Modificar `src/lib/tenant-resolver.ts`:
```typescript
// Add new function for subdomain resolution
export async function resolveSubdomainToTenantId(subdomain: string): Promise<string> {
  if (!subdomain) {
    throw new Error('Subdomain is required')
  }

  // Check cache first
  const cacheKey = `subdomain:${subdomain}`
  const cached = tenantCache.get(cacheKey)
  if (cached && cached.expires > Date.now()) {
    console.log(`🎯 Cache hit: ${subdomain} → ${cached.schema_name}`)
    return cached.schema_name
  }

  const supabase = getSupabaseClient()

  try {
    // Query by slug (subdomain maps to slug column)
    const { data, error } = await supabase
      .from('tenant_registry')
      .select('tenant_id, tenant_type, is_active')
      .eq('slug', subdomain)
      .eq('is_active', true)
      .single()

    if (error || !data) {
      console.warn(`⚠️ Subdomain ${subdomain} not found in registry:`, error?.message)
      throw new Error(`Subdomain ${subdomain} not found or inactive`)
    }

    const tenantId = data.tenant_id

    // Cache the result
    tenantCache.set(cacheKey, {
      schema_name: tenantId,
      expires: Date.now() + CACHE_TTL
    })

    console.log(`✅ Resolved subdomain: ${subdomain} → ${tenantId} (${data.tenant_type})`)
    return tenantId

  } catch (error) {
    console.error(`❌ Error resolving subdomain ${subdomain}:`, error)
    throw error
  }
}

// Update resolveTenantSchemaName to support subdomain
export async function resolveTenantSchemaName(tenantUuid: string | null | undefined): Promise<string> {
  // ... existing code ...

  // Add subdomain check before UUID/slug detection
  const isSubdomain = tenantUuid && !tenantUuid.match(/^[0-9a-f]{8}-[0-9a-f]{4}-/)
  if (isSubdomain) {
    return resolveSubdomainToTenantId(tenantUuid)
  }

  // ... rest of existing code ...
}
```

ARCHIVOS:
- Modificar: `src/middleware.ts` (add subdomain detection)
- Modificar: `src/lib/tenant-resolver.ts` (add resolveSubdomainToTenantId function)

TESTING:
- Visit `https://simmerdown.innpilot.io`
- Check cookie: `tenant_subdomain=simmerdown`
- Check logs: `[middleware] Subdomain detected: simmerdown`
- Test tenant resolution: `resolveSubdomainToTenantId('simmerdown')` → tenant_id correcto

SIGUIENTE: FASE 2 - Multi-Conversation Foundation (Prompt 2.1)
```

//VAMOS AQUÍ

---

## FASE 2: Multi-Conversation Foundation 💬 (6-8h)

### Prompt 2.1: Database Migrations (guest_conversations + compliance)

**AGENTE:** @database-agent

**COPY-PASTE DESDE AQUÍ:**

```
TAREA: Crear migrations para guest_conversations, compliance_submissions, tenant_compliance_credentials

CONTEXTO:
- Proyecto: Guest Portal Multi-Conversation (ver plan.md, TODO.md tarea 2.1-2.4)
- Base de referencia: Staff Chat usa `staff_conversations` table
- Objetivo: Crear estructura de base de datos para multi-conversation + compliance

ESPECIFICACIONES:

1. Migration: guest_conversations
   - Path: `supabase/migrations/20251005010000_add_guest_conversations.sql`
   - Contenido:
```sql
-- Guest Conversations Table
CREATE TABLE guest_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID NOT NULL REFERENCES guest_reservations(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenant_registry(tenant_id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  last_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_guest_conversations_guest_id ON guest_conversations(guest_id);
CREATE INDEX idx_guest_conversations_tenant_id ON guest_conversations(tenant_id);
CREATE INDEX idx_guest_conversations_updated_at ON guest_conversations(updated_at DESC);

-- RLS Policies
ALTER TABLE guest_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guests can view their own conversations"
  ON guest_conversations FOR SELECT
  USING (
    guest_id IN (
      SELECT id FROM guest_reservations
      WHERE tenant_id = current_setting('request.jwt.claims', true)::json->>'tenant_id'
    )
  );

CREATE POLICY "Guests can create their own conversations"
  ON guest_conversations FOR INSERT
  WITH CHECK (
    guest_id IN (
      SELECT id FROM guest_reservations
      WHERE tenant_id = current_setting('request.jwt.claims', true)::json->>'tenant_id'
    )
  );

CREATE POLICY "Guests can update their own conversations"
  ON guest_conversations FOR UPDATE
  USING (
    guest_id IN (
      SELECT id FROM guest_reservations
      WHERE tenant_id = current_setting('request.jwt.claims', true)::json->>'tenant_id'
    )
  );

CREATE POLICY "Guests can delete their own conversations"
  ON guest_conversations FOR DELETE
  USING (
    guest_id IN (
      SELECT id FROM guest_reservations
      WHERE tenant_id = current_setting('request.jwt.claims', true)::json->>'tenant_id'
    )
  );

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_guest_conversations_updated_at
BEFORE UPDATE ON guest_conversations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

2. Migration: compliance_submissions
   - Path: `supabase/migrations/20251005010100_add_compliance_submissions.sql`
   - Contenido:
```sql
-- Compliance Submissions Table
CREATE TABLE compliance_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID NOT NULL REFERENCES guest_reservations(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenant_registry(tenant_id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('sire', 'tra', 'both')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'processing', 'success', 'failed')),
  data JSONB NOT NULL,
  sire_response JSONB,
  tra_response JSONB,
  error_message TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_by VARCHAR(50) DEFAULT 'guest' CHECK (submitted_by IN ('guest', 'staff'))
);

-- Indexes
CREATE INDEX idx_compliance_submissions_guest_id ON compliance_submissions(guest_id);
CREATE INDEX idx_compliance_submissions_tenant_id ON compliance_submissions(tenant_id);
CREATE INDEX idx_compliance_submissions_status ON compliance_submissions(status);
CREATE INDEX idx_compliance_submissions_submitted_at ON compliance_submissions(submitted_at DESC);

-- RLS Policies
ALTER TABLE compliance_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guests can view their own submissions"
  ON compliance_submissions FOR SELECT
  USING (guest_id = auth.uid());

CREATE POLICY "Staff can view tenant submissions"
  ON compliance_submissions FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenant_permissions
      WHERE user_id = auth.uid() AND is_active = true
    )
  );
```

3. Migration: tenant_compliance_credentials
   - Path: `supabase/migrations/20251005010200_add_tenant_compliance_credentials.sql`
   - Contenido:
```sql
-- Tenant Compliance Credentials Table
CREATE TABLE tenant_compliance_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES tenant_registry(tenant_id) ON DELETE CASCADE,
  sire_username VARCHAR(255),
  sire_password_encrypted TEXT,
  tra_rnt_token VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies (staff only)
ALTER TABLE tenant_compliance_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can access credentials"
  ON tenant_compliance_credentials FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_tenant_permissions
      WHERE user_id = auth.uid()
        AND tenant_id = tenant_compliance_credentials.tenant_id
        AND role IN ('owner', 'admin')
        AND is_active = true
    )
  );
```

ARCHIVOS:
- Crear: `supabase/migrations/20251005010000_add_guest_conversations.sql`
- Crear: `supabase/migrations/20251005010100_add_compliance_submissions.sql`
- Crear: `supabase/migrations/20251005010200_add_tenant_compliance_credentials.sql`

TESTING:
- `npx supabase migration show` → 3 migrations visibles
- Apply migrations (local): `npx supabase db reset`
- Apply migrations (prod): Se aplicarán con next deploy
- Verificar RLS: Guest no puede ver conversations de otro guest

SIGUIENTE: Prompt 2.2 para crear APIs de conversations
```

---

### Prompt 2.2: Backend API - Conversations CRUD ✅ COMPLETADO (Oct 5, 2025)

**AGENTE:** @backend-developer

**COPY-PASTE DESDE AQUÍ:**

```
TAREA: Crear APIs para guest conversations (CREATE, READ, UPDATE, DELETE)

CONTEXTO:
- Database migrations aplicadas ✅ (Prompt 2.1)
- Base de referencia: Staff Chat API (`/api/staff/chat`)
- Objetivo: APIs completas para multi-conversation

ESPECIFICACIONES:

1. POST /api/guest/conversations - Create new
2. GET /api/guest/conversations - List all
3. PUT /api/guest/conversations/[id] - Update title
4. DELETE /api/guest/conversations/[id] - Delete
5. Modificar GET /api/guest/chat/history - Add conversation_id param

CÓDIGO ESPERADO:

```typescript
// src/app/api/guest/conversations/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyGuestToken } from '@/lib/guest-auth'
import { createServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const session = await verifyGuestToken(token)
  if (!session) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('guest_conversations')
    .select('id, title, last_message, created_at, updated_at')
    .eq('guest_id', session.reservation_id)
    .order('updated_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ conversations: data, total: data.length })
}

export async function POST(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const session = await verifyGuestToken(token)
  if (!session) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const { title } = await request.json()
  const conversationTitle = title || `Conversación ${new Date().toLocaleString('es', { month: 'short', day: 'numeric' })}`

  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('guest_conversations')
    .insert({
      guest_id: session.reservation_id,
      tenant_id: session.tenant_id,
      title: conversationTitle,
      last_message: ''
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ conversation: data }, { status: 201 })
}
```

```typescript
// src/app/api/guest/conversations/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyGuestToken } from '@/lib/guest-auth'
import { createServerClient } from '@/lib/supabase'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const token = request.headers.get('authorization')?.replace('Bearer ', '')

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const session = await verifyGuestToken(token)
  if (!session) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const { title } = await request.json()

  if (!title || title.trim().length === 0) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }

  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('guest_conversations')
    .update({ title: title.trim() })
    .eq('id', id)
    .eq('guest_id', session.reservation_id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, conversation: data })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const token = request.headers.get('authorization')?.replace('Bearer ', '')

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const session = await verifyGuestToken(token)
  if (!session) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const supabase = createServerClient()

  // Delete conversation (CASCADE will delete associated messages)
  const { error } = await supabase
    .from('guest_conversations')
    .delete()
    .eq('id', id)
    .eq('guest_id', session.reservation_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, deleted_id: id })
}
```

ARCHIVOS:
- Crear: `src/app/api/guest/conversations/route.ts`
- Crear: `src/app/api/guest/conversations/[id]/route.ts`
- Modificar: `src/app/api/guest/chat/history/route.ts` (add conversation_id query param)

TESTING:
- `curl -X POST /api/guest/conversations -H "Authorization: Bearer TOKEN"` → 201 Created
- `curl /api/guest/conversations -H "Authorization: Bearer TOKEN"` → 200 OK con array
- `curl -X PUT /api/guest/conversations/:id -d '{"title":"New Title"}' -H "Authorization: Bearer TOKEN"` → 200 OK
- `curl -X DELETE /api/guest/conversations/:id -H "Authorization: Bearer TOKEN"` → 200 OK
- RLS funciona: No cross-guest access

SIGUIENTE: Prompt 2.3 para UI components (ConversationList + GuestChatInterface refactor)
```

---

### Prompt 2.3: UI Components - Sidebar Multi-Conversation

**AGENTE:** @ux-interface

**COPY-PASTE DESDE AQUÍ:**

```
TAREA: Crear ConversationList component y refactor GuestChatInterface con sidebar

CONTEXTO:
- APIs de conversations creadas ✅ (Prompt 2.2)
- Base de referencia: `src/components/Staff/ConversationList.tsx` (COPIAR estructura)
- Objetivo: UI multi-conversation mejorada a partir de copiado de Staff Chat

ESPECIFICACIONES:

1. Crear ConversationList.tsx (copiado de Staff Chat):
   - Path: `src/components/Chat/ConversationList.tsx`
   - Features:
     - "Nueva conversación" button (+ icon, blue)
     - Lista de conversations con title, last_message preview, timestamp relativo
     - Active conversation highlight (border-left blue, bg-blue-50)
     - Empty state: "No conversations yet"
     - Mobile responsive (colapsable)

2. Refactor GuestChatInterface.tsx:
   - Agregar sidebar layout (300px desktop, drawer mobile)
   - Load conversations on mount (GET /api/guest/conversations)
   - "Nueva conversación" functionality (POST /api/guest/conversations)
   - Conversation switching (load messages GET /api/guest/chat/history?conversation_id=X)
   - Auto-generate conversation titles (from first user message)
   - **MANTENER entity tracking ✅** (ya existe)
   - **MANTENER follow-up suggestions ✅** (ya existe)

CÓDIGO ESPERADO (ConversationList):
```typescript
// src/components/Chat/ConversationList.tsx
'use client'

import { Plus, MessageSquare, Clock } from 'lucide-react'

interface Conversation {
  id: string
  title: string
  last_message: string
  updated_at: string
}

interface ConversationListProps {
  conversations: Conversation[]
  activeConversationId: string | null
  onSelectConversation: (id: string) => void
  onNewConversation: () => void
}

export default function ConversationList({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
}: ConversationListProps) {

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Ahora'
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}d`
    return date.toLocaleDateString('es')
  }

  return (
    <div className="h-full flex flex-col bg-white border-r border-slate-200">
      {/* Header with New Conversation Button */}
      <div className="p-4 border-b border-slate-200">
        <button
          onClick={onNewConversation}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus className="h-5 w-5" />
          Nueva conversación
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <MessageSquare className="h-16 w-16 text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              No hay conversaciones
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Inicia una nueva conversación para comenzar
            </p>
          </div>
        ) : (
          /* Conversation Items */
          <div className="divide-y divide-slate-100">
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => onSelectConversation(conversation.id)}
                className={`w-full text-left p-4 hover:bg-slate-50 transition-colors ${
                  activeConversationId === conversation.id
                    ? 'bg-blue-50 border-l-4 border-l-blue-600'
                    : 'border-l-4 border-l-transparent'
                }`}
              >
                {/* Title */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-semibold text-slate-900 text-sm line-clamp-1">
                    {conversation.title}
                  </h4>
                </div>

                {/* Last Message Preview */}
                <p className="text-sm text-slate-600 line-clamp-2 mb-2">
                  {conversation.last_message || 'Sin mensajes aún'}
                </p>

                {/* Timestamp */}
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <Clock className="h-3 w-3" />
                  <span>{formatRelativeTime(conversation.updated_at)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

ARCHIVOS:
- Crear: `src/components/Chat/ConversationList.tsx`
- Modificar: `src/components/Chat/GuestChatInterface.tsx` (add sidebar layout, load conversations, switching)

REFERENCIA:
- `src/components/Staff/ConversationList.tsx` (copiar estructura exacta)
- `src/components/Staff/StaffChatInterface.tsx` (sidebar layout reference)

TESTING:
- Component renders correctamente
- "Nueva conversación" crea conversación (POST API)
- Click selecciona conversación (load messages)
- Active highlight funciona
- Empty state visible cuando no hay conversations
- **Entity tracking sigue funcionando** ✅
- **Follow-up suggestions funcionan** ✅
- Mobile responsive (drawer)

SIGUIENTE: FASE 3 - Compliance Module Integration (Prompt 3.1)

---

### Prompt 2.5: Multi-Modal File Upload Setup

**AGENTE:** @backend-developer

**COPY-PASTE DESDE AQUÍ:**

```
TAREA: Implementar subida de archivos (fotos + documentos) con Claude Vision API

CONTEXTO:
- Proyecto: Guest Portal Multi-Conversation + Compliance (ver plan.md FASE 2.5)
- Objetivo: Habilitar upload de fotos (location recognition PoC) y documentos (passport OCR)

ESPECIFICACIONES:

1. Supabase Storage Setup:
   - Bucket: 'guest-attachments'
   - RLS: Solo guest puede subir a `{guest_id}/`
   - Max size: 10MB
   - Formats: image/*, application/pdf

2. Database Migration: conversation_attachments
```sql
CREATE TABLE conversation_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES guest_conversations(id) ON DELETE CASCADE,
  message_id UUID,
  file_type VARCHAR(50) NOT NULL CHECK (file_type IN ('image', 'document', 'pdf')),
  file_url TEXT NOT NULL,
  file_size_bytes INTEGER,
  mime_type VARCHAR(100),
  ocr_text TEXT,
  vision_analysis JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

3. Claude Vision API Integration:
   - Archivo: `src/lib/claude-vision.ts`
   - Function: `analyzeImage(imageUrl, prompt)`
   - Model: claude-3-5-sonnet-20241022
   - Use cases:
     * Location recognition: "Where is this? How to get to beach?"
     * Passport OCR: Extract passport data for compliance

4. Backend API:
   - POST /api/guest/conversations/:id/attachments
   - Upload file → Supabase Storage
   - If image: Call Claude Vision
   - If passport: Extract data (number, country, birthdate)
   - Save metadata to conversation_attachments

5. UI Components (@ux-interface):
   - Paperclip button (lucide-react)
   - File input (hidden)
   - Image preview modal
   - Loading state during Vision API call

TEST:
- Upload foto Simmerdown → Vision recognizes location
- Upload passport → OCR extracts data correctly
- File stored en Supabase Storage bucket
- Attachment metadata en conversation_attachments table

SIGUIENTE: Prompt 2.6 para Conversation Intelligence
```

---

### Prompt 2.6: Conversation Intelligence & Memory Management

**AGENTE:** @backend-developer

**COPY-PASTE DESDE AQUÍ:**

```
TAREA: Implementar gestión inteligente de memoria y sugerencias de conversación

CONTEXTO:
- Proyecto: Guest Portal Multi-Conversation (ver plan.md FASE 2.6)
- Objetivo: Compactación automática, favoritos, sugerencias inteligentes, auto-archiving

ESPECIFICACIONES:

1. Update guest_conversations schema:
```sql
ALTER TABLE guest_conversations
  ADD COLUMN message_count INTEGER DEFAULT 0,
  ADD COLUMN compressed_history JSONB DEFAULT '[]',
  ADD COLUMN favorites JSONB DEFAULT '[]',
  ADD COLUMN is_archived BOOLEAN DEFAULT FALSE,
  ADD COLUMN archived_at TIMESTAMPTZ,
  ADD COLUMN last_activity_at TIMESTAMPTZ DEFAULT NOW();
```

2. Conversation Memory Management:
   Archivo: `src/lib/guest-conversation-memory.ts` (NUEVO)

```typescript
export async function compactConversationIfNeeded(conversationId: string) {
  const conversation = await getConversation(conversationId)

  // Umbral: 20 mensajes → comprimir bloque más antiguo
  if (conversation.message_count > 20 && conversation.message_count % 10 === 0) {
    const oldMessages = await getOldestMessages(conversationId, 10)
    const summary = await compressWithClaude(oldMessages)

    await updateConversation(conversationId, {
      compressed_history: [
        ...conversation.compressed_history,
        { summary, timestamp: new Date(), message_range: [...] }
      ]
    })

    await archiveMessages(conversationId, oldMessages.map(m => m.id))
  }
}

export async function suggestNewConversation(messages: Message[]): { suggest: boolean; topic: string } {
  // Topic keywords:
  const TOPICS = {
    restaurantes: ['restaurante', 'comida', 'cena', 'almuerzo'],
    playas: ['playa', 'mar', 'buceo', 'snorkel'],
    servicios: ['piscina', 'spa', 'gimnasio', 'servicio']
  }

  // Detectar 2+ menciones del mismo tema → sugerir nueva conversación
  // Return: { suggest: true, topic: 'restaurantes' }
}

export async function addToFavorites(conversationId: string, favorite: Favorite) {
  // favorite = { type: 'place|activity|restaurant', name, url, timestamp }
}
```

3. Auto-trigger compactación:
   - Modificar: `src/app/api/guest/chat/route.ts`
   - Llamar `compactConversationIfNeeded()` después de cada mensaje
   - Update `message_count` y `last_activity_at`

4. UI - Topic Suggestions (@ux-interface):
```typescript
{showNewConversationSuggestion && (
  <div className="bg-blue-50 border-l-4 border-blue-600 p-4">
    <p>💡 Parece que cambiaste de tema. ¿Quieres crear una conversación sobre "{newTopic}"?</p>
    <button onClick={createNewConversation}>Sí, crear</button>
    <button onClick={dismissSuggestion}>No, continuar</button>
  </div>
)}
```

5. UI - Favorites Section (@ux-interface):
   - Sidebar section "⭐ Favoritos"
   - Click → insert favorite into chat

6. Cron Jobs:
   Archivo: `src/lib/cron/archive-conversations.ts`

   - Daily 2am: Archive conversations (last_activity_at > 30 días)
   - Daily 2am: Delete archived conversations (archived_at > 90 días)
   - Config: `vercel.json` cron schedule

TEST:
- Send 50 messages → verify 2 bloques compactados
- Mention 'restaurantes' 2x → suggestion appears
- Add favorite → appears in sidebar
- Manual trigger cron → conversations archived/deleted

SIGUIENTE: FASE 3 - Compliance Module Integration
```
```

---

## FASE 3: Compliance Module Integration 📋 (10-12h)

### Prompt 3.1: Compliance Chat Engine

**AGENTE:** @backend-developer

**COPY-PASTE DESDE AQUÍ:**

```
TAREA: Crear compliance-chat-engine.ts con conversational flow y entity extraction

CONTEXTO:
- Proyecto: Guest Portal Multi-Conversation (ver plan.md FASE 3.1)
- Objetivo: Chat conversacional que captura datos SIRE + TRA con confirmación
- Base: `src/lib/conversational-chat-engine.ts` (ya existe, tiene entity extraction)

ESPECIFICACIONES:

1. State Machine:
   - normal → compliance_active → compliance_confirm → compliance_processing → success/failed

2. Entity Extraction (campos SIRE + TRA):
   - Pasaporte: Regex [A-Z]{2}[0-9]{6,9}
   - País: NER + validation contra lista de países
   - Fecha nacimiento: Date parsing (DD/MM/YYYY, DD-MM-YYYY, etc.)
   - Propósito viaje: Enum ['turismo', 'negocios', 'estudio', 'familiar', 'otro']

3. Pre-fill Data (desde reserva):
   - Nombre: session.guest_name
   - Check-in: reservation.check_in_date
   - Check-out: reservation.check_out_date
   - Teléfono: reservation.phone

4. Validation (strict):
   - Passport format válido
   - País en lista oficial de países
   - Fecha nacimiento válida (> 18 años, < 120 años)
   - Todos los campos required completados

5. Confirmation Generation:
   - Mensaje formateado con todos los datos
   - Clear "¿Todo correcto? Responde SÍ para enviar"

CÓDIGO ESPERADO:

```typescript
// src/lib/compliance-chat-engine.ts
import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from './supabase'

export interface ComplianceContext {
  mode: 'normal' | 'compliance_active' | 'compliance_confirm' | 'compliance_processing'
  compliance_type: 'sire' | 'tra' | 'both'
  compliance_data: {
    nombre: string
    pasaporte?: string
    pais?: string
    fecha_nacimiento?: string
    proposito_viaje?: string
    check_in: string
    check_out: string
    telefono: string
    nacionalidad?: string
  }
  fields_collected: string[]
  fields_remaining: string[]
  confirmation_pending: boolean
  validation_errors: string[]
}

const REQUIRED_FIELDS = ['pasaporte', 'pais', 'fecha_nacimiento', 'proposito_viaje']

const PASSPORT_REGEX = /\b[A-Z]{2}[0-9]{6,9}\b/
const DATE_REGEX = /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/

export async function generateComplianceResponse(
  message: string,
  context: ComplianceContext,
  session: { guest_name: string; reservation_id: string; tenant_id: string }
): Promise<{ response: string; updated_context: ComplianceContext }> {

  // Extract entities from message
  const extractedData = extractComplianceEntities(message, context)

  // Update context with extracted data
  const updatedContext = {
    ...context,
    compliance_data: {
      ...context.compliance_data,
      ...extractedData
    }
  }

  // Update fields collected/remaining
  updatedContext.fields_collected = REQUIRED_FIELDS.filter(
    field => updatedContext.compliance_data[field as keyof typeof updatedContext.compliance_data]
  )
  updatedContext.fields_remaining = REQUIRED_FIELDS.filter(
    field => !updatedContext.compliance_data[field as keyof typeof updatedContext.compliance_data]
  )

  // Check if all fields collected
  if (updatedContext.fields_remaining.length === 0 && !updatedContext.confirmation_pending) {
    // Generate confirmation message
    updatedContext.mode = 'compliance_confirm'
    updatedContext.confirmation_pending = true

    const confirmationMessage = generateConfirmationMessage(updatedContext.compliance_data)
    return { response: confirmationMessage, updated_context: updatedContext }
  }

  // Ask for next field
  const nextField = updatedContext.fields_remaining[0]
  const promptMessage = generateFieldPrompt(nextField, updatedContext.compliance_data)

  return { response: promptMessage, updated_context: updatedContext }
}

function extractComplianceEntities(message: string, context: ComplianceContext) {
  const extracted: Partial<ComplianceContext['compliance_data']> = {}

  // Extract passport
  const passportMatch = message.match(PASSPORT_REGEX)
  if (passportMatch) {
    extracted.pasaporte = passportMatch[0]
  }

  // Extract date (fecha de nacimiento)
  const dateMatch = message.match(DATE_REGEX)
  if (dateMatch && !context.compliance_data.fecha_nacimiento) {
    const [_, day, month, year] = dateMatch
    extracted.fecha_nacimiento = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  // Extract country (basic keyword matching)
  const countries = ['colombia', 'méxico', 'argentina', 'españa', 'usa', 'estados unidos', /* ... */]
  const lowerMessage = message.toLowerCase()
  for (const country of countries) {
    if (lowerMessage.includes(country)) {
      extracted.pais = country
      break
    }
  }

  // Extract propósito (keyword matching)
  if (lowerMessage.match(/turismo|vacaciones|paseo/)) {
    extracted.proposito_viaje = 'turismo'
  } else if (lowerMessage.match(/negocios|trabajo|laboral/)) {
    extracted.proposito_viaje = 'negocios'
  } else if (lowerMessage.match(/estudio|universidad|curso/)) {
    extracted.proposito_viaje = 'estudio'
  }

  return extracted
}

function generateConfirmationMessage(data: ComplianceContext['compliance_data']): string {
  return `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 CONFIRMACIÓN FINAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Verifica que todo esté correcto antes de enviar:

👤 Nombre completo: ${data.nombre}
🆔 Pasaporte: ${data.pasaporte}
🌍 País: ${data.pais}
🎂 Fecha nacimiento: ${data.fecha_nacimiento}
📞 Teléfono: ${data.telefono}
📅 Check-in: ${data.check_in}
📅 Check-out: ${data.check_out}
✈️ Propósito: ${data.proposito_viaje}

¿Todo correcto?
✅ Responde SÍ para enviar a SIRE y TRA
❌ Responde NO para corregir`
}

function generateFieldPrompt(field: string, data: ComplianceContext['compliance_data']): string {
  const prompts = {
    pasaporte: '📋 ¿Cuál es tu número de pasaporte?',
    pais: '🌍 ¿De qué país eres?',
    fecha_nacimiento: '📅 ¿Cuál es tu fecha de nacimiento? (DD/MM/AAAA)',
    proposito_viaje: '✈️ ¿Cuál es el propósito de tu viaje? (Turismo, Negocios, Estudio, etc.)'
  }
  return prompts[field as keyof typeof prompts] || '¿Puedes proporcionar más información?'
}

export function validateComplianceData(data: ComplianceContext['compliance_data']): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Validate passport format
  if (data.pasaporte && !PASSPORT_REGEX.test(data.pasaporte)) {
    errors.push('Formato de pasaporte inválido')
  }

  // Validate date
  if (data.fecha_nacimiento) {
    const birthDate = new Date(data.fecha_nacimiento)
    const age = (new Date().getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    if (age < 18) errors.push('Debe ser mayor de 18 años')
    if (age > 120) errors.push('Fecha de nacimiento inválida')
  }

  // Validate required fields
  for (const field of REQUIRED_FIELDS) {
    if (!data[field as keyof typeof data]) {
      errors.push(`Campo requerido: ${field}`)
    }
  }

  return { valid: errors.length === 0, errors }
}
```

ARCHIVOS:
- Crear: `src/lib/compliance-chat-engine.ts`

TESTING:
- Entity extraction > 95% accuracy
- Pasaporte "AB123456" extraído correctamente
- País "Colombia" extraído
- Fecha "15/03/1985" parseada a "1985-03-15"
- Validation funciona (passport format, age, required fields)
- Confirmation message formateado correctamente

SIGUIENTE: Prompt 3.2 para modificar conversational-chat-engine.ts (intent detection)
```

---

*[Continuaría con Prompts 3.2 - 7.6, pero por límites de espacio, muestro estructura completa sin repetir formato similar...]*

---

## 📋 LISTA COMPLETA DE PROMPTS

**FASE 1** (3 prompts):
- 1.1: DNS Wildcard + SSL ✅
- 1.2: Nginx Subdomain Routing ✅
- 1.3: Next.js Middleware + Tenant Resolver ✅

**FASE 2** (6 prompts principales + 15 sub-tasks):
- 2.1: Database Migrations ⏳ PENDIENTE
- 2.2: Backend API - Conversations CRUD ✅ COMPLETADO (Oct 5, 2025)
- 2.3: UI Components - Sidebar ⏳ PENDIENTE
- 2.5: Multi-Modal File Upload (8 sub-tasks) ⏳ PENDIENTE
- 2.6: Conversation Intelligence (8 sub-tasks) ⏳ PENDIENTE

**FASE 3** (4 prompts):
- 3.1: Compliance Chat Engine ✅
- 3.2: Intent Detection Enhancement
- 3.3: SIRE Puppeteer + TRA API Integration
- 3.4: Compliance UI Components

**FASE 4** (2 prompts):
- 4.1: Staff Notifications (Email)
- 4.2: Dashboard Compliance Tab

**FASE 5** (1 prompt):
- 5.1: E2E Testing + Performance Validation

**FASE 6** (1 prompt):
- 6.1: SEO + Analytics

**FASE 7** (1 prompt):
- 7.1: Documentation + Deployment

**Total: 15 prompts ejecutables**

---

## 📈 PROGRESO DE EJECUCIÓN

**Prompts Completados:** 4/15 (27%)

### ✅ Completados
- ✅ Prompt 1.1: DNS Wildcard + SSL (Oct 5, 2025 - 30min)
- ✅ Prompt 1.2: Nginx Subdomain Routing (Oct 5, 2025 - 1h)
- ✅ Prompt 1.3: Next.js Middleware + Tenant Resolver (Oct 5, 2025 - 45min)
- ✅ Prompt 2.2: Backend API - Conversations CRUD (Oct 5, 2025 - 2h)
  - Files Created: 2 (route.ts + [id]/route.ts)
  - Files Modified: 1 (chat/history/route.ts)
  - Testing: 12/12 tests passed (100%)
  - Documentation: FASE_2.2_COMPLETION_REPORT.md

### ⏳ Pendientes
- ⏳ Prompt 2.1: Database Migrations (próximo)
- ⏳ Prompt 2.3: UI Components - Sidebar
- ⏳ Prompt 2.5: Multi-Modal File Upload
- ⏳ Prompt 2.6: Conversation Intelligence
- ⏳ Prompt 3.1: Compliance Chat Engine
- ⏳ Prompt 3.2: Intent Detection Enhancement
- ⏳ Prompt 3.3: SIRE Puppeteer + TRA API
- ⏳ Prompt 3.4: Compliance UI Components
- ⏳ Prompt 4.1: Staff Notifications
- ⏳ Prompt 4.2: Dashboard Compliance Tab
- ⏳ Prompt 5.1: E2E Testing + Performance
- ⏳ Prompt 6.1: SEO + Analytics
- ⏳ Prompt 7.1: Documentation + Deployment

**Fases Completadas:** 1/7 (FASE 1 - Subdomain Infrastructure)
**Fases En Progreso:** 1/7 (FASE 2 - Multi-Conversation Foundation - 19% completado)

---

**Última actualización:** 5 de Octubre 2025 - 21:30
**Timeline:** 28-36 horas total
**Formato:** Copy-paste ready para cada fase
**Tiempo invertido:** ~4.5 horas (FASE 1: 2.5h, FASE 2.2: 2h)
