# Dev-Public Sync Plan

**Objetivo:** Copiar Dev → Public. Fin.

**Duración Total:** 4 horas (3 fases)

**Last Updated:** Oct 3, 2025

---

## 🎯 Objetivo

Hacer que el ambiente **Public** (`/chat-mobile`) sea **IDÉNTICO** al ambiente **Dev** (`/chat-mobile-dev`).

**Dev es perfecto** = NO SE TOCA
**Public está desincronizado** = Se copia EXACTAMENTE de Dev

---

## 📋 FASES

### FASE 1: Backend Copy (2h) 🤖

**Objetivo:** Public engine = Dev engine (idéntico)

**Archivos a modificar:**
- `src/lib/public-chat-engine.ts`
- `src/lib/public-chat-session.ts`

**Tareas:**
1. Remover `extractTravelIntent()` de public-chat-engine.ts
2. Copiar system prompt de Dev → Public (character-for-character)
3. Actualizar history a 50 mensajes (como Dev)
4. Remover intent merge logic de updatePublicSession()
5. Verificar: 15 results, 400 chars preview (como Dev)

**Resultado:**
```typescript
// Dev engine
function buildMarketingSystemPrompt(session, searchResults, conversationMemories)
.slice(-50) // 50 messages history
.slice(0, 15) // 15 results
.substring(0, 400) // 400 chars

// Public engine (IDÉNTICO)
function buildMarketingSystemPrompt(session, searchResults, conversationMemories)
.slice(-50) // 50 messages history
.slice(0, 15) // 15 results
.substring(0, 400) // 400 chars
```

**Test:**
```bash
diff src/lib/dev-chat-engine.ts src/lib/public-chat-engine.ts
# Solo diferencias: nombres de funciones (Dev vs Public), nombres de tablas
```

---

### FASE 2: Frontend Copy (1h) 🎨

**Objetivo:** ChatMobile = DevChatMobileDev (idéntico)

**Archivos:**
- `src/components/Public/ChatMobile.tsx`
- `src/components/Dev/DevChatMobileDev.tsx` (source)

**Tareas:**
1. Leer DevChatMobileDev.tsx completo
2. Copiar EXACTAMENTE a ChatMobile.tsx
3. Ajustar imports si necesario
4. Mantener header cyan (mismo que Dev)
5. Mantener "🚧 DEV MODE" badge? NO (es solo para dev)

**Resultado:**
- Mismo layout fullscreen
- Mismo header cyan
- Mismo flujo de streaming
- Mismo markdown rendering
- Mismo photo carousel
- Mismo suggestions

**Test:**
```bash
# Visual test
npm run dev
# Abrir /chat-mobile-dev y /chat-mobile
# Deben verse IDÉNTICOS (excepto badge)
```

---

### FASE 3: Migration Script (1h) 🤖

**Objetivo:** Comando "migra" que compara y alerta diferencias

**Archivo a crear:**
- `scripts/migrate-dev-to-public.sh`

**Script:**
```bash
#!/bin/bash
echo "🔄 Comparing Dev vs Public..."

# Compare engines
diff src/lib/dev-chat-engine.ts src/lib/public-chat-engine.ts > diff-engines.txt

# Compare components
diff src/components/Dev/DevChatMobileDev.tsx src/components/Public/ChatMobile.tsx > diff-components.txt

# Verify config
grep -n "slice(-50)" src/lib/dev-chat-engine.ts
grep -n "slice(-50)" src/lib/public-chat-engine.ts

# Report
echo "✅ Comparison complete"
echo "Review diff-engines.txt and diff-components.txt"
```

**Comando slash:**
- Crear `.claude/commands/migrate.md`
- Usuario escribe: "migra"
- Sistema ejecuta script

---

## 🎯 Success Criteria

**Backend:**
- [ ] System prompt idéntico (0 diff)
- [ ] 50 messages history en ambos
- [ ] 15 results, 400 chars en ambos
- [ ] NO travel intent extraction en Public
- [ ] Build pasa sin errores

**Frontend:**
- [ ] ChatMobile = DevChatMobileDev (visual)
- [ ] Mismo header, mismo layout
- [ ] Streaming funciona igual
- [ ] Markdown funciona igual
- [ ] Photos funciona igual

**Migration:**
- [ ] Script "migra" funciona
- [ ] Reporta diferencias correctamente
- [ ] Tests pasan

---

## 🚫 Lo que NO vamos a hacer (por ahora)

❌ Header con dropdown de travel intent
❌ Diferenciación orange vs cyan
❌ Auto-fill de datos
❌ Frontend capturando travel intent

**Eso viene DESPUÉS**, cuando iteremos en Dev y nos guste el resultado.

---

## 📂 Archivos Involucrados

**Backend (FASE 1):**
- `src/lib/dev-chat-engine.ts` (source - NO TOCAR)
- `src/lib/public-chat-engine.ts` (target - copiar de Dev)
- `src/lib/dev-chat-session.ts` (source - NO TOCAR)
- `src/lib/public-chat-session.ts` (target - copiar de Dev)

**Frontend (FASE 2):**
- `src/components/Dev/DevChatMobileDev.tsx` (source - NO TOCAR)
- `src/components/Public/ChatMobile.tsx` (target - copiar de Dev)

**Migration (FASE 3):**
- `scripts/migrate-dev-to-public.sh` (crear)
- `.claude/commands/migrate.md` (crear)

---

## 🔄 Workflow Futuro

1. **Iterar en Dev:** Probar cambios en `/chat-mobile-dev`
2. **Validar:** Si funciona y nos gusta
3. **Migrar:** Ejecutar "migra" → copia Dev → Public
4. **Deploy:** Public va a producción

**Dev siempre es la fuente de verdad.**

---

**Status:** 📋 Plan simplificado - Ready to execute
**Next:** FASE 1 - Backend Copy (2h)
