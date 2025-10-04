# Dev-Public Sync - Workflow Prompts

**Objetivo:** Copiar Dev → Public. Fin.

**Uso:** Copy-paste estos prompts para ejecutar cada fase

---

## 🚀 Quick Start

### New Conversation - Full Context

```
CONTEXTO: Dev-Public Sync

Proyecto: Copiar Dev → Public (idéntico)

Archivos:
- Plan: dev-public-sync-plan.md
- TODO: dev-public-sync-TODO.md
- Workflow: dev-public-sync-prompt-workflow.md

Lee los 3 archivos y confirma que entiendes el objetivo.
```

---

## FASE 1: Backend Copy

### Prompt 1.1: Remove Travel Intent

```
FASE 1.1: Remover travel intent de Public engine

Archivo: src/lib/public-chat-engine.ts

Tareas:
1. Remover línea 107: extractTravelIntent(message)
2. Remover líneas 112-121: mergedIntent construction
3. Actualizar call sites (líneas 124, 439)

Test: npm run build

Reporta cuando completes.
```

### Prompt 1.2: Copy System Prompt

```
FASE 1.2: Copiar system prompt Dev → Public

Source: src/lib/dev-chat-engine.ts líneas 206-240
Target: src/lib/public-chat-engine.ts líneas 243-277

Acción: Copy-paste EXACTO (character-for-character)

Update signature:
buildMarketingSystemPrompt(session, searchResults, conversationMemories)

Verifica:
sed -n '206,240p' src/lib/dev-chat-engine.ts > /tmp/dev.txt
sed -n '243,277p' src/lib/public-chat-engine.ts > /tmp/public.txt
diff /tmp/dev.txt /tmp/public.txt

Esperado: 0 diferencias

Reporta resultado del diff.
```

### Prompt 1.3: Update History to 50

```
FASE 1.3: Actualizar history a 50 mensajes

Cambios:
1. src/lib/dev-chat-engine.ts:259 → .slice(-50)
2. src/lib/public-chat-engine.ts:296 → .slice(-50)
3. src/lib/public-chat-engine.ts:455 → .slice(-50)

Test: npm run build

Confirma 3 cambios realizados.
```

### Prompt 1.4: Remove Intent from Session

```
FASE 1.4: Remover intent de session management

Archivo: src/lib/public-chat-session.ts

Cambios:
1. Línea 176: updatePublicSession(sessionId, userMessage, assistantResponse)
   - Remover param: extractedIntent

2. Remover intent merge logic:
   - Líneas 338-347
   - Líneas 276-284
   - Líneas 312-320

3. Remover de database updates:
   - travel_intent: updatedIntent

Test: TypeScript compiles

Confirma cambios.
```

### Prompt 1.5: Verify & Commit

```
FASE 1.5: Verificar y commit

Verificación:
diff src/lib/dev-chat-engine.ts src/lib/public-chat-engine.ts
# Solo diferencias: nombres de funciones, tablas

Build:
npm run build

Commit:
git add src/lib/public-chat-engine.ts src/lib/public-chat-session.ts
git commit -m "refactor: FASE 1 - sync Public backend with Dev (copy prompt, 50 msgs)"

Confirma commit exitoso.
```

---

## FASE 2: Frontend Copy

### Prompt 2.1: Copy Component

```
FASE 2: Copiar componente Dev → Public

Source: src/components/Dev/DevChatMobileDev.tsx
Target: src/components/Public/ChatMobile.tsx

Acción:
1. Leer DevChatMobileDev.tsx completo
2. Copiar EXACTAMENTE a ChatMobile.tsx
3. Remover badge "🚧 DEV MODE"
4. Mantener TODO lo demás idéntico

Test visual:
npm run dev
- Abrir /chat-mobile-dev
- Abrir /chat-mobile
- Comparar: deben verse IGUALES (excepto badge)

Commit:
git add src/components/Public/ChatMobile.tsx
git commit -m "refactor: FASE 2 - copy Dev component to Public (identical UI)"

Confirma visual test passed.
```

---

## FASE 3: Migration Script

### Prompt 3.1: Create Script

```
FASE 3: Crear migration script

Archivo: scripts/migrate-dev-to-public.sh

Content:
#!/bin/bash
echo "🔄 Comparing Dev vs Public..."

diff src/lib/dev-chat-engine.ts src/lib/public-chat-engine.ts > diff-engines.txt
diff src/components/Dev/DevChatMobileDev.tsx src/components/Public/ChatMobile.tsx > diff-components.txt

grep -n "slice(-50)" src/lib/*-chat-engine.ts

echo "✅ Review diff-engines.txt and diff-components.txt"

Make executable:
chmod +x scripts/migrate-dev-to-public.sh

Test:
./scripts/migrate-dev-to-public.sh

Confirma que genera diff files correctamente.
```

### Prompt 3.2: Create Slash Command

```
Crear slash command "migra"

Archivo: .claude/commands/migrate.md

Content:
# Migrate Command

Execute migration comparison script.

Usage: User types "migra"

Command:
./scripts/migrate-dev-to-public.sh

Output: Diff reports in diff-engines.txt and diff-components.txt

Confirma comando creado.
```

---

## 🎯 Final Verification

```
Verificación final - Dev-Public Sync

Checklist:
[ ] Backend:
    - System prompt idéntico (0 diff)
    - 50 messages history
    - NO travel intent extraction

[ ] Frontend:
    - ChatMobile = DevChatMobileDev (visual)
    - Same header, layout, streaming

[ ] Migration:
    - Script migra funciona
    - Genera diff reports

Build final:
npm run build

Test visual:
npm run dev
- /chat-mobile-dev ✅
- /chat-mobile ✅

Reporta status de cada item.
```

---

## 🔄 Command: "migra"

```
migra
```

**Ejecuta:** `./scripts/migrate-dev-to-public.sh`

**Output:**
- diff-engines.txt (backend comparison)
- diff-components.txt (frontend comparison)

**Use case:** Verificar que Dev y Public siguen sincronizados después de cambios

---

## 🚫 NOT Doing (Remember)

Cuando usuario pida features NO en el plan:

```
Ese feature (travel intent header/dropdown/orange) NO está en el plan actual.

Plan actual: Copiar Dev → Public (idéntico)

Ese feature viene DESPUÉS cuando iteremos en Dev.

¿Confirmas que primero queremos completar la copia Dev → Public?
```

---

**Last Updated:** Oct 3, 2025
**Status:** Simplified workflow - Ready to execute
**Next:** FASE 1.1 - Remove Travel Intent
