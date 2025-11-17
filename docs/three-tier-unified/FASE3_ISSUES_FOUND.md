# ⚠️ FASE 3 - Issues Identificados

**Fecha:** 2025-11-16
**Reportado por:** Usuario
**Status:** Requiere corrección

---

## 🔍 Problemas Encontrados

### 1. ❌ DATOS FALTANTES (CRÍTICO)

**Problema:**
- El nuevo proyecto PRD (`kprqghwdnaykxhostivv`) tiene el SCHEMA (43 tablas) pero NO tiene DATOS
- La fuente de verdad de datos está en: `hoaiwcueleiemeplrurv` (staging viejo)

**Tablas que necesitan datos:**

| Tabla | Fuente (staging) | Destino (PRD) | Acción |
|-------|------------------|---------------|--------|
| `tenant_registry` | 1 row | 0 rows | ✅ Copiar |
| `accommodation_units_public` | 49 rows | 0 rows | ✅ Copiar |
| `sire_countries` | 0 rows | 0 rows | ⚠️ Necesita data de catálogos |
| `sire_cities` | 0 rows | 0 rows | ⚠️ Necesita data de catálogos |
| `muva_content` | 0 rows | 0 rows | ⏸️ OK vacío |

**Impacto:**
- 🔴 CRÍTICO - Sistema no funcional sin datos
- Sin tenant_registry → No hay tenants
- Sin accommodation_units_public → Guest chat no puede responder

---

### 2. ⚠️ FUNCIONES RPC FALTANTES

**Problema:**
Usuario reporta que faltan 3 funciones que SÍ existen en staging viejo

**Acción necesaria:**
1. Listar funciones en staging viejo (hoaiwcueleiemeplrurv)
2. Listar funciones en PRD nuevo (kprqghwdnaykxhostivv)
3. Identificar las 3 faltantes
4. Crear migration para agregarlas

---

### 3. ⚠️ SECURITY ADVISORS (NO CRÍTICO)

**Status confirmado:**

**Errores (3):**
1. `guest_chat_performance_monitor` - View con SECURITY DEFINER
   - **Impacto:** Bajo (no existe en PRD nuevo, posiblemente OK)
2. `code_embeddings` - RLS disabled
   - **Impacto:** Bajo (tabla de testing)
3. `migration_metadata` - RLS disabled
   - **Impacto:** Bajo (metadata interna)

**Warnings (16):**
- Functions sin search_path fijo
- **Impacto:** Medio
- **Acción:** Fix en próxima migration

---

## 🎯 Plan de Corrección

### PRIORIDAD 1: Copiar Datos (CRÍTICO)

**Orden de ejecución:**

1. **Tenant Registry** (1 row)
   ```sql
   -- Export desde staging viejo
   -- Import a PRD nuevo
   ```

2. **Accommodation Units Public** (49 rows)
   ```sql
   -- Export desde staging viejo
   -- Import a PRD nuevo
   ```

3. **Catálogos SIRE**
   - sire_countries (códigos países SIRE)
   - sire_cities (códigos ciudades SIRE)
   - **Fuente:** Archivos de catálogo o script de seed

### PRIORIDAD 2: Funciones RPC Faltantes

1. Identificar las 3 funciones
2. Extraer definiciones de staging viejo
3. Crear migration `20251116000000_add_missing_functions.sql`
4. Aplicar a PRD

### PRIORIDAD 3: Security Fixes (NO URGENTE)

1. Agregar RLS a `code_embeddings`
2. Agregar RLS a `migration_metadata`
3. Fix search_path en 16 funciones

---

## 📋 Checklist de Corrección

- [ ] Exportar datos de tenant_registry
- [ ] Exportar datos de accommodation_units_public
- [ ] Importar datos a PRD
- [ ] Identificar 3 funciones faltantes
- [ ] Crear migration con funciones
- [ ] Aplicar migration
- [ ] Validar datos en PRD
- [ ] Validar funciones en PRD
- [ ] Actualizar FASE3_COMPLETION_REPORT.md

---

## 🚨 Estado Actual de FASE 3

**Antes:** ✅ COMPLETADA
**Ahora:** ⚠️ COMPLETADA CON ISSUES
**Acción:** Corrección de datos + funciones faltantes

---

**Siguiente paso:** Usuario debe confirmar cuáles son las 3 funciones faltantes para proceder con la corrección.
