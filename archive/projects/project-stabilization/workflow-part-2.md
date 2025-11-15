# Workflow Prompts - PARTE 2/3
# FASE 2 (Branch Alignment) + FASE 3 (Dependency Updates)

**Proyecto:** MUVA Platform Stabilization
**Prompts Coverage:** FASE 2 (2 prompts) + FASE 3 (3 prompts)

---

## FASE 2: Environment & Branch Alignment 🌿

### Prompt 2.1: Branch Strategy + Scripts de Toggle

**AGENTE:** @agent-infrastructure-monitor

**COPY-PASTE DESDE AQUÍ:**

```
TAREA: Definir branch strategy y crear scripts de toggle de ambiente

CONTEXTO:
- Proyecto: Project Stabilization 2025 - FASE 2
- Ver: project-stabilization/plan-part-2.md (FASE 2)
- Objetivo: Clarificar staging → dev → main y crear herramientas de toggle

ESPECIFICACIONES:

**PARTE 1: Documentar Branch Strategy (tarea 2.1)**

1. Crear: project-stabilization/docs/fase-2/BRANCH_STRATEGY.md
   - Documentar estrategia: staging → dev → main
   - Mapear Git branches ↔ Supabase projects:
     - staging (git) → smdhgcpojpurvgdppufo (Supabase proyecto separado)
     - dev (git) → ooaumjzaztmutltifhoq (Supabase proyecto principal)
     - main (git) → reservado (no usar por ahora)
   - Documentar propósito de cada ambiente
   - Crear diagrama de workflow

2. Ver estrategia propuesta completa en:
   - project-stabilization/plan-part-2.md (FASE 2, tarea 2.1)

**PARTE 2: Script Toggle de Ambiente (tarea 2.2)**

1. Crear: scripts/toggle-env.sh
   - Detectar ambiente actual (staging vs production)
     - Buscar NEXT_PUBLIC_SUPABASE_URL en .env.local
     - smdhgcpojpurvgdppufo = staging
     - ooaumjzaztmutltifhoq = production
   - Toggle entre .env.staging ↔ .env.local
   - Backup automático antes de cambiar
   - Validación post-toggle (llamar validate-env.sh)
   - Feedback colorido (verde/amarillo/rojo)

2. Ver script completo propuesto en:
   - project-stabilization/plan-part-2.md (FASE 2, tarea 2.2)

**PARTE 3: Script de Validación (tarea 2.3)**

1. Crear: scripts/validate-env.sh
   - Lista de variables requeridas:
     - NEXT_PUBLIC_SUPABASE_URL
     - NEXT_PUBLIC_SUPABASE_ANON_KEY
     - SUPABASE_SERVICE_ROLE_KEY
     - ANTHROPIC_API_KEY
     - OPENAI_API_KEY
     - SMTP_HOST, SMTP_USER, SMTP_PASSWORD
     - STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
   - Validar presencia de cada variable
   - Validar que no estén vacías
   - Detectar y mostrar ambiente (staging/production)
   - Feedback colorido

2. Ver script completo propuesto en:
   - project-stabilization/plan-part-2.md (FASE 2, tarea 2.3)

TEST:
- Documentación BRANCH_STRATEGY.md clara y completa
- Script toggle-env.sh funcional:
  ```bash
  ./scripts/toggle-env.sh
  # Debe detectar ambiente actual y ofrecer toggle
  ```
- Script validate-env.sh funcional:
  ```bash
  ./scripts/validate-env.sh
  # Debe validar todas las variables y mostrar ambiente
  ```

SIGUIENTE: Prompt 2.2 (Deploy Scripts + Documentation)
```

---

### Prompt 2.2: Deploy Scripts y Documentación

**AGENTE:** @agent-infrastructure-monitor + @agent-deploy-agent

**COPY-PASTE DESDE AQUÍ:**

```
TAREA: Crear scripts de deployment y documentar workflow completo

CONTEXTO:
- Proyecto: Project Stabilization 2025 - FASE 2
- Ver: project-stabilization/plan-part-2.md (FASE 2)
- Scripts de toggle ya creados

ESPECIFICACIONES:

**PARTE 1: Deploy Scripts (tareas 2.4)**

1. Crear: scripts/deploy-dev.sh
   - Pre-deploy checks:
     - npm run validate-env
     - git status (verificar no hay cambios sin commitear)
   - Tests locales: npm run build && npm run test
   - Deploy a VPS:
     - SSH a muva@195.200.6.216
     - cd ~/muva-chat
     - Backup de .env.local
     - git fetch && git checkout dev && git pull
     - npm install --legacy-peer-deps && npm run build
     - pm2 restart muva-chat && pm2 save
     - Health check
   - Feedback colorido

2. Crear: scripts/deploy-staging.sh
   - Similar a deploy-dev.sh pero:
     - Branch: staging
     - Directory: ~/muva-chat-staging
     - PM2 instance: muva-chat-staging
     - Usar .env.staging

3. Ver scripts completos propuestos en:
   - project-stabilization/plan-part-2.md (FASE 2, tarea 2.4)

**PARTE 2: Actualizar package.json (tarea 2.5)**

1. Agregar npm scripts en package.json:
   ```json
   {
     "scripts": {
       "env:staging": "./scripts/toggle-env.sh staging",
       "env:production": "./scripts/toggle-env.sh production",
       "validate-env": "./scripts/validate-env.sh",
       "deploy:dev": "./scripts/deploy-dev.sh",
       "deploy:staging": "./scripts/deploy-staging.sh"
     }
   }
   ```

**PARTE 3: Documentar Workflow (tarea 2.6)**

1. Crear: project-stabilization/docs/fase-2/DEPLOYMENT_WORKFLOW.md
   - Documentar ambientes (staging, dev, main)
   - Workflow típico:
     - New feature (staging → dev)
     - Hotfix (directo en dev)
     - Experiment (staging)
   - Troubleshooting common issues

2. Ver template completo en:
   - project-stabilization/plan-part-2.md (FASE 2, tarea 2.6)

**CRITERIOS DE ÉXITO FASE 2:**
- ✅ Branch strategy documentada y clara
- ✅ Scripts de toggle funcionando
- ✅ Validación de ambiente automática
- ✅ Deploy scripts probados (dry-run)
- ✅ npm scripts agregados a package.json
- ✅ Documentación workflow completa

TEST:
- npm run env:staging (toggle a staging)
- npm run env:production (toggle a production)
- npm run validate-env (validar ambiente)
- npm run deploy:dev (dry-run, verificar script funcional)
- Documentación DEPLOYMENT_WORKFLOW.md completa

SIGUIENTE FASE: FASE 3 (Dependency Updates)
Ver: Prompt 3.1
```

---

## FASE 3: Dependency Updates 📦

⚠️ **ACTUALIZACIÓN SEGÚN DIAGNÓSTICO REAL:**

Según `DIAGNOSTICO-f9f6b27.md`, las dependencias se dividen en:
- **Grupo 1 (Safe - 23 paquetes):** Minor/Patch updates → ✅ COMPLETADO (Commit a2e3bd4)
- **Grupo 2 (Medium Risk - ~8 paquetes):** API changes posibles → Requiere testing extensivo
- **Grupo 3 (Breaking Changes - 12 paquetes):** LangChain 1.0, OpenAI 6.x → Requiere migración de código

**ESTADO:** Grupo 1 completado. Grupos 2 y 3 pendientes, requieren testing exhaustivo pero se ejecutan en este workflow.

Ver `EJECUCION-PLAN.md` FASE 2 para lista exacta de 23 paquetes safe.

---

### Prompt 3.1: Actualizar Dependencias Grupo 1 (Safe Updates)

**AGENTE:** @agent-backend-developer

**COPY-PASTE DESDE AQUÍ:**

```
TAREA: Actualizar dependencias de bajo riesgo (Grupo 1: Safe Updates)

CONTEXTO:
- Proyecto: Project Stabilization 2025 - FASE 3
- Ver: project-stabilization/plan-part-2.md (FASE 3, GRUPO 1)
- Objetivo: Actualizar ~15 paquetes con patches y minor versions

ESPECIFICACIONES:

**GRUPO 1: Safe Updates 🟢**

**LISTA EXACTA de 23 paquetes (del diagnóstico real):**

1. @anthropic-ai/sdk: 0.63.0 → 0.68.0
2. @supabase/supabase-js: 2.57.4 → 2.77.0
3. @tailwindcss/postcss: 4.1.13 → 4.1.16
4. @testing-library/jest-dom: 6.8.0 → 6.9.1
5. @tiptap/react: 3.6.6 → 3.9.1
6. @tiptap/starter-kit: 3.6.6 → 3.9.1
7. @types/leaflet: 1.9.20 → 1.9.21
8. @types/react: 19.1.13 → 19.2.2
9. @types/react-dom: 19.1.9 → 19.2.2
10. dotenv: 17.2.2 → 17.2.3
11. eslint: 9.35.0 → 9.38.0
12. framer-motion: 12.23.22 → 12.23.24
13. jest: 30.1.3 → 30.2.0
14. jest-environment-jsdom: 30.1.2 → 30.2.0
15. lucide-react: 0.544.0 → 0.548.0
16. pdfjs-dist: 5.4.149 → 5.4.296
17. puppeteer: 24.23.0 → 24.27.0
18. react: 19.1.0 → 19.2.0
19. react-dom: 19.1.0 → 19.2.0
20. react-pdf: 10.1.0 → 10.2.0
21. recharts: 3.2.1 → 3.3.0
22. tailwindcss: 4.1.13 → 4.1.16
23. typescript: 5.9.2 → 5.9.3

**Fuente:** `DIAGNOSTICO-ee1d48e.md` - Sección "Dependencies Status - Safe Updates"

**Metodología:**

1. Actualizar UNO A LA VEZ:
   ```bash
   npm install @anthropic-ai/sdk@latest
   npm run build
   npm run test

   # Si OK, siguiente:
   npm install @supabase/supabase-js@latest
   npm run build
   npm run test

   # Repetir para cada paquete
   ```

2. Si algún paquete falla:
   - Documentar error
   - Rollback: git checkout package.json package-lock.json
   - Marcar paquete para revisión

3. Después de completar todos los del grupo:
   - Test integración completo
   - Smoke test local (rutas principales)

**Test de Integración (tarea 3.1.2):**
```bash
# Build completo
npm run build
# Expected: ✅ Sin errores

# Tests completos
npm run test
# Expected: ✅ Todos pasando

# Smoke test
npm run dev
# Verificar rutas:
# - http://localhost:3000/staff/login
# - http://localhost:3000/dashboard
# - http://localhost:3000/chat
```

**Documentación:**
1. Crear: project-stabilization/docs/fase-3/DEPENDENCY_UPDATE_PLAN.md
   - Listar todos los paquetes actualizados del Grupo 1
   - Documentar versiones: antes → después
   - Documentar si hubo problemas

TEST:
- ✅ ~15 paquetes actualizados (Grupo 1)
- ✅ Build exitoso
- ✅ Tests pasando
- ✅ Smoke test OK
- ✅ No warnings nuevos

SIGUIENTE: Prompt 3.2 (Grupo 2: Medium Risk)
```

---

### Prompt 3.2: Actualizar Dependencias Grupo 2 (Medium Risk)

⚠️ **IMPORTANTE:** Grupo 2 (Medium Risk) requiere testing exhaustivo de features afectadas (Auth flows, Forms, Supabase SSR).

**Consideraciones:**
- Cambios de API requieren testing manual extensivo
- Riesgo de regresiones en features críticas
- Tiempo estimado: 2-3 horas (incluyendo testing)
- Proceder con precaución y validar cada cambio

---

**AGENTE:** @agent-backend-developer

**COPY-PASTE DESDE AQUÍ:**

```
TAREA: Actualizar dependencias de riesgo medio (Grupo 2: Medium Risk)

CONTEXTO:
- Proyecto: Project Stabilization 2025 - FASE 3
- Ver: project-stabilization/plan-part-2.md (FASE 3, GRUPO 2)
- Grupo 1 ya completado y testeado

ESPECIFICACIONES:

**GRUPO 2: Medium Risk Updates ⚠️**

Paquetes a actualizar:
- @supabase/ssr (update con cambios en API)
- react-hook-form (API changes posibles)
- zod (validation schema changes)
- Otros ~5 paquetes con cambios moderados

**Metodología:**

1. Para cada paquete:
   ```bash
   # Actualizar
   npm install @supabase/ssr@latest

   # Revisar changelog
   npm info @supabase/ssr

   # Buscar breaking changes en código
   grep -r "createServerClient" src/
   grep -r "supabase/ssr" src/

   # Si hay cambios de API, ajustar código
   # ...

   # Build y test
   npm run build
   npm run test
   ```

2. Archivos a revisar comúnmente:
   - src/lib/supabase/server.ts (si se usa @supabase/ssr)
   - src/components/**/forms/*.tsx (si se usa react-hook-form)
   - src/lib/validations/*.ts (si se usa zod)

3. Documentar cualquier cambio de código requerido

**Test de Integración (tarea 3.2.2):**
```bash
# Build + tests
npm run build && npm run test

# Test manual de features afectadas:
# - Auth flows (si @supabase/ssr cambió)
# - Form validations (si react-hook-form o zod cambiaron)
# - Supabase SSR (si hay cambios)
```

**Documentación:**
1. Actualizar: project-stabilization/docs/fase-3/DEPENDENCY_UPDATE_PLAN.md
   - Agregar paquetes del Grupo 2
   - Documentar versiones y cambios de código

2. Si hubo breaking changes:
   - Crear: project-stabilization/docs/fase-3/BREAKING_CHANGES_LOG.md
   - Documentar qué cambió, por qué, y cómo se arregló

TEST:
- ✅ ~8 paquetes actualizados (Grupo 2)
- ✅ Build exitoso
- ✅ Tests pasando
- ✅ Features afectadas funcionando
- ✅ Documentación de cambios

SIGUIENTE: Prompt 3.3 (Grupo 3: Breaking Changes)
```

---

### Prompt 3.3: Actualizar Dependencias Grupo 3 (Breaking Changes)

⚠️ **IMPORTANTE:** Grupo 3 (Breaking Changes) incluye:
- LangChain 0.3.x → 1.0.x (4 packages)
- OpenAI SDK 5.x → 6.x

Estos requieren migración de código significativa + testing exhaustivo de AI features (chat, embeddings).

**Consideraciones:**
- Breaking changes confirmados en APIs críticas
- Migración de código requiere 2-3 horas
- Testing de AI features requiere 1-2 horas adicionales
- Alto riesgo - requiere validación exhaustiva de funcionalidad AI
- Proceder con precaución máxima

---

**AGENTE:** @agent-backend-developer

**COPY-PASTE DESDE AQUÍ:**

```
TAREA: Actualizar y migrar breaking changes (Grupo 3: LangChain 1.0 + OpenAI SDK 6.x)

CONTEXTO:
- Proyecto: Project Stabilization 2025 - FASE 3
- Ver: project-stabilization/plan-part-2.md (FASE 3, GRUPO 3)
- Grupos 1 y 2 completados

ESPECIFICACIONES:

**GRUPO 3: Breaking Changes 🔴**

Paquetes con breaking changes confirmados:
- @langchain/community: 0.3.56 → 1.0.0
- @langchain/core: 0.3.77 → 1.0.2
- @langchain/openai: 0.6.13 → 1.0.0
- openai: 5.21.0 → 6.7.0

**PARTE 1: Migrar LangChain (tarea 3.3.1)**

1. Actualizar todos los paquetes LangChain:
   ```bash
   npm install @langchain/community@latest @langchain/core@latest @langchain/openai@latest
   ```

2. Revisar breaking changes:
   ```bash
   npm info @langchain/core
   npm info @langchain/openai
   ```

3. Archivos a migrar:
   - src/lib/ai/langchain.ts
   - src/lib/ai/embeddings.ts
   - src/app/api/chat/route.ts
   - src/app/api/generate-response/route.ts

4. Breaking changes conocidos:
   ```typescript
   // ANTES (LangChain 0.3.x)
   const model = new ChatOpenAI({
     modelName: "gpt-4",
     temperature: 0.7,
   });

   // DESPUÉS (LangChain 1.0.x)
   const model = new ChatOpenAI({
     model: "gpt-4",  // ✅ modelName → model
     temperature: 0.7,
   });
   ```

5. Buscar todos los usos:
   ```bash
   grep -r "modelName" src/
   grep -r "ChatOpenAI" src/
   grep -r "OpenAIEmbeddings" src/
   ```

6. Test específico de AI:
   ```bash
   npm run build
   npm run test

   # Test chat API
   npm run dev
   curl -X POST http://localhost:3000/api/chat \
     -H "Content-Type: application/json" \
     -d '{"message": "test", "tenant_id": "xxx"}'
   ```

**PARTE 2: Migrar OpenAI SDK (tarea 3.3.2)**

1. Actualizar OpenAI SDK:
   ```bash
   npm install openai@latest
   ```

2. Revisar breaking changes:
   ```bash
   npm info openai
   ```

3. Archivos a migrar:
   - src/lib/ai/openai.ts
   - src/app/api/chat/route.ts

4. Breaking changes conocidos:
   ```typescript
   // ANTES (OpenAI SDK 5.x)
   const completion = await openai.chat.completions.create({
     messages: messages as ChatCompletionMessageParam[],
   });

   // DESPUÉS (OpenAI SDK 6.x)
   const completion = await openai.chat.completions.create({
     messages: messages as OpenAI.ChatCompletionMessageParam[],  // ✅ Namespace
   });
   ```

5. Buscar todos los usos:
   ```bash
   grep -r "ChatCompletionMessageParam" src/
   grep -r "openai.chat.completions" src/
   ```

**PARTE 3: Test Integración Completa (tarea 3.3.3)**

```bash
# 1. Build completo
npm run build

# 2. Tests completos
npm run test

# 3. E2E tests de AI features
npm run dev

# Test chat
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hola, necesito ayuda", "tenant_id": "xxx"}'

# Test embeddings
curl -X POST http://localhost:3000/api/generate-embeddings \
  -H "Content-Type: application/json" \
  -d '{"text": "test content for embeddings"}'
```

**PARTE 4: Eliminar --legacy-peer-deps (tarea 3.4)**

```bash
# 1. Eliminar node_modules y lock
rm -rf node_modules package-lock.json

# 2. Install sin --legacy-peer-deps
npm install

# 3. Si hay errores de peer deps:
# - Revisar qué paquetes causan conflicto
# - Actualizar o buscar alternativas
# - Si no es posible resolver, documentar razón
```

**PARTE 5: Documentación (tarea 3.5)**

1. Crear: project-stabilization/docs/fase-3/MIGRATION_GUIDE.md
   - Documentar breaking changes de LangChain
   - Documentar breaking changes de OpenAI SDK
   - Documentar código cambiado (archivos, líneas)
   - Documentar rollback plan

2. Actualizar: project-stabilization/docs/fase-3/BREAKING_CHANGES_LOG.md
   - Agregar entradas de Grupo 3
   - Documentar impacto y solución

**CRITERIOS DE ÉXITO FASE 3:**
- ✅ 35 dependencias actualizadas (3 grupos)
- ✅ Breaking changes migrados (LangChain, OpenAI)
- ✅ Build exitoso sin warnings nuevos
- ✅ Tests pasando (100%)
- ✅ AI features funcionando (chat, embeddings)
- ✅ --legacy-peer-deps removido (o documentado por qué no)
- ✅ Documentación de migraciones completa

TEST:
- ✅ Build: npm run build
- ✅ Tests: npm run test
- ✅ Type check: npm run type-check
- ✅ Chat API functional
- ✅ Embeddings API functional
- ✅ No peer dependency warnings (o documentados)

SIGUIENTE FASE: FASE 4 (MCP Optimization)
Ver: workflow-part-3.md (Prompt 4.1)
```

---

## NOTAS IMPORTANTES

### Autorización de Commits FASE 2 y 3

**Al finalizar FASE 2:**
```
FASE 2 COMPLETADA ✅

Cambios realizados:
- scripts/toggle-env.sh, validate-env.sh (nuevos)
- scripts/deploy-dev.sh, deploy-staging.sh (nuevos)
- package.json (npm scripts agregados)
- project-stabilization/docs/fase-2/* (documentación)

Tests:
- ✅ Toggle funcional
- ✅ Validación funcional
- ✅ Deploy scripts probados

¿Deseas que commitee estos cambios?
```

**Al finalizar FASE 3:**
```
FASE 3 COMPLETADA ✅

Cambios realizados:
- package.json + package-lock.json (35 deps actualizadas)
- src/lib/ai/langchain.ts (migración LangChain 1.0)
- src/lib/ai/openai.ts (migración OpenAI SDK 6.x)
- src/lib/ai/embeddings.ts (ajustes)
- src/app/api/chat/route.ts (tipos actualizados)
- project-stabilization/docs/fase-3/* (documentación)

Tests:
- ✅ Build exitoso
- ✅ Tests 100% pasando
- ✅ AI features funcionando
- ✅ Chat API operational
- ✅ Embeddings API operational

¿Deseas que commitee estos cambios?
```

### Rollback si es Necesario

**FASE 2:**
```bash
git checkout HEAD~1 scripts/toggle-env.sh scripts/validate-env.sh scripts/deploy-*.sh package.json
```

**FASE 3:**
```bash
# Rollback dependencies
git checkout HEAD~1 package.json package-lock.json
npm install --legacy-peer-deps

# Rollback código
git checkout HEAD~1 src/lib/ai/
npm run build
```

---

**Última actualización:** 30 Octubre 2025
