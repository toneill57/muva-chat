# Three-Tier Migration - Plan de Ejecución

**Fecha:** 16 de Noviembre, 2025
**Duración:** 2h 40min
**Estado:** ✅ Listo para Ejecutar

---

## 📚 ARCHIVOS EN ESTA CARPETA

| Archivo | Propósito | Usar Para |
|---------|-----------|-----------|
| **README.md** | Este archivo - Punto de entrada | Orientación inicial |
| **plan.md** | Plan completo de migración | Entender fases y arquitectura |
| **TODO.md** | 32 tareas con checkboxes | Tracking de progreso |
| **workflow.md** | Prompts ejecutables copy-paste | Ejecución paso a paso |

**Carpetas:**
- `backups/` - Backups SQL (se crean durante FASE 0)
- `logs/` - Logs de ejecución (se crean durante ejecución)

---

## 🎯 ESTADO ACTUAL VERIFICADO

### Supabase Projects

| Branch | Project ID | Tablas | Datos | Migrations |
|--------|------------|--------|-------|------------|
| dev | azytxnyiizldljxrapoe | 43 | 0 | 18 |
| tst | bddcvjoeoiekzfetvxoe | 43 | 0 | 18 |
| main | kprqghwdnaykxhostivv | 0 | 0 | 0 |

### GitHub Branches

| Branch | Commit | Migrations | Estado |
|--------|--------|------------|--------|
| dev | 1875e09 | 18 | ✅ Sincronizado |
| tst | 1875e09 | 18 | ✅ Sincronizado |
| prd | 1875e09 | 18 | ✅ Sincronizado |

**Proyecto viejo (fuente de datos):**
- hoaiwcueleiemeplrurv → Staging con datos completos

---

## 🚨 FUENTES DE VERDAD (CRÍTICO)

**⚠️ Hay DOS fuentes de verdad diferentes:**

### 1. CÓDIGO/MIGRATIONS
- **Fuente:** Rama Git `staging` (commit 1875e09)
- **Contiene:** 18 migrations, código, configuración
- **Uso:** Sincronizar dev/tst/prd

### 2. DATOS
- **Fuente:** Proyecto Supabase `hoaiwcueleiemeplrurv`
- **Contiene:** Datos reales (tenants, units, conversations)
- **Uso:** Copiar datos a dev/tst en FASE 2

**NUNCA confundir estas dos fuentes.**

---

## 🚀 ARQUITECTURA FINAL

```
dev (GitHub) → dev (Supabase) → localhost:3001
18 migrations    azytxnyiiz...     + datos ✅

tst (GitHub) → tst (Supabase) → staging.muva.chat
18 migrations    bddcvjoeo...      + datos ✅

prd (GitHub) → main (Supabase) → muva.chat
18 migrations    kprqghwd...       sin datos (por ahora)
```

---

## 📋 FASES DE EJECUCIÓN

| Fase | Descripción | Tiempo | Estado |
|------|-------------|--------|--------|
| 0 | Preparación y backups | 10 min | Pendiente |
| 1 | Verificar GitHub | 0 min | ✅ COMPLETADA |
| 2 | Migrar datos a dev/tst | 30 min | Pendiente |
| 3 | Migrations a main/prd | 15 min | Pendiente |
| 4 | Config local (.env) | 20 min | Pendiente |
| 5 | GitHub Actions | 30 min | Pendiente |
| 6 | VPS deployment | 30 min | Pendiente |
| 7 | Documentación | 20 min | Opcional |

**Total:** 2h 40min (FASE 1 ya completada)

---

## ⚡ INICIO RÁPIDO

### Paso 1: Leer el Plan (5 min)
```bash
cat docs/three-tier-unified/plan.md
```

### Paso 2: Ejecutar Fase por Fase

```bash
# Abrir workflow
cat docs/three-tier-unified/workflow.md

# Copiar Prompt 0.1 completo (entre 🔽 y 🔼)
# Pegar en chat con Claude
# Esperar aprobación → Continuar con FASE 2
```

**IMPORTANTE:** FASE 1 ya está completada → saltar directo a FASE 2 después de FASE 0

---

## 🔑 DECISIONES CLAVE

1. **GitHub branches:** ✅ YA EXISTEN (dev/tst/prd sincronizados)
2. **Datos dev/tst:** Copia COMPLETA de staging viejo
3. **Datos prd:** Sin datos (se migran post-plan)
4. **Proyecto viejo:** Se mantiene como backup permanente

---

## ⚠️ PREREQUISITOS

Antes de empezar FASE 0:

- [ ] Acceso SSH al VPS: `ssh -i ~/.ssh/muva_deploy root@195.200.6.216`
- [ ] MCP Supabase configurado en Claude Code
- [ ] GitHub admin access (para configurar secrets)
- [ ] 2-3 horas disponibles

---

## 📞 PRÓXIMO PASO

**Para empezar:**

1. Lee `plan.md` completo (10 min)
2. Abre `workflow.md`
3. Copia **Prompt 0.1** (FASE 0 - Preparación)
4. Pégalo en chat con Claude
5. Sigue instrucciones paso a paso

**Después de FASE 0 → IR DIRECTO A FASE 2** (FASE 1 ya completada)

---

**Creado:** 16 de Noviembre, 2025
**Última Actualización:** 16 de Noviembre, 2025 15:35
**Versión:** 1.0 (Limpia y lista)
