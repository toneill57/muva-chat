# Issues - Accommodation Units Redesign (Fase 1)

**Fecha**: 2025-11-10
**Estado General**: 2 bugs menores (P2), 2 mejoras futuras (P3)

---

## Críticos (P0) - BLOQUEADORES
**NINGUNO** ✅

---

## Altos (P1) - Impacto importante pero no bloqueador
**NINGUNO** ✅

---

## Medios (P2) - Mejoras recomendadas

### [BUG-101] Formato de precios inconsistente entre componentes
- **Descripción**: `AccommodationUnitDetail.tsx` usa `toLocaleString('es-CO')` sin `style: 'currency'`, lo que muestra precios sin símbolo de moneda (ej: "160.000" en vez de "$160.000"). Otros componentes (Grid y Tabla) usan `Intl.NumberFormat` con `style: 'currency', currency: 'COP'` correctamente.
- **Ubicación**: `src/components/Accommodation/AccommodationUnitDetail.tsx` línea 48-51
- **Impacto**: Inconsistencia visual - usuarios ven formato diferente en página individual vs lista
- **Severidad**: Medium (P2) - No rompe funcionalidad pero afecta UX
- **Fix esperado**:
  ```typescript
  // ANTES (línea 48-51):
  const formatPrice = (price?: number) => {
    if (!price) return 'N/A'
    return `$${price.toLocaleString('es-CO')}`
  }

  // DESPUÉS (recomendado):
  const formatPrice = (price?: number) => {
    if (!price) return 'N/A'
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price)
  }
  ```
- **Status**: ✅ RESUELTO - Fixed on 2025-11-10
- **Tiempo real**: 2 minutos
- **Commit**: Formato de precios consistente usando Intl.NumberFormat

---

### [BUG-102] Error state sin botón Retry en página individual
- **Descripción**: Cuando ocurre un error al cargar datos de una unidad (ej: API failure, unitId no encontrado), la página muestra solo un mensaje de error sin opción para reintentar la carga. Usuario debe usar navegación del navegador para volver.
- **Ubicación**: `src/app/[tenant]/accommodations/units/[unitId]/page.tsx` líneas 119-130
- **Impacto**: UX pobre - usuario no puede recuperarse fácilmente de errores transitorios
- **Severidad**: Medium (P2) - No bloqueador pero afecta UX
- **Fix esperado**:
  ```typescript
  // ANTES (líneas 119-130):
  if (error || !unit) {
    return (
      <div className="p-6 text-center max-w-4xl mx-auto">
        <div className="text-red-500 mb-4 text-lg">{error || 'Unit not found'}</div>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
        >
          Volver a la lista
        </button>
      </div>
    )
  }

  // DESPUÉS (recomendado):
  if (error || !unit) {
    return (
      <div className="p-6 text-center max-w-4xl mx-auto">
        <div className="text-red-500 mb-4 text-lg">{error || 'Unit not found'}</div>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => router.back()} variant="outline">
            Volver a la lista
          </Button>
          {error && (
            <Button onClick={fetchUnit} variant="default">
              Reintentar
            </Button>
          )}
        </div>
      </div>
    )
  }
  ```
- **Status**: ✅ RESUELTO - Fixed on 2025-11-10
- **Tiempo real**: 5 minutos
- **Commit**: Error state mejorado con botón Retry y mejor UX (AlertCircle icon + shadcn Button)

---

## Bajos (P3) - Mejoras futuras

### [ENHANCEMENT-001] Tabla mobile: Vista card colapsada
- **Descripción**: En mobile (<768px), la tabla requiere scroll horizontal para ver todas las columnas. Si bien hay un hint visible ("Desliza horizontalmente..."), una mejor UX sería colapsar la tabla a una vista de cards verticales en mobile.
- **Ubicación**: `src/components/Accommodation/AccommodationUnitsTable.tsx`
- **Impacto**: UX mobile mejorable - scroll horizontal no es ideal
- **Severidad**: Low (P3) - Solución actual es funcional con hint
- **Fix esperado**:
  - Detectar viewport <768px
  - Renderizar componente alternativo tipo `AccommodationUnitsCompactGrid` en vez de tabla
  - O implementar vista card inline dentro del mismo componente
- **Status**: 🔵 PLANIFICADO - Fase 3 (Filtros & Refinamiento)
- **Tiempo estimado**: 1-2 horas
- **Notas**: Esta mejora requiere diseño UX adicional para decidir qué información mostrar en cards mobile

---

### [ENHANCEMENT-002] Lazy loading de imágenes
- **Descripción**: Actualmente las imágenes se cargan todas inmediatamente (eager loading). Para mejorar performance en páginas con 50+ unidades, agregar `loading="lazy"` a tags `<img>`.
- **Ubicación**:
  - `src/components/Accommodation/AccommodationUnitsCompactGrid.tsx` línea 69
  - `src/components/Accommodation/AccommodationUnitsTable.tsx` línea 117
  - `src/components/Accommodation/AccommodationUnitDetail.tsx` líneas 93, 113
- **Impacto**: Performance mejorable - carga inicial más rápida
- **Severidad**: Low (P3) - Performance actual es aceptable para 9-20 unidades
- **Fix esperado**:
  ```typescript
  // Agregar atributo a todas las imágenes:
  <img
    src={unit.featured_image_url}
    alt={unit.name}
    loading="lazy" // ← AGREGAR
    className="..."
  />
  ```
- **Status**: 🔵 PLANIFICADO - Fase 4 (Performance Optimization)
- **Tiempo estimado**: 15 minutos
- **Prioridad**: Aumentar a P2 si tenant tiene >50 unidades

---

## Resumen de Status

| Prioridad | Total | Abiertos | Cerrados | En Progreso |
|-----------|-------|----------|----------|-------------|
| P0 (Crítico) | 0 | 0 | 0 | 0 |
| P1 (Alto) | 0 | 0 | 0 | 0 |
| P2 (Medio) | 2 | 0 | 2 | 0 |
| P3 (Bajo) | 2 | 2 | 0 | 0 |
| **TOTAL** | **4** | **2** | **2** | **0** |

---

## Criterios de Priorización

### P0 (Crítico - BLOQUEADOR)
- Rompe funcionalidad core
- Impide navegación básica
- Errores de compilación
- **Acción**: FIX INMEDIATO antes de merge

### P1 (Alto - Impacto importante)
- Afecta UX significativamente
- Causa confusión al usuario
- Datos incorrectos visibles
- **Acción**: Fix antes de merge a `main` (OK para merge a `staging`)

### P2 (Medio - Mejoras recomendadas)
- Inconsistencias menores
- UX mejorable pero funcional
- Optimizaciones nice-to-have
- **Acción**: Fix en siguiente fase o sprint

### P3 (Bajo - Mejoras futuras)
- Optimizaciones de performance (no críticas)
- Features adicionales nice-to-have
- Mejoras de diseño opcionales
- **Acción**: Backlog para fases futuras

---

## Próximos Pasos

### Inmediato (antes de merge a `staging`):
- [x] ✅ Fix BUG-101: Formato de precios consistente (COMPLETADO 2025-11-10)
- [x] ✅ Fix BUG-102: Botón Retry en error state (COMPLETADO 2025-11-10)
- [ ] Testing manual en navegador para confirmar funcionalidad

### Fase 2 (próxima):
- [x] ~~Resolver BUG-101 y BUG-102~~ (YA RESUELTOS)
- [ ] Implementar Quick Actions (ya parcialmente implementado)
- [ ] Testing funcional completo de página individual

### Fase 3 (Filtros & Refinamiento):
- [ ] ENHANCEMENT-001: Tabla mobile responsive
- [ ] Implementar filtros avanzados
- [ ] Testing de UX completo

### Fase 4 (Performance):
- [ ] ENHANCEMENT-002: Lazy loading de imágenes
- [ ] Virtual scrolling si >50 unidades
- [ ] Lighthouse audit completo

---

**Última actualización**: 2025-11-10 14:30:00
**Responsable**: @agent-ux-interface

---

## Changelog

### 2025-11-10 14:30:00
- ✅ **BUG-101 RESUELTO**: Formato de precios consistente usando `Intl.NumberFormat`
- ✅ **BUG-102 RESUELTO**: Error state con botón Retry + AlertCircle icon
- ✅ **Build**: Next.js build exitoso sin errores
- ✅ **TypeScript**: Compilación exitosa sin errores
- 📊 **Status**: P2 bugs 100% resueltos (2/2), solo P3 enhancements pendientes
