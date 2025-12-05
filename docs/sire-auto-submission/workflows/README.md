# SIRE Auto-Submission - Workflow Prompts

Workflows detallados para las 6 FASES del proyecto SIRE Auto-Submission.

---

## 📁 Archivos Generados

| Archivo | FASE | Prompts | Duración | Status |
|---------|------|---------|----------|--------|
| `FASE-1-workflow.md` | Enhanced Conversational Capture | 6 (1.1-1.6) | 8h | ✅ Completo |
| `FASE-2-workflow.md` | Document Upload + OCR Extraction | 7 (2.1-2.7) | 10h | ✅ Completo |
| `FASE-3-workflow.md` | Real SIRE Integration | 7 (3.1-3.7) | 12h | ✅ Completo |
| `FASE-4-workflow.md` | Submission Workflow & Queue | 7 (4.1-4.7) | 8h | ✅ Completo |
| `FASE-5-workflow.md` | Staff Admin Dashboard | 6 (5.1-5.6) | 10h | ✅ Completo |
| `FASE-6-workflow.md` | Testing & Documentation | 7 (6.1-6.7) | 6h | ✅ Completo |

**Total:** 6 archivos, 40 prompts, 54 horas estimadas

---

## 🎯 Cómo Usar Estos Workflows

### 1. Contexto General (SIEMPRE primero)

Cada archivo comienza con un bloque de "Contexto General" que debes copiar y pegar al inicio de una conversación con Claude Code para establecer el contexto completo del proyecto.

### 2. Formato de Prompts

Cada prompt tiene delimitadores 🔽 y 🔼 que indican exactamente qué copiar:

```markdown
🔽 **COPIAR DESDE AQUÍ (Prompt X.Y)**
[Contenido completo del prompt]
🔼 **COPIAR HASTA AQUÍ (Prompt X.Y)**
```

### 3. Progreso Tracking

Cada prompt incluye:
- **Progreso General:** N/41 tareas completadas (%)
- **Progreso FASE X:** M/T tareas completadas (%)
- **Estado Actual:** Lista de logros previos

### 4. Verificación Post-Ejecución

Todos los prompts tienen una sección de verificación que:
- Pregunta si la ejecución fue satisfactoria
- Si "Sí": Actualiza TODO.md y muestra progreso
- Si "No": Itera hasta aprobación

---

## 📊 Progreso del Proyecto

### FASE 1: Enhanced Conversational Capture (8h)
- [x] 1.1: Create conversational prompts system (2h)
- [x] 1.2: Implement progressive disclosure logic (2h)
- [x] 1.3: Build SIRE progress bar component (1.5h)
- [x] 1.4: Integrate SIRE mode into GuestChatInterface (2h)
- [x] 1.5: Enhance entity extraction for SIRE (1.5h)
- [x] 1.6: Update chat API with SIRE system prompt (1h)

### FASE 2: Document Upload + OCR Extraction (10h)
- [x] 2.1: Create document upload component (2h)
- [x] 2.2: Implement Claude Vision OCR integration (3h)
- [x] 2.3: Build field extraction and mapping (2h)
- [x] 2.4: Create document preview modal (2h)
- [x] 2.5: Create OCR API endpoint (1.5h)
- [x] 2.6: Create database migration for document uploads (0.5h)
- [x] 2.7: Integrate document upload into chat interface (1h)

### FASE 3: Real SIRE Integration (12h)
- [x] 3.1: Research SIRE portal UI and selectors (2h)
- [x] 3.2: Implement SIRE credentials management (1.5h)
- [x] 3.3: Update sire-automation.ts with real selectors (4h)
- [x] 3.4: Create database migration for SIRE credentials (1h)
- [x] 3.5: Update SIRE submit API endpoint (2h)
- [x] 3.6: Create manual test submission script (1h)
- [x] 3.7: End-to-end manual testing (0.5h)

### FASE 4: Submission Workflow & Queue (8h)
- [x] 4.1: Decide queue system (Bull vs Inngest) (0.5h)
- [x] 4.2: Implement queue configuration (2h)
- [x] 4.3: Implement queue worker (2h)
- [x] 4.4: Create queue API endpoints (1.5h)
- [x] 4.5: Implement webhook notifications (1h)
- [x] 4.6: Create database migration for queue (0.5h)
- [x] 4.7: Integration testing (1h)

### FASE 5: Staff Admin Dashboard (10h)
- [x] 5.1: Create admin dashboard page (2h)
- [x] 5.2: Build guest list component (3h)
- [x] 5.3: Build metrics cards component (1.5h)
- [x] 5.4: Build filters component (1h)
- [x] 5.5: Create admin API endpoints (2.5h)
- [x] 5.6: Create database views for dashboard (1h)

### FASE 6: Testing & Documentation (6h)
- [x] 6.1: Create E2E test for guest flow (2h)
- [x] 6.2: Create E2E test for admin flow (1.5h)
- [x] 6.3: Create user documentation (1h)
- [x] 6.4: Create technical documentation (1h)
- [x] 6.5: Create pilot checklist (0.5h)
- [x] 6.6: Create rollout plan (0.5h)
- [x] 6.7: Performance and security testing (0.5h)

**Total:** 40/41 tareas (98%) - 54 horas estimadas

*(Tarea 41: Actualización final de documentación)*

---

## 🚀 Quick Start

1. **Iniciar FASE 1:**
   ```bash
   # Abrir FASE-1-workflow.md
   # Copiar "Contexto General" al inicio de conversación con Claude Code
   # Copiar Prompt 1.1 completo (entre 🔽 y 🔼)
   ```

2. **Después de cada prompt:**
   - Verificar que la tarea se completó satisfactoriamente
   - Confirmar "Sí" para que Claude actualice TODO.md
   - Pasar al siguiente prompt indicado

3. **Al completar cada FASE:**
   - Revisar resumen de archivos creados/modificados
   - Ejecutar tests requeridos
   - Pasar a siguiente FASE

---

## 📝 Notas Importantes

1. **Progreso Counters:**
   - FASE 1 Start: 0/41 (0%) → End: 6/41 (15%)
   - FASE 2 Start: 6/41 (15%) → End: 13/41 (32%)
   - FASE 3 Start: 13/41 (32%) → End: 20/41 (49%)
   - FASE 4 Start: 20/41 (49%) → End: 27/41 (66%)
   - FASE 5 Start: 27/41 (66%) → End: 33/41 (80%)
   - FASE 6 Start: 33/41 (80%) → End: 40/41 (98%)

2. **Agentes Especializados:**
   - `@agent-backend-developer` - Backend, APIs, Puppeteer
   - `@agent-ux-interface` - React components, UI
   - `@agent-database-agent` - SQL migrations

3. **Formato de Código:**
   - FASES 1-3: Código completo con ejemplos detallados
   - FASES 4-6: Código condensado pero funcional (optimización de tokens)

---

## 🎉 Resultado Final

Al completar las 6 FASES tendrás:

**30+ archivos nuevos:**
- 6+ React components
- 10+ API endpoints
- 6+ SQL migrations
- 8+ helper libraries
- E2E tests

**Sistema completo funcionando:**
- ✅ Captura conversacional automática (13 campos SIRE)
- ✅ OCR de documentos con Claude Vision (>85% accuracy)
- ✅ Envío real a portal SIRE (Puppeteer automation)
- ✅ Queue system con retry logic y dead-letter queue
- ✅ Admin dashboard completo con metrics y filtros
- ✅ E2E testing + documentación completa

**Listo para pilot** con 1-3 hoteles según `PILOT_CHECKLIST.md`

---

**Creado:** Diciembre 5, 2025
**Proyecto:** MUVA Chat - SIRE Auto-Submission
