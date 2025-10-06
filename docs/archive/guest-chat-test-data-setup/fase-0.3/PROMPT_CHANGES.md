# FASE 0.3: Actualización de System Prompt

**Fecha:** Oct 1, 2025
**Estado:** ✅ COMPLETADO
**Archivo Modificado:** `src/lib/conversational-chat-engine.ts:680-758`

## Objetivo

Actualizar el system prompt del Guest Chat para reflejar claramente la arquitectura de 3 dominios de información, eliminando la confusión entre información pública y privada.

## Problema Original

El prompt anterior usaba categorías ambiguas:

```
1. INFORMACIÓN DE ALOJAMIENTO (Dos niveles):
   A) INFORMACIÓN PÚBLICA (Todas las unidades ✅)
   B) INFORMACIÓN PRIVADA/MANUAL (Solo ${accommodationName} ⛔)

2. TURISMO Y ACTIVIDADES
3. POLÍTICAS DEL HOTEL
```

**Problemas:**
- ❌ No estaba claro cuándo usar cada categoría
- ❌ "Información de Alojamiento" mezclaba dos conceptos diferentes
- ❌ No había etiquetas visuales para identificación rápida
- ❌ No se mencionaba explícitamente el dominio MUVA

## Solución Implementada

### Nueva Estructura de 3 Dominios

```
📚 ARQUITECTURA DE 3 DOMINIOS DE INFORMACIÓN:

1. **[TURISMO SAN ANDRÉS 🌴]** - Información turística general
   - Restaurantes, playas, actividades, transporte
   - Contenido de MUVA (base turística de San Andrés)
   - Disponible para todos los huéspedes

2. **[HOTEL SIMMERDOWN 🏨]** - Políticas generales del hotel
   - Políticas generales del hotel
   - Horarios de check-in/out
   - Amenidades compartidas (piscina, WiFi, áreas comunes)
   - Reglas de la propiedad
   - Información de TODAS las unidades (descripciones, precios, comparaciones)

3. **[TU ALOJAMIENTO: ${accommodationName} #${accommodationNumber} 🏠]** - Manual operativo PRIVADO
   - Manual operativo específico de tu unidad
   - Instrucciones de electrodomésticos
   - Contraseñas WiFi, códigos de caja fuerte
   - Características únicas de tu espacio
```

### Mejoras Clave

1. **Etiquetas Visuales con Emojis**
   - 🌴 TURISMO SAN ANDRÉS - Fácil identificación
   - 🏨 HOTEL SIMMERDOWN - Claridad visual
   - 🏠 TU ALOJAMIENTO - Énfasis en privacidad

2. **Instrucciones Explícitas de Uso**
   ```
   🔒 INSTRUCCIONES DE USO DE CONTEXTO:

   - Si el huésped pregunta sobre "mi habitación", "mi alojamiento":
     🏠 Usa SOLO información marcada con [TU ALOJAMIENTO: ...]

   - Si pregunta sobre el hotel en general, otras unidades:
     🏨 Usa información marcada con [HOTEL SIMMERDOWN 🏨]

   - Si pregunta sobre actividades, restaurantes, playas:
     🌴 Usa información marcada con [TURISMO SAN ANDRÉS 🌴]
   ```

3. **Referencias a Campos de Base de Datos**
   - Conecta etiquetas con `source_table`:
     - 🏠 → `accommodation_units_manual`
     - 🏨 → `guest_information`
     - 🌴 → `muva_content`

4. **Ejemplos Actualizados**
   - Ahora incluyen referencias a dominios específicos
   - Ejemplo: "✅ Respuesta correcta (usando 🏨 HOTEL SIMMERDOWN): ..."

## Cambios en el Código

### Líneas Modificadas

**Archivo:** `src/lib/conversational-chat-engine.ts`

**Líneas:** 680-758 (79 líneas modificadas)

**Cambios principales:**
1. Reemplazado "RESTRICCIONES DE SEGURIDAD CRÍTICAS" → "ARQUITECTURA DE 3 DOMINIOS"
2. Agregada sección "📚 ARQUITECTURA DE 3 DOMINIOS DE INFORMACIÓN"
3. Agregada sección "🔒 INSTRUCCIONES DE USO DE CONTEXTO"
4. Actualizado "EJEMPLOS DE USO CORRECTO" con referencias a dominios
5. Agregado ejemplo de uso de dominio 🌴 TURISMO

### Antes y Después

#### ANTES (Líneas 688-714)
```typescript
🔒 RESTRICCIONES DE SEGURIDAD CRÍTICAS:

1. INFORMACIÓN DE ALOJAMIENTO (Dos niveles):

   A) INFORMACIÓN PÚBLICA (Todas las unidades ✅):
      ✅ Puedes mencionar y comparar TODAS las unidades del hotel
      ...

   B) INFORMACIÓN PRIVADA/MANUAL (Solo ${accommodationName} ⛔):
      ⚠️ Instrucciones detalladas, contraseñas WiFi...
      ...
```

#### DESPUÉS (Líneas 688-745)
```typescript
📚 ARQUITECTURA DE 3 DOMINIOS DE INFORMACIÓN:

Tienes acceso a 3 dominios claramente separados:

1. **[TURISMO SAN ANDRÉS 🌴]** - Información turística general
   - Restaurantes, playas, actividades, transporte
   ...

2. **[HOTEL SIMMERDOWN 🏨]** - Políticas generales del hotel
   - Políticas generales del hotel
   ...

3. **[TU ALOJAMIENTO: ${accommodationName} #${accommodationNumber} 🏠]** - Manual operativo PRIVADO
   - Manual operativo específico de tu unidad
   ...

🔒 INSTRUCCIONES DE USO DE CONTEXTO:

**IMPORTANTE - Identificación de dominios en resultados:**
- Si el huésped pregunta sobre "mi habitación"...
  🏠 Usa SOLO información marcada con [TU ALOJAMIENTO: ...]
```

## Criterios de Éxito

- ✅ Prompt menciona explícitamente los 3 dominios
- ✅ Usa emojis para identificación rápida (🌴, 🏨, 🏠)
- ✅ Instrucciones claras sobre cuándo usar cada dominio
- ✅ Incluye nombre y número de unidad del huésped
- ✅ Referencias a campos de base de datos (`source_table`)
- ✅ Ejemplos actualizados con referencias a dominios

## Impacto Esperado

### Para el Sistema
- Mayor claridad en la lógica de routing de información
- Reducción de errores de seguridad (compartir info privada)
- Base sólida para FASE 0.4 (etiquetado de contexto)

### Para Claude (LLM)
- Estructura mental más clara de los 3 dominios
- Decisiones más rápidas sobre qué información usar
- Mejor adherencia a restricciones de seguridad

### Para el Desarrollo
- Prompt más fácil de mantener y extender
- Alineación clara con arquitectura de base de datos
- Documentación implícita en el prompt mismo

## Próximos Pasos

➡️ **FASE 0.4:** Actualizar función `formatSearchContext` para agregar etiquetas 🌴/🏨/🏠 a los resultados de búsqueda

**Archivo a modificar:** `src/lib/conversational-chat-engine.ts` (líneas ~613-650)

**Objetivo:** Que los resultados de búsqueda incluyan las etiquetas visuales que el prompt ahora menciona.

## Notas Técnicas

### Variables Dinámicas en el Prompt

El prompt usa las siguientes variables dinámicas:

- `${context.guestInfo.guest_name}` - Nombre del huésped
- `${context.guestInfo.check_in}` - Fecha de check-in
- `${context.guestInfo.check_out}` - Fecha de check-out
- `${accommodationName}` - Nombre de la unidad (ej: "Kaya")
- `${accommodationNumber}` - Número de unidad (ej: "3")
- `${hasMuvaAccess}` - Boolean para acceso a turismo
- `${searchContext}` - Resultados de búsqueda vectorial

### Longitud del Prompt

- **Antes:** ~1,450 caracteres
- **Después:** ~2,100 caracteres
- **Aumento:** +45% (justificado por mayor claridad)

### Tokens Estimados

- **Antes:** ~400 tokens
- **Después:** ~550 tokens
- **Costo adicional:** ~$0.000015 por query (despreciable)

## Testing

Ver `docs/guest-chat-test-data-setup/fase-0.4/TESTING_PLAN.md` para plan de testing completo después de completar FASE 0.4.

**Testing manual sugerido:**
1. Query sobre "mi WiFi" → Debe usar 🏠 TU ALOJAMIENTO
2. Query sobre "qué apartamentos tienen terraza" → Debe usar 🏨 HOTEL SIMMERDOWN
3. Query sobre "dónde comer pescado" → Debe usar 🌴 TURISMO SAN ANDRÉS

---

**Documentación generada:** Oct 1, 2025
**Última actualización:** Oct 1, 2025
