# Acompañantes SIRE - Plan de Implementación

**Proyecto:** Companions SIRE Integration
**Fecha Inicio:** 2025-12-26
**Estado:** 🚀 Listo para Implementación

---

## 🎯 OVERVIEW

### Objetivo Principal
Integrar el sistema de acompañantes con el flujo SIRE completo:
1. Guardar datos de acompañantes en `reservation_guests`
2. Mostrar acompañantes en tarjetas de reservación del staff
3. Generar TXT SIRE con todos los huéspedes (titular + acompañantes)

### ¿Por qué?
- SIRE requiere reportar TODOS los huéspedes extranjeros, no solo el titular
- El staff necesita ver quién está registrado antes de generar el TXT
- La tabla `reservation_guests` ya existe pero no está siendo usada

### Alcance
- Backend: Modificar API para guardar en `reservation_guests`
- Frontend Guest: Enviar `guest_order` en requests
- Frontend Staff: Mostrar acompañantes en tarjetas
- SIRE Export: Leer de `reservation_guests` para generar TXT

---

## 📊 ESTADO ACTUAL

### Sistema Existente
- ✅ Tabla `reservation_guests` creada (migración 20251205190819)
- ✅ Lógica conversacional multi-guest en `GuestChatInterface.tsx`
- ✅ Estados `guestOrder` y `awaitingAdditionalGuestResponse`
- ✅ SIRE TXT generator con estructura para N huéspedes
- ✅ Progressive disclosure funcionando para 13 campos

### Limitaciones Actuales
- ❌ Todo se guarda en `guest_reservations` (solo titular)
- ❌ Cuando hay múltiples huéspedes, se sobreescribe el anterior
- ❌ Tarjetas no muestran acompañantes
- ❌ SIRE export solo genera línea del titular

---

## 🚀 ESTADO DESEADO

### Nueva Experiencia

**Huésped en /my-stay:**
1. Completa registro SIRE (13 campos) → Se guarda como `guest_order=1`
2. Sistema pregunta "¿Hay otro huésped?"
3. Si dice "sí" → Nuevo formulario SIRE → Se guarda como `guest_order=2`
4. Repite hasta que dice "no"

**Staff en /accommodations/reservations-motopress:**
1. Ve tarjeta con badge "3 huéspedes registrados"
2. Click en tab "Acompañantes" → Ve lista de todos
3. Cada acompañante muestra su progreso SIRE individual

**Generación TXT:**
1. Al generar TXT del día, incluye TODOS los huéspedes de cada reserva
2. Una línea por huésped (titular + acompañantes)

### Características Clave
- Persistencia correcta en `reservation_guests`
- Visualización de acompañantes en UI staff
- SIRE export multi-huésped

---

## 📱 TECHNICAL STACK

### Frontend
- React 19 + Next.js 15
- Tailwind CSS
- Existing components in `src/components/reservations/`

### Backend
- Next.js API Routes
- Supabase (PostgreSQL)
- Existing SIRE lib in `src/lib/sire/`

### Base de Datos
- Tabla: `reservation_guests`
- FK: `reservation_id` → `guest_reservations.id`

---

## 🔧 DESARROLLO - FASES

### FASE 1: Backend - Guardar Acompañantes (2h)
**Objetivo:** Modificar API para guardar en `reservation_guests` en lugar de `guest_reservations`

**Entregables:**
- API endpoint que inserte/actualice en `reservation_guests`
- Soporte para `guest_order` en requests
- Mantener compatibilidad con titular en `guest_reservations`

**Archivos a modificar:**
- `src/app/api/guest/chat/route.ts` - Agregar lógica de guardado
- `src/app/api/guest/reservation-sire-data/route.ts` - Leer de `reservation_guests`

**Testing:**
- Verificar INSERT en `reservation_guests` con `guest_order=1`
- Verificar INSERT de acompañante con `guest_order=2`
- Verificar que no se sobrescriben datos

---

### FASE 2: Frontend Guest - Enviar guest_order (1h)
**Objetivo:** Modificar `GuestChatInterface` para enviar `guest_order` al backend

**Entregables:**
- Envío de `guest_order` en payload de API
- Reset correcto al cambiar de huésped
- Mensaje de confirmación al completar cada huésped

**Archivos a modificar:**
- `src/components/Chat/GuestChatInterface.tsx` - Agregar guest_order a requests

**Testing:**
- Registrar titular → Verificar guest_order=1 en DB
- Agregar acompañante → Verificar guest_order=2 en DB
- Verificar flujo completo con 3 huéspedes

---

### FASE 3: UI Staff - Tarjetas Compactas (1.5h)
**Objetivo:** Rediseñar tarjetas de reservación más compactas

**Entregables:**
- Tarjetas más compactas (menos espacio vertical)
- Grid responsivo mejorado
- Información esencial visible sin expandir

**Archivos a modificar:**
- `src/components/reservations/UnifiedReservationCard.tsx` - Rediseño compacto

**Testing:**
- Verificar en desktop (3 columnas)
- Verificar en tablet (2 columnas)
- Verificar en mobile (1 columna)

---

### FASE 4: UI Staff - Tab Acompañantes (2h) - 4 tareas
**Objetivo:** Agregar sistema de tabs con sección de acompañantes

**Subtareas:**
- 4.1: Modificar API /reservations/list para incluir acompañantes
- 4.2: Implementar sistema de tabs en tarjeta
- 4.3: Crear lista de acompañantes (CompanionsList)
- 4.4: Agregar badge contador de huéspedes

**Entregables:**
- Tab "Titular" / "Acompañantes" en cada tarjeta
- Lista de acompañantes con progreso SIRE individual
- Badge con contador de huéspedes registrados

**Archivos a modificar:**
- `src/components/reservations/UnifiedReservationCard.tsx` - Agregar tabs + lista
- `src/app/api/reservations/list/route.ts` - JOIN con reservation_guests

**Testing:**
- Verificar que muestra acompañantes correctamente
- Verificar progreso SIRE individual por huésped
- Verificar badge de contador

---

### FASE 5: SIRE Export Multi-Huésped (1.5h)
**Objetivo:** Modificar generador TXT para incluir todos los huéspedes

**Entregables:**
- Leer de `reservation_guests` en lugar de `guest_reservations`
- Generar línea por cada huésped (titular + acompañantes)
- Mantener filtro por nacionalidad (excluir colombianos)

**Archivos a modificar:**
- `src/app/api/sire/generate-txt/route.ts` - Query a reservation_guests
- `src/lib/sire/sire-txt-generator.ts` - Ajustar si es necesario

**Testing:**
- Generar TXT con reserva de 1 huésped → 2 líneas (E + S)
- Generar TXT con reserva de 3 huéspedes → 6 líneas (3 E + 3 S)
- Verificar formato correcto de cada línea

---

### FASE 6: Mejoras UX y Validación (2.5h)
**Objetivo:** Agregar mejoras de experiencia de usuario y validaciones de negocio

**Entregables:**
- Badge "X/Y huéspedes registrados" en tarjetas de staff
- Copiar datos del titular para acompañantes (nacionalidad, origen, destino)
- Historial de exports SIRE con estados visuales (Generado → Subido → Confirmado)

**Archivos a modificar:**
- `src/app/api/reservations/list/route.ts` - Agregar expected_guests, registered_guests
- `src/components/reservations/UnifiedReservationCard.tsx` - Badge progreso
- `src/components/Chat/GuestChatInterface.tsx` - Copiar datos titular
- `src/app/[tenant]/sire/page.tsx` - Estados visuales y acciones

**Testing:**
- Reserva 2 adults + 1 child → badge "0/3 huéspedes"
- Completar titular → pregunta si copiar datos para huésped #2
- Export generado → botón "Marcar subido" → botón "Confirmar"

---

## ✅ CRITERIOS DE ÉXITO

### Funcionalidad
- [ ] Acompañantes se guardan en `reservation_guests`
- [ ] Staff puede ver acompañantes en tarjetas
- [ ] TXT SIRE incluye todos los huéspedes
- [ ] Flujo conversacional funciona sin errores

### Performance
- [ ] Tarjetas cargan en <500ms
- [ ] Query de acompañantes optimizada (índices)

### UX
- [ ] Tarjetas más compactas y legibles
- [ ] Tabs intuitivos para navegación
- [ ] Progreso SIRE claro por huésped
- [ ] Badge "X/Y huéspedes" visible en cada tarjeta
- [ ] Familias registran acompañantes más rápido (copiar datos)
- [ ] Staff puede trackear estado de archivos SIRE subidos

---

## 🤖 AGENTES REQUERIDOS

### 1. **@agent-backend-developer** (Principal)
**Responsabilidad:** Lógica de guardado y queries

**Tareas:**
- FASE 1: Modificar API de chat para guardar en `reservation_guests`
- FASE 4: Modificar API de list para JOIN con acompañantes
- FASE 5: Modificar SIRE export para multi-huésped

**Archivos:**
- `src/app/api/guest/chat/route.ts`
- `src/app/api/reservations/list/route.ts`
- `src/app/api/sire/generate-txt/route.ts`

---

### 2. **@agent-ux-interface** (Principal)
**Responsabilidad:** UI de tarjetas y tabs

**Tareas:**
- FASE 2: Modificar GuestChatInterface
- FASE 3: Rediseño compacto de tarjetas
- FASE 4: Implementar sistema de tabs

**Archivos:**
- `src/components/Chat/GuestChatInterface.tsx`
- `src/components/reservations/UnifiedReservationCard.tsx`

---

## 📂 ESTRUCTURA DE ARCHIVOS

```
/Users/oneill/Sites/apps/muva-chat/
├── src/
│   ├── app/
│   │   └── api/
│   │       ├── guest/
│   │       │   ├── chat/route.ts          # MODIFICAR (FASE 1)
│   │       │   └── reservation-sire-data/route.ts # MODIFICAR (FASE 1)
│   │       ├── reservations/
│   │       │   └── list/route.ts          # MODIFICAR (FASE 4)
│   │       └── sire/
│   │           └── generate-txt/route.ts  # MODIFICAR (FASE 5)
│   ├── components/
│   │   ├── Chat/
│   │   │   └── GuestChatInterface.tsx     # MODIFICAR (FASE 2)
│   │   └── reservations/
│   │       └── UnifiedReservationCard.tsx # MODIFICAR (FASE 3, 4)
│   └── lib/
│       └── sire/
│           └── sire-txt-generator.ts      # REVISAR (FASE 5)
└── docs/
    └── companions-sire/
        ├── CONTEXTO.md                    # Contexto técnico
        ├── plan.md                        # Este archivo
        ├── TODO.md                        # Tareas y progreso
        ├── FASE-1-backend-guardar.md      # Prompts FASE 1
        ├── FASE-2-frontend-guest-order.md # Prompts FASE 2
        ├── FASE-3-ui-tarjetas-compactas.md # Prompts FASE 3
        ├── FASE-4-ui-tab-acompanantes.md  # Prompts FASE 4
        ├── FASE-5-sire-export-multi.md    # Prompts FASE 5
        └── FASE-6-mejoras-ux-validacion.md # Prompts FASE 6
```

---

## 📝 NOTAS IMPORTANTES

### Consideraciones Técnicas
- `guest_reservations` sigue siendo la tabla principal de la reserva (metadata)
- `reservation_guests` contiene datos SIRE de CADA persona
- Para titular: guardar en AMBAS tablas (compatibilidad)
- Para acompañantes: solo en `reservation_guests`

### Flujo de Datos
```
Huésped completa SIRE
  ↓
GuestChatInterface envía {guest_order: 1, ...sireData}
  ↓
API /guest/chat:
  - Si guest_order=1: INSERT en guest_reservations + reservation_guests
  - Si guest_order>1: INSERT solo en reservation_guests
  ↓
Staff ve tarjeta:
  - Datos titular de guest_reservations
  - Lista acompañantes de reservation_guests
  ↓
SIRE Export:
  - SELECT * FROM reservation_guests WHERE reservation_id=X
  - Genera 1 línea por huésped
```

---

**Última actualización:** 2025-12-28
**Próximo paso:** Ejecutar FASE 1 - Ver `FASE-1-backend-guardar.md`
