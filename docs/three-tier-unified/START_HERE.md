# 👋 EMPIEZA AQUÍ - Three-Tier Migration

**Proyecto:** Migración MUVA Chat a Three-Tier
**Estado:** ✅ Listo para ejecutar
**Duración:** 2h 40min

---

## 📖 ¿QUÉ ES ESTO?

Plan completo para migrar MUVA Chat a arquitectura three-tier:
- **dev** → desarrollo local
- **tst** → testing (staging.muva.chat)
- **prd** → producción (muva.chat)

---

## 🚀 INICIO RÁPIDO (3 pasos)

### 1. Lee el README (3 min)
```bash
cat docs/three-tier-unified/README.md
```
→ Vista general del plan

### 2. Lee el Plan Completo (10 min)
```bash
cat docs/three-tier-unified/plan.md
```
→ Detalles de cada fase

### 3. Ejecuta el Workflow (2h 40min)
```bash
cat docs/three-tier-unified/workflow.md
```
→ Copia Prompt 0.1 (entre 🔽 y 🔼)
→ Pégalo en chat con Claude
→ Sigue instrucciones

---

## 📁 ARCHIVOS DEL PLAN

```
docs/three-tier-unified/
├── START_HERE.md       ← Estás aquí
├── README.md           → Punto de entrada principal
├── plan.md             → Plan completo (fases 0-7)
├── TODO.md             → 32 tareas con checkboxes
└── workflow.md         → Prompts copy-paste listos
```

---

## 🚨 FUENTES DE VERDAD

**⚠️ DOS fuentes diferentes:**

1. **CÓDIGO/MIGRATIONS:** Rama Git `staging` (18 migrations, commit 1875e09)
2. **DATOS:** Proyecto Supabase `hoaiwcueleiemeplrurv` (tenants, units, etc.)

**NO confundir estas dos fuentes.**

---

## ⚡ ESTADO ACTUAL

### GitHub ✅
- dev/tst/prd sincronizados (commit 1875e09, 18 migrations)

### Supabase
- dev/tst: schema completo, SIN datos
- main: vacío (0 migrations)

### Pendiente
- Migrar datos a dev/tst
- Aplicar migrations a main
- Configurar VPS

---

## ⏱️ FASES

| # | Fase | Tiempo | Estado |
|---|------|--------|--------|
| 0 | Preparación | 10 min | Pendiente |
| 1 | GitHub Sync | 0 min | ✅ COMPLETADA |
| 2 | Migrar Datos | 30 min | Pendiente |
| 3 | Migrations Main | 15 min | Pendiente |
| 4 | Config Local | 20 min | Pendiente |
| 5 | GitHub Actions | 30 min | Pendiente |
| 6 | VPS Deploy | 30 min | Pendiente |
| 7 | Docs | 20 min | Opcional |

**Total:** 2h 40min

---

## 🎯 PRÓXIMO PASO

1. Abre `README.md` para contexto completo
2. Abre `workflow.md` para ejecutar
3. Copia **Prompt 0.1** (FASE 0)
4. Pégalo en Claude y comienza

**IMPORTANTE:** FASE 1 ya completada → después de FASE 0 ir directo a FASE 2

---

**Fecha:** 16 de Noviembre, 2025
**Versión:** 1.0 (Limpia)
