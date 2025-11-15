# Tintero.md

## Análisis del Problema de Retrieval Incompleto

### Problema Identificado
El sistema de chat de SimmerDown tiene un problema de **retrieval incompleto** en consultas de inventario:

**Síntomas:**
- ✅ **Búsquedas específicas funcionan**: "apartamento One Love" → Lo encuentra
- ✅ **Búsquedas específicas funcionan**: "apartamento Simmer Highs" → Lo encuentra
- ✅ **Cualquier alojamiento específico** → Lo encuentra
- ❌ **Consultas de inventario**: "¿Qué alojamientos tenemos?" → Solo 2 de 8 resultados
- ❌ **Consultas generales**: "¿Cuántos alojamientos hay?" → Solo 2 de 8 resultados

### Root Cause
El sistema está configurado para consultas **específicas** (similarity search precisa) pero NO para consultas **inventario completo** (broad retrieval).

**Datos Confirmados:**
- 8 alojamientos totales: Dreamland, Kaya, Misty Morning, Natural Mystic, One Love, Simmer Highs, Summertime, Sunshine
- Solo se muestran: Kaya + Simmer Highs (2 resultados)
- Todos tienen embeddings (las búsquedas específicas funcionan)

### Solución Propuesta
1. **Detectar tipo de query**: "inventario completo" vs "búsqueda específica"
2. **Parámetros dinámicos**:
   - Inventario → `top_k=15`, similarity threshold bajo
   - Específica → `top_k=4`, similarity threshold normal
3. **Query intent detection** mejorado para detectar "inventory_complete"
4. **Ajustar parámetros** de búsqueda según tipo de consulta

### Implementación Técnica
- Modificar `/src/lib/query-intent.ts` para mejor detección de inventario
- Ajustar parámetros en `/src/app/api/chat/listings/route.ts`
- Configurar `match_optimized_documents` con parámetros dinámicos

---
**Status**: En el tintero - esperando nueva idea del usuario para mejores resultados