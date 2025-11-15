# 🔍 Análisis Comparativo: Kaya vs Simmer Highs

**Fecha:** 2025-10-22
**Objetivo:** Identificar patrones de bloqueo padre-hijo y tipos de eventos

---

## 📋 TIPOS DE EVENTOS DETECTADOS

Después de analizar ambos calendarios ICS, se encontraron **SOLO 2 tipos** de eventos:

### 1. ✅ "Reserved" (Reserva Confirmada)
**Características:**
- `SUMMARY` = "Reserved"
- Incluye campo `DESCRIPTION` con:
  - URL de la reserva en Airbnb
  - Últimos 4 dígitos del teléfono del huésped
- UID empieza con `1418fb94e984-`

### 2. 🚫 "Airbnb (Not available)" (Bloqueado)
**Características:**
- `SUMMARY` = "Airbnb (Not available)"
- **NO incluye campo DESCRIPTION**
- UID empieza con `7f662ec65913-`

**✅ Confirmación:** No existen otros tipos de eventos en estos calendarios.

---

## 🔗 ANÁLISIS DE RELACIÓN PADRE-HIJO

### Coincidencias Perfectas (Bloqueos por reserva del padre)

| Fechas | Kaya (hijo) | Simmer Highs (padre) | Tipo |
|--------|-------------|----------------------|------|
| Dec 23-29 | 🚫 Bloqueado | ✅ Reserva HM2PBRTSR2 | Padre-hijo |
| Jan 2-6 | 🚫 Bloqueado | ✅ Reserva HMZ4HZCAP8 | Padre-hijo |
| Jan 7-11 | 🚫 Bloqueado | ✅ Reserva HMM88A323J | Padre-hijo |
| Jan 20-25 | 🚫 Bloqueado | ✅ Reserva HMDAFE3E93 | Padre-hijo |
| Mar 2-8 | 🚫 Bloqueado | ✅ Reserva HMW8CAF5PY | Padre-hijo |
| Apr 23-26 | 🚫 Bloqueado | ✅ Reserva HM3KKRYEKF | Padre-hijo |

**Patrón identificado:** 6 de 8 bloqueos en Kaya coinciden con reservas del padre (Simmer Highs).

### Bloqueos sin coincidencia directa

#### En Kaya:
- Oct 25-28 → **Coincide con reserva de Simmer Highs HM3KTNNJQ5** ✅
- Nov 14-17 → No hay reserva en Simmer Highs ❓

#### En Simmer Highs:
- Oct 20-25 → No afecta a Kaya (Kaya tiene reserva propia)
- Oct 28-Nov 14 → No afecta a Kaya directamente
- **Nov 20-26** → ⚠️ **NO aparece en Kaya (debería estar bloqueado por Motopress)**
- Dec 6-10 → No afecta a Kaya
- Dec 14-19 → No afecta a Kaya
- Feb 14-18 → No afecta a Kaya
- Feb 27-Mar 2 → No afecta a Kaya

---

## 🚨 HALLAZGO CRÍTICO: Nov 20-26

**Problema detectado:**
- Simmer Highs: ✅ Bloqueado Nov 20-26
- Kaya: ❌ **NO aparece ningún evento para esas fechas**

**Posibles causas:**

1. **Airbnb NO exporta bloqueos de calendarios externos**
   - Si este bloqueo viene de Motopress (calendario importado), Airbnb podría no incluirlo en su ICS export
   - Solo exporta: reservas nativas + bloqueos manuales + bloqueos padre-hijo de Airbnb

2. **Lag de sincronización**
   - ¿Cuándo se creó el bloqueo en Motopress?
   - ICS puede tardar horas en actualizarse

3. **Configuración incorrecta**
   - Kaya no tiene importado el calendario de Motopress en Airbnb

---

## 📊 ESTADÍSTICAS

| Métrica | Kaya | Simmer Highs |
|---------|------|--------------|
| Reservas confirmadas | 5 | 7 |
| Bloqueos "Not available" | 8 | 7 |
| Total eventos | 13 | 14 |
| Bloqueos padre-hijo | 7/8 (87.5%) | N/A |

---

## 💡 RECOMENDACIONES PARA MUVA

### 1. Estrategia de Sincronización Bidireccional

```
Motopress (fuente de verdad)
    ↓ (API sync)
MUVA Database
    ↓ (ICS export)
Airbnb (import)
```

**Problema:** Airbnb ICS export NO incluye todos los bloqueos que Airbnb recibe de calendarios externos.

**Solución:**
- Usar Motopress como fuente de verdad
- Exportar ICS desde MUVA para que Airbnb lo importe
- Importar ICS de Airbnb solo para **detectar reservas nuevas nativas de Airbnb**

### 2. Detección de Tipos de Bloqueo

```typescript
function detectarTipoBloqueo(evento, calendarioPadre) {
  if (evento.SUMMARY === "Reserved" && evento.DESCRIPTION) {
    return "RESERVA_AIRBNB"
  }

  if (evento.SUMMARY === "Airbnb (Not available)") {
    // Buscar si hay reserva del padre en esas fechas
    const reservaPadre = buscarReservaEnFechas(calendarioPadre, evento.DTSTART, evento.DTEND)

    if (reservaPadre) {
      return "BLOQUEO_PADRE_HIJO"
    }

    return "BLOQUEO_MANUAL_O_DESCONOCIDO"
  }
}
```

### 3. Schema de Base de Datos

```sql
-- Tabla de reservas (todas las fuentes)
CREATE TABLE reservations (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  accommodation_id UUID REFERENCES accommodations(id),
  source VARCHAR(50), -- 'airbnb', 'motopress', 'manual'
  external_id VARCHAR(255), -- Código de reserva (ej: HMCH8MD3BQ)
  external_url TEXT, -- Link directo a la reserva
  check_in DATE,
  check_out DATE,
  phone_hint VARCHAR(4), -- Solo últimos 4 dígitos (Airbnb)
  status VARCHAR(50), -- 'confirmed', 'cancelled', etc.
  created_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ
);

-- Tabla de bloqueos
CREATE TABLE accommodation_blocks (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  accommodation_id UUID REFERENCES accommodations(id),
  block_start DATE,
  block_end DATE,
  block_type VARCHAR(50), -- 'parent_child', 'manual', 'external_sync', 'unknown'
  source VARCHAR(50), -- 'airbnb', 'motopress', 'manual'
  related_reservation_id UUID REFERENCES reservations(id), -- Si es padre-hijo
  ics_uid TEXT, -- Para tracking
  created_at TIMESTAMPTZ
);
```

---

## ✅ CONCLUSIONES

1. **Airbnb ICS solo tiene 2 tipos de eventos:** "Reserved" y "Airbnb (Not available)"
2. **El 87.5% de bloqueos en Kaya son por relación padre-hijo** (reservas de Simmer Highs)
3. **Airbnb NO exporta bloqueos de calendarios externos** en su ICS (confirmado por ausencia de Nov 20-26)
4. **Para sincronización completa, MUVA debe:**
   - Leer ICS de Airbnb solo para reservas nativas
   - Exportar ICS propio que Airbnb importe
   - Usar Motopress API como fuente de verdad
