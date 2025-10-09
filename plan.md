# MCP Optimization + SIRE Compliance - Plan de Implementación

**Proyecto:** MCP Optimization + SIRE Compliance Extension
**Fecha Inicio:** 8 Octubre 2025
**Estado:** 📋 Planificación → FASE 1 Ready to Start

---

## 🎯 OVERVIEW

### Objetivo Principal

**Fase 1-9 (Prioridad):** Implementar stack completo de MCP servers para optimizar consumo de tokens en Claude Code mediante semantic code search, persistent memory, y knowledge graph del proyecto.

**Fase 10-12 (Secundaria):** Extender tabla `guest_reservations` con 9 campos SIRE faltantes para compliance legal con Sistema de Información y Registro de Extranjeros (SIRE - Migración Colombia).

### ¿Por qué?

**MCP Optimization:**
- **Token Reduction**: Reducir 40-60% tokens en queries de código mediante semantic search vs grep/read tradicional
- **Persistent Context**: Mantener arquitectura del proyecto y decisiones disponibles entre sesiones sin re-leer archivos
- **Better Retrieval**: Búsquedas semánticas encuentran código relevante sin conocer nombres exactos de archivos/funciones

**SIRE Compliance:**
- **Compliance Legal**: SIRE requiere 13 campos obligatorios (actualmente solo 4/13)
- **Gap Crítico**: Datos extraídos en compliance chat no persisten en base de datos estructurada
- **Data Integrity**: Validaciones y constraints en BD vs JSONB sin tipado

### Alcance

**MCP Optimization (FASE 1-9):**
- ✅ Configurar 4 MCP servers (claude-context, knowledge-graph, memory-keeper, context7)
- ✅ Indexar codebase completo con OpenAI embeddings
- ✅ Mapear entidades y relaciones arquitectónicas de InnPilot
- ✅ Migrar decisiones técnicas a Memory Keeper
- ✅ Medir reducción de tokens antes/después
- ✅ Documentar setup completo

**SIRE Compliance (FASE 10-12):**
- ✅ Agregar 9 campos SIRE a tabla `guest_reservations`
- ✅ Migrar datos existentes de `compliance_submissions`
- ✅ Actualizar APIs de reservas
- ✅ Modificar compliance chat engine
- ❌ **NO incluye**: UI para editar datos (se mantiene chat como entrada)

---

## 📊 ESTADO ACTUAL

### Sistema Existente

**MCP Servers:**
- ✅ Supabase MCP conectado y funcional (20 tools activos)
- ❌ Sin semantic code search (usa grep/read tradicional)
- ❌ Sin persistent memory entre sesiones
- ❌ Sin knowledge graph de arquitectura del proyecto

**SIRE Compliance:**
- ✅ Tabla `guest_reservations` con datos básicos
- ✅ Compliance chat extrae datos correctamente
- ✅ Tabla `compliance_submissions` para tracking
- ✅ Field mappers conversational→SIRE funcionando
- ❌ Solo 4/13 campos SIRE en `guest_reservations`

### Limitaciones Actuales

**MCP Optimization:**
1. **Token Waste en Code Queries**: Búsquedas requieren grep + read múltiples archivos (~10-25K tokens)
2. **Context Loss**: Decisiones arquitectónicas se pierden entre sesiones (requiere re-leer CLAUDE.md, docs)
3. **No Semantic Understanding**: Grep busca strings exactos, no entiende conceptos ("autenticación" no encuentra "login logic")
4. **Manual Knowledge Management**: Relaciones entre entidades del proyecto no están mapeadas

**SIRE Compliance:**
1. **9 Campos Faltantes**: `document_type`, `document_number`, `birth_date`, `first_surname`, `second_surname`, `given_names`, `nationality_code`, `origin_country_code`, `destination_country_code`
2. **Compliance Data No Persiste**: Chat extrae datos pero solo guarda en `compliance_submissions.data` (JSONB)
3. **APIs Sin Campos Compliance**: `/api/reservations/list` no retorna datos SIRE

---

## 🚀 ESTADO DESEADO

### Nueva Experiencia

**Para Desarrolladores (MCP):**
- Queries de código resueltas con semantic search sin multi-round grep/read
- Arquitectura del proyecto siempre disponible (Knowledge Graph)
- Decisiones técnicas recuperables sin leer archivos (Memory Keeper)
- Docs oficiales React/Next.js/TypeScript on-demand (Context7)

**Para el Sistema SIRE:**
- Datos de identidad vinculados permanentemente a reservación
- Validaciones SIRE en base de datos
- Auditorías fáciles con datos estructurados

### Características Clave

**MCP:**
1. **Semantic Code Search**: Indexación completa del codebase con embeddings
2. **Knowledge Graph**: Entidades (Properties, Guests, Reservations, SIRE, Chat, etc.) y relaciones mapeadas
3. **Memory Keeper**: Decisiones arquitectónicas, bugs conocidos, patterns persistentes
4. **Context7**: Docs oficiales sin consumir tokens locales
5. **Token Reduction Medible**: 40-60% reducción promedio

**SIRE:**
1. **Campos Estructurados**: 9 columnas tipadas en `guest_reservations`
2. **Migración de Datos**: Poblar desde `compliance_submissions` existentes
3. **Validación en BD**: Constraints para tipos de documento, códigos
4. **API Actualizada**: Endpoints retornan campos compliance

---

## 📱 TECHNICAL STACK

### MCP Infrastructure
- **MCP Servers**: 5 servers (supabase, claude-context, knowledge-graph, memory-keeper, context7)
- **Vector Database**: Zilliz Cloud (Milvus serverless)
- **Embeddings**: OpenAI text-embedding-3-small
- **Storage Local**: `~/.context/merkle/` (indexing state), `memory.jsonl` (knowledge graph), `context.db` (memory keeper)

### SIRE Backend
- **Database**: PostgreSQL 17.4 (Supabase)
- **ORM/Queries**: Supabase RPC functions
- **Migrations**: Supabase CLI
- **Field Mapping**: `src/lib/sire/field-mappers.ts`
- **Compliance Engine**: `src/lib/compliance-chat-engine.ts`

### Testing
- **MCP**: Token measurement before/after, semantic query validation
- **SIRE**: SQL validation, API testing, end-to-end compliance flow

---

## 🔧 DESARROLLO - FASES

### FASE 1: Reinicio y Verificación MCP Servers (5 min)

**Objetivo:** Cargar los 4 nuevos MCP servers y verificar conectividad

**Agente:** **@agent-infrastructure-monitor**

**Entregables:**
1. Claude Code reiniciado con 5 MCP servers activos
2. Verificación `/mcp` muestra todos conectados
3. Diagnóstico de cualquier error de conexión

**Archivos a verificar:**
- `~/.claude.json` - Configuración de 5 MCP servers

**Testing:**
- Ejecutar `/mcp` en Claude Code
- Verificar 5 servers "✓ connected":
  - supabase
  - claude-context
  - knowledge-graph
  - memory-keeper
  - context7
- Si alguno falla: Revisar `~/.claude/debug/latest`

**Criterio de éxito:** 5/5 servers conectados sin errores

---

### FASE 2: Pruebas de Búsqueda Semántica (10 min)

**Objetivo:** Validar claude-context funciona correctamente con codebase indexado

**Agente:** **@agent-infrastructure-monitor**

**Entregables:**
1. 3 búsquedas semánticas ejecutadas
2. Documentación de resultados vs grep tradicional
3. Token comparison measurements

**Tareas:**
1. Ejecutar 3 búsquedas semánticas:
   - Query 1: "guest authentication logic"
   - Query 2: "SIRE compliance data validation"
   - Query 3: "matryoshka embeddings implementation"
   - Tool: `mcp__claude-context__search_code`

**Testing:**
- Al menos 2 de 3 queries retornan resultados relevantes
- Snippets de código incluidos
- Tiempo respuesta < 2 segundos
- Comparar con método tradicional (grep + read)

**Criterio de éxito:** ≥2/3 queries exitosas + token reduction documentada

---

### FASE 3: Knowledge Graph Setup Básico (15 min)

**Objetivo:** Configurar estructura básica de Knowledge Graph

**Agente:** **@agent-infrastructure-monitor**

**Entregables:**
1. 10 entidades principales creadas
2. 8 relaciones básicas mapeadas
3. 3 observaciones arquitectónicas guardadas
4. Validación de queries al graph

**Entidades a crear:**
- properties (Hotel properties - multi-tenant)
- accommodation_units (Rooms/units)
- guests (Guest users)
- guest_reservations (Booking records)
- compliance_submissions (SIRE compliance data)
- chat_sessions (Conversational AI sessions)
- premium_chat (Premium tier)
- matryoshka_embeddings (Efficient embeddings)
- sire_integration (Gov compliance)
- muva_tourism (Tourism system)

**Relaciones básicas:**
- properties → has_many → accommodation_units
- properties → has_many → chat_sessions
- guests → has_many → guest_reservations
- guest_reservations → has_one → compliance_submissions
- chat_sessions → belongs_to → guests
- chat_sessions → belongs_to → properties
- premium_chat → uses → matryoshka_embeddings
- compliance_submissions → validates_with → sire_integration

**Observaciones iniciales:**
1. "Why RPC functions instead of SQL?" → "98% token reduction (17,700→345 tokens, Oct 2025)"
2. "Multi-tenant isolation strategy" → "Row Level Security (RLS) policies on properties, accommodation_units, chat_sessions"
3. "Matryoshka embeddings config" → "1536 full → 512 truncated for speed in premium chat"

**Archivos a crear/modificar:**
- `.claude-memory/memory.jsonl` (auto-creado por knowledge-graph MCP)

**Testing:**
- Query: "What tables are related to SIRE compliance?"
- Resultado esperado: guest_reservations, compliance_submissions, sire_integration + relaciones

**Criterio de éxito:** Knowledge Graph responde queries arquitectónicas correctamente

---

### FASE 4: Memory Keeper Setup Básico (10 min)

**Objetivo:** Configurar Memory Keeper y guardar decisiones críticas

**Agente:** **@agent-infrastructure-monitor**

**Entregables:**
1. 5 memories críticas guardadas
2. Validación de persistencia (reinicio test)
3. Recovery de memories en nueva sesión

**Memories a guardar:**

**Memory 1: "Database Query Pattern Policy"**
```
PRIMARY: Use RPC functions like get_accommodation_unit_by_id()
SECONDARY: Direct SQL via MCP for ad-hoc analysis
EMERGENCY ONLY: execute_sql() RPC
Rationale: 98% token reduction + type safety
Source: docs/architecture/DATABASE_QUERY_PATTERNS.md
```

**Memory 2: "SIRE Compliance Extension Status"**
```
Phase: Planning complete, ready for FASE 10
Missing: 9 SIRE fields in guest_reservations
Timeline: 7h estimated (3 phases)
Docs: plan.md FASE 10-12, docs/sire/CODIGOS_OFICIALES.md
```

**Memory 3: "Infrastructure Stack"**
```
Migrated Vercel→VPS Hostinger (Oct 4, 2025)
Stack: Nginx + PM2 + Let's Encrypt SSL
NEVER create vercel.json (obsolete)
```

**Memory 4: "Known Issues"**
```
MotoPress: requires admin auth + credential encryption
Hooks: post-tool-use must be manually enabled in Claude Code settings
Context management: max 10-15 /clear before hard reset needed
```

**Memory 5: "MCP Optimization Status"**
```
Date: Oct 8, 2025
Completed: MCP servers configured and codebase fully indexed (818 files, 33,257 chunks)
Status: Ready for FASE 1 execution
Next: Complete FASE 1-9 setup, then SIRE compliance (FASE 10-12)
Goal: 40-60% token reduction in code queries
```

**Archivos a crear:**
- `context.db` (auto-creado por memory-keeper MCP en project root)

**Testing:**
- Guardar memories
- Reiniciar Claude Code
- Query: "What is the database query pattern policy?"
- Resultado esperado: Memory Keeper recupera decisión sin leer archivos

**Criterio de éxito:** Memories persisten y se recuperan correctamente en nueva sesión

---

### FASE 5: Context7 Testing (5 min)

**Objetivo:** Validar acceso a docs oficiales sin consumir tokens

**Agente:** **@agent-infrastructure-monitor**

**Entregables:**
1. 2 queries de documentación ejecutadas
2. Validación de resultados actualizados
3. Token comparison vs leer docs locales

**Queries a ejecutar:**
- Query 1: "Next.js 15 app router server actions"
- Query 2: "React 19 use hook documentation"
- Tool: `search_docs` (context7)

**Testing:**
- Retorna docs oficiales actualizadas (2024-2025)
- No consume tokens de lectura local
- Respuesta relevante y precisa
- Comparar tokens con método tradicional

**Criterio de éxito:** Ambas queries retornan docs oficiales correctas con 0 tokens de archivos locales

---

### FASE 6: Medición de Reducción de Tokens (15 min) ✅ COMPLETADA

**Objetivo:** Comparar consumo de tokens antes/después de MCP

**Agente:** **@agent-infrastructure-monitor**

**Estado:** ✅ Completada (Oct 9, 2025)

**Resultados:**
- **Reducción Medida (Q1-Q2):** 90.4% promedio
- **Reducción Proyectada (Q3-Q5):** 95.3% promedio full stack
- **Queries Exitosas:** 5/5 superaron target 40%
- **Outliers:** 0 (todas las queries mejoraron significativamente)

**Entregables:**
1. Benchmark de 5 queries comunes del proyecto ✅
2. Tabla comparativa ANTES (grep/read) vs DESPUÉS (MCP) ✅
3. Cálculo de reducción promedio en porcentaje ✅
4. Documentación de findings ✅

**Queries a medir:**

**Query 1: "¿Dónde está la lógica de SIRE compliance?"**
- ANTES: Grep "sire.*compliance" + Read 5-10 archivos (~10K-15K tokens estimados)
- DESPUÉS: `mcp__claude-context__search_code` con query semántico
- Medir tokens con `/context`

**Query 2: "¿Cómo funciona matryoshka embeddings?"**
- ANTES: Read implementation files (~5K-8K tokens)
- DESPUÉS: Semantic search
- Medir tokens

**Query 3: "¿Qué relación hay entre reservations y chat_sessions?"**
- ANTES: Read schema.sql + migrations (~10K tokens)
- DESPUÉS: Knowledge Graph query
- Medir tokens

**Query 4: "¿Por qué migramos de Vercel a VPS?"**
- ANTES: Read CLAUDE.md + docs (~5K tokens)
- DESPUÉS: Memory Keeper query
- Medir tokens

**Query 5: "¿Cuál es el estado del proyecto SIRE extension?"**
- ANTES: Read plan.md + TODO.md (~8K tokens)
- DESPUÉS: Memory Keeper query
- Medir tokens

**Fórmula de reducción:**
```
Reducción % = ((Tokens_ANTES - Tokens_DESPUÉS) / Tokens_ANTES) × 100
```

**Archivos a crear:**
- `docs/mcp-optimization/TOKEN_BENCHMARKS.md` - Tabla comparativa completa

**Testing:**
- Calcular reducción promedio
- Objetivo: >40% reducción promedio
- Documentar outliers (queries que no mejoraron)

**Criterio de éxito:** ≥40% reducción en ≥4 de 5 queries

---

### FASE 7: Documentación MCP Final (10 min)

**Objetivo:** Documentar setup completo de MCP servers

**Agente:** **@agent-infrastructure-monitor**

**Entregables:**
1. Sección nueva en CLAUDE.md con MCP servers
2. Archivo `MCP_SERVERS_RESULTS.md` con benchmarks
3. Troubleshooting guide
4. Quick start para nuevas sesiones

**Archivos a crear/modificar:**

**1. Actualizar CLAUDE.md:**
Agregar sección al inicio:
```markdown
## 🚀 MCP SERVERS CONFIGURADOS (Oct 2025)

**Stack de Optimización de Tokens:**

1. **claude-context** (Semantic Code Search)
   - Indexación: Zilliz Cloud + OpenAI embeddings
   - Reducción: ~XX% tokens en code queries (medido)
   - Tools: index_codebase, search_code, get_indexing_status

2. **knowledge-graph** (Relaciones de Entidades)
   - Storage: memory.jsonl local
   - Uso: Arquitectura del proyecto persistente
   - Entidades mapeadas: 10 (Properties, Guests, SIRE, etc.)

3. **memory-keeper** (Decisiones Arquitectónicas)
   - Storage: SQLite context.db
   - Uso: Tracking de decisiones y progreso
   - Memories: Database patterns, SIRE status, infrastructure

4. **context7** (Docs Oficiales)
   - Docs: React 19, Next.js 15, TypeScript
   - Zero storage local

5. **supabase** (Database Operations)
   - Ya activo previamente

**Resultados medidos:**
- Code search: XX% reducción tokens
- Architecture queries: XX% reducción
- Decision retrieval: XX% reducción
- Promedio general: XX% reducción

**Fecha implementación:** Octubre 8, 2025
```

**2. Crear `docs/optimization/MCP_SERVERS_RESULTS.md`:**
- Setup completo realizado
- Benchmarks antes/después (tabla de Query 1-5)
- Casos de uso recomendados por MCP server
- Troubleshooting común (server no conecta, indexación lenta, etc.)

**Testing:**
- CLAUDE.md contiene nueva sección
- MCP_SERVERS_RESULTS.md existe y está completo
- Todos los resultados medidos documentados con porcentajes reales

**Criterio de éxito:** Documentación permite replicar setup en otro proyecto

---

### FASE 8: Knowledge Graph COMPLETO (15 min)

**Objetivo:** Mapeo COMPLETO de todas las entidades y relaciones de InnPilot

**Agente:** **@agent-infrastructure-monitor**

**Entregables:**
1. 20+ entidades del proyecto completo (incluye features específicos)
2. 30+ relaciones arquitectónicas detalladas
3. 10+ observaciones de decisiones técnicas
4. Validación de queries complejas

**Entidades adicionales a crear (más allá de FASE 3):**

**Features:**
- motopress_integration (Property management sync)
- whatsapp_integration (Guest communication)
- anthropic_claude_api (Conversational AI)
- openai_embeddings (Embedding generation)
- supabase_rls (Row Level Security)

**Infraestructura:**
- vps_hostinger (Production server)
- nginx_reverse_proxy (Web server)
- pm2_process_manager (Process management)
- lets_encrypt_ssl (SSL certificates)

**SIRE Específico:**
- sire_field_mappers (Conversational → SIRE data transformation)
- sire_codigos_oficiales (Country/city code catalogs)
- sire_report_submission (External API integration)

**Relaciones adicionales (arquitectura completa):**

**Multi-tenant:**
- properties → owns → accommodation_units (1:N)
- properties → has_many → guests (via reservations) (1:N)
- properties → isolates_via → supabase_rls (1:1)

**Compliance Flow:**
- guests → initiates → chat_sessions (1:N)
- chat_sessions → extracts_to → compliance_submissions (1:1)
- compliance_submissions → populates → guest_reservations (1:1)
- compliance_submissions → validates_with → sire_field_mappers (N:1)
- sire_field_mappers → uses → sire_codigos_oficiales (N:1)

**AI Features:**
- chat_sessions → powered_by → anthropic_claude_api (N:1)
- premium_chat → uses → matryoshka_embeddings (1:1)
- matryoshka_embeddings → generated_by → openai_embeddings (N:1)

**Integrations:**
- properties → syncs_with → motopress_integration (1:1)
- guests → notified_via → whatsapp_integration (N:1)

**Infrastructure:**
- properties → deployed_on → vps_hostinger (N:1)
- vps_hostinger → serves_via → nginx_reverse_proxy (1:1)
- nginx_reverse_proxy → manages_with → pm2_process_manager (1:1)
- vps_hostinger → secured_by → lets_encrypt_ssl (1:1)

**Observaciones adicionales (decisiones técnicas):**

4. "MotoPress Integration Security"
   - Implementation: Admin-only with credential encryption
   - Reason: Protect third-party API keys
   - Source: `src/lib/motopress/` implementation

5. "Matryoshka Truncation Strategy"
   - Full: 1536 dimensions for embeddings
   - Truncated: 512 dimensions for real-time chat
   - Tradeoff: 3x speed improvement, minimal accuracy loss
   - Source: Premium chat performance benchmarks

6. "SIRE Code Catalog Management"
   - Storage: JSON files in `_assets/sire/`
   - Countries: 250 (SIRE proprietary codes, not ISO 3166-1)
   - Cities: 1,122 (DIVIPOLA codes)
   - Helper: `_assets/sire/codigos-sire.ts`
   - Reason: Static catalogs, no DB overhead

7. "Row Level Security Enforcement"
   - Tables: properties, accommodation_units, chat_sessions, guest_reservations
   - Policy: `tenant_id` must match authenticated property
   - Bypass: Service role for admin operations
   - Source: Supabase RLS policies

8. "Vercel → VPS Migration"
   - Date: October 4, 2025
   - Reason: Cost optimization + cron job support
   - Stack: Nginx + PM2 + Let's Encrypt
   - Impact: Zero downtime deployment

9. "Hooks Configuration"
   - Type: post-tool-use hook for error logging
   - File: `.claude/errors.jsonl`
   - Requirement: Must be manually enabled in Claude Code settings
   - Discovery: October 6, 2025 during health check

10. "Context Management Strategy"
    - Limit: 10-15 `/clear` commands before context bloat
    - Hard reset: Close Claude Code + reopen (fresh session)
    - External memory: SNAPSHOT.md + MCP servers
    - Reason: Accumulated summaries degrade performance

**Archivos a actualizar:**
- `.claude-memory/memory.jsonl` (expanded with all entities/relations/observations)

**Testing:**
- Query compleja 1: "Show me the complete compliance flow from guest chat to SIRE submission"
- Query compleja 2: "What infrastructure components are used in production?"
- Query compleja 3: "How do matryoshka embeddings integrate with premium chat?"
- Resultado esperado: Knowledge Graph responde con entidades + relaciones completas

**Criterio de éxito:** Queries arquitectónicas complejas respondidas con contexto completo

---

### FASE 9: Memory Keeper COMPLETO (10 min)

**Objetivo:** Migración COMPLETA de decisiones de CLAUDE.md y SNAPSHOT.md a Memory Keeper

**Agente:** **@agent-infrastructure-monitor**

**Entregables:**
1. 15+ memories de decisiones técnicas
2. 5+ memories de estado de proyectos
3. 10+ memories de bugs conocidos y patterns
4. Validación de recovery en nueva sesión

**Memories adicionales a guardar (más allá de FASE 4):**

**Decisiones Arquitectónicas:**

**Memory 6: "Authentication Strategy"**
```
Guest authentication: Magic links via email
Property authentication: Email/password + session
Third-party (MotoPress): Admin-only with encrypted credentials
Source: src/app/api/auth/ implementation
```

**Memory 7: "Embedding Strategy"**
```
Provider: OpenAI text-embedding-3-small
Dimensions: 1536 (full) for storage, 512 (truncated) for real-time
Use cases:
- Premium chat: Semantic search in conversation history
- Matryoshka: Flexible dimension truncation for speed/accuracy tradeoff
Source: src/lib/embeddings/ + premium chat implementation
```

**Memory 8: "Database Connection Pattern"**
```
Client-side: Supabase client with anon key + RLS
Server-side: Service role for admin operations
Migrations: Supabase CLI migrations (never execute_sql in prod)
Source: src/lib/supabase/client.ts
```

**Memory 9: "Multi-Tenant Isolation"**
```
Strategy: Row Level Security (RLS) policies
Enforced on: properties, accommodation_units, chat_sessions, guest_reservations
Policy: tenant_id must match authenticated property
Bypass: Service role for migrations and admin
Source: Supabase RLS policies in migrations
```

**Memory 10: "SIRE Field Mapping"**
```
Conversational data → SIRE format
Mapper: src/lib/sire/field-mappers.ts
Code catalogs: _assets/sire/codigos-sire.ts
Validations: Regex patterns + country/city code lookup
Source: docs/sire/FASE_3.1_ESPECIFICACIONES_CORREGIDAS.md
```

**Estado de Proyectos:**

**Memory 11: "SIRE Compliance Extension"**
```
Status: ~80% complete (planning done, ready for FASE 10)
Missing: 9 SIRE fields in guest_reservations table
Timeline: 7 hours (3 phases: migration, backend, testing)
Agents: @agent-database-agent (primary), @agent-backend-developer (secondary)
Docs: plan.md FASE 10-12, TODO.md, sire-compliance-prompt-workflow.md
Next step: Execute FASE 10 (Database migration)
```

**Memory 12: "Mobile-First Chat Interface"**
```
Status: Planned (not started)
Goal: Fullscreen mobile-first chat UI optimized for iPhone 15/14, Pixel 8, Galaxy S24
Strategy: Dual environment (dev + prod)
Docs: plan.md, TODO.md, mobile-first-prompt-workflow.md in project files
Agent: @agent-ux-interface
Next step: Execute FASE 0 (dual environment setup)
```

**Memory 13: "MCP Optimization Project"**
```
Status: In progress (FASE 1-7 complete as of Oct 8, 2025)
Current phase: FASE 8 (Knowledge Graph complete), FASE 9 (Memory Keeper complete)
Next: FASE 10-12 (SIRE compliance)
Results: XX% average token reduction (measured in FASE 6)
Agents: @agent-infrastructure-monitor (primary for MCP)
Docs: plan.md, TODO.md, mcp-optimization-prompt-workflow.md
```

**Bugs Conocidos y Patterns:**

**Memory 14: "MotoPress Sync Known Issues"**
```
Issue: MotoPress webhook occasionally fails with 401 Unauthorized
Cause: Admin credentials not encrypted in early versions
Fix: Implemented credential encryption + admin-only access
Status: Resolved (Oct 2025)
Prevention: Never store third-party credentials in plain text
Source: src/lib/motopress/ implementation notes
```

**Memory 15: "Hooks Configuration Gotcha"**
```
Issue: Hooks defined in .claude/hooks/ but not executing
Cause: Hooks must be manually enabled in Claude Code settings
Discovery: Oct 6, 2025 health check
Fix: Settings → Hooks → Enable post-tool-use hook
Verification: Run intentional error, check .claude/errors.jsonl exists
Source: docs/development/CLAUDE_HOOKS_SETUP.md
```

**Memory 16: "Context Bloat Pattern"**
```
Issue: After 10-15 /clear commands, Claude mentions irrelevant old context
Cause: Accumulated summaries (each /clear adds ~5-10K tokens)
Fix: Hard reset (Cmd+Q Claude Code, reopen fresh session)
Prevention: Use SNAPSHOT.md + MCP servers as external memory instead of /clear
Limit: Max 10-15 /clear before hard reset needed
Source: CLAUDE.md context management policy
```

**Memory 17: "Edit Tool String Matching"**
```
Pattern: Edit tool requires byte-perfect string match
Issue: Using memory/paraphrasing causes "String Not Found" errors
Solution: Hybrid workflow:
  - Simple edits (1-2 lines, unique strings): Edit directly
  - Complex edits (lists 3+, sub-bullets): Read first → Copy exact text → Edit
Tradeoff: Read costs ~500 tokens but guarantees 100% success
Source: CLAUDE.md development methodology
```

**Memory 18: "Database Query Optimization Pattern"**
```
Hierarchy (by token efficiency):
1. RPC functions (PRIMARY): get_accommodation_unit_by_id() - 98% token reduction
2. Direct SQL via MCP (SECONDARY): Ad-hoc analysis only
3. execute_sql() RPC (EMERGENCY): One-time migrations/fixes only

Never use execute_sql() in:
- Regular application code
- Scheduled scripts (sync, cron jobs)
- API endpoints
- Any code that runs > once

Source: docs/architecture/DATABASE_QUERY_PATTERNS.md
Measured: Oct 2025 (17,700 → 345 tokens = 98.1% reduction)
```

**Memory 19: "Premium Chat Performance Pattern"**
```
Optimization: Matryoshka embedding truncation
Full dimensions: 1536 (stored for accuracy)
Truncated dimensions: 512 (used for real-time search)
Performance gain: 3x speed improvement
Accuracy loss: Minimal (<2% retrieval quality)
Use case: Premium chat semantic search in conversation history
Source: Premium chat performance benchmarks
```

**Memory 20: "SIRE Code Catalog Strategy"**
```
Storage: Static JSON files (not database)
Location: _assets/sire/
Files:
  - codigos-pais.json (250 countries, SIRE proprietary codes)
  - ciudades-colombia.json (1,122 cities, DIVIPOLA codes)
  - codigos-sire.ts (helper functions)

Reason: Static catalogs, no DB queries overhead
Update frequency: Rarely (government updates)
Source: docs/sire/CODIGOS_OFICIALES.md
```

**Archivos a actualizar:**
- `context.db` (SQLite database expanded with all memories)

**Testing:**
- Reiniciar Claude Code (simular nueva sesión)
- Query: "What are the known issues with MotoPress integration?"
- Query: "What is the SIRE field mapping strategy?"
- Query: "What is the status of the mobile-first chat project?"
- Resultado esperado: Memory Keeper recupera todas las memories sin leer archivos

**Criterio de éxito:** Todas las memories críticas recuperables en nueva sesión

---

### FASE 10: SIRE - Database Migration (2h)

**Objetivo:** Agregar 9 campos SIRE a `guest_reservations` con validaciones y constraints

**Agentes:** **@agent-database-agent** (Principal), **@agent-infrastructure-monitor** (Revisión)

**Entregables:**
1. Migración SQL con 9 nuevas columnas
2. Constraints para tipos de documento válidos
3. Índices para búsquedas por documento
4. Script de migración de datos desde `compliance_submissions`

**Archivos a crear/modificar:**
- `supabase/migrations/20251007000000_add_sire_fields_to_guest_reservations.sql` (NUEVO)
- `scripts/migrate-compliance-data-to-reservations.sql` (NUEVO - opcional)

**Campos a agregar:**
```sql
ALTER TABLE public.guest_reservations ADD COLUMN
  -- SIRE Identity Fields
  document_type VARCHAR(2),              -- '3', '5', '10', '46'
  document_number VARCHAR(15),           -- Pasaporte/cédula 6-15 chars (sin guiones)
  birth_date DATE,                       -- Fecha de nacimiento

  -- SIRE Name Fields (separados, con acentos)
  first_surname VARCHAR(50),             -- Primer apellido (MAYÚSCULAS, con acentos)
  second_surname VARCHAR(50),            -- Segundo apellido (opcional, PUEDE estar vacío)
  given_names VARCHAR(50),               -- Nombres (MAYÚSCULAS, con acentos)

  -- SIRE Country Codes (soportan ISO 3166-1 + DIVIPOLA)
  nationality_code VARCHAR(3),           -- Código país nacionalidad 1-3 dígitos (ej: "840")
  origin_country_code VARCHAR(6),        -- País/ciudad procedencia 1-6 dígitos
  destination_country_code VARCHAR(6);   -- País/ciudad destino 1-6 dígitos
```

**Validaciones (Constraints):**
```sql
-- Tipo de documento válido (SOLO 4 códigos oficiales SIRE)
ALTER TABLE guest_reservations ADD CONSTRAINT check_document_type
  CHECK (document_type IS NULL OR document_type IN ('3', '5', '10', '46'));

-- Número de documento alfanumérico 6-15 chars
ALTER TABLE guest_reservations ADD CONSTRAINT check_document_number_format
  CHECK (document_number IS NULL OR (LENGTH(document_number) BETWEEN 6 AND 15 AND document_number ~ '^[A-Z0-9]+$'));

-- Apellidos solo letras (incluyendo acentos y Ñ), máx 50 chars
ALTER TABLE guest_reservations ADD CONSTRAINT check_first_surname_format
  CHECK (first_surname IS NULL OR first_surname ~ '^[A-ZÁÉÍÓÚÑ ]{1,50}$');

ALTER TABLE guest_reservations ADD CONSTRAINT check_second_surname_format
  CHECK (second_surname IS NULL OR second_surname ~ '^[A-ZÁÉÍÓÚÑ ]{0,50}$');

-- Nombres solo letras (incluyendo acentos), máx 50 chars
ALTER TABLE guest_reservations ADD CONSTRAINT check_given_names_format
  CHECK (given_names IS NULL OR given_names ~ '^[A-ZÁÉÍÓÚÑ ]{1,50}$');

-- Código nacionalidad numérico 1-3 dígitos
ALTER TABLE guest_reservations ADD CONSTRAINT check_nationality_code_format
  CHECK (nationality_code IS NULL OR nationality_code ~ '^\d{1,3}$');

-- Códigos lugar (procedencia/destino) 1-6 dígitos (soporta ISO + DIVIPOLA)
ALTER TABLE guest_reservations ADD CONSTRAINT check_origin_code_format
  CHECK (origin_country_code IS NULL OR origin_country_code ~ '^\d{1,6}$');

ALTER TABLE guest_reservations ADD CONSTRAINT check_destination_code_format
  CHECK (destination_country_code IS NULL OR destination_country_code ~ '^\d{1,6}$');
```

**Índices:**
```sql
-- Búsquedas por documento (compliance audits)
CREATE INDEX idx_guest_reservations_document ON guest_reservations(document_number) WHERE document_number IS NOT NULL;

-- Búsquedas por nacionalidad (reportes)
CREATE INDEX idx_guest_reservations_nationality ON guest_reservations(nationality_code) WHERE nationality_code IS NOT NULL;
```

**Testing:**
- Verificar que migración aplica sin errores
- Verificar que constraints funcionan (rechaza valores inválidos)
- Verificar que índices se crean correctamente
- Verificar que datos existentes NO se rompen (campos nullable)

**Criterio de éxito:** Migración completa en < 5 segundos, 0 errores, constraints validando

---

### FASE 11: SIRE - Backend Integration (3h)

**Objetivo:** Actualizar compliance engine y APIs para usar nuevos campos SIRE

**Agentes:** **@agent-backend-developer** (Principal), **@agent-infrastructure-monitor** (Revisión)

**Entregables:**
1. Compliance chat engine actualizado (persiste en guest_reservations)
2. API `/api/reservations/list` retorna campos SIRE
3. Función helper para sincronizar compliance_submissions → guest_reservations
4. TypeScript types actualizados

**Archivos a modificar:**

**1. Update TypeScript Types:**
- `src/lib/compliance-chat-engine.ts`
  - Agregar campos SIRE a `GuestReservation` interface

**2. Update Compliance Engine:**
- `src/lib/compliance-chat-engine.ts`
  - Función nueva: `updateReservationWithComplianceData()`
  ```typescript
  async function updateReservationWithComplianceData(
    reservationId: string,
    sireData: SIREData
  ): Promise<void> {
    const { data, error } = await supabase
      .from('guest_reservations')
      .update({
        document_type: sireData.tipo_documento,
        document_number: sireData.numero_identificacion,
        birth_date: parseSIREDate(sireData.fecha_nacimiento),
        first_surname: sireData.primer_apellido,
        second_surname: sireData.segundo_apellido,
        given_names: sireData.nombres,
        nationality_code: sireData.codigo_nacionalidad,
        origin_country_code: sireData.lugar_procedencia,
        destination_country_code: sireData.lugar_destino,
      })
      .eq('id', reservationId)

    if (error) throw error
  }
  ```

**3. Update Reservation API:**
- `src/app/api/reservations/list/route.ts`
  - Agregar campos SIRE a SELECT query
  - Actualizar return type para incluir campos compliance

**4. Helper: Sync Script:**
- `scripts/sync-compliance-to-reservations.ts` (NUEVO)
  - Lee `compliance_submissions` exitosas
  - Actualiza `guest_reservations` con datos SIRE
  - Log de resultados (cuántos actualizados)

**Testing:**
- Test unitario: `parseSIREDate()` convierte DD/MM/YYYY → Date
- Test API: `/api/reservations/list` retorna nuevos campos
- Test integration: Compliance chat → persiste en guest_reservations
- Test script: Sync pobla datos correctamente

**Criterio de éxito:** Compliance engine persiste datos + API retorna campos SIRE

---

### FASE 11.6: SIRE - UI Integration (45 min)

**Objetivo:** Integrar componentes UI de compliance con el nuevo backend SIRE

**Agente:** **@agent-ux-interface** (Principal)

**Entregables:**
1. ComplianceReminder actualizado para verificar estado usando 9 campos SIRE
2. ComplianceConfirmation muestra los 9 campos para confirmación del usuario
3. ComplianceSuccess muestra referencias completas de submission
4. Validación del flujo end-to-end desde sidebar hasta persistencia en BD

**Archivos a modificar:**

**1. Update ComplianceReminder.tsx:**
- `src/components/Compliance/ComplianceReminder.tsx`
  - Verificar progreso usando campos SIRE en guest_reservations
  - Mostrar badge correcto: "No iniciado" / "En progreso" / "Completado"
  - Actualizar lógica de `progressPercentage` basada en campos completos

**2. Update ComplianceConfirmation.tsx:**
- `src/components/Compliance/ComplianceConfirmation.tsx`
  - Mostrar los 9 campos SIRE para verificación del usuario:
    - Tipo de documento y número
    - Fecha de nacimiento
    - Apellidos (primero y segundo)
    - Nombres
    - Nacionalidad
    - País/ciudad procedencia
    - País/ciudad destino
  - Formato human-readable con labels claros

**3. Update ComplianceSuccess.tsx:**
- `src/components/Compliance/ComplianceSuccess.tsx`
  - Mostrar información completa de submission exitosa
  - Incluir referencia SIRE si está disponible
  - Confirmar que datos se guardaron en guest_reservations

**Testing Manual:**
1. Abrir `/guest-chat/{conversation_id}` en navegador
2. Verificar que sidebar muestra banner "Registro SIRE"
3. Click en "Iniciar registro SIRE"
4. Completar flujo de compliance en chat
5. Verificar en ComplianceConfirmation que se muestran los 9 campos
6. Confirmar submission
7. Verificar en ComplianceSuccess que se muestra confirmación
8. Verificar en base de datos que los 9 campos se guardaron en guest_reservations

**Criterio de éxito:** Flujo completo sidebar → chat → confirmación → base de datos funciona sin errores

---

### FASE 12: SIRE - Testing & Validation (2h)

**Objetivo:** Validar que todo el flujo compliance funciona end-to-end

**Agentes:** **@agent-database-agent** + **@agent-backend-developer** (Ambos revisan)

**Entregables:**
1. Script de validación SQL (queries para verificar datos)
2. Test end-to-end de compliance flow
3. Documentación de testing results
4. Rollback plan si algo falla

**Archivos a crear:**

**1. Validation Queries:**
- `scripts/validate-sire-compliance-data.sql` (NUEVO)
```sql
-- 1. Verificar que campos SIRE existen
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'guest_reservations'
  AND column_name IN ('document_type', 'document_number', 'birth_date', ...);

-- 2. Contar reservas con datos compliance completos
SELECT
  COUNT(*) FILTER (WHERE document_number IS NOT NULL) as with_document,
  COUNT(*) FILTER (WHERE birth_date IS NOT NULL) as with_birthdate,
  COUNT(*) FILTER (WHERE first_surname IS NOT NULL) as with_surname,
  COUNT(*) as total_reservations
FROM guest_reservations;

-- 3. Validar formatos (deben pasar constraints)
SELECT id, document_type, document_number
FROM guest_reservations
WHERE document_type IS NOT NULL
  AND document_type NOT IN ('3', '5', '10', '46');
-- Debe retornar 0 rows

-- 4. Verificar migración de datos desde compliance_submissions
SELECT
  gr.id,
  gr.guest_name,
  gr.document_number as reservations_doc,
  cs.data->>'numero_identificacion' as submissions_doc
FROM guest_reservations gr
LEFT JOIN compliance_submissions cs ON cs.guest_id = gr.id
WHERE cs.status = 'success'
  AND gr.document_number IS NULL;
-- Debe retornar 0 rows (todos migrados)
```

**2. End-to-End Test:**
- `scripts/test-compliance-flow.ts` (NUEVO)
```typescript
// 1. Crear guest reservation de prueba
// 2. Simular compliance chat (extraer datos)
// 3. Verificar que datos se persisten en guest_reservations
// 4. Verificar que submission también se crea
// 5. Verificar que API retorna datos compliance
// 6. Cleanup: Borrar datos de prueba
```

**3. Rollback Plan:**
- `scripts/rollback-sire-fields-migration.sql` (NUEVO)
```sql
-- Si algo falla, revertir migración
ALTER TABLE guest_reservations
  DROP COLUMN IF EXISTS document_type,
  DROP COLUMN IF EXISTS document_number,
  DROP COLUMN IF EXISTS birth_date,
  DROP COLUMN IF EXISTS first_surname,
  DROP COLUMN IF EXISTS second_surname,
  DROP COLUMN IF EXISTS given_names,
  DROP COLUMN IF EXISTS nationality_code,
  DROP COLUMN IF EXISTS origin_country_code,
  DROP COLUMN IF EXISTS destination_country_code;
```

**Testing:**
- ✅ Migración aplica correctamente
- ✅ Constraints validan datos
- ✅ APIs retornan campos nuevos
- ✅ Compliance engine persiste datos
- ✅ Datos existentes migrados desde submissions
- ✅ End-to-end flow funciona

**Criterio de éxito:** 8/8 tests passing, 0 errores en validación SQL

---

### FASE 12.7: SIRE - UI Testing (30 min)

**Objetivo:** Validar que la integración UI-backend de compliance funciona correctamente

**Agente:** **@agent-ux-interface** (Principal)

**Entregables:**
1. Manual testing del flujo completo UI
2. Verificación de persistencia de datos en BD
3. Validación de experiencia del usuario
4. Documentación de hallazgos

**Testing Manual (Paso a Paso):**

**1. Setup inicial:**
- Abrir navegador en `http://localhost:3000/guest-chat/{conversation_id}` (usar conversación activa con reserva válida)
- Verificar que sidebar derecho está visible

**2. ComplianceReminder (Sidebar):**
- ✅ Banner "Registro SIRE" aparece en sidebar
- ✅ Badge muestra estado correcto ("No iniciado" / "En progreso" / "Completado")
- ✅ Botón "Iniciar registro SIRE" o "Continuar registro" funciona
- ✅ Click abre modal de compliance

**3. Compliance Chat Flow:**
- ✅ Modal se abre correctamente
- ✅ Completar flujo conversacional (extraer 9 datos SIRE)
- ✅ Chat valida y extrae correctamente los datos
- ✅ Al finalizar, abre ComplianceConfirmation

**4. ComplianceConfirmation (Modal):**
- ✅ Muestra los 9 campos SIRE para confirmación:
  - Tipo de documento (código + descripción legible)
  - Número de identificación
  - Fecha de nacimiento (formato DD/MM/YYYY)
  - Primer apellido
  - Segundo apellido (o vacío si no aplica)
  - Nombres
  - Nacionalidad (código + nombre país)
  - Procedencia (código + nombre)
  - Destino (código + nombre)
- ✅ Labels son claros y human-readable
- ✅ Botón "Confirmar" está habilitado
- ✅ Click en "Confirmar" envía datos al backend

**5. ComplianceSuccess (Modal):**
- ✅ Modal muestra confirmación de éxito
- ✅ Mensaje indica que datos se guardaron correctamente
- ✅ Muestra referencia SIRE (si está disponible)
- ✅ Botón "Cerrar" funciona correctamente

**6. Verificación en Base de Datos:**
```sql
-- Ejecutar en Supabase SQL Editor
SELECT
  id,
  guest_name,
  document_type,
  document_number,
  birth_date,
  first_surname,
  second_surname,
  given_names,
  nationality_code,
  origin_country_code,
  destination_country_code
FROM guest_reservations
WHERE id = '<reservation_id_from_test>';
-- Debe mostrar los 9 campos completos con datos del compliance flow
```
- ✅ Los 9 campos SIRE están completos (no NULL)
- ✅ Formatos son correctos (mayúsculas, códigos numéricos)
- ✅ Datos coinciden con los mostrados en ComplianceConfirmation

**7. Verificación de Estado (Recargar página):**
- Recargar página del guest chat
- ✅ Banner "Registro SIRE" muestra badge "Completado"
- ✅ `progressPercentage` es 100%
- ✅ No se puede iniciar registro de nuevo (ya completado)

**Criterio de éxito:**
- Flujo completo funciona sin errores
- Datos persisten correctamente en BD
- UI muestra información clara y precisa
- Estado de progreso se actualiza correctamente

---

## ✅ CRITERIOS DE ÉXITO

### MCP Optimization (FASE 1-9)

**Funcionalidad:**
- [ ] 5 MCP servers conectados (supabase, claude-context, knowledge-graph, memory-keeper, context7)
- [ ] Codebase indexado completamente con OpenAI embeddings
- [ ] 20+ entidades y 30+ relaciones mapeadas en Knowledge Graph
- [ ] 20+ memories de decisiones técnicas guardadas en Memory Keeper
- [ ] Semantic search funciona con ≥2/3 queries exitosas
- [ ] Context7 retorna docs oficiales correctamente

**Performance:**
- [ ] ≥40% reducción promedio de tokens (medido en 5 queries)
- [ ] Semantic search < 2 segundos respuesta
- [ ] Knowledge Graph responde queries complejas correctamente
- [ ] Memory Keeper recupera decisions en nueva sesión

**Documentation:**
- [ ] CLAUDE.md actualizado con sección MCP servers
- [ ] MCP_SERVERS_RESULTS.md creado con benchmarks
- [ ] TOKEN_BENCHMARKS.md con tabla comparativa
- [ ] Agent review docs en cada fase

### SIRE Compliance (FASE 10-12)

**Funcionalidad:**
- [ ] 9 campos SIRE agregados a `guest_reservations` con tipos correctos
- [ ] Constraints validan tipos de documento (3, 5, 10, 46)
- [ ] Constraints validan formatos (letras en nombres, numérico en códigos)
- [ ] Migración de datos desde `compliance_submissions` completa (100%)
- [ ] Compliance engine actualiza `guest_reservations` al extraer datos
- [ ] API `/api/reservations/list` retorna campos SIRE

**Data Integrity:**
- [ ] 0 errores en migración SQL
- [ ] 0 datos existentes corruptos
- [ ] Índices creados correctamente
- [ ] Foreign keys intactos

**Performance:**
- [ ] Migración completa en < 5 segundos
- [ ] Queries de API no degradadas
- [ ] Índices mejoran búsquedas por documento (< 10ms)

**Documentation:**
- [ ] Migración documentada con comentarios SQL
- [ ] TypeScript types actualizados (0 errores compilación)
- [ ] Testing results documentados en `TESTS.md`
- [ ] Rollback plan probado (en dev)

---

## 🤖 AGENTES REQUERIDOS

### 1. **@agent-infrastructure-monitor** (Principal - MCP Optimization)

**Responsabilidad:** Setup y testing de MCP servers, medición de performance, Knowledge Graph y Memory Keeper

**Tareas:**
- **FASE 1-7**: Setup técnico de 4 MCP servers, testing, medición tokens
- **FASE 8-9**: Mapeo completo de entidades/relaciones + migración de memories
- **Revisión**: Validar implementación de todas las fases MCP + proponer optimizaciones

**Archivos:**
- `~/.claude.json` (configuración MCP)
- `.claude-memory/memory.jsonl` (Knowledge Graph)
- `context.db` (Memory Keeper)
- `docs/mcp-optimization/` (documentación de fases)
- `docs/optimization/MCP_SERVERS_RESULTS.md`
- `docs/optimization/TOKEN_BENCHMARKS.md`

**Workflow de Revisión Post-Implementación:**
1. Validar que setup MCP está completo y funcional
2. Revisar benchmarks de reducción de tokens
3. Identificar queries que no mejoraron y proponer optimizaciones
4. Sugerir entidades/relaciones adicionales para Knowledge Graph
5. Proponer memories críticas adicionales para Memory Keeper
6. Documentar findings en `docs/mcp-optimization/fase-{N}/AGENT_REVIEW.md`

---

### 2. **@agent-database-agent** (Principal - SIRE Database)

**Responsabilidad:** Migraciones de base de datos, validaciones SQL, constraints

**Tareas:**
- **FASE 10**:
  - Crear migración con 9 campos SIRE
  - Agregar constraints de validación
  - Crear índices para búsquedas
  - Script de migración de datos desde compliance_submissions
  - Aplicar migración en dev
  - Verificar con queries SQL

- **FASE 12**:
  - Crear queries de validación
  - Ejecutar validaciones post-migración
  - Verificar integridad de datos
  - Crear rollback script

**Archivos:**
- `supabase/migrations/20251007000000_add_sire_fields_to_guest_reservations.sql`
- `scripts/migrate-compliance-data-to-reservations.sql`
- `scripts/validate-sire-compliance-data.sql`
- `scripts/rollback-sire-fields-migration.sql`
- `docs/mcp-optimization/fase-10/` (documentación SIRE DB)

**Workflow de Revisión Post-Implementación:**
1. Validar que migración aplicó sin errores
2. Verificar que todos los constraints están funcionando
3. Revisar índices creados y proponer optimizaciones
4. Validar migración de datos existentes (100% completo)
5. Proponer mejoras en validaciones SQL
6. Documentar findings en `docs/mcp-optimization/fase-10/AGENT_REVIEW.md`

---

### 3. **@agent-backend-developer** (Secundario - SIRE Backend)

**Responsabilidad:** Backend integration, APIs, compliance engine updates

**Tareas:**
- **FASE 11**:
  - Actualizar TypeScript types en compliance engine
  - Crear función `updateReservationWithComplianceData()`
  - Modificar API `/api/reservations/list` para retornar campos SIRE
  - Crear helper script para sync compliance → reservations
  - Testing de APIs

- **FASE 12**:
  - Crear test end-to-end de compliance flow
  - Ejecutar tests de integración
  - Validar que APIs funcionan correctamente

**Archivos:**
- `src/lib/compliance-chat-engine.ts`
- `src/app/api/reservations/list/route.ts`
- `scripts/sync-compliance-to-reservations.ts`
- `scripts/test-compliance-flow.ts`
- `docs/mcp-optimization/fase-11/` (documentación SIRE Backend)

**Workflow de Revisión Post-Implementación:**
1. Validar que compliance engine persiste datos correctamente
2. Revisar TypeScript types y proponer mejoras
3. Verificar que API retorna campos compliance
4. Validar end-to-end flow funciona sin errores
5. Proponer optimizaciones en sync script
6. Documentar findings en `docs/mcp-optimization/fase-11/AGENT_REVIEW.md`

---

### 4. **@agent-ux-interface** (Secundario - SIRE UI Integration)

**Responsabilidad:** UI integration para compliance flow con nuevos campos SIRE

**Tareas:**
- **FASE 11.6**:
  - Actualizar ComplianceReminder para verificar progreso usando 9 campos SIRE
  - Actualizar ComplianceConfirmation para mostrar los 9 campos para confirmación
  - Actualizar ComplianceSuccess para mostrar referencias completas de submission
  - Validar flujo end-to-end desde sidebar hasta persistencia en BD

- **FASE 12.7**:
  - Manual testing del flujo completo UI → chat → confirmación → BD
  - Verificación de persistencia de datos
  - Validación de experiencia del usuario
  - Documentación de hallazgos

**Archivos:**
- `src/components/Compliance/ComplianceReminder.tsx`
- `src/components/Compliance/ComplianceConfirmation.tsx`
- `src/components/Compliance/ComplianceSuccess.tsx`
- `src/components/Chat/GuestChatInterface.tsx`
- `docs/mcp-optimization/fase-11/` (documentación UI integration)
- `docs/mcp-optimization/fase-12/` (documentación testing)

**Workflow de Revisión Post-Implementación:**
1. Validar que ComplianceReminder muestra progreso correcto usando campos SIRE
2. Verificar que ComplianceConfirmation muestra los 9 campos con formato legible
3. Verificar que ComplianceSuccess muestra confirmación completa
4. Validar flujo end-to-end sin errores de UI
5. Proponer mejoras de UX basadas en testing manual
6. Documentar findings en `docs/mcp-optimization/fase-11/UI_INTEGRATION_REVIEW.md`

---

## 📂 ESTRUCTURA DE ARCHIVOS

```
/Users/oneill/Sites/apps/InnPilot/
├── .claude-memory/
│   └── memory.jsonl (Knowledge Graph - auto-creado)
├── context.db (Memory Keeper - auto-creado)
├── supabase/migrations/
│   └── 20251007000000_add_sire_fields_to_guest_reservations.sql (NUEVO)
├── scripts/
│   ├── migrate-compliance-data-to-reservations.sql (NUEVO)
│   ├── validate-sire-compliance-data.sql (NUEVO)
│   ├── rollback-sire-fields-migration.sql (NUEVO)
│   ├── sync-compliance-to-reservations.ts (NUEVO)
│   └── test-compliance-flow.ts (NUEVO)
├── src/lib/
│   └── compliance-chat-engine.ts (MODIFICAR)
├── src/app/api/reservations/list/
│   └── route.ts (MODIFICAR)
└── docs/
    ├── optimization/
    │   ├── MCP_SERVERS_RESULTS.md (NUEVO)
    │   └── TOKEN_BENCHMARKS.md (NUEVO)
    └── mcp-optimization/
        ├── fase-1/ (Reinicio MCP)
        │   ├── IMPLEMENTATION.md
        │   ├── CHANGES.md
        │   ├── TESTS.md
        │   ├── ISSUES.md
        │   └── AGENT_REVIEW.md (NUEVO - agent findings)
        ├── fase-2/ (Búsqueda semántica)
        │   └── (same structure)
        ├── fase-3/ (Knowledge Graph setup)
        ├── fase-4/ (Memory Keeper setup)
        ├── fase-5/ (Context7)
        ├── fase-6/ (Medición tokens)
        ├── fase-7/ (Docs MCP)
        ├── fase-8/ (KG COMPLETO)
        ├── fase-9/ (Memory COMPLETO)
        ├── fase-10/ (SIRE Database)
        ├── fase-11/ (SIRE Backend)
        └── fase-12/ (SIRE Testing)
```

---

## 📝 NOTAS IMPORTANTES

### Consideraciones Técnicas MCP

1. **Indexación Completa**: ✅ claude-context completó indexación del codebase (818 files, 33,257 chunks, Oct 8 2025). Ready for full semantic search capabilities.

2. **Reinicio Requerido**: Cambios en `~/.claude.json` requieren reinicio completo de Claude Code (Cmd+Q → reabrir).

3. **Storage Local**: Knowledge Graph usa `memory.jsonl`, Memory Keeper usa SQLite `context.db`. Ambos persisten entre sesiones.

4. **Token Reduction Variable**: Reducción de tokens varía por tipo de query:
   - Code search: 40-70% reducción
   - Architecture queries: 80-95% reducción (Knowledge Graph)
   - Decision retrieval: 90-98% reducción (Memory Keeper)

5. **Embeddings Cost**: OpenAI text-embedding-3-small ~$0.02 por 1M tokens. Indexación inicial InnPilot (~200K tokens código) = ~$0.004 ONE-TIME.

### Consideraciones Técnicas SIRE

1. **Campos Nullable**: Todos los campos SIRE son `NULL` por defecto para no romper:
   - Reservas existentes sin datos compliance
   - MotoPress sync (no envía estos campos)
   - Reservas manuales sin compliance

2. **Separación de Nombres**:
   - Actualmente: `guest_name` (texto libre "Juan García Pérez")
   - Nuevo: `first_surname`, `second_surname`, `given_names` (separados)
   - **NO reemplazar** `guest_name` (se mantiene para display)
   - Campos SIRE son adicionales para compliance

3. **Códigos de País y Ciudad**:
   - ✅ Catálogos oficiales SIRE disponibles (Octubre 6, 2025)
   - **Países**: `_assets/sire/codigos-pais.json` (250 países) - Códigos SIRE propietarios, NO ISO 3166-1
   - **Ciudades**: `_assets/sire/ciudades-colombia.json` (1,122 ciudades) - Códigos DIVIPOLA
   - **Helper TS**: `_assets/sire/codigos-sire.ts` (funciones de búsqueda)
   - Mapper: `src/lib/sire/field-mappers.ts` (usa códigos SIRE correctos)

4. **Migración de Datos Existentes**:
   - Solo migrar desde `compliance_submissions` con `status = 'success'`
   - Si hay múltiples submissions para mismo guest, usar la más reciente
   - Log de cuántos guest_reservations se actualizaron

5. **Testing en Dev Branch**:
   - Aplicar migración primero en dev branch de Supabase
   - Validar con datos de test
   - Solo después aplicar en producción

---

**Última actualización:** 8 Octubre 2025, 7:45 PM
**Próximo paso:** Ejecutar FASE 1 - Reinicio y verificación de MCP servers
