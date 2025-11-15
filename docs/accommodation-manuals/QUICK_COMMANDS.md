# Quick Commands - Mejoras Sistema de Manuales

**Para ejecutar rápidamente cada tarea del plan**

---

## 🚀 SPRINT 1 - UX Improvements (P1)

### Implementar TODAS las mejoras P1 (1h 45min)
```bash
# Crear branch
git checkout -b feat/manuals-ux-improvements

# Prompt para Claude Code:
"Implementa las 3 mejoras UX de PRIORIDAD 1 del plan MEJORAS_PLAN_PROJECT.md:

1. Drag Preview Enhancement (30 min)
2. Success Animation (45 min)
3. Chunk Preview in Accordion (30 min)

Sigue las especificaciones exactas de cada tarea en el plan.
Archivos a modificar:
- src/components/Accommodation/AccommodationManualsSection.tsx
- src/components/Accommodation/ManualContentModal.tsx

Al terminar:
- Verifica build sin errores (pnpm run build)
- Testing manual en localhost:3001
- Prepara commit descriptivo"
```

---

### Implementar SOLO Drag Preview (30 min)
```bash
git checkout -b feat/drag-preview-enhancement

"Implementa mejora P1.1 (Drag Preview Enhancement) según MEJORAS_PLAN_PROJECT.md.
Specs en líneas 25-65.
Archivo: src/components/Accommodation/AccommodationManualsSection.tsx"
```

---

### Implementar SOLO Success Animation (45 min)
```bash
git checkout -b feat/success-animation

"Implementa mejora P1.2 (Success Animation) según MEJORAS_PLAN_PROJECT.md.
Specs en líneas 69-119.
Archivo: src/components/Accommodation/AccommodationManualsSection.tsx"
```

---

### Implementar SOLO Chunk Preview (30 min)
```bash
git checkout -b feat/chunk-preview

"Implementa mejora P1.3 (Chunk Preview in Accordion) según MEJORAS_PLAN_PROJECT.md.
Specs en líneas 123-160.
Archivo: src/components/Accommodation/ManualContentModal.tsx"
```

---

## 🚀 SPRINT 2 - Advanced Features (P2)

### Implementar TODAS las features P2 (3h 30min)
```bash
git checkout -b feat/manuals-advanced-features

"Implementa las 3 mejoras de PRIORIDAD 2 del plan MEJORAS_PLAN_PROJECT.md:

1. Search/Filter in Manual List (1h)
2. Bulk Delete Action (1.5h)
3. Manual Versioning Basic (1h)

Sigue las especificaciones exactas de cada tarea.
Archivos a modificar:
- src/components/Accommodation/AccommodationManualsSection.tsx
- src/app/api/accommodation-manuals/[unitId]/route.ts (solo para versioning)

Verificar:
- Build sin errores
- Testing completo en localhost:3001
- UX intuitiva en cada feature"
```

---

### Implementar SOLO Search/Filter (1h)
```bash
git checkout -b feat/search-filter-manuals

"Implementa mejora P2.1 (Search/Filter) según MEJORAS_PLAN_PROJECT.md.
Specs en líneas 166-217.
Archivo: src/components/Accommodation/AccommodationManualsSection.tsx"
```

---

### Implementar SOLO Bulk Delete (1.5h)
```bash
git checkout -b feat/bulk-delete-manuals

"Implementa mejora P2.2 (Bulk Delete) según MEJORAS_PLAN_PROJECT.md.
Specs en líneas 221-293.
Archivo: src/components/Accommodation/AccommodationManualsSection.tsx
IMPORTANTE: Confirmación reforzada con input 'ELIMINAR'"
```

---

### Implementar SOLO Versioning (1h)
```bash
git checkout -b feat/manual-versioning

"Implementa mejora P2.3 (Manual Versioning) según MEJORAS_PLAN_PROJECT.md.
Specs en líneas 297-350.
Archivos:
- src/components/Accommodation/AccommodationManualsSection.tsx
- src/app/api/accommodation-manuals/[unitId]/route.ts (opcional)"
```

---

## 🚀 SPRINT 2 - Performance Optimizations (P3)

### Implementar TODAS las optimizaciones P3 (2h)
```bash
git checkout -b feat/manuals-performance-optimizations

"Implementa las 3 mejoras de PRIORIDAD 3 del plan MEJORAS_PLAN_PROJECT.md:

1. Lazy Loading de Chunks (30 min)
2. Rate Limiting Frontend (30 min)
3. Cache SWR (1h)

Sigue las especificaciones exactas de cada tarea.
Archivos a modificar:
- src/components/Accommodation/ManualContentModal.tsx (lazy loading)
- src/components/Accommodation/AccommodationManualsSection.tsx (rate limiting + SWR)
- package.json (agregar 'swr' dependency)

INSTALAR SWR: pnpm add swr

Verificar métricas:
- Reducción de requests innecesarios (-50% lazy loading)
- Cache funcionando (1 min revalidación)
- Rate limiting previene spam"
```

---

### Implementar SOLO Lazy Loading (30 min)
```bash
git checkout -b feat/lazy-loading-chunks

"Implementa mejora P3.1 (Lazy Loading) según MEJORAS_PLAN_PROJECT.md.
Specs en líneas 356-395.
Archivo: src/components/Accommodation/ManualContentModal.tsx"
```

---

### Implementar SOLO Rate Limiting (30 min)
```bash
git checkout -b feat/rate-limiting-upload

"Implementa mejora P3.2 (Rate Limiting) según MEJORAS_PLAN_PROJECT.md.
Specs en líneas 399-455.
Archivo: src/components/Accommodation/AccommodationManualsSection.tsx
Cooldown: 3 segundos después de cada upload"
```

---

### Implementar SOLO SWR Cache (1h)
```bash
git checkout -b feat/swr-cache-manuals

"Implementa mejora P3.3 (Cache SWR) según MEJORAS_PLAN_PROJECT.md.
Specs en líneas 459-519.
Archivo: src/components/Accommodation/AccommodationManualsSection.tsx

IMPORTANTE:
1. Primero: pnpm add swr
2. Implementar según specs
3. Configurar revalidación: 60s
4. Mutate después de upload/delete"
```

---

## 🚀 SPRINT 3 (OPCIONAL) - Premium Features (P4)

### Implementar Manual Preview (2h)
```bash
git checkout -b feat/manual-preview-modal

"Implementa mejora P4.1 (Manual Preview) según MEJORAS_PLAN_PROJECT.md.
Specs en líneas 527-588.
Archivos:
- src/components/Accommodation/ManualPreviewModal.tsx (NUEVO)
- src/components/Accommodation/AccommodationManualsSection.tsx (integración)

Preview con renderizado markdown antes de confirmar upload"
```

---

### Implementar PDF Export (3h)
```bash
git checkout -b feat/pdf-export-manual

"Implementa mejora P4.2 (PDF Export) según MEJORAS_PLAN_PROJECT.md.
Specs en líneas 592-659.
Archivos:
- src/app/api/accommodation-manuals/[manualId]/export/route.ts (NUEVO)
- src/components/Accommodation/AccommodationManualsSection.tsx (botón download)

IMPORTANTE:
1. Primero: pnpm add jspdf
2. Crear API endpoint /export
3. Agregar botón de descarga en UI"
```

---

### Implementar Analytics Dashboard (4h)
```bash
git checkout -b feat/manual-analytics-dashboard

"Implementa mejora P4.3 (Analytics Dashboard) según MEJORAS_PLAN_PROJECT.md.
Specs en líneas 663-752.
Archivos:
- src/components/Accommodation/ManualAnalytics.tsx (NUEVO)
- supabase/migrations/YYYYMMDDHHMMSS_manual_analytics.sql (NUEVO)
- src/app/api/accommodation-manuals/[unitId]/analytics/route.ts (NUEVO)

IMPORTANTE:
1. Crear migration para tabla analytics
2. Aplicar en staging primero
3. Implementar tracking de eventos
4. Dashboard con 3-5 métricas clave"
```

---

## 📋 TESTING COMMANDS

### Test completo después de P1
```bash
# Build check
pnpm run build

# Dev server
pnpm run dev:staging

# Testing manual en navegador:
# http://simmerdown.localhost:3001/accommodations/units

# Validar:
# 1. Drag preview visible durante drag
# 2. Success animation después de upload
# 3. Chunk preview visible en accordion collapsed
```

---

### Test completo después de P2
```bash
pnpm run build
pnpm run dev:staging

# Testing manual:
# 1. Subir >3 manuales → Search debe aparecer
# 2. Buscar manual por nombre → Resultados instantáneos
# 3. Seleccionar 2+ manuales → Bulk delete button visible
# 4. Intentar subir filename duplicado → Confirmación aparece
```

---

### Test completo después de P3
```bash
pnpm run build
pnpm run dev:staging

# Testing performance:
# 1. Abrir DevTools Network tab
# 2. Cargar página → Verificar 0 requests a /chunks (lazy loading)
# 3. Abrir modal → 1 request a /chunks
# 4. Cerrar y reabrir → Cache, no re-fetch
# 5. Intentar spam upload → Rate limiting activo
```

---

## 🔧 TROUBLESHOOTING

### Si build falla con TypeScript errors:
```bash
# Verificar tipos
pnpm exec tsc --noEmit

# Ver errores específicos
pnpm run build 2>&1 | grep "error TS"
```

---

### Si SWR no funciona:
```bash
# Verificar instalación
pnpm ls swr

# Si no está instalado:
pnpm add swr

# Verificar import correcto en componente:
# import useSWR from 'swr'
```

---

### Si animations no se ven smooth:
```bash
# Verificar Tailwind config incluye animations
# tailwind.config.ts debe tener:
# plugins: [require('@tailwindcss/forms'), ...]

# Verificar classes correctas:
# animate-in fade-in zoom-in duration-300
```

---

## 📊 MÉTRICAS DE ÉXITO

### Después de P1 (UX):
```bash
# Verificar en DevTools Console:
# - No errores JavaScript
# - Animaciones 60fps (Performance tab)
# - Drag preview rendering correcto
```

### Después de P2 (Features):
```bash
# Testing funcional:
# - Search filtra correctamente
# - Bulk delete funciona con confirmación
# - Versioning detecta duplicados
```

### Después de P3 (Performance):
```bash
# Métricas esperadas (DevTools Network):
# - Lazy loading: -50% requests a /chunks
# - SWR cache: -60% requests a /list
# - Rate limiting: 0 errores de spam
```

---

## 🎯 QUICK REFERENCE

**Archivo de plan completo:**
```
docs/accommodation-manuals/MEJORAS_PLAN_PROJECT.md
```

**Componentes a modificar:**
```
src/components/Accommodation/AccommodationManualsSection.tsx  (P1, P2, P3)
src/components/Accommodation/ManualContentModal.tsx           (P1, P3)
src/app/api/accommodation-manuals/[unitId]/route.ts           (P2.3)
```

**Dependencies a instalar:**
```bash
pnpm add swr        # Para P3.3 (Cache)
pnpm add jspdf      # Para P4.2 (PDF Export) - OPCIONAL
```

---

**Última actualización:** 2025-11-09
**Estado:** ✅ Ready to use

**Para ejecutar Sprint 1 completo:**
```bash
git checkout -b feat/manuals-ux-improvements

# Copiar el prompt de "Implementar TODAS las mejoras P1" arriba
# y ejecutar con Claude Code
```
