# Guest Chat Fix Applied - November 6, 2025

**Problema:** Guest chat no responde preguntas sobre alojamiento
**Fecha Fix:** November 6, 2025, 03:30 AM
**Estado:** ✅ FUNCIONES RPC ARREGLADAS EN DEV Y STAGING

---

## FIX APLICADO

### Funciones RPC Re-creadas

Re-apliqué las funciones RPC críticas con el `search_path` correcto:

```sql
-- 1. match_unit_manual_chunks (CRÍTICA para guest chat)
CREATE OR REPLACE FUNCTION public.match_unit_manual_chunks(...)
SET search_path TO 'public', 'hotels', 'extensions'  -- ✅ Incluye 'extensions'

-- 2. match_muva_documents (CRÍTICA para turismo)
CREATE OR REPLACE FUNCTION public.match_muva_documents(...)
SET search_path TO 'public', 'extensions', 'pg_temp'  -- ✅ Incluye 'extensions'
```

### Bases de Datos Actualizadas

- ✅ **DEV** (ooaumjzaztmutltifhoq): Funciones re-creadas
- ✅ **STAGING** (rvjmwwvkhglcuqwcznph): Funciones re-creadas

### Test de Verificación

**Query ejecutado:**
```sql
SELECT match_unit_manual_chunks(
  (SELECT embedding_balanced FROM accommodation_units_manual_chunks LIMIT 1),
  '51ac0aaa-683d-49fe-ae40-af48e6ba0096'::uuid,
  0.1,
  3
);
```

**Resultado:** ✅ FUNCIONA
Retorna 3 chunks con información de:
- "Ubicación del Alojamiento"
- "Acceso y Claves" (incluye clave del apartamento: 6308)
- "Instrucciones para llegar"

---

## VPS/PRODUCCIÓN

### PM2 Restart

```bash
ssh -i ~/.ssh/muva_deploy root@195.200.6.216
pm2 restart muva-chat
```

**Status:** ✅ Producción reiniciada (HTTP 200)

### Nota sobre Staging VPS

- No hay proceso PM2 separado para staging
- Solo existe directorio `/var/www/muva-chat-staging`
- Staging usa branch de Supabase (rvjmwwvkhglcuqwcznph)

---

## PRÓXIMOS PASOS

### 1. Verificar Guest Chat en Producción

URL: https://simmerdown.muva.chat/guest-chat

**Test:**
1. Autenticarse como guest (con phone_last_4)
2. Preguntar: "¿Cuál es la clave del WiFi?"
3. Debe responder con info del apartamento

### 2. Si Sigue Sin Funcionar

Verificar:
- ¿El guest tiene `accommodation_unit_id` en su session?
- ¿La app está usando la DB correcta?
- ¿El código del chat engine está usando `match_unit_manual_chunks`?

Ver: `/Users/oneill/Sites/apps/muva-chat/src/lib/conversational-chat-engine.ts:316-333`

---

## EVIDENCIA

**Función en DEV:**
```
proname: match_unit_manual_chunks
search_path: 'public', 'hotels', 'extensions' ✅
```

**Función en STAGING:**
```
proname: match_unit_manual_chunks
search_path: 'public', 'hotels', 'extensions' ✅
```

**Test Result:**
```json
{
  "section_title": "Acceso y Claves",
  "chunk_content": "Clave del apartamento Sunshine: 6308",
  "similarity": 0.6758
}
```

---

**Fix Aplicado Por:** Claude Code
**Método:** MCP Supabase direct SQL execution
**Verificación:** Test real con embeddings
