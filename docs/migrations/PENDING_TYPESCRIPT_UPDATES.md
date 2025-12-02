# Trabajo Pendiente: Actualización TypeScript Post-Migración

**Status:** ✅ Base de datos completada | ⏳ Código pendiente
**Fecha:** 2025-11-09

---

## Resumen

La migración de base de datos a fuente única de verdad (`hotels.accommodation_units`) está **100% completada**.

El código TypeScript requiere actualizaciones para usar la nueva estructura. Esta tarea es **GRANDE** (afecta 617 líneas en script de sync + múltiples archivos de chat).

---

## Opción Recomendada: Script Nuevo vs Modificar Existente

### Opción A: Crear `sync-accommodations-to-hotels.ts` (RECOMENDADO)

**Ventajas:**
- ✅ No rompe el flujo actual mientras migras
- ✅ Puedes probar el nuevo script sin afectar producción
- ✅ Mantiene el script viejo como referencia
- ✅ Cambio arquitectural grande = script nuevo justificado

**Desventajas:**
- ⚠️ Duplicación temporal de código

**Archivos a crear:**
```
scripts/
├── sync-accommodations-to-public.ts  (DEPRECATED - mantener por ahora)
└── sync-accommodations-to-hotels.ts  (NUEVO - usa hotels.accommodation_units)
```

### Opción B: Modificar `sync-accommodations-to-public.ts`

**Ventajas:**
- ✅ No hay duplicación de código

**Desventajas:**
- ❌ Rompe el flujo actual si algo sale mal
- ❌ Más difícil de rollback
- ❌ 617 líneas de cambios en un solo commit

---

## Trabajo Pendiente Detallado

### 1. Script de Sync (`scripts/sync-accommodations-to-hotels.ts`)

**Cambios arquitecturales:**

#### ANTES (chunks separados → accommodation_units_public):
```typescript
// 1 alojamiento = 7-8 registros (chunks)
for (const chunk of chunks) {
  await supabase
    .from('accommodation_units_public')
    .insert({
      unit_id: uuid(),
      name: `${name} - ${chunk.sectionTitle}`,
      description: chunk.content,
      embedding_fast: await generateEmbeddingTier1(chunk.content),
      embedding: await generateEmbeddingTier2(chunk.content)
    });
}
```

#### DESPUÉS (consolidado → hotels.accommodation_units):
```typescript
// 1 alojamiento = 1 registro consolidado
const consolidatedDescription = chunks
  .map(c => `## ${c.sectionTitle}\n${c.content}`)
  .join('\n\n');

await supabase
  .from('hotels.accommodation_units')
  .insert({
    id: uuid(),
    tenant_id,
    name,  // Sin sufijo " - Overview"
    full_description: consolidatedDescription,
    public_description: consolidatedDescription,  // Para chat público
    embedding_public_fast: await generateEmbeddingTier1(consolidatedDescription),
    embedding_public_full: await generateEmbeddingTier2(consolidatedDescription),
    // guest_description y embedding_guest_* se llenan después con manual
    pricing,
    amenities_list,
    capacity,
    bed_configuration,
    images,
    unit_type,
    unit_number,
    status: 'active',
    // ... otros campos
  });
```

**Complejidad:** ~300 líneas de cambios

---

### 2. Chat Público (`src/lib/public-chat-search.ts`)

**Cambios mínimos** (RPC ya actualizado):

```typescript
// ANTES
const { data } = await supabase.rpc('match_accommodations_public', {
  query_embedding: embeddingFast,
  p_tenant_id: tenantId,
  match_threshold: 0.3,
  match_count: 4
});

// DESPUÉS - Sin cambios! RPC ya apunta a hotels.accommodation_units
// Pero verificar que el response sigue siendo compatible
```

**Complejidad:** ~10 líneas de verificación

---

### 3. Guest Chat (`src/lib/dev-chat-search.ts`)

**Cambios** (usar nuevo RPC):

```typescript
// ANTES - Usaba accommodation_units_manual_chunks (vacía)
const { data } = await supabase.rpc('match_guest_accommodations', {
  // ...
});

// DESPUÉS - Usar nuevo RPC
const { data } = await supabase.rpc('match_accommodations_guest', {
  query_embedding: embeddingFast,
  p_tenant_id: tenantId,
  p_guest_unit_id: guestUnitId,  // UUID del alojamiento del huésped
  match_threshold: 0.3,
  match_count: 4
});
```

**Complejidad:** ~50 líneas

**NOTA IMPORTANTE:** Guest embeddings (`embedding_guest_fast/full`) requieren **contenido del manual de alojamiento**, que no tienes aún. Esto es un **proyecto separado** (procesar PDFs de manuales).

---

### 4. Actualización de Tipos (`src/types/`)

Agregar nuevas columnas a interfaces TypeScript:

```typescript
// src/types/supabase-database.ts o similar
interface HotelsAccommodationUnits {
  // Campos existentes...

  // NUEVOS campos
  embedding_public_fast: number[] | null;
  embedding_public_full: number[] | null;
  embedding_guest_fast: number[] | null;
  embedding_guest_full: number[] | null;
  public_description: string | null;
  guest_description: string | null;
}
```

**Complejidad:** ~20 líneas

---

## Estimación de Tiempo

| Tarea | Complejidad | Tiempo Estimado |
|-------|-------------|-----------------|
| 1. Script sync nuevo | Alta | 3-4 horas |
| 2. Chat público | Baja | 30 min |
| 3. Guest chat | Media | 1-2 horas |
| 4. Tipos TypeScript | Baja | 30 min |
| 5. Testing completo | Media | 2 horas |
| **TOTAL** | | **7-9 horas** |

---

## Plan de Ejecución Recomendado

### Fase 1: Script de Sync (Crítico)
1. Crear `scripts/sync-accommodations-to-hotels.ts`
2. Consolidar chunks en descripción única
3. Generar embeddings públicos
4. Guardar en `hotels.accommodation_units`
5. Probar con 1 alojamiento (dry-run + real)

### Fase 2: Chat Público
1. Verificar que `match_accommodations_public()` funciona
2. Ejecutar sync completo
3. Probar `http://tucasaenelmar.localhost:3001/`
4. Verificar que responde preguntas sobre alojamientos

### Fase 3: Guest Chat (Opcional - requiere manuales)
1. Procesar PDFs de manuales de alojamiento
2. Generar `guest_description` y `embedding_guest_*`
3. Actualizar `dev-chat-search.ts`
4. Probar `http://tucasaenelmar.localhost:3001/guest-chat`

### Fase 4: Cleanup
1. Deprecar `scripts/sync-accommodations-to-public.ts`
2. Eliminar referencias a `accommodation_units_public`
3. Actualizar documentación

---

## Próximo Paso Inmediato

**Si quieres continuar ahora:**

Crear `scripts/sync-accommodations-to-hotels.ts` basado en el script existente pero con la nueva arquitectura consolidada.

**Si prefieres posponer:**

La base de datos está lista. Cuando retomes el trabajo:
1. Leer este documento
2. Leer `docs/migrations/SINGLE_SOURCE_OF_TRUTH_MIGRATION.md`
3. Empezar por Fase 1

---

## Archivos Clave

```
📁 Base de Datos (✅ COMPLETADO)
├── supabase/migrations/20251109000000_single_source_of_truth_embeddings.sql
├── hotels.accommodation_units (6 columnas nuevas + 4 índices)
├── match_accommodations_public() (RPC actualizado)
└── match_accommodations_guest() (RPC nuevo)

📁 Código TypeScript (⏳ PENDIENTE)
├── scripts/sync-accommodations-to-hotels.ts (CREAR)
├── src/lib/public-chat-search.ts (VERIFICAR)
├── src/lib/dev-chat-search.ts (ACTUALIZAR)
└── src/types/supabase-database.ts (ACTUALIZAR)
```

---

## Notas Finales

- ✅ Base de datos 100% lista
- ✅ Tablas limpias (0 registros)
- ✅ RPCs funcionando
- ⏳ Código requiere ~7-9 horas de trabajo
- 🎯 Enfoque recomendado: Script nuevo + testing incremental
