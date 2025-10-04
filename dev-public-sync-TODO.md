# Dev-Public Sync TODO

**Objetivo:** Copiar Dev → Public. Fin.

**Total:** 4 horas (3 fases)

---

## FASE 1: Backend Copy (2h) 🤖

### 1.1 Remove Travel Intent from Public Engine (30m)

- [ ] Abrir `src/lib/public-chat-engine.ts`
- [ ] Remover línea 107: `extractTravelIntent(message)`
- [ ] Remover líneas 112-121: `mergedIntent` construction
- [ ] Actualizar call sites (líneas 124, 439)
- [ ] **Test:** `npm run build` (debe pasar)

### 1.2 Copy System Prompt Dev → Public (30m)

- [ ] Leer `src/lib/dev-chat-engine.ts` líneas 206-240
- [ ] Copiar EXACTAMENTE a `src/lib/public-chat-engine.ts` líneas 243-277
- [ ] Actualizar signature: `buildMarketingSystemPrompt(session, results, memories)` (3 params)
- [ ] **Test:**
  ```bash
  sed -n '206,240p' src/lib/dev-chat-engine.ts > /tmp/dev.txt
  sed -n '243,277p' src/lib/public-chat-engine.ts > /tmp/public.txt
  diff /tmp/dev.txt /tmp/public.txt
  # Expected: 0 differences
  ```

### 1.3 Update Message History to 50 (15m)

- [ ] Dev: `src/lib/dev-chat-engine.ts:259` → `.slice(-50)`
- [ ] Public: `src/lib/public-chat-engine.ts:296` → `.slice(-50)`
- [ ] Public streaming: `src/lib/public-chat-engine.ts:455` → `.slice(-50)`
- [ ] **Test:** `npm run build`

### 1.4 Remove Intent from Session Management (30m)

- [ ] Abrir `src/lib/public-chat-session.ts`
- [ ] Actualizar `updatePublicSession()` signature (línea 176)
  - Remove param: `extractedIntent`
- [ ] Remover intent merge logic (líneas 338-347, 276-284, 312-320)
- [ ] Remover `travel_intent: updatedIntent` de database updates
- [ ] **Test:** TypeScript compiles

### 1.5 Final Verification (15m)

- [ ] **Diff check:**
  ```bash
  diff src/lib/dev-chat-engine.ts src/lib/public-chat-engine.ts
  # Only differences: function names, table names
  ```
- [ ] **Build:** `npm run build`
- [ ] **Commit:**
  ```bash
  git add src/lib/public-chat-engine.ts src/lib/public-chat-session.ts
  git commit -m "refactor: FASE 1 - sync Public backend with Dev (copy system prompt, 50 msgs)"
  ```

---

## FASE 2: Frontend Copy (1h) 🎨

### 2.1 Read Dev Component (10m)

- [ ] Leer `src/components/Dev/DevChatMobileDev.tsx` completo
- [ ] Entender estructura, imports, estado

### 2.2 Copy to Public (30m)

- [ ] Copiar DevChatMobileDev.tsx → ChatMobile.tsx (COMPLETO)
- [ ] Ajustar imports si necesario
- [ ] Remover badge "🚧 DEV MODE" (solo para dev)
- [ ] Mantener todo lo demás IDÉNTICO

### 2.3 Visual Test (15m)

- [ ] **Start dev:** `npm run dev`
- [ ] Abrir `/chat-mobile-dev` (Dev)
- [ ] Abrir `/chat-mobile` (Public)
- [ ] Comparar visualmente:
  - Mismo header cyan ✅
  - Mismo layout ✅
  - Mismo streaming ✅
  - Mismo markdown ✅

### 2.4 Commit (5m)

- [ ] **Commit:**
  ```bash
  git add src/components/Public/ChatMobile.tsx
  git commit -m "refactor: FASE 2 - copy Dev component to Public (identical UI)"
  ```

---

## FASE 3: Migration Script (1h) 🤖

### 3.1 Create Migration Script (40m)

- [ ] Crear `scripts/migrate-dev-to-public.sh`
- [ ] Script content:
  ```bash
  #!/bin/bash
  echo "🔄 Comparing Dev vs Public..."

  diff src/lib/dev-chat-engine.ts src/lib/public-chat-engine.ts > diff-engines.txt
  diff src/components/Dev/DevChatMobileDev.tsx src/components/Public/ChatMobile.tsx > diff-components.txt

  grep -n "slice(-50)" src/lib/*-chat-engine.ts

  echo "✅ Review diff-engines.txt and diff-components.txt"
  ```
- [ ] Make executable: `chmod +x scripts/migrate-dev-to-public.sh`

### 3.2 Create Slash Command (10m)

- [ ] Crear `.claude/commands/migrate.md`
- [ ] Content:
  ```markdown
  # Migrate Command

  Execute: `./scripts/migrate-dev-to-public.sh`

  Compares Dev vs Public and reports differences.
  ```

### 3.3 Test Script (10m)

- [ ] Run: `./scripts/migrate-dev-to-public.sh`
- [ ] Verify diff files created
- [ ] Check output makes sense

---

## ✅ Success Criteria

**Backend:**
- [ ] System prompt idéntico (0 diff)
- [ ] 50 messages history
- [ ] 15 results, 400 chars
- [ ] NO travel intent extraction
- [ ] Build passes

**Frontend:**
- [ ] ChatMobile = DevChatMobileDev (visual)
- [ ] Same header, layout, streaming

**Migration:**
- [ ] "migra" script works
- [ ] Reports differences correctly

---

## 🚫 NOT Doing (Yet)

❌ Travel intent header dropdown
❌ Orange vs cyan differentiation
❌ Auto-fill logic
❌ Frontend capturing intent

**That comes LATER when we iterate in Dev.**

---

**Next:** FASE 1.1 - Remove Travel Intent (30m)
