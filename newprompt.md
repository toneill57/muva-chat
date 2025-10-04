# Prompt para Nueva Conversación - Optimización Búsqueda <100ms

## 📋 Copia este prompt completo:

```
CONTEXTO: Optimización Performance Búsqueda Conversation Memory

Estoy en FASE 5.1 del proyecto "Conversation Memory System". Los benchmarks muestran performance inconsistente en búsqueda vectorial.

ESTADO ACTUAL:
- Target: <100ms búsqueda vectorial (plan.md línea 258)
- Performance real: 160ms (mejor caso) a 720ms (peor caso)
- Cache embeddings: ✅ implementado (0ms cache hits)
- Índice HNSW: ✅ configurado correctamente (m=16, ef_construction=64)
- Función RPC: ✅ existe y funciona (match_conversation_memory)

PROBLEMA IDENTIFICADO:
El RPC tarda diferente cada vez (160ms vs 720ms) con mismo query.
Causa probable: Network latency + Supabase connection overhead variable.

ARCHIVOS CLAVE:
- src/lib/conversation-memory-search.ts (búsqueda actual)
- src/lib/embedding-cache.ts (cache implementado)
- scripts/benchmark-search-optimized.ts (benchmark que muestra problema)
- docs/conversation-memory/fase-5/PERFORMANCE.md (documentación)

HALLAZGOS DE INVESTIGACIÓN PREVIA:
1. Índice HNSW bien configurado ✅
2. Cache embeddings funciona (0ms en hits) ✅
3. Solo 4 filas en tabla (índice instantáneo) ✅
4. Variación está en RPC/network, no en query ✅
5. Supabase createServerClient() se llama cada búsqueda (posible overhead)

OBJETIVO:
Implementar SOLO optimizaciones quick-win (1 hora) para acercarnos a <100ms:

1. **Connection Pooling** (30min)
   - Cambiar createServerClient() por singleton
   - Reutilizar conexión Supabase
   - Ganancia esperada: 30-50ms

2. **Timing Detallado** (15min)
   - Medir tiempo RPC por separado
   - Logging: embedding time, RPC time, total time
   - Identificar bottleneck exacto

3. **EXPLAIN ANALYZE** (15min)
   - Ejecutar query directo en Supabase
   - Ver query plan real
   - Confirmar uso índice HNSW

NO HACER (over-engineering):
- ❌ Cambiar arquitectura a Postgres directo
- ❌ Redis cache adicional
- ❌ Modificar config índice HNSW
- ❌ Pre-generar más embeddings

TAREAS ESPECÍFICAS:
1. Modificar conversation-memory-search.ts:
   - Singleton Supabase client (connection pooling)
   - Agregar timing: const rpcStart = Date.now()
   - Log: RPC time, embedding time, total time

2. Crear script EXPLAIN ANALYZE:
   - Ejecutar query vectorial directo
   - Ver plan de ejecución
   - Confirmar índice usage

3. Re-ejecutar benchmark:
   - scripts/benchmark-search-optimized.ts
   - Verificar reducción de variación
   - Target: 100-150ms consistente

CRITERIO DE ÉXITO:
- Si logramos 100-120ms: ✅ SHIP IT
- Si logramos 150-180ms: ✅ Aceptable, ajustar target a <200ms con justificación
- Si sigue >200ms o inconsistente: 🔍 Problema es infraestructura, no código

EXPECTATIVA REALISTA:
Con Supabase hosted, network RTT es 50-100ms inevitable.
Target <100ms es aspiracional. 150-180ms es excelente performance real.

Por favor:
1. Lee conversation-memory-search.ts
2. Implementa connection pooling (singleton client)
3. Agrega timing detallado (RPC por separado)
4. Crea script EXPLAIN ANALYZE
5. Ejecuta benchmark y analiza resultados
```

## 📌 Instrucciones de Uso:

1. **Abre nueva conversación** en Claude Code
2. **Pega el prompt completo** de arriba
3. Claude tendrá TODO el contexto necesario
4. Ejecutará SOLO las 3 optimizaciones (1h)
5. Te dará resultados y recomendación final

## ✅ Este prompt incluye:
- ✅ Contexto completo del problema
- ✅ Estado actual y hallazgos
- ✅ Archivos específicos a modificar
- ✅ Tareas concretas (no ambiguas)
- ✅ Criterios claros de éxito
- ✅ Expectativas realistas
- ✅ Límites (no over-engineer)

**Tiempo estimado total: 1 hora**
**Risk: Bajo (fácil rollback)**
**Beneficio potencial: 30-100ms mejora**
