# SIRE Auto-Submission - Workflow Prompts

Workflows detallados para las 6 FASES del proyecto SIRE Auto-Submission.

---

## 📁 Archivos Generados

| Archivo | FASE | Prompts | Duración | Status |
|---------|------|---------|----------|--------|
| `FASE-1-workflow.md` | Enhanced Conversational Capture | 6 (1.1-1.6) | 8h | ✅ Completo |
| `FASE-2-workflow.md` | Document Upload + OCR Extraction | 7 (2.1-2.7) | 10h | ✅ Completo |
| `FASE-3-workflow.md` | **TXT File Generation** | 6 (3.1-3.6) | 7h | ✅ Completo |
| `FASE-4-workflow.md` | Submission Workflow & Queue | 7 (4.1-4.7) | 8h | ✅ Completo |
| `FASE-5-workflow.md` | Staff Admin Dashboard | 6 (5.1-5.6) | 10h | ✅ Completo |
| `FASE-6-workflow.md` | Testing & Documentation | 7 (6.1-6.7) | 6h | ✅ Completo |

**Total:** 6 archivos, 39 prompts, 49 horas estimadas

**Nota:** FASE 3 reformulada de "Real SIRE Integration" a "TXT File Generation" (Puppeteer automation postponed a FASE FUTURA)

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
- **Progreso General:** N/39 tareas completadas (%)
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

### FASE 3: TXT File Generation (7h)
- [x] 3.1: Implement TXT file generator (1.5h)
- [x] 3.2: Create TXT export API endpoint (1h)
- [x] 3.3: Implement pre-generation validation (1h)
- [x] 3.4: Create sire_exports tracking table (0.5h)
- [x] 3.5: Add download TXT button to UI (2h)
- [x] 3.6: Testing TXT format compliance (1h)

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

**Total:** 39 tareas - 49 horas estimadas

**Nota:** Puppeteer automation (FASE FUTURA) no incluida en el conteo (7 tareas adicionales, 12h)

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
   - FASE 1 Start: 0/39 (0%) → End: 6/39 (15%)
   - FASE 2 Start: 6/39 (15%) → End: 13/39 (33%)
   - FASE 3 Start: 13/39 (33%) → End: 19/39 (49%)
   - FASE 4 Start: 19/39 (49%) → End: 26/39 (67%)
   - FASE 5 Start: 26/39 (67%) → End: 32/39 (82%)
   - FASE 6 Start: 32/39 (82%) → End: 39/39 (100%)

2. **Agentes Especializados:**
   - `@agent-backend-developer` - Backend, APIs, TXT generation, queue system
   - `@agent-ux-interface` - React components, UI
   - `@agent-database-agent` - SQL migrations
   - `@agent-deploy-agent` - Deployment testing

3. **Formato de Código:**
   - FASES 1-3: Código completo con ejemplos detallados
   - FASES 4-6: Código condensado pero funcional (optimización de tokens)

---

## 🎉 Resultado Final

Al completar las 6 FASES tendrás:

**30+ archivos nuevos:**
- 6+ React components
- 8+ API endpoints
- 4 SQL migrations
- 6+ helper libraries
- E2E tests

**Sistema MVP completo funcionando:**
- ✅ Captura conversacional automática (13 campos SIRE)
- ✅ OCR de documentos con Claude Vision (>85% accuracy)
- ✅ Generación de archivos TXT formato oficial SIRE
- ✅ Queue system con retry logic y dead-letter queue
- ✅ Admin dashboard completo con metrics y filtros
- ✅ E2E testing + documentación completa

**Flujo Final:**
1. Guest completa datos vía chat o sube pasaporte (OCR automático)
2. Sistema genera archivo TXT con formato oficial SIRE
3. Staff descarga TXT y sube manualmente al portal SIRE (o automático vía queue)
4. Dashboard muestra status y métricas en tiempo real

**Listo para pilot** con 1-3 hoteles según `PILOT_CHECKLIST.md`

**FASE FUTURA:** Automation de upload vía Puppeteer (opcional, después de validar MVP)

---

**Creado:** Diciembre 5, 2025
**Proyecto:** MUVA Chat - SIRE Auto-Submission
