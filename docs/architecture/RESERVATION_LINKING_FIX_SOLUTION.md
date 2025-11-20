# Solución: Error de Foreign Key en reservation_accommodations

**Fecha:** 19 de Noviembre, 2025
**Rama:** dev-2 (yxzjurldoestlezvvjrg)
**Problema Original:** `Key (accommodation_unit_id)=(xxx) is not present in table "accommodation_units_public"`

---

## ❌ INTENTOS FALLIDOS (Lo que NO era el problema)

### Intento 1: Problema de nombres en reservaciones
- **Error:** Asumí que el problema era que las reservaciones no tenían nombres
- **Tiempo perdido:** ~30 minutos modificando el mapper de MotoPress
- **Resultado:** Empeoramos todo, pusimos URLs como nombres de huéspedes

### Intento 2: Problema con _embed en la API
- **Error:** Creí que faltaba el parámetro `_embed=1` en las llamadas a MotoPress
- **Tiempo perdido:** ~20 minutos analizando endpoints
- **Resultado:** Irrelevante, el problema no era de la API

### Intento 3: Problema de RLS (Row Level Security)
- **Error:** El usuario sugirió eliminar RLS, yo no investigué la causa real
- **Tiempo perdido:** ~10 minutos
- **Resultado:** No era RLS, era un foreign key constraint

---

## ✅ LA SOLUCIÓN REAL

### El Problema REAL (que estaba documentado en DATA_POPULATION_TIMELINE.md)

El documento **DATA_POPULATION_TIMELINE.md** en las líneas 834-876 explica claramente:

> **Dual-Table Pattern (Accommodations)**
>
> MUVA Chat usa **dos tablas separadas** para accommodations:
>
> | Table | Purpose | Format | IDs |
> |-------|---------|--------|-----|
> | `hotels.accommodation_units` | Operational data | 1 record per unit | UUID Set A |
> | `accommodation_units_public` | Semantic search | 5-7 chunks per unit | UUID Set B (DIFFERENT!) |

**EL PROBLEMA:** Los IDs son **COMPLETAMENTE DIFERENTES** entre las dos tablas.

### Ejemplo Concreto del Problema:

```yaml
Unidad: "Misty Morning"
├── En hotels.accommodation_units:
│   └── ID: de1a41b6-f708-4515-acbd-5167f7fed1e2
└── En accommodation_units_public:
    └── ID: 1c150004-2b8a-4038-9685-744bb35ad137  # ¡DIFERENTE!
```

### El Foreign Key Constraint:

```sql
-- La tabla reservation_accommodations tiene:
FOREIGN KEY (accommodation_unit_id)
  REFERENCES accommodation_units_public(unit_id)  -- ¡NO hotels.accommodation_units!
```

---

## 📝 CÓMO LO RESOLVIMOS

### Paso 1: Identificar los IDs correctos
```sql
-- Obtener los unit_id de accommodation_units_public (NO de hotels)
SELECT DISTINCT unit_id, name
FROM accommodation_units_public
WHERE tenant_id = '10c27802-545a-4ca3-b453-c9db80c4f504'
  AND name LIKE '% - Overview%';
```

### Paso 2: Crear links con IDs CORRECTOS
```typescript
// ❌ MAL - Usando ID de hotels.accommodation_units
{
  accommodation_unit_id: "de1a41b6-f708-4515-acbd-5167f7fed1e2" // WRONG TABLE!
}

// ✅ BIEN - Usando ID de accommodation_units_public
{
  accommodation_unit_id: "1c150004-2b8a-4038-9685-744bb35ad137" // CORRECT!
}
```

### Paso 3: Script de reparación
Creamos `scripts/link-all-remaining-reservations.ts` que:
1. Obtiene IDs de `accommodation_units_public` (NO de hotels)
2. Crea links en `reservation_accommodations` con esos IDs
3. Satisface el foreign key constraint correctamente

---

## 🎓 LECCIONES APRENDIDAS

### 1. **SIEMPRE revisar la documentación existente**
El documento `DATA_POPULATION_TIMELINE.md` explicaba claramente la arquitectura dual-table y que los IDs son diferentes.

### 2. **Los errores de Foreign Key NO son de RLS**
```
ERROR: Key (accommodation_unit_id)=(xxx) is not present in table "accommodation_units_public"
```
Este error significa que el ID no existe en la tabla referenciada, NO es un problema de permisos.

### 3. **Entender la arquitectura antes de "arreglar"**
```
┌─────────────────────────┐         ┌─────────────────────────┐
│ hotels.accommodation    │         │ accommodation_units_    │
│        _units          │         │       public           │
├─────────────────────────┤         ├─────────────────────────┤
│ id: UUID (Set A)       │         │ unit_id: UUID (Set B)  │
│ name: "Misty Morning"  │         │ name: "Misty - Overview"│
│ [operational data]     │         │ [embeddings, chunks]   │
└─────────────────────────┘         └─────────────────────────┘
         ⬆️                                    ⬆️
         ❌ NO SE USA                         ✅ SE USA ESTE
                                              │
                                              │
                              ┌───────────────▼────────────────┐
                              │ reservation_accommodations    │
                              ├────────────────────────────────┤
                              │ accommodation_unit_id: UUID   │
                              │ (FK → accommodation_units_     │
                              │       public.unit_id)         │
                              └────────────────────────────────┘
```

---

## 📊 RESULTADO FINAL

```yaml
Estado Inicial:
├── Total reservaciones: 231
├── Con vínculos: 0
└── Errores de FK: 231

Estado Final:
├── Total reservaciones: 231
├── Con vínculos: 231 ✅
└── Errores de FK: 0 ✅
```

---

## 🔑 COMANDOS CLAVE

### Verificar qué tabla usa el FK:
```sql
SELECT
    conname as constraint_name,
    confrelid::regclass as foreign_table,
    af.attname as foreign_column
FROM pg_constraint c
JOIN pg_attribute af ON af.attnum = ANY(c.confkey)
WHERE conrelid = 'reservation_accommodations'::regclass
  AND contype = 'f';
-- Resultado: FK apunta a accommodation_units_public.unit_id
```

### Verificar IDs en cada tabla:
```sql
-- Comparar IDs entre tablas
SELECT 'hotels' as source, id FROM hotels.accommodation_units WHERE tenant_id = ?
UNION ALL
SELECT 'public' as source, unit_id FROM accommodation_units_public WHERE tenant_id = ?;
-- Resultado: IDs completamente diferentes
```

---

## ⚠️ ADVERTENCIA PARA EL FUTURO

**NUNCA asumas que los IDs son iguales entre tablas relacionadas.**

En MUVA Chat:
- `hotels.accommodation_units.id` ≠ `accommodation_units_public.unit_id`
- Son la misma unidad conceptual pero con IDs diferentes
- SIEMPRE verificar qué tabla referencia el foreign key

---

**Documento creado después de 3 intentos fallidos por no leer DATA_POPULATION_TIMELINE.md**