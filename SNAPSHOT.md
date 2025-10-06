---
title: "InnPilot Project SNAPSHOT - Índice General"
description: "Estado actual del proyecto InnPilot - Octubre 2025. Snapshots especializados por agente."
category: architecture-snapshot
status: PRODUCTION_READY
version: "4.0-AGENT-SNAPSHOTS"
last_updated: "2025-10-06T16:30:00"
tags: [production, multi_tenant, compliance_module, matryoshka_embeddings, vps_deployment, agent_snapshots]
---

# 🏗️ InnPilot Project SNAPSHOT - Índice General

**Última actualización**: 6 Octubre 2025 16:30
**Estado**: PRODUCCIÓN - VPS Hostinger (innpilot.io)
**Versión**: 4.0 - Agent Snapshots (nueva estructura)

---

## 📊 ESTADO GENERAL: **8/10** 🟢

**Proyecto Activo**: SIRE Compliance Data Extension (listo para FASE 1)

**Métricas Clave:**
- **Código**: 203,896 líneas TypeScript/TSX (207 archivos)
- **Infraestructura**: VPS Hostinger + PM2 + Nginx + SSL
- **Base de Datos**: 39 tablas, 235 migraciones, 100% embeddings
- **APIs**: 44 endpoints (38 completos, 4 WIP, 2 legacy)
- **Seguridad**: 0 vulnerabilidades, RLS 100%, 2/3 fixes críticos aplicados

**Desglose:**
- Código: 8/10 (calidad alta, falta testing)
- Documentación: 6/10 (abundante pero gaps críticos)
- Infraestructura: 9/10 (deployment excelente)
- Base de Datos: 9/10 (saludable, RLS completo)
- Seguridad: 9/10 (excelente, solo falta Postgres upgrade)

---

## 🎯 PROYECTO ACTIVO: SIRE Compliance Data Extension

### **Estado**: PLANIFICACIÓN COMPLETA - Listo para FASE 1

**Objetivo:** Extender tabla `guest_reservations` con 9 campos SIRE faltantes para compliance legal.

**Gap Identificado:**
- **Actual:** 4/13 campos SIRE requeridos
- **Faltantes:** `document_type`, `document_number`, `birth_date`, `first_surname`, `second_surname`, `given_names`, `nationality_code`, `origin_country_code`, `destination_country_code`

**Fases del Proyecto:**
1. **FASE 1**: Database Migration (4 tareas, ~2h 15min) → `@database-agent`
2. **FASE 2**: Backend Integration (5 tareas, ~3h 15min) → `@backend-developer`
3. **FASE 3**: Testing & Validation (6 tareas, ~2h 45min) → Ambos agentes

**Tiempo Total Estimado:** ~7 horas

**Documentación:**
- ✅ `plan.md` (620 líneas) - Plan completo 3 fases
- ✅ `TODO.md` (190 líneas) - 15 tareas con estimaciones
- ✅ `sire-compliance-prompt-workflow.md` (950 líneas) - 16 prompts ready-to-use

**Catálogos Oficiales:**
- ✅ `_assets/sire/codigos-pais.json` (250 países - códigos SIRE propietarios)
- ✅ `_assets/sire/ciudades-colombia.json` (1,122 ciudades DIVIPOLA)
- ✅ `_assets/sire/codigos-sire.ts` - Helper TypeScript
- ✅ `src/lib/sire/field-mappers.ts` - Mappers conversacionales → SIRE

**Próximo Paso:** Ejecutar FASE 1.1 con `@agent-database-agent`

---

## 📁 SNAPSHOTS ESPECIALIZADOS POR AGENTE

Para información detallada por dominio, consultar los snapshots especializados en `snapshots/`:

### 🌐 **General** - `snapshots/general-snapshot.md`
**Contenido:** Resumen ejecutivo completo del proyecto
- Métricas clave (código, infra, DB, APIs)
- Proyecto activo (SIRE Compliance)
- Características principales implementadas
- Estructura del proyecto
- Próximos pasos recomendados
- Conclusión y estado general

**Usar cuando:** Necesites una visión holística del proyecto sin detalles técnicos específicos

---

### 🔧 **Backend Developer** - `snapshots/backend-developer.md`
**Contenido:** APIs, business logic, integrations, SIRE FASE 2
- Proyecto activo: FASE 2 Backend Integration (tasks 2.1-2.5, 3.2)
- Stack tecnológico backend (Next.js, Supabase, AI/LLM)
- Inventario completo 44 endpoints
- RPC Functions (7 creadas, 98.1% reducción context)
- Performance targets vs actual
- Seguridad (RLS, secrets management)

**Usar cuando:** Implementes APIs, business logic, chat engines, authentication, integrations

---

### 🗄️ **Database Agent** - `snapshots/database-agent.md`
**Contenido:** Schema, migrations, RPC functions, SIRE FASE 1
- Proyecto activo: FASE 1 Database Migration + FASE 3 Validation
- Esquema PostgreSQL completo (39 tablas)
- Sistema Matryoshka embeddings (3-tier)
- 7 RPC Functions (context optimization)
- Migraciones (235 aplicadas, 12 locales)
- Seguridad (RLS 100%, function search_path)

**Usar cuando:** Trabajes con schema, migrations, embeddings, database optimization, RLS policies

---

### 🎨 **UX-Interface** - `snapshots/ux-interface.md`
**Contenido:** Componentes, accesibilidad, design system, mobile-first
- Estado de componentes (80 totales, 21,309 LOC)
- Problemas críticos UI (ARIA 32.5%, GuestChatInterface 1,610 LOC)
- Design system (Tailwind, shadcn/ui, Framer Motion)
- Lighthouse scores (actual vs target)
- Features implementadas (Multi-conversation, Compliance, Public, Staff)

**Usar cuando:** Desarrolles componentes React, optimices accesibilidad, implementes mobile-first, refactorices UI

---

### 🖥️ **Infrastructure Monitor** - `snapshots/infrastructure-monitor.md`
**Contenido:** VPS deployment, monitoring, error detection, performance
- Deployment architecture (VPS Hostinger, PM2, Nginx)
- CI/CD pipeline (GitHub Actions → VPS)
- Error detection proactivo (.claude/errors.jsonl)
- Performance targets (API, Matryoshka tiers, database)
- Health checks (daily, weekly, monthly)

**Usar cuando:** Monitorees performance, analices errores, optimices infraestructura, configures deployment

---

### 🗺️ **API Endpoints Mapper** - `snapshots/api-endpoints-mapper.md`
**Contenido:** Inventario completo 44 endpoints, authentication, performance
- Endpoints por categoría (Guest 12, Staff 4, Compliance 2, MotoPress 6, etc.)
- Autenticación (JWT Guest/Staff, Public, CRON, Admin TODO)
- Performance targets vs actual (todos ✅ PASS)
- Gaps y pendientes (MotoPress security, OpenAPI spec)

**Usar cuando:** Documentes APIs, analices endpoints, planifiques integraciones, audites autenticación

---

### 🚀 **Deploy Agent** - `snapshots/deploy-agent.md`
**Contenido:** CI/CD automation, VPS deployment, GitHub Actions
- Workflow automatizado (commit → push → deploy → verify)
- CI/CD pipeline (GitHub Actions)
- VPS deployment (PM2, Nginx config)
- Secrets management (10 GitHub secrets)
- Deployment commands (manual + automated)

**Usar cuando:** Configures deployment, automatices CI/CD, gestiones secrets, hagas rollbacks

---

### 🧬 **Embeddings Generator** - `snapshots/embeddings-generator.md`
**Contenido:** Matryoshka 3-tier, vector search, performance benchmarks
- Arquitectura Matryoshka (1024d, 1536d, 3072d)
- Cobertura 100% (8 tablas críticas)
- Embedding generation workflow (OpenAI + slicing)
- Performance benchmarks (todos targets met)
- 20+ vector search functions PostgreSQL

**Usar cuando:** Generes embeddings, optimices vector search, analices performance Matryoshka

---

## 🚀 PRÓXIMOS PASOS INMEDIATOS

### Esta Semana
1. ✅ **RESUELTO** - plan.md y TODO.md restaurados (Oct 6, 2025)
2. ✅ **RESUELTO** - RLS habilitado en todas las tablas (Oct 6, 2025)
3. 🟠 **IMPORTANTE** - Investigar Conversion Rate 0% (176 sesiones → 0 conversiones)

### 2 Semanas
4. 🟠 **IMPORTANTE** - Accesibilidad WCAG 2.1 AA (32.5% → 100% ARIA)
5. 🟠 **IMPORTANTE** - Refactor GuestChatInterface (1,610 LOC → modular)
6. 🟡 **MEDIO** - Completar SIRE/TRA Real (Puppeteer + TRA API)
7. 🟡 **MEDIO** - MotoPress Security (6 endpoints sin auth admin)

---

## 📊 MÉTRICAS DE CALIDAD (Resumen)

| Métrica | Actual | Target | Status |
|---------|--------|--------|--------|
| **npm Vulnerabilities** | 0 | 0 | ✅ |
| **TypeScript Strict Mode** | ✅ | ✅ | ✅ |
| **ARIA Coverage** | 32.5% | 100% | 🔴 |
| **RLS Enabled** | 100% | 100% | ✅ |
| **Test Coverage** | <5% | >70% | 🔴 |
| **Embeddings Coverage** | 100% | 100% | ✅ |
| **API Response Time** | ✅ | <3s | ✅ |

---

## 🔗 REFERENCIAS RÁPIDAS

### URLs
- **Production**: https://innpilot.io
- **VPS**: 195.200.6.216
- **Database**: Supabase (ooaumjzaztmutltifhoq.supabase.co)

### Comandos Esenciales
```bash
# Development server (MANDATORY)
./scripts/dev-with-keys.sh

# Type checking
npm run type-check

# Build
npm run build

# Deploy (automated)
npm run deploy-agent
```

### Documentos Clave
- **Plan Activo**: `plan.md` (SIRE Compliance - 620 líneas)
- **Tasks**: `TODO.md` (15 tasks - 190 líneas)
- **Prompts**: `sire-compliance-prompt-workflow.md` (16 prompts - 950 líneas)
- **Guía Agentes**: `CLAUDE.md` (workflow y reglas críticas)

---

## 📈 CHANGELOG - Versión 4.0 (Octubre 6, 2025)

### Nueva Estructura: Agent Snapshots

**Motivación:**
- SNAPSHOT.md original: 994 líneas (difícil de navegar)
- Agentes leían contexto irrelevante (UI agent leyendo migrations)
- Alto consumo de tokens en conversaciones especializadas

**Solución Implementada:**
- Creada carpeta `snapshots/` con 8 snapshots especializados
- SNAPSHOT.md reducido a índice general (994 → ~200 líneas)
- Cada agente tiene su contexto específico (~150-250 líneas)

**Beneficios:**
- **Reducción context window**: ~15,000-20,000 tokens ahorrados por conversación especializada
- **Especialización**: Agentes solo leen información relevante a su dominio
- **Mantenibilidad**: Actualizar solo snapshot del agente afectado
- **Escalabilidad**: Fácil agregar/deprecar agentes sin afectar otros

**Archivos Creados:**
```
snapshots/
├── general-snapshot.md          (150 líneas)
├── backend-developer.md         (200 líneas)
├── database-agent.md            (250 líneas)
├── ux-interface.md              (180 líneas)
├── infrastructure-monitor.md    (200 líneas)
├── api-endpoints-mapper.md      (120 líneas)
├── deploy-agent.md              (80 líneas)
└── embeddings-generator.md      (60 líneas)
```

---

**Siguiente Revisión**: Noviembre 2025 (mensual)
**Última Auditoría**: 6 Octubre 2025 (6 agentes especializados)
**Versión**: 4.0 - Agent Snapshots
