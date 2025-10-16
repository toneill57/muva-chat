# MCP Usage Policy - Enforcement Obligatorio

**Creado:** 2025-10-16
**Propósito:** Maximizar eficiencia y reducir consumo de tokens en 60-70%
**Status:** OBLIGATORIO - Violaciones = Desperdicio de $$

---

## 🚨 REGLA DE ORO: MCP-FIRST POLICY

**ANTES de usar CUALQUIER método tradicional (Bash, WebFetch, tsx inline), VERIFICAR si existe MCP equivalente.**

Si existe MCP → USAR MCP (sin excepciones)
Si NO existe MCP → Métodos tradicionales permitidos

---

## 📋 Matriz de Decisión: MCP vs Tradicional

| Tarea | ❌ NUNCA Usar | ✅ SIEMPRE Usar | Ahorro Tokens |
|-------|---------------|-----------------|---------------|
| **SQL Queries** | `npx tsx -e "createClient()..."` | `mcp__supabase__execute_sql` | 70% |
| **DB Schema** | `npx tsx + describe tables` | `mcp__supabase__list_tables` | 80% |
| **Framework Docs** | `WebFetch(https://nextjs.org/docs)` | `mcp__context7__get-library-docs` | 90% |
| **Library Lookup** | WebSearch + manual parsing | `mcp__context7__resolve-library-id` | 85% |
| **UI Testing** | `curl http://localhost:3000` | `mcp__playwright__browser_snapshot` | 92% |
| **Browser Automation** | Puppeteer manual | `mcp__playwright__browser_*` | 75% |
| **Project Memory** | Files scattered | `mcp__knowledge-graph__aim_*` | 60% |
| **Audit Tracking** | Manual docs | Knowledge-Graph entities | 70% |

---

## 🔴 REGLAS ESPECÍFICAS POR MCP

### 1. MCP Supabase (`mcp__supabase__*`)

**✅ USAR PARA:**
- Cualquier query SQL (SELECT, INSERT, UPDATE, DELETE)
- Listar tablas: `mcp__supabase__list_tables` con `schemas: ["public"]`
- Inspeccionar schema de base de datos
- Obtener datos de producción

**❌ NUNCA USAR:**
- `npx tsx -e "import { createClient } from '@supabase/supabase-js'..."` → PROHIBIDO
- tsx inline para queries SQL → PROHIBIDO
- Bash con createClient() → PROHIBIDO

**WORKAROUND CRÍTICO:**
```typescript
// ✅ CORRECTO
mcp__supabase__list_tables({
  project_id: "ooaumjzaztmutltifhoq",
  schemas: ["public"]  // OBLIGATORIO para evitar permission denied
})

// ❌ INCORRECTO (causará permission denied)
mcp__supabase__list_tables({
  project_id: "ooaumjzaztmutltifhoq"
  // schemas omitido → ERROR
})
```

**DDL Operations (CREATE/ALTER/DROP):**
- ⚠️ MCP Supabase NO funciona para DDL
- ✅ Usar Management API: `scripts/execute-ddl-via-api.ts`

---

### 2. MCP Context7 (`mcp__context7__*`)

**✅ USAR PARA:**
- Obtener docs oficiales de frameworks (Next.js, React, Supabase, etc.)
- Buscar ejemplos de código específicos
- Resolver nombres de librerías a IDs Context7

**❌ NUNCA USAR:**
- WebFetch a URLs de documentación → PROHIBIDO
- WebSearch para "next.js server actions docs" → PROHIBIDO
- Leer archivos markdown de docs localmente → PROHIBIDO (si existen docs oficiales)

**WORKFLOW CORRECTO:**
```typescript
// PASO 1: Resolver library ID
mcp__context7__resolve-library-id({ libraryName: "next.js" })
// Respuesta: /vercel/next.js

// PASO 2: Obtener docs específicos
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/vercel/next.js/v15.1.8",
  topic: "server actions",
  tokens: 1000  // Limitar para evitar overhead
})
```

**Ahorro Real:**
- Sin MCP: 25,000 tokens (página completa de docs)
- Con MCP: 2,400 tokens (solo contenido relevante)
- **Ahorro: 90%** ✅

---

### 3. MCP Playwright (`mcp__playwright__*`)

**✅ USAR PARA:**
- Testing de UI en localhost
- Navegación automatizada
- Snapshots estructurados del DOM (YAML)
- Verificar rendering de componentes React

**❌ NUNCA USAR:**
- `curl http://localhost:3000` → PROHIBIDO
- Bash para obtener HTML → PROHIBIDO
- WebFetch a localhost → PROHIBIDO

**WORKFLOW CORRECTO:**
```typescript
// Navegar
mcp__playwright__browser_navigate({ url: "http://localhost:3000" })

// Obtener snapshot estructurado
mcp__playwright__browser_snapshot()
// Retorna: YAML parseable del DOM

// Cerrar cuando termines
mcp__playwright__browser_close()
```

**Ahorro Real:**
- Sin MCP: 5,000 tokens (HTML crudo sin estructura)
- Con MCP: 400 tokens (YAML compacto)
- **Ahorro: 92%** ✅

---

### 4. MCP Knowledge-Graph (`mcp__knowledge-graph__aim_*`)

**✅ USAR PARA:**
- Tracking de auditorías y decisiones importantes
- Memoria persistente entre sesiones
- Relaciones entre entidades del proyecto
- Contextos separados (work, personal, project-specific)

**❌ NUNCA USAR:**
- Archivos markdown scattered para tracking → INEFICIENTE
- Comentarios en código para decisiones → NO PERSISTENTE
- TODOs en archivos random → DIFÍCIL DE BUSCAR

**WORKFLOW CORRECTO:**
```typescript
// Crear entidad de auditoría
mcp__knowledge-graph__aim_create_entities({
  context: "muva-project-audit",
  entities: [{
    name: "MCP_Audit_2025",
    entityType: "audit",
    observations: [
      "Auditoría realizada el 2025-10-16",
      "4/4 MCPs operacionales"
    ]
  }]
})

// Buscar auditorías previas
mcp__knowledge-graph__aim_search_nodes({
  context: "muva-project-audit",
  query: "audit"
})
```

---

## 💰 ROI Esperado

### Benchmark Actual (Antes de Policy)
- Tokens promedio por sesión: ~200,000
- Uso de MCPs: ~30% de los casos donde deberían usarse
- Eficiencia: BAJA ❌

### Target (Con Policy Enforcement)
- Tokens promedio por sesión: <80,000
- Uso de MCPs: 100% de los casos aplicables
- Eficiencia: ALTA ✅
- **Ahorro esperado: 60-70%**

---

## 🚫 PENALIZACIONES POR VIOLACIÓN

Si detectas que estás por usar un método tradicional cuando MCP está disponible:

1. **STOP** inmediatamente
2. **FLAG** la ineficiencia al usuario
3. **CORREGIR** usando el MCP apropiado
4. **DOCUMENTAR** el caso en Knowledge-Graph

**Ejemplo de FLAG:**
```
⚠️ VIOLACIÓN DE MCP-FIRST POLICY DETECTADA
Método tradicional: npx tsx para SQL query
MCP correcto: mcp__supabase__execute_sql
Tokens desperdiciados: ~350
Corrección aplicada ✅
```

---

## 📊 Métricas de Success

**KPIs a trackear:**
- [ ] 0 queries SQL vía tsx (100% vía MCP Supabase)
- [ ] 0 WebFetch de docs (100% vía Context7)
- [ ] 0 curl para UI testing (100% vía Playwright)
- [ ] Reducción de tokens/sesión: 200k → <80k
- [ ] Tiempo de respuesta: Reducción de 40% en operaciones DB/Docs

---

## 🔄 Health Check Diario

**Script:** `scripts/mcp-health-check.ts`

**Ejecutar cada mañana antes de desarrollo:**
```bash
npx tsx scripts/mcp-health-check.ts
```

**Output esperado:**
```
✅ Supabase MCP: OPERATIONAL (150ms)
✅ Context7 MCP: OPERATIONAL (300ms)
✅ Playwright MCP: OPERATIONAL (200ms)
✅ Knowledge-Graph MCP: OPERATIONAL (100ms)

Status: 4/4 MCPs ready
```

---

## 📚 Referencias

- **Auditoría Original:** `docs/infrastructure/MCP_AUDIT_2025-10-16.md`
- **MCP Setup:** `docs/optimization/MCP_SERVERS_RESULTS.md`
- **Supabase Workaround:** `docs/troubleshooting/MCP_SUPABASE_LIST_TABLES_WORKAROUND.md`
- **CLAUDE.md:** MCP-FIRST POLICY section

---

**ÚLTIMA ACTUALIZACIÓN:** 2025-10-16
**PRÓXIMA REVISIÓN:** 2025-10-30 (verificar cumplimiento de targets)
