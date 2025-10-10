# FASE 11.2 - Testing Guide

Visual guide for testing the updated compliance UI components.

---

## Test Environment Setup

### Prerequisites:
- Development server running (`npm run dev`)
- Database with SIRE catalog data populated
- Test guest reservation with conversation_id

### Test Data SQL:
```sql
-- Create or use existing test reservation
SELECT id, guest_name, conversation_id 
FROM guest_reservations 
WHERE tenant_id = '<your-tenant-id>'
LIMIT 1;

-- Get conversation for testing
SELECT id, reservation_id 
FROM guest_conversations 
WHERE reservation_id = '<test-reservation-id>'
LIMIT 1;
```

---

## Component Test Guide

### 1. ComplianceReminder (Sidebar Badge)

**Location:** Left sidebar in guest chat interface

**URL:** `http://localhost:3000/guest-chat/<conversation-id>`

---

#### Test 1.1: "No iniciado" State (0/9 campos)

**Setup:**
```sql
UPDATE guest_reservations
SET document_type = NULL,
    document_number = NULL,
    birth_date = NULL,
    first_surname = NULL,
    second_surname = NULL,
    given_names = NULL,
    nationality_code = NULL,
    origin_country_code = NULL,
    destination_country_code = NULL
WHERE id = '<test-reservation-id>';
```

**Expected Visual:**
```
┌─────────────────────────────────────────┐
│ 📋 Registro SIRE      [No iniciado]    │
│                                         │
│ Completa tu registro SIRE para         │
│ ayudarnos a cumplir con la normativa   │
│ colombiana (opcional)                   │
│                                         │
│ [0%          Progress Bar           ]  │
│                                         │
│ [Iniciar registro →]                   │
└─────────────────────────────────────────┘
```

**Badge Color:** 🔴 Red
**Progress Bar:** 0%
**Button Text:** "Iniciar registro"

---

#### Test 1.2: "En progreso" State (5/9 campos)

**Setup:**
```sql
UPDATE guest_reservations
SET document_type = '3',
    document_number = 'AB123456',
    birth_date = '1990-05-15',
    first_surname = 'GARCIA',
    given_names = 'JUAN',
    second_surname = NULL,
    nationality_code = NULL,
    origin_country_code = NULL,
    destination_country_code = NULL
WHERE id = '<test-reservation-id>';
```

**Expected Visual:**
```
┌─────────────────────────────────────────┐
│ 📋 Registro SIRE  [En progreso 5/9]    │
│                                         │
│ Completa tu registro SIRE para         │
│ ayudarnos a cumplir con la normativa   │
│ colombiana (opcional)                   │
│                                         │
│ [████████░░░ Progress Bar ~56%      ]  │
│                                         │
│ [Continuar registro →]                 │
└─────────────────────────────────────────┘
```

**Badge Color:** 🟡 Yellow
**Progress Bar:** ~56% (5/9 campos)
**Button Text:** "Continuar registro"

---

#### Test 1.3: "Completado" State (9/9 campos)

**Setup:**
```sql
UPDATE guest_reservations
SET document_type = '3',
    document_number = 'AB123456',
    birth_date = '1990-05-15',
    first_surname = 'GARCIA',
    second_surname = 'LOPEZ',
    given_names = 'JUAN CARLOS',
    nationality_code = '840',
    origin_country_code = '840',
    destination_country_code = '11001'
WHERE id = '<test-reservation-id>';
```

**Expected Visual:**
```
(Reminder component should be hidden/auto-dismissed)
```

**Badge Color:** 🟢 Green
**Progress Bar:** 100%
**Visibility:** Hidden (auto-dismiss after completion)

---

### 2. ComplianceConfirmation (Modal)

**Trigger:** Click "Iniciar registro SIRE" → Complete compliance chat → Modal appears

**URL:** Same as above + compliance flow

---

#### Test 2.1: Normal Flow (9 fields with second_surname)

**Expected Data (from compliance chat):**
- Nombre: "Juan Carlos Garcia Lopez"
- Pasaporte: "AB123456"
- País: "Estados Unidos"
- Fecha Nacimiento: "15/05/1990"

**Expected Visual:**
```
┌─────────────────────────────────────────────────────┐
│                 Confirmar datos SIRE                │
│ Por favor verifica que los siguientes datos son    │
│ correctos antes de confirmar                        │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Tipo de documento                                   │
│ 3 - Pasaporte                                       │
│ ─────────────────────────────────────────────────── │
│ Número de identificación                            │
│ AB123456                                            │
│ ─────────────────────────────────────────────────── │
│ Fecha de nacimiento                                 │
│ 15/05/1990                                          │
│ ─────────────────────────────────────────────────── │
│ Primer apellido                                     │
│ GARCIA                                              │
│ ─────────────────────────────────────────────────── │
│ Segundo apellido                                    │
│ LOPEZ                                               │
│ ─────────────────────────────────────────────────── │
│ Nombres                                             │
│ JUAN CARLOS                                         │
│ ─────────────────────────────────────────────────── │
│ Nacionalidad                                        │
│ 840 - Estados Unidos                                │
│ ─────────────────────────────────────────────────── │
│ Procedencia                                         │
│ 840 - Estados Unidos                                │
│ ─────────────────────────────────────────────────── │
│ Destino                                             │
│ 11001 - Bogotá D.C.                                 │
│ ─────────────────────────────────────────────────── │
│                                                     │
│ ℹ️ Estos datos son obligatorios para cumplir con  │
│    la normativa SIRE de Colombia                    │
│                                                     │
│          [Cancelar]    [Confirmar datos]           │
└─────────────────────────────────────────────────────┘
```

**Verifications:**
- ✅ All 9 fields visible
- ✅ Human-readable names (not just codes)
- ✅ Date format: DD/MM/YYYY
- ✅ Names in UPPERCASE
- ✅ Loading skeletons during catalog fetch
- ✅ "Cancelar" button closes modal
- ✅ "Confirmar datos" button enabled

---

#### Test 2.2: Without second_surname (8 fields visible)

**Expected Data:**
- Nombre: "John Smith" (only 2 parts, no second surname)
- Pasaporte: "US123456789"
- País: "Estados Unidos"
- Fecha Nacimiento: "25/03/1985"

**Expected Visual:**
```
┌─────────────────────────────────────────────────────┐
│                 Confirmar datos SIRE                │
│ Por favor verifica que los siguientes datos son    │
│ correctos antes de confirmar                        │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Tipo de documento                                   │
│ 3 - Pasaporte                                       │
│ ─────────────────────────────────────────────────── │
│ Número de identificación                            │
│ US123456789                                         │
│ ─────────────────────────────────────────────────── │
│ Fecha de nacimiento                                 │
│ 25/03/1985                                          │
│ ─────────────────────────────────────────────────── │
│ Primer apellido                                     │
│ SMITH                                               │
│ ─────────────────────────────────────────────────── │
│ (Segundo apellido row is HIDDEN)                   │
│ ─────────────────────────────────────────────────── │
│ Nombres                                             │
│ JOHN                                                │
│ ─────────────────────────────────────────────────── │
│ Nacionalidad                                        │
│ 840 - Estados Unidos                                │
│ ─────────────────────────────────────────────────── │
│ Procedencia                                         │
│ 840 - Estados Unidos                                │
│ ─────────────────────────────────────────────────── │
│ Destino                                             │
│ 11001 - Bogotá D.C.                                 │
│ ─────────────────────────────────────────────────── │
│                                                     │
│          [Cancelar]    [Confirmar datos]           │
└─────────────────────────────────────────────────────┘
```

**Verifications:**
- ✅ Only 8 fields visible (segundo_apellido hidden)
- ✅ No empty row or NULL value displayed

---

#### Test 2.3: Loading State (Catalog Fetch)

**Expected Visual (first 100-300ms):**
```
┌─────────────────────────────────────────────────────┐
│                 Confirmar datos SIRE                │
│ Por favor verifica que los siguientes datos son    │
│ correctos antes de confirmar                        │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Tipo de documento                                   │
│ [████░░░░░░░] Loading...                            │
│ ─────────────────────────────────────────────────── │
│ Número de identificación                            │
│ AB123456                                            │
│ ─────────────────────────────────────────────────── │
│ Fecha de nacimiento                                 │
│ [████░░░░░░░] Loading...                            │
│ ─────────────────────────────────────────────────── │
│ ...                                                 │
└─────────────────────────────────────────────────────┘
```

**After Fetch Complete:**
- Skeleton loaders replaced with actual values
- "Confirmar datos" button enabled

---

#### Test 2.4: Error State (Catalog Lookup Fails)

**Simulate:** Disconnect database or corrupt catalog data

**Expected Visual:**
```
┌─────────────────────────────────────────────────────┐
│                 Confirmar datos SIRE                │
│ Por favor verifica que los siguientes datos son    │
│ correctos antes de confirmar                        │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Tipo de documento                                   │
│ 3 (⚠️ Raw code, fallback to raw value)             │
│ ─────────────────────────────────────────────────── │
│ Número de identificación                            │
│ AB123456                                            │
│ ─────────────────────────────────────────────────── │
│ Fecha de nacimiento                                 │
│ 15/05/1990                                          │
│ ─────────────────────────────────────────────────── │
│ Nacionalidad                                        │
│ 840 (⚠️ Raw code)                                   │
│ ─────────────────────────────────────────────────── │
│ ...                                                 │
│                                                     │
│          [Cancelar]    [Confirmar datos]           │
└─────────────────────────────────────────────────────┘
```

**Verifications:**
- ✅ Fallback to raw codes (no crash)
- ✅ Modal remains functional
- ✅ "Confirmar datos" button still works

---

### 3. ComplianceSuccess (Success Screen)

**Trigger:** Complete Test 2.1 or 2.2 → Click "Confirmar datos" → API success

---

#### Test 3.1: Success with Reference ID

**Expected Visual:**
```
┌─────────────────────────────────────────────────────┐
│           🎉🎊 (Confetti Animation) 🎊🎉            │
│                                                     │
│                      ✓                              │
│                                                     │
│          ¡Registro SIRE completado!                │
│                                                     │
│ Tus datos han sido guardados correctamente         │
│ en el sistema                                       │
│                                                     │
│ ┌─────────────────────────────────────────────┐   │
│ │ Referencia SIRE:                            │   │
│ │ abc123-submission-id                        │   │
│ │                                             │   │
│ │ Los datos están persistidos en tu reserva  │   │
│ │ y listos para enviar a SIRE cuando sea     │   │
│ │ requerido.                                  │   │
│ │                                             │   │
│ │ 9 de octubre de 2025, 10:45                │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ ┌─────────────────────────────────────────────┐   │
│ │ ✓ Registro SIRE completado. Puedes         │   │
│ │   continuar con tu reserva.                 │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│               [Volver al chat]                      │
│                                                     │
│ Esta ventana se cerrará automáticamente en 8 seg   │
└─────────────────────────────────────────────────────┘
```

**Verifications:**
- ✅ Confetti animation plays (4 seconds)
- ✅ Green success banner
- ✅ SIRE reference displayed
- ✅ Timestamp in Spanish locale
- ✅ Auto-closes after 8 seconds
- ✅ "Volver al chat" button works immediately

---

#### Test 3.2: Success without Reference ID

**Expected Visual:**
```
┌─────────────────────────────────────────────────────┐
│           🎉🎊 (Confetti Animation) 🎊🎉            │
│                                                     │
│                      ✓                              │
│                                                     │
│          ¡Registro SIRE completado!                │
│                                                     │
│ Tus datos han sido guardados correctamente         │
│ en el sistema                                       │
│                                                     │
│ ┌─────────────────────────────────────────────┐   │
│ │ Los datos están persistidos en tu reserva  │   │
│ │ y listos para enviar a SIRE cuando sea     │   │
│ │ requerido.                                  │   │
│ │                                             │   │
│ │ 9 de octubre de 2025, 10:45                │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ ┌─────────────────────────────────────────────┐   │
│ │ ✓ Registro SIRE completado. Puedes         │   │
│ │   continuar con tu reserva.                 │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│               [Volver al chat]                      │
│                                                     │
│ Esta ventana se cerrará automáticamente en 8 seg   │
└─────────────────────────────────────────────────────┘
```

**Verifications:**
- ✅ No "Referencia SIRE" row (gracefully hidden)
- ✅ Rest of UI remains identical

---

## End-to-End Integration Test

### Complete User Flow

**Setup:** Fresh guest session with no compliance data

**Steps:**
1. Guest logs in to portal
2. Navigate to guest chat: `http://localhost:3000/guest-chat/<conversation-id>`
3. Observe sidebar: ComplianceReminder badge shows "No iniciado" (red)
4. Click "Iniciar registro SIRE" button
5. Compliance chat starts (bot asks questions)
6. Provide data:
   - Bot: "¿Cuál es tu nombre completo?"
   - User: "Juan Carlos Garcia Lopez"
   - Bot: "¿Cuál es tu número de pasaporte?"
   - User: "AB123456"
   - Bot: "¿De qué país vienes?"
   - User: "Estados Unidos"
   - Bot: "¿Cuál es tu fecha de nacimiento?"
   - User: "15 de mayo de 1990"
7. Bot summarizes and triggers ComplianceConfirmation modal
8. Verify modal shows 9 formatted fields
9. Click "Confirmar datos"
10. API submits (watch Network tab in DevTools)
11. ComplianceSuccess modal appears with confetti
12. Wait 8 seconds (or click "Volver al chat")
13. Modal closes automatically
14. **Verify sidebar:** Badge updates to "Completado" (green)

---

### Database Verification

After Step 14, run:
```sql
SELECT 
  id,
  guest_name,
  document_type,
  document_number,
  birth_date,
  first_surname,
  second_surname,
  given_names,
  nationality_code,
  origin_country_code,
  destination_country_code,
  updated_at
FROM guest_reservations
WHERE id = '<test-reservation-id>';
```

**Expected Result:**
```
id: <test-reservation-id>
guest_name: Juan Carlos Garcia Lopez (original)
document_type: '3'
document_number: 'AB123456'
birth_date: '1990-05-15'
first_surname: 'GARCIA'
second_surname: 'LOPEZ'
given_names: 'JUAN CARLOS'
nationality_code: '840'
origin_country_code: '840'
destination_country_code: '11001'
updated_at: <recent timestamp>
```

---

## Browser DevTools Checks

### Console Logs (Expected)

```
[compliance-api] POST /api/compliance/submit (MOCK MODE)
[compliance-api] Request received: { conversationalDataFields: [...], reservationId: '...' }
[compliance-api] Conversational data preview: { nombre: 'Juan Carlos Garcia Lopez', ... }
[compliance-api] SIRE mapping complete: { hotel: '999999', ciudad: '88001', ... }
[compliance-api] ✅ Submission saved to DB: { submissionId: '...' }
[compliance-engine] Updating reservation with SIRE data...
[compliance-engine] ✅ Reservation updated successfully
[compliance-api] ✅ Response: { success: true, submissionId: '...', ... }
```

### Network Tab (Expected)

**POST /api/compliance/submit**
- Status: 201 Created
- Response Time: <500ms
- Response Body:
  ```json
  {
    "success": true,
    "submissionId": "abc123-...",
    "timestamp": "2025-10-09T...",
    "status": "pending"
  }
  ```

**No Console Errors:**
- ✅ No red error messages
- ✅ No TypeScript type errors
- ✅ No React warnings

---

## Mobile Testing

### Devices to Test:
- iPhone 15 Pro Max (430px × 932px)
- Pixel 8 (412px × 915px)
- iPad (768px × 1024px)

### Responsive Checks:
- ✅ Sidebar slides in/out on mobile
- ✅ Modal scrollable on small screens
- ✅ Touch targets ≥ 44px × 44px
- ✅ Text readable (minimum 14px font size)
- ✅ Buttons stack vertically on narrow screens

**Chrome DevTools Mobile Emulation:**
1. Open DevTools (F12)
2. Toggle device toolbar (Cmd+Shift+M / Ctrl+Shift+M)
3. Select device preset (iPhone 15 Pro Max recommended)
4. Run tests

---

## Performance Checks

### Lighthouse Audit

**Run Audit:**
1. Build production version: `npm run build && npm start`
2. Open http://localhost:3000 in Chrome
3. DevTools → Lighthouse → Mobile → Analyze

**Expected Scores:**
- Performance: ≥ 85
- Accessibility: 100
- Best Practices: ≥ 90
- SEO: 100

### Critical Metrics:
- First Contentful Paint (FCP): < 1.5s
- Largest Contentful Paint (LCP): < 2.5s
- Time to Interactive (TTI): < 3.0s
- Cumulative Layout Shift (CLS): < 0.1

---

## Known Issues / Limitations

### Current Limitations:
1. **Progress Calculation:** Queries database on every sidebar render (could be cached)
2. **Catalog Lookups:** 4 separate queries (could be batched)
3. **No Retry Button:** If catalog lookup fails, user must refresh page
4. **No Inline Editing:** Cannot edit fields in confirmation modal (future enhancement)

### Expected Behaviors (Not Bugs):
- Second surname row hidden if NULL (intentional)
- Raw codes shown if catalog lookup fails (fallback)
- Confetti animation stops after 4 seconds (intentional)
- Modal auto-closes after 8 seconds (intentional)

---

## Troubleshooting

### Issue: Badge shows "No iniciado" even after completion

**Cause:** Frontend not refreshing after submission

**Solution:**
1. Check if `onClose` in ComplianceSuccess triggers re-fetch
2. Verify localStorage key: `compliance_reminder_dismissed` set to 'true'
3. Hard refresh browser (Cmd+Shift+R / Ctrl+F5)

---

### Issue: Modal shows raw codes instead of names

**Cause:** Catalog lookup failing

**Solution:**
1. Check database has catalog data:
   ```sql
   SELECT COUNT(*) FROM sire_document_types; -- Should return 4
   SELECT COUNT(*) FROM sire_countries;      -- Should return 250
   SELECT COUNT(*) FROM sire_cities;         -- Should return 1100+
   ```
2. Check network tab for failed queries
3. Verify Supabase connection

---

### Issue: TypeScript errors in browser console

**Cause:** Prop mismatch or missing types

**Solution:**
1. Run `npx tsc --noEmit --skipLibCheck` to check types
2. Verify prop names match interfaces
3. Check for missing imports

---

## Success Criteria

**All tests pass if:**
- ✅ Badge shows correct state (No iniciado / En progreso X/9 / Completado)
- ✅ Modal displays 9 formatted fields with human-readable names
- ✅ Second surname hidden when NULL
- ✅ Success screen appears and auto-closes
- ✅ Data persists in database (all 9 SIRE fields populated)
- ✅ No console errors
- ✅ Mobile responsive
- ✅ Lighthouse scores meet targets

**Ready for UAT** when all success criteria met.

---

**Author:** UX-Interface Agent
**Date:** October 9, 2025
**Phase:** FASE 11.2 - UI Layer Integration
