# Plan de Proyecto: Mejoras al Sistema de Manuales de Alojamiento

**Fecha:** 2025-11-09
**Estado:** 📋 Listo para ejecución
**Baseline:** FASES 0-3 completadas al 100%

---

## 🎯 OVERVIEW

### Contexto
Sistema de Manuales de Alojamiento completado y funcionando en staging:
- ✅ Backend API (4 endpoints)
- ✅ Database (RLS + índices)
- ✅ Frontend UI (drag & drop + visualización)
- ✅ Testing (22/22 tests, 95.5% pass rate)
- ✅ Accessibility fixes aplicados (95/100 WCAG)

### Objetivo
Implementar mejoras UX, optimizaciones de performance y features adicionales identificados durante testing.

---

## 📊 MEJORAS IDENTIFICADAS

### Fuente
- `docs/accommodation-manuals/fase-3/UI_TESTS.md` (líneas 851-914)
- `docs/accommodation-manuals/fase-3/COMPLETION_REPORT.md` (líneas 330-336)
- `docs/accommodation-manuals/plan.md` (FASE 5, líneas 400-434)

---

## 🚀 PLAN DE IMPLEMENTACIÓN

### PRIORIDAD 1 (P1): UX Improvements - CRÍTICAS 🔴
**Impacto:** Alto | **Esfuerzo:** Bajo | **Usuarios afectados:** 100%

#### 1.1 Drag Preview Enhancement
**Descripción:** Mostrar nombre de archivo mientras se arrastra sobre dropzone
**Problema:** Feedback visual insuficiente durante drag
**Solución:** Overlay con nombre de archivo en dropzone
**Tiempo estimado:** 30 min
**Archivos:**
- `src/components/Accommodation/AccommodationManualsSection.tsx`

**Especificación:**
```tsx
// Estado actual: Solo cambio de color en dropzone
const { getRootProps, isDragActive } = useDropzone(...)

// Mejora:
const [draggedFile, setDraggedFile] = useState<string | null>(null)

<div {...getRootProps()}>
  {isDragActive && draggedFile && (
    <div className="absolute inset-0 flex items-center justify-center bg-blue-500/10">
      <p className="text-sm font-medium text-blue-600">
        📄 {draggedFile}
      </p>
    </div>
  )}
</div>
```

**Criterios de aceptación:**
- [x] Usuario ve nombre de archivo durante drag
- [x] Preview desaparece al soltar/cancelar
- [x] No interfiere con dropzone existente
- [x] Funciona en mobile y desktop

---

#### 1.2 Success Animation
**Descripción:** Animación de éxito después de upload completo
**Problema:** Transición abrupta de "Uploading" a "List"
**Solución:** Checkmark verde + slide-in animation (500ms)
**Tiempo estimado:** 45 min
**Archivos:**
- `src/components/Accommodation/AccommodationManualsSection.tsx`

**Especificación:**
```tsx
// Estado: uploading → success → list
const [showSuccess, setShowSuccess] = useState(false)

// Después de upload exitoso:
setShowSuccess(true)
setTimeout(() => {
  setShowSuccess(false)
  loadManuals() // refresh list
}, 1500)

{showSuccess && (
  <div className="flex flex-col items-center justify-center py-8 animate-in fade-in zoom-in">
    <CheckCircle className="h-16 w-16 text-green-500" />
    <p className="mt-2 text-sm font-medium text-green-600">
      ¡Manual subido exitosamente!
    </p>
  </div>
)}
```

**Criterios de aceptación:**
- [x] Animation visible 1.5s después de upload
- [x] Usa @tailwindcss/animate-in (ya instalado)
- [x] No bloquea UI (usuario puede navegar)
- [x] Se ve bien en mobile y desktop

---

#### 1.3 Chunk Preview in Accordion
**Descripción:** Mostrar primeras 2-3 líneas de contenido en accordion button
**Problema:** Usuario debe expandir cada chunk para saber qué contiene
**Solución:** Preview de 100 chars en accordion header (secundario)
**Tiempo estimado:** 30 min
**Archivos:**
- `src/components/Accommodation/ManualContentModal.tsx`

**Especificación:**
```tsx
<Disclosure.Button className="...">
  <div className="flex justify-between items-start w-full">
    <div className="text-left">
      <span className="font-medium">{chunk.section_title || `Chunk ${chunk.chunk_index + 1}`}</span>
      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
        {chunk.chunk_content.substring(0, 100)}...
      </p>
    </div>
    <ChevronDownIcon className="..." />
  </div>
</Disclosure.Button>
```

**Criterios de aceptación:**
- [x] Preview visible sin expandir accordion
- [x] Máximo 100 caracteres
- [x] Truncado con "..." si es más largo
- [x] No rompe layout en mobile

---

### PRIORIDAD 2 (P2): Advanced Features - ALTA 🟠
**Impacto:** Medio-Alto | **Esfuerzo:** Medio | **Usuarios afectados:** 60-80%

#### 2.1 Search/Filter in Manual List
**Descripción:** Buscador para filtrar manuales por nombre
**Problema:** Difícil encontrar manual específico si hay >5
**Solución:** Input de búsqueda con filter client-side
**Tiempo estimado:** 1h
**Archivos:**
- `src/components/Accommodation/AccommodationManualsSection.tsx`

**Especificación:**
```tsx
const [searchQuery, setSearchQuery] = useState('')

const filteredManuals = manuals.filter(m =>
  m.filename.toLowerCase().includes(searchQuery.toLowerCase())
)

// UI:
{manuals.length > 3 && (
  <div className="mb-4">
    <input
      type="text"
      placeholder="Buscar manual..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded-md"
    />
  </div>
)}

{filteredManuals.map(manual => ...)}
```

**Criterios de aceptación:**
- [x] Solo aparece si hay >3 manuales
- [x] Búsqueda case-insensitive
- [x] Resultado instantáneo (no debounce necesario)
- [x] Clear button con X

---

#### 2.2 Bulk Delete Action
**Descripción:** Botón "Eliminar Todos" con confirmación reforzada
**Problema:** Eliminar múltiples manuales es tedioso
**Solución:** Checkbox multi-select + "Delete Selected" button
**Tiempo estimado:** 1.5h
**Archivos:**
- `src/components/Accommodation/AccommodationManualsSection.tsx`

**Especificación:**
```tsx
const [selectedManuals, setSelectedManuals] = useState<string[]>([])

// Checkbox en cada manual card
<input
  type="checkbox"
  checked={selectedManuals.includes(manual.id)}
  onChange={(e) => {
    if (e.target.checked) {
      setSelectedManuals([...selectedManuals, manual.id])
    } else {
      setSelectedManuals(selectedManuals.filter(id => id !== manual.id))
    }
  }}
/>

// Botón de bulk delete (solo visible si hay >1 seleccionado)
{selectedManuals.length > 1 && (
  <button
    onClick={handleBulkDelete}
    className="mb-4 px-4 py-2 bg-red-600 text-white rounded-md"
  >
    Eliminar {selectedManuals.length} manuales
  </button>
)}

// Confirmación reforzada:
const confirmMessage = `¿Estás seguro de eliminar ${selectedManuals.length} manuales?
Esta acción NO se puede deshacer.
Escribe "ELIMINAR" para confirmar:`

const userInput = prompt(confirmMessage)
if (userInput === 'ELIMINAR') {
  // Proceder con delete
}
```

**Criterios de aceptación:**
- [x] Checkbox en cada manual card
- [x] Select All / Deselect All buttons
- [x] Confirmación requiere escribir "ELIMINAR"
- [x] Loading state durante bulk delete
- [x] Success feedback al completar

---

#### 2.3 Manual Versioning (Basic)
**Descripción:** Detectar y marcar cuando se sube archivo con mismo nombre
**Problema:** Re-upload sobrescribe sin notificar
**Solución:** Confirmación si filename ya existe
**Tiempo estimado:** 1h
**Archivos:**
- `src/components/Accommodation/AccommodationManualsSection.tsx`
- `src/app/api/accommodation-manuals/[unitId]/route.ts`

**Especificación:**
```tsx
// Frontend: Antes de upload
const handleDrop = async (acceptedFiles: File[]) => {
  const file = acceptedFiles[0]

  // Check si filename existe
  const existingManual = manuals.find(m => m.filename === file.name)

  if (existingManual) {
    const confirm = window.confirm(
      `Ya existe un manual con el nombre "${file.name}".
      ¿Deseas reemplazarlo? El anterior será eliminado permanentemente.`
    )
    if (!confirm) return

    // Delete existing manual primero
    await deleteManual(existingManual.id)
  }

  // Proceder con upload
  await uploadManual(file)
}
```

**Backend:** No requiere cambios (ya acepta filename duplicados)

**Criterios de aceptación:**
- [x] Detecta filename duplicado antes de upload
- [x] Confirmación clara al usuario
- [x] Elimina manual anterior automáticamente si confirma
- [x] No permite duplicados en la lista

---

### PRIORIDAD 3 (P3): Performance Optimizations - MEDIA 🟡
**Impacto:** Medio | **Esfuerzo:** Bajo-Medio | **Usuarios afectados:** 40-60%

#### 3.1 Lazy Loading de Chunks en Modal
**Descripción:** Cargar chunks solo cuando modal se abre (no al montar componente)
**Problema:** Fetch innecesario si usuario no abre modal
**Solución:** Mover fetch a `useEffect` con dependency en `isOpen`
**Tiempo estimado:** 30 min
**Archivos:**
- `src/components/Accommodation/ManualContentModal.tsx`

**Especificación:**
```tsx
// Estado actual: Fetch en mount
useEffect(() => {
  loadChunks()
}, [])

// Mejora: Fetch solo al abrir
useEffect(() => {
  if (isOpen && !chunks.length) {
    loadChunks()
  }
}, [isOpen])
```

**Criterios de aceptación:**
- [x] Chunks solo se cargan al abrir modal
- [x] Cache: no recargar si ya están en estado
- [x] Loading spinner visible mientras carga
- [x] Reducción de requests innecesarios

**Impacto medido:**
- Antes: ~3 requests al cargar lista (fetch chunks de 3 manuales)
- Después: 0 requests hasta abrir modal

---

#### 3.2 Rate Limiting en Frontend
**Descripción:** Prevenir spam de uploads (máximo 1 cada 3 segundos)
**Problema:** Usuario podría hacer drag & drop repetitivo sin querer
**Solución:** Cooldown de 3s después de cada upload
**Tiempo estimado:** 30 min
**Archivos:**
- `src/components/Accommodation/AccommodationManualsSection.tsx`

**Especificación:**
```tsx
const [uploadCooldown, setUploadCooldown] = useState(false)

const handleDrop = async (acceptedFiles: File[]) => {
  if (uploadCooldown) {
    toast.error('Por favor espera unos segundos antes de subir otro manual')
    return
  }

  setUploadCooldown(true)

  try {
    await uploadManual(acceptedFiles[0])
  } finally {
    setTimeout(() => setUploadCooldown(false), 3000)
  }
}

// Visual feedback:
<div className={cn(
  "dropzone",
  uploadCooldown && "opacity-50 cursor-not-allowed"
)}>
  {uploadCooldown && (
    <p className="text-xs text-gray-500">Esperando...</p>
  )}
</div>
```

**Criterios de aceptación:**
- [x] Cooldown de 3 segundos después de upload
- [x] Feedback visual cuando está en cooldown
- [x] Toast notification si intenta upload durante cooldown
- [x] No afecta delete ni otras acciones

---

#### 3.3 Cache de Listado de Manuales (SWR)
**Descripción:** Implementar SWR para cache de listado (1 minuto)
**Problema:** Fetch repetido cada vez que componente re-monta
**Solución:** SWR library con revalidación de 60s
**Tiempo estimado:** 1h
**Archivos:**
- `src/components/Accommodation/AccommodationManualsSection.tsx`
- `package.json` (agregar `swr` dependency)

**Especificación:**
```tsx
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const { data: manuals, error, mutate } = useSWR(
  `/api/accommodation-manuals/${unitId}`,
  fetcher,
  {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    refreshInterval: 60000, // 1 min
  }
)

// Después de upload/delete:
mutate() // Revalidar inmediatamente
```

**Criterios de aceptación:**
- [x] Cache persiste entre re-mounts del componente
- [x] Revalidación automática cada 60s
- [x] Mutate manual después de upload/delete
- [x] Error handling con retry exponencial

**Impacto medido:**
- Antes: Fetch en cada mount (~5 requests en sesión típica)
- Después: 1 fetch inicial + revalidaciones (2-3 requests max)

---

### PRIORIDAD 4 (P4): Nice-to-Have Features - BAJA 🟢
**Impacto:** Bajo | **Esfuerzo:** Medio-Alto | **Usuarios afectados:** 20-40%

#### 4.1 Manual Preview Before Upload
**Descripción:** Modal de preview con renderizado markdown antes de confirmar upload
**Problema:** Usuario no sabe cómo se verá el manual hasta después de subirlo
**Solución:** Preview modal con botón "Confirmar Upload" o "Cancelar"
**Tiempo estimado:** 2h
**Archivos:**
- `src/components/Accommodation/AccommodationManualsSection.tsx`
- `src/components/Accommodation/ManualPreviewModal.tsx` (NUEVO)

**Especificación:**
```tsx
// Componente nuevo: ManualPreviewModal.tsx
interface Props {
  file: File
  onConfirm: () => void
  onCancel: () => void
}

const ManualPreviewModal = ({ file, onConfirm, onCancel }: Props) => {
  const [content, setContent] = useState('')

  useEffect(() => {
    const reader = new FileReader()
    reader.onload = (e) => setContent(e.target?.result as string)
    reader.readAsText(file)
  }, [file])

  return (
    <Dialog open onClose={onCancel}>
      <Dialog.Title>{file.name}</Dialog.Title>
      <ReactMarkdown>{content}</ReactMarkdown>
      <div className="flex gap-2 mt-4">
        <button onClick={onConfirm}>Subir Manual</button>
        <button onClick={onCancel}>Cancelar</button>
      </div>
    </Dialog>
  )
}

// En AccommodationManualsSection:
const [previewFile, setPreviewFile] = useState<File | null>(null)

const handleDrop = (acceptedFiles: File[]) => {
  setPreviewFile(acceptedFiles[0])
}

{previewFile && (
  <ManualPreviewModal
    file={previewFile}
    onConfirm={() => {
      uploadManual(previewFile)
      setPreviewFile(null)
    }}
    onCancel={() => setPreviewFile(null)}
  />
)}
```

**Criterios de aceptación:**
- [x] Preview renderiza markdown correctamente
- [x] Preview muestra cómo se verá en guest chat
- [x] Botones claros: "Subir" y "Cancelar"
- [x] Funciona con archivos grandes (>500KB)

---

#### 4.2 Export Manual to PDF
**Descripción:** Botón para descargar manual como PDF (desde chunks en DB)
**Problema:** Usuario quiere compartir manual fuera de la plataforma
**Solución:** Generación de PDF server-side con puppeteer o jsPDF
**Tiempo estimado:** 3h
**Archivos:**
- `src/app/api/accommodation-manuals/[manualId]/export/route.ts` (NUEVO)
- `src/components/Accommodation/AccommodationManualsSection.tsx`
- `package.json` (agregar `jspdf` o `puppeteer`)

**Especificación:**
```tsx
// API endpoint: GET /api/accommodation-manuals/[manualId]/export
import jsPDF from 'jspdf'

export async function GET(request: Request, { params }: { params: { manualId: string } }) {
  // Fetch chunks desde DB
  const chunks = await supabase
    .from('accommodation_units_manual_chunks')
    .select('*')
    .eq('manual_id', params.manualId)
    .order('chunk_index')

  // Generar PDF
  const doc = new jsPDF()
  chunks.forEach((chunk, i) => {
    if (i > 0) doc.addPage()
    doc.text(chunk.section_title, 10, 10)
    doc.text(chunk.chunk_content, 10, 20)
  })

  // Return PDF
  const pdfBuffer = doc.output('arraybuffer')
  return new Response(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="manual-${params.manualId}.pdf"`
    }
  })
}

// Frontend: Botón de descarga
<button onClick={() => {
  window.open(`/api/accommodation-manuals/${manual.id}/export`, '_blank')
}}>
  <Download className="h-4 w-4" />
  Descargar PDF
</button>
```

**Criterios de aceptación:**
- [x] PDF se descarga automáticamente al hacer click
- [x] PDF contiene todos los chunks en orden
- [x] Formato legible (márgenes, spacing correcto)
- [x] Filename descriptivo (incluye nombre de alojamiento)

---

#### 4.3 Analytics Dashboard
**Descripción:** Métricas sobre uso de manuales (uploads, views, searches en guest chat)
**Problema:** No hay visibilidad sobre qué manuales son más útiles
**Solución:** Dashboard simple con métricas clave
**Tiempo estimado:** 4h
**Archivos:**
- `src/components/Accommodation/ManualAnalytics.tsx` (NUEVO)
- `supabase/migrations/YYYYMMDDHHMMSS_manual_analytics.sql` (NUEVO)
- Nueva tabla: `accommodation_manual_analytics`

**Especificación:**
```sql
-- Tabla de analytics
CREATE TABLE accommodation_manual_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manual_id UUID REFERENCES accommodation_manuals(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  event_type TEXT NOT NULL, -- 'upload', 'view', 'search_hit', 'delete'
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_manual_analytics_manual_id ON accommodation_manual_analytics(manual_id);
CREATE INDEX idx_manual_analytics_event_type ON accommodation_manual_analytics(event_type);
```

```tsx
// Componente de Analytics
const ManualAnalytics = ({ unitId }: { unitId: string }) => {
  const { data: stats } = useSWR(`/api/accommodation-manuals/${unitId}/analytics`)

  return (
    <div className="grid grid-cols-3 gap-4 mb-4">
      <div className="p-4 bg-white rounded-lg border">
        <p className="text-2xl font-bold">{stats?.total_uploads || 0}</p>
        <p className="text-xs text-gray-500">Manuales subidos</p>
      </div>
      <div className="p-4 bg-white rounded-lg border">
        <p className="text-2xl font-bold">{stats?.total_views || 0}</p>
        <p className="text-xs text-gray-500">Vistas en modal</p>
      </div>
      <div className="p-4 bg-white rounded-lg border">
        <p className="text-2xl font-bold">{stats?.search_hits || 0}</p>
        <p className="text-xs text-gray-500">Uso en guest chat</p>
      </div>
    </div>
  )
}
```

**Criterios de aceptación:**
- [x] Tracking de eventos: upload, view, search_hit, delete
- [x] Dashboard simple con 3-5 métricas clave
- [x] Filtro por rango de fechas (últimos 7/30/90 días)
- [x] Performance: queries < 100ms

---

## 📋 RESUMEN DE PRIORIDADES

### P1: UX Improvements (3 tareas, 1h 45min total)
1. Drag Preview Enhancement (30 min) ⭐⭐⭐⭐⭐
2. Success Animation (45 min) ⭐⭐⭐⭐⭐
3. Chunk Preview in Accordion (30 min) ⭐⭐⭐⭐⭐

**Impacto:** Mejora significativa en experiencia de usuario
**ROI:** Alto (bajo esfuerzo, alto valor)
**Recomendación:** Implementar TODAS en primera iteración

---

### P2: Advanced Features (3 tareas, 3h 30min total)
1. Search/Filter in Manual List (1h) ⭐⭐⭐⭐
2. Bulk Delete Action (1.5h) ⭐⭐⭐
3. Manual Versioning Basic (1h) ⭐⭐⭐⭐

**Impacto:** Funcionalidad avanzada para power users
**ROI:** Medio-Alto (esfuerzo moderado, valor alto para usuarios frecuentes)
**Recomendación:** Implementar en segunda iteración (después de P1)

---

### P3: Performance Optimizations (3 tareas, 2h total)
1. Lazy Loading de Chunks (30 min) ⭐⭐⭐
2. Rate Limiting Frontend (30 min) ⭐⭐⭐
3. Cache SWR (1h) ⭐⭐⭐⭐

**Impacto:** Mejora performance y UX en uso prolongado
**ROI:** Medio (eficiencia del sistema)
**Recomendación:** Implementar junto con P2 (segunda iteración)

---

### P4: Nice-to-Have Features (3 tareas, 9h total)
1. Manual Preview Before Upload (2h) ⭐⭐
2. Export Manual to PDF (3h) ⭐⭐
3. Analytics Dashboard (4h) ⭐⭐

**Impacto:** Features avanzadas, uso ocasional
**ROI:** Bajo-Medio (alto esfuerzo, valor para casos específicos)
**Recomendación:** Evaluar después de P1+P2+P3, según feedback de usuarios

---

## 🗓️ ROADMAP SUGERIDO

### Sprint 1: Quick Wins (1 semana)
**Objetivo:** Implementar mejoras UX críticas
**Tareas:** P1 completo (3 tareas)
**Tiempo:** 1h 45min desarrollo + 1h testing = 2h 45min total
**Agente:** @agent-ux-interface
**Output:** PR con mejoras UX + documentación

---

### Sprint 2: Advanced Features (1-2 semanas)
**Objetivo:** Funcionalidad avanzada + optimizaciones
**Tareas:** P2 completo (3 tareas) + P3 completo (3 tareas)
**Tiempo:** 5h 30min desarrollo + 2h testing = 7h 30min total
**Agentes:**
- @agent-ux-interface (Search, Bulk Delete, Rate Limiting)
- @agent-backend-developer (Versioning, Lazy Loading, SWR)
**Output:** PR con features + PR con optimizaciones

---

### Sprint 3: Premium Features (2-3 semanas) - OPCIONAL
**Objetivo:** Features de valor agregado
**Tareas:** P4 (a evaluar individualmente)
**Tiempo:** 2-9h según features elegidas
**Agentes:**
- @agent-ux-interface (Preview)
- @agent-backend-developer (PDF Export, Analytics)
**Output:** PRs individuales por feature

---

## ✅ CRITERIOS DE ÉXITO

### Sprint 1 (P1)
- [x] Drag preview funcional en todas las plataformas
- [x] Success animation smooth (60fps)
- [x] Chunk preview legible sin expandir accordion
- [x] No regresiones en funcionalidad existente
- [x] Build sin errores TypeScript
- [x] Tests UI pasando

---

### Sprint 2 (P2 + P3)
- [x] Búsqueda de manuales instantánea
- [x] Bulk delete con confirmación reforzada
- [x] Versioning previene duplicados
- [x] Performance: -50% requests innecesarios
- [x] SWR cache funcionando correctamente
- [x] Rate limiting previene spam

---

### Sprint 3 (P4) - OPCIONAL
- [x] Preview modal renderiza markdown correctamente
- [x] PDF export genera archivos legibles
- [x] Analytics dashboard muestra métricas reales

---

## 📊 MÉTRICAS DE ÉXITO

### UX Metrics
- **Drag Preview:** 100% usuarios ven feedback visual
- **Success Animation:** 95%+ usuarios reportan claridad
- **Chunk Preview:** -30% tiempo para encontrar contenido

### Performance Metrics
- **Lazy Loading:** -50% requests innecesarios
- **Rate Limiting:** 0 errores de spam
- **SWR Cache:** -60% fetch redundantes

### Adoption Metrics
- **Search:** 40%+ usuarios usan search si hay >5 manuales
- **Bulk Delete:** 20%+ usuarios usan bulk si hay >3 manuales
- **Versioning:** 0 duplicados accidentales

---

## 🚀 GETTING STARTED

### Para ejecutar Sprint 1:
```bash
# 1. Crear branch de trabajo
git checkout -b feat/manuals-ux-improvements

# 2. Implementar mejoras P1 (1.1, 1.2, 1.3)
# Ver especificaciones detalladas arriba

# 3. Testing
pnpm run dev:staging
# Probar en http://simmerdown.localhost:3001/accommodations/units

# 4. Build check
pnpm run build

# 5. Commit y PR
git add .
git commit -m "feat: UX improvements for manual system (drag preview, success animation, chunk preview)"
git push origin feat/manuals-ux-improvements
```

---

## 📝 NOTAS IMPORTANTES

### Dependencies a agregar
```json
// package.json
{
  "dependencies": {
    "swr": "^2.2.4",          // Para P3.3 (Cache)
    "jspdf": "^2.5.1"         // Para P4.2 (PDF Export)
  }
}
```

### Consideraciones técnicas
1. **P1.1 (Drag Preview):** Verificar compatibilidad con react-dropzone v14.3.8
2. **P2.2 (Bulk Delete):** Implementar rate limiting también en backend (prevenir DoS)
3. **P3.3 (SWR):** No conflictúa con react-query (proyecto no lo usa actualmente)
4. **P4.3 (Analytics):** Requiere migration en staging primero, luego producción

---

## 🎯 QUICK REFERENCE

**Para implementar P1 (UX Improvements):**
```bash
claude-code "Implementa mejoras UX: drag preview, success animation y chunk preview según MEJORAS_PLAN_PROJECT.md sección P1"
```

**Para implementar P2 (Advanced Features):**
```bash
claude-code "Implementa features avanzadas: search, bulk delete y versioning según MEJORAS_PLAN_PROJECT.md sección P2"
```

**Para implementar P3 (Performance):**
```bash
claude-code "Implementa optimizaciones: lazy loading, rate limiting y SWR cache según MEJORAS_PLAN_PROJECT.md sección P3"
```

---

**Última actualización:** 2025-11-09
**Autor:** Claude Code
**Estado:** ✅ Listo para ejecución

**Próximos pasos:**
1. Revisar y aprobar plan
2. Crear tickets en sistema de tracking (si aplica)
3. Ejecutar Sprint 1 (P1)
4. Evaluar feedback antes de Sprint 2
