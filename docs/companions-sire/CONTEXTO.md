# Acompañantes SIRE - Contexto del Proyecto

**Ultima actualizacion:** 2025-12-28

---

## Objetivo Principal

Integrar el sistema de acompañantes con el flujo SIRE completo:
1. Guardar datos de acompañantes en `reservation_guests`
2. Mostrar acompañantes en tarjetas de reservacion del staff
3. Generar TXT SIRE con todos los huespedes (titular + acompañantes)

---

## Estado Actual del Sistema

### Funciona
- Tabla `reservation_guests` existe (migracion 20251205190819)
- Logica conversacional multi-guest en frontend
- Estados `guestOrder` y `awaitingAdditionalGuestResponse` en GuestChatInterface
- SIRE TXT generator con estructura para N huespedes
- Progressive disclosure funcionando para 13 campos

### Limitaciones
- Todo se guarda en `guest_reservations` (solo titular)
- Cuando hay multiples huespedes, se sobreescribe el anterior
- Tarjetas no muestran acompañantes
- SIRE export solo genera linea del titular

---

## Archivos Clave

| Archivo | Descripcion | Fases |
|---------|-------------|-------|
| `src/app/api/guest/chat/route.ts` | API principal de chat SIRE | 1 |
| `src/app/api/guest/reservation-sire-data/route.ts` | API datos SIRE por huesped | 1 |
| `src/components/Chat/GuestChatInterface.tsx` | UI del huesped | 2 |
| `src/components/reservations/UnifiedReservationCard.tsx` | Tarjeta de reserva | 3, 4 |
| `src/app/api/reservations/list/route.ts` | API lista reservaciones | 4 |
| `src/app/api/sire/generate-txt/route.ts` | Generador TXT SIRE | 5 |
| `src/lib/sire/sire-txt-generator.ts` | Funciones de mapeo SIRE | 5 |

---

## Esquema de Base de Datos

### Tabla: `reservation_guests`
```sql
- id: uuid (PK)
- reservation_id: uuid (FK -> guest_reservations.id)
- tenant_id: varchar (NOT NULL)
- guest_order: integer (1=titular, 2+=acompañantes)
- is_primary_guest: boolean (NOT NULL)
- guest_type: varchar (opcional)
- guest_name: varchar (opcional, nombre completo legacy)
- given_names: varchar
- first_surname: varchar
- second_surname: varchar
- document_type: varchar
- document_number: varchar
- nationality_code: varchar
- birth_date: date
- origin_city_code: varchar
- destination_city_code: varchar
- sire_status: varchar (pending|complete)
- created_at: timestamptz
- updated_at: timestamptz
- UNIQUE(reservation_id, guest_order)
```

### Tabla: `guest_reservations` (existente)
Contiene datos de la reserva + campos SIRE del titular (backwards compatibility)

---

## Stack Tecnologico

- **Frontend:** Next.js 15 + React 19
- **Estilos:** Tailwind CSS
- **Base de datos:** Supabase (PostgreSQL)
- **Autenticacion:** JWT (guest tokens)

---

## Fases de Implementacion

| Fase | Nombre | Tareas | Agente Principal |
|------|--------|--------|------------------|
| 1 | Backend - Guardar Acompañantes | 3 | @agent-backend-developer |
| 2 | Frontend - Enviar guest_order | 2 | @agent-ux-interface |
| 3 | UI Staff - Tarjetas Compactas | 2 | @agent-ux-interface |
| 4 | UI Staff - Tab Acompañantes | 4 | Mixto |
| 5 | SIRE Export Multi-Huesped | 3 | @agent-backend-developer |
| 6 | Mejoras UX y Validación | 5 | Mixto |

**Total: 19 tareas**

---

## Flujo de Datos (Estado Deseado)

```
Huesped completa SIRE
  |
  v
GuestChatInterface envia {guest_order: 1, ...sireData}
  |
  v
API /guest/chat:
  - Si guest_order=1: INSERT en guest_reservations + reservation_guests
  - Si guest_order>1: INSERT solo en reservation_guests
  |
  v
Staff ve tarjeta:
  - Datos titular de guest_reservations
  - Lista acompañantes de reservation_guests
  |
  v
SIRE Export:
  - SELECT * FROM reservation_guests WHERE reservation_id=X
  - Genera 1 linea por huesped (E + S)
```

---

## Documentacion Relacionada

- `plan.md` - Arquitectura y especificaciones detalladas
- `FASE-1-backend-guardar.md` - Prompts Fase 1
- `FASE-2-frontend-guest-order.md` - Prompts Fase 2
- `FASE-3-ui-tarjetas-compactas.md` - Prompts Fase 3
- `FASE-4-ui-tab-acompanantes.md` - Prompts Fase 4
- `FASE-5-sire-export-multi.md` - Prompts Fase 5
- `FASE-6-mejoras-ux-validacion.md` - Prompts Fase 6 (UX + Validación)
