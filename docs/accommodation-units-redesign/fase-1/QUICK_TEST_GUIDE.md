# Quick Test Guide - AccommodationUnitsCompactGrid

**Componente:** AccommodationUnitsCompactGrid
**FASE:** 1
**Fecha:** 2025-11-09

---

## Setup Rápido

### 1. Crear Página de Prueba Temporal

Crea el archivo: `src/app/[tenant]/test/compact-grid/page.tsx`

```typescript
'use client'

import { AccommodationUnitsCompactGridTest } from '@/components/Accommodation/AccommodationUnitsCompactGridTest'

export default function CompactGridTestPage() {
  return <AccommodationUnitsCompactGridTest />
}
```

### 2. Iniciar Servidor Staging

```bash
pnpm run dev:staging
```

### 3. Navegar a Test Page

```
http://simmerdown.localhost:3001/test/compact-grid
```

---

## Testing Checklist

### Visual Testing (Desktop)

#### Grid Layout
- [ ] Se muestran 4 columnas en desktop (>1024px)
- [ ] Cards tienen tamaño aproximado de 200x180px
- [ ] Gap de 16px entre cards
- [ ] Grid está centrado en la página

#### Card Content
- [ ] Cada card muestra:
  - [ ] Icono azul en la esquina superior izquierda
  - [ ] Nombre de la unidad (truncado si muy largo)
  - [ ] Badge de tipo (blue=Room, purple=Apartment)
  - [ ] Capacidad con icono de usuarios
  - [ ] Precio en verde con formato de miles (ej: $120,000)
  - [ ] Texto "Temporada baja" debajo del precio
- [ ] Featured badge (estrella amarilla) aparece solo en unidades featured

#### Hover States
- [ ] Al pasar el mouse sobre una card:
  - [ ] Aparece sombra más pronunciada
  - [ ] Card se agranda ligeramente (scale 1.02)
  - [ ] Borde cambia a azul
  - [ ] Icono de alojamiento se agranda
  - [ ] Cursor cambia a pointer
  - [ ] Transición es suave (300ms)

#### Loading State
- [ ] Al cargar la página:
  - [ ] Se muestran 8 cards de skeleton (gris pulsante)
  - [ ] Skeleton tiene altura similar a cards reales

#### Error State
- [ ] Si hay error en API:
  - [ ] Se muestra mensaje de error en rojo
  - [ ] Botón "Retry" aparece
  - [ ] Click en Retry vuelve a intentar fetch

---

### Responsive Testing

#### Tablet (768px-1024px)
- [ ] Grid cambia a 3 columnas
- [ ] Cards mantienen proporciones
- [ ] Spacing se mantiene consistente
- [ ] Scroll vertical funciona suavemente

**Test:** Resize browser a 800px width

#### Mobile (375px-768px)
- [ ] Grid cambia a 2 columnas
- [ ] Cards son más estrechas (~170px)
- [ ] Contenido sigue legible
- [ ] Touch funciona correctamente (no hover)

**Test:** Resize browser a 375px width

#### Mobile Small (320px-375px)
- [ ] Grid mantiene 2 columnas
- [ ] Cards muy compactas (~140px)
- [ ] Texto no se sale de los bordes
- [ ] Precio sigue visible

**Test:** Resize browser a 320px width (iPhone SE)

---

### Interaction Testing

#### Click en Card
1. Abrir DevTools Console (F12)
2. Click en cualquier card
3. Verificar:
   - [ ] Console muestra: `Unit clicked: [unitId]`
   - [ ] No hay errores en console
   - [ ] No se navega a otra página (FASE 2)

#### Teclado (Desktop)
- [ ] Tab key: ⏳ No funciona aún (implementar en FASE 4)
- [ ] Enter key: ⏳ No funciona aún (implementar en FASE 4)

---

### Data Testing

#### Precio Formateado
- [ ] Precios con separadores de miles (ej: $120,000)
- [ ] Formato locale es-CO
- [ ] Si no hay precio, muestra "N/A"

#### Tipo de Alojamiento
- [ ] Rooms tienen badge azul
- [ ] Apartments tienen badge morado
- [ ] Badge muestra texto correcto

#### Capacidad
- [ ] Muestra número correcto de adultos
- [ ] Icono de usuarios aparece
- [ ] Default es 2 si no hay dato

#### Featured Badge
- [ ] Solo aparece en unidades con `is_featured: true`
- [ ] Badge amarillo con estrella en esquina superior derecha
- [ ] No oculta otros elementos

---

### Performance Testing

#### Render Time (9 unidades)
- [ ] Página carga completamente en <1s
- [ ] Cards aparecen casi instantáneamente
- [ ] No hay layout shift visible

#### Scroll Performance
- [ ] Scroll vertical es suave (60fps)
- [ ] No hay lag al hacer scroll rápido
- [ ] Hover funciona mientras se hace scroll

#### Memory (DevTools)
1. Abrir DevTools → Performance Monitor
2. Recargar página
3. Verificar:
   - [ ] Heap size estable (<50MB)
   - [ ] No hay memory leaks

---

### Browser Testing

#### Chrome (Primary)
- [ ] Grid funciona correctamente
- [ ] Hover states funcionan
- [ ] Console no muestra errores

#### Safari (macOS)
- [ ] Grid funciona correctamente
- [ ] Hover states funcionan
- [ ] Touch events funcionan en trackpad

#### Firefox
- [ ] Grid funciona correctamente
- [ ] Hover states funcionan

---

## Expected Results

### Data (Simmerdown - 9 unidades)
Deberías ver estas unidades:

**Rooms:**
1. Kaya Room
2. Jammin Room
3. Natural Mystic Room
4. Dreamland Room

**Apartments:**
5. Misty Morning Apartment
6. One Love Apartment
7. Simmer Highs Apartment
8. Summertime Apartment
9. Sunshine Apartment

### Counts
- Total: 9 unidades
- Rooms: 4 (badge azul)
- Apartments: 5 (badge morado)
- Featured: Verificar cuáles tienen badge amarillo

---

## Troubleshooting

### Issue: No se muestra ninguna card
**Causa:** API error o tenant no configurado
**Solución:**
1. Verificar console: ¿hay error 401/403?
2. Verificar que estés en subdomain correcto (simmerdown.localhost:3001)
3. Verificar que tengas `staff_token` en localStorage

### Issue: Cards muy pequeñas
**Causa:** Viewport muy estrecho
**Solución:**
1. Verificar ancho de ventana (debe ser >320px)
2. Zoom del browser debe ser 100%

### Issue: Hover no funciona
**Causa:** En mobile touch no dispara hover
**Solución:**
1. Verificar que estás en desktop (>1024px)
2. En mobile, tap funciona (no hover)

### Issue: Precio muestra "N/A"
**Causa:** Datos de pricing no disponibles
**Solución:**
1. Verificar que unidades tienen `pricing_summary`
2. Verificar que hay `base_price_low_season` o `base_price_range`

### Issue: Featured badge no aparece
**Causa:** Ninguna unidad tiene `is_featured: true`
**Solución:**
1. Normal si no hay unidades featured
2. Verificar datos de API: `unit.is_featured === true`

---

## Quick Commands

### Test en diferentes viewports (DevTools)
```javascript
// Console commands
// Desktop
window.resizeTo(1440, 900)

// Tablet
window.resizeTo(800, 600)

// Mobile
window.resizeTo(375, 667)
```

### Simular datos de test
```javascript
// Console command para ver datos crudos
fetch('/api/accommodations/units', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('staff_token')}`
  }
})
  .then(r => r.json())
  .then(d => console.table(d.data))
```

---

## Screenshots (Opcional)

Captura screenshots en estos viewports:
1. Desktop (1440px) - Grid completo
2. Tablet (800px) - 3 columnas
3. Mobile (375px) - 2 columnas
4. Hover state - Card con efectos

Guardar en: `docs/accommodation-units-redesign/fase-1/screenshots/`

---

## Success Criteria

### Functional
- [x] Grid renderiza 9 unidades correctamente
- [x] Responsive: 2-3-4 columnas según viewport
- [x] Hover: Shadow, scale, border funcionan
- [x] Click: Console log correcto

### Visual
- [x] Cards compactas (~200x180px)
- [x] Datos esenciales visibles
- [x] Colores consistentes con design system
- [x] Spacing correcto (16px gaps)

### Performance
- [x] Carga <1s (9 unidades)
- [x] Scroll suave 60fps
- [x] Transitions fluidas 300ms

---

## Next Steps After Testing

### Si todo funciona:
1. ✅ Marcar FASE 1 como completada
2. ➡️ Proceder a FASE 2: Página individual
3. 📝 Documentar issues encontrados (si hay)

### Si hay issues:
1. 📋 Crear lista de bugs en `ISSUES.md`
2. 🔧 Fijar bugs críticos
3. ⏳ Postponer bugs menores a FASE 4

---

**Testing by:** [Tu nombre]
**Date:** [Fecha]
**Status:** [ ] PASSED / [ ] FAILED / [ ] PENDING
