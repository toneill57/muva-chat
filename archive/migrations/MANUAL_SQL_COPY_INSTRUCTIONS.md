# Instrucciones para Copiar Manualmente las 2 Tablas Faltantes

**Fecha:** 7 de Noviembre, 2025
**Tablas:** `hotels.accommodation_units` (26 filas) + `accommodation_units_manual_chunks` (219 filas)
**Archivos generados:**
- `/tmp/hotels-accommodation-units.sql` (✅ Regenerado con tipos de array corregidos - Nov 7, 2025)
- `/tmp/accommodation-units-manual-chunks.sql`

---

## ⚠️ Contexto del Problema

El schema `hotels` NO está expuesto por Supabase PostgREST (solo permite `public` y `graphql_public`), por lo que la migración automatizada no pudo copiar estas 2 tablas.

**IMPORTANTE:** La función RPC `execute_sql` reporta éxito pero NO persiste los INSERT statements (bug de Supabase). Por lo tanto, estas tablas deben copiarse manualmente vía SQL Editor de Supabase Dashboard.

---

## 📋 Pasos para Ejecutar

### 1. Abrir Supabase Dashboard - STAGING

```
https://supabase.com/dashboard/project/hoaiwcueleiemeplrurv/editor
```

O directo al SQL Editor:
```
https://supabase.com/dashboard/project/hoaiwcueleiemeplrurv/sql/new
```

### 2. ⚠️ IMPORTANTE: Copiar archivo `hotels.accommodation_units` PRIMERO (26 filas)

**Archivo:** `/tmp/hotels-accommodation-units.sql`

**⚠️ DEBE ejecutarse PRIMERO** porque `accommodation_units_manual_chunks` tiene una FK a esta tabla.

**Pasos:**
1. Abrir el archivo en un editor de texto
2. Copiar TODO el contenido (incluye 26 INSERT statements)
3. Pegar en el SQL Editor de Supabase
4. Ejecutar (botón "Run" o `Cmd/Ctrl + Enter`)

**Resultado esperado:**
```
26 rows inserted
```

### 3. Copiar archivo `accommodation_units_manual_chunks` (219 filas)

**Archivo:** `/tmp/accommodation-units-manual-chunks.sql`

**Pasos:**
1. Abrir el archivo en un editor de texto
2. Copiar TODO el contenido (incluye 219 INSERT statements)
3. Pegar en el SQL Editor de Supabase
4. Ejecutar (botón "Run" o `Cmd/Ctrl + Enter`)

**Resultado esperado:**
```
219 rows inserted
```

**⚠️ NOTA:** Este archivo NO incluye las columnas de vectores (`embedding`, `embedding_balanced`, `embedding_fast`) porque son demasiado grandes. Estos embeddings deberán regenerarse en staging.

### 4. Verificar Inserción

Ejecutar en SQL Editor:

```sql
-- Verificar hotels.accommodation_units
SELECT
  tenant_id,
  COUNT(*) as count
FROM hotels.accommodation_units
GROUP BY tenant_id;

-- Esperado:
-- 2263efba-b62b-417b-a422-a84638bc632f | 16
-- b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf | 10

-- Verificar accommodation_units_manual_chunks
SELECT
  tenant_id,
  COUNT(*) as count,
  COUNT(CASE WHEN embedding IS NULL THEN 1 END) as embeddings_null
FROM accommodation_units_manual_chunks
GROUP BY tenant_id;

-- Esperado:
-- 219 total rows
-- 219 embeddings_null (todos NULL - pendiente regeneración)
```

---

## 🔧 Regenerar Embeddings (PENDIENTE)

Las columnas de vectores (`embedding`, `embedding_balanced`, `embedding_fast`) en `accommodation_units_manual_chunks` están NULL porque no se pudieron copiar via SQL (demasiado grandes).

### Opciones para regenerarlos:

**Opción 1: Script de regeneración automática**
```bash
# Crear script que procese todos los chunks y genere embeddings
pnpm dlx tsx scripts/regenerate-manual-chunks-embeddings.ts --env=staging
```

**Opción 2: Trigger en la aplicación**
- Al hacer login en staging, detectar chunks sin embeddings
- Regenerar automáticamente en background

**Opción 3: Copiar embeddings desde producción**
```sql
-- ADVERTENCIA: Esta query es EXTREMADAMENTE PESADA
-- Solo ejecutar si es absolutamente necesario
UPDATE accommodation_units_manual_chunks staging
SET
  embedding = prod.embedding,
  embedding_balanced = prod.embedding_balanced,
  embedding_fast = prod.embedding_fast
FROM (
  SELECT id, embedding, embedding_balanced, embedding_fast
  FROM accommodation_units_manual_chunks
) prod
WHERE staging.id = prod.id;
```

---

## ✅ Checklist de Finalización

- [ ] `hotels.accommodation_units` copiado (26 filas)
- [ ] `accommodation_units_manual_chunks` copiado (219 filas)
- [ ] Verificación SQL ejecutada exitosamente
- [ ] Embeddings regenerados (o programado para regeneración)
- [ ] Test de guest chat en staging

---

## 📊 Estado Final Esperado

| Tabla | Producción | Staging | Estado |
|-------|------------|---------|--------|
| `hotels.accommodation_units` | 26 | 26 | ✅ |
| `accommodation_units_manual_chunks` | 219 | 219 | ⚠️ (sin embeddings) |

---

## 🚨 Troubleshooting

### Error: "duplicate key value violates unique constraint"
**Causa:** Ya existen registros en la tabla
**Solución:**
```sql
-- Limpiar tabla antes de insertar
DELETE FROM hotels.accommodation_units;
DELETE FROM accommodation_units_manual_chunks;
```

### Error: "violates foreign key constraint accommodation_units_manual_chunks_accommodation_unit_id_fkey"
**Causa:** Orden incorrecto de inserción - `accommodation_units_manual_chunks` requiere que existan registros en `hotels.accommodation_units` primero
**Solución:**
1. Ejecutar PRIMERO `/tmp/hotels-accommodation-units.sql`
2. Verificar que se insertaron 26 filas
3. LUEGO ejecutar `/tmp/accommodation-units-manual-chunks.sql`

### Error: "column tags is of type text[] but expression is of type jsonb"
**Causa:** El archivo SQL tenía un bug de tipo de datos (corregido en la versión actual)
**Solución:** Re-descargar el archivo `/tmp/hotels-accommodation-units.sql` que fue regenerado el 7 de Noviembre, 2025

### Error: "syntax error near..."
**Causa:** El contenido SQL está malformado
**Solución:** Verificar que copiaste TODO el archivo incluyendo la primera línea de comentario

---

## 📞 Soporte

Si encuentras problemas al ejecutar estos SQL statements, contactar al equipo de desarrollo con:
- Captura de pantalla del error en Supabase
- Archivo SQL que estabas ejecutando
- Resultado de la query de verificación

---

**Generado automáticamente:** 2025-11-07
**Por:** Script `scripts/export-hotels-units-sql.ts` y `scripts/export-manual-chunks-sql.ts`
