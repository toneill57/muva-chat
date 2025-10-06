# Fixed Layout Migration - Testing Guide

**Proyecto:** Fixed Layout Migration - FASE 4
**Fecha:** Octubre 5, 2025
**Objetivo:** Guía completa para ejecutar testing manual y automatizado

---

## OVERVIEW

Esta guía te ayudará a ejecutar los 120+ regression tests de manera eficiente y consistente.

**Tiempo estimado:**
- DevChatMobileDev testing: 2-3 horas
- ChatMobile testing: 2-3 horas
- Performance testing: 1 hora
- Total: 5-7 horas

**Herramientas necesarias:**
- Chrome Desktop 120+ (DevTools device mode)
- Safari iOS 17+ (iPhone físico o simulator)
- Chrome Android 120+ (Android físico o emulator)
- Lighthouse (built-in Chrome DevTools)
- Network throttling tools

---

## 1. ENVIRONMENT SETUP

### 1.1 Start Development Server

```bash
cd /Users/oneill/Sites/apps/InnPilot
./scripts/dev-with-keys.sh
```

**Verificar:**
- Server corriendo en http://localhost:3000
- Console sin errores
- Hot reload funcionando

### 1.2 Clear Browser Cache

**Chrome Desktop:**
1. DevTools (Cmd+Opt+I)
2. Network tab → Disable cache (checkbox)
3. Application tab → Clear storage → Clear site data

**Safari iOS:**
1. Settings → Safari → Clear History and Website Data

**Chrome Android:**
1. Settings → Privacy → Clear browsing data → Cached images and files

### 1.3 Clear localStorage

**DevTools Console:**
```javascript
localStorage.clear()
```

**Verificar:**
- `dev_chat_session_id` NO existe
- `public_chat_session_id` NO existe

---

## 2. DEVICE SETUP

### 2.1 Chrome DevTools Device Mode

**Desktop Testing (primario):**
1. Abrir http://localhost:3000/dev-chat-mobile-dev
2. DevTools (Cmd+Opt+I)
3. Toggle device toolbar (Cmd+Shift+M)
4. Select device:
   - iPhone 15 Pro Max (430×932)
   - iPhone 14 Pro (393×852)
   - Pixel 8 Pro (412×915)
   - Galaxy S24 (360×800)

**Custom Device (si no existe):**
1. Settings → Devices → Add custom device
2. Galaxy S24:
   - Width: 360
   - Height: 800
   - Pixel ratio: 3
   - User agent: Default Android

### 2.2 iOS Physical Device / Simulator

**Simulator (recomendado para testing):**
```bash
# Abrir Xcode Simulator
open -a Simulator
```

**Seleccionar:**
- iPhone 15 Pro Max (iOS 17)
- iPhone 14 Pro (iOS 17)

**Conectar a localhost:**
1. Safari on Simulator
2. Navigate to: http://localhost:3000/dev-chat-mobile-dev
3. Desktop Safari → Develop → Simulator → dev-chat-mobile-dev

**Physical iPhone:**
1. Conectar iPhone via USB
2. iPhone Settings → Safari → Advanced → Web Inspector (ON)
3. iPhone Safari → http://YOUR_IP:3000/dev-chat-mobile-dev
4. Desktop Safari → Develop → [Your iPhone] → dev-chat-mobile-dev

### 2.3 Android Physical Device / Emulator

**Emulator (recomendado):**
```bash
# Abrir Android Studio → AVD Manager
# Launch: Pixel 8 Pro API 34
```

**Conectar a localhost:**
1. Chrome on Emulator
2. Navigate to: http://10.0.2.2:3000/dev-chat-mobile-dev
   (10.0.2.2 = localhost en Android emulator)

**Physical Android:**
1. Conectar device via USB
2. Enable USB debugging (Developer Options)
3. Chrome on phone → http://YOUR_IP:3000/dev-chat-mobile-dev
4. Desktop Chrome → chrome://inspect → Inspect device

---

## 3. MANUAL TESTING WORKFLOW

### 3.1 Test Execution Order

**Para cada archivo (DevChatMobileDev, ChatMobile):**

1. **A. Scroll Behavior** (12 tests, 15min)
   - Enviar 10+ mensajes primero
   - Test A1-A12 secuencialmente
   - Verificar en todos los devices

2. **B. Pull-to-Refresh** (8 tests, 10min)
   - Scroll to top
   - Test B1-B8 secuencialmente

3. **C. Welcome Message** (6 tests, 10min)
   - localStorage.clear() primero
   - Reload page
   - Test C1-C6 secuencialmente

4. **D. Message Rendering** (10 tests, 15min)
   - Enviar 5 mensajes (3 user, 2 assistant)
   - Test D1-D10 secuencialmente

5. **E. Photo Carousel** (8 tests, 15min)
   - Preguntar: "Show me Suite Oceanfront"
   - Esperar respuesta con photos
   - Test E1-E8 secuencialmente

6. **F. Suggestion Pills** (8 tests, 10min)
   - Recibir mensaje con suggestions
   - Test F1-F8 secuencialmente

7. **G. Typing Dots** (4 tests, 5min)
   - Enviar mensaje, observar loading state
   - Test G1-G4 secuencialmente

8. **H. Error Banner** (6 tests, 10min)
   - Forzar error (kill dev server mid-request)
   - Test H1-H6 secuencialmente
   - Restart dev server después

9. **I. Input Field** (8 tests, 10min)
   - Test I1-I8 secuencialmente

10. **J. Send Button** (6 tests, 10min)
    - Test J1-J6 secuencialmente

11. **K. New Conversation** (6 tests, 10min)
    - Test K1-K6 secuencialmente

12. **L. Safe Areas** (6 tests, 15min)
    - Solo en iOS devices (iPhone 15, iPhone 14)
    - Test L1-L6 secuencialmente

### 3.2 Recording Results

**Use REGRESSION_TESTS.md Results Table:**

```markdown
| Test ID | DevChatMobileDev | ChatMobile | Notes |
|---------|------------------|------------|-------|
| A1 | [x] Pass | [x] Pass | Smooth on all devices |
| A2 | [x] Pass | [ ] Fail | ChatMobile no auto-scroll |
```

**For each test:**
- Mark [x] Pass or [x] Fail
- Add notes if needed
- Screenshot issues (Cmd+Shift+4)

---

## 4. BROWSER DEVTOOLS TESTING

### 4.1 Performance Profiling

**Chrome DevTools:**

1. Open DevTools (Cmd+Opt+I)
2. Performance tab
3. Start recording (Cmd+E)
4. Perform actions:
   - Scroll 10+ messages
   - Send 3 messages
   - Activate pull-to-refresh
5. Stop recording (Cmd+E)

**Analyze:**
- FPS: Should be 60fps consistently
- Main thread: Should be < 50% during scroll
- Layout shifts: Should be ZERO (CLS = 0)

**Screenshot:**
- Cmd+Shift+4 → Save to `/docs/fixed-layout-migration/fase-4/screenshots/performance-devdev.png`

### 4.2 Network Throttling

**Test slow 3G:**

1. DevTools → Network tab
2. Throttling dropdown → Slow 3G
3. Send message
4. Verify: Typing dots show during loading
5. Verify: Message streams correctly

**Test offline:**

1. Throttling → Offline
2. Send message
3. Verify: Error banner appears
4. Verify: Retry button works when back online

### 4.3 Console Errors

**Monitor console durante TODOS los tests:**

1. Console tab
2. Clear console (Cmd+K)
3. Execute test
4. Verify: ZERO errors, ZERO warnings

**Common issues to watch:**
- ❌ `Uncaught ReferenceError`
- ❌ `Failed to fetch`
- ❌ `Hydration error`
- ❌ `Invalid prop type`

---

## 5. LIGHTHOUSE TESTING

### 5.1 Run Lighthouse Audit

**DevChatMobileDev:**

1. Build production: `npm run build && npm start`
2. Open http://localhost:3000/dev-chat-mobile-dev
3. DevTools → Lighthouse tab
4. Settings:
   - Mode: Navigation
   - Device: Mobile
   - Categories: Performance, Accessibility, Best Practices, SEO
5. Click "Analyze page load"

**Target Scores:**
- Performance: ≥ 90
- Accessibility: 100
- Best Practices: ≥ 90
- SEO: ≥ 80

**ChatMobile:**
- Repeat same steps for http://localhost:3000/chat-mobile

### 5.2 Core Web Vitals

**Verify metrics:**

| Metric | Target | DevDev | ChatMobile |
|--------|--------|--------|------------|
| FCP (First Contentful Paint) | < 1.5s | __s | __s |
| LCP (Largest Contentful Paint) | < 2.5s | __s | __s |
| CLS (Cumulative Layout Shift) | < 0.1 | __ | __ |
| TBT (Total Blocking Time) | < 300ms | __ms | __ms |
| SI (Speed Index) | < 3.0s | __s | __s |

**Document results in PERFORMANCE_COMPARISON.md**

### 5.3 Lighthouse Troubleshooting

**If Performance < 90:**

1. Check Network tab: Are images optimized?
2. Check Coverage tab: Unused JavaScript?
3. Check Rendering tab: Layout shifts?

**If Accessibility < 100:**

1. Check ARIA labels
2. Check color contrast
3. Check keyboard navigation

---

## 6. MOBILE DEVICE TESTING

### 6.1 iOS Safari (Physical iPhone)

**Setup:**
1. Connect iPhone via USB
2. Safari → http://YOUR_IP:3000/dev-chat-mobile-dev
3. Desktop Safari → Develop → [iPhone] → Inspect

**Critical tests:**
- L1-L6 (Safe areas with notch/home bar)
- A9-A10 (Keyboard behavior)
- B1-B8 (Pull-to-refresh native feel)

**Capture video:**
1. iPhone Control Center → Screen Recording
2. Perform tests
3. Stop recording
4. AirDrop video to Mac

### 6.2 Android Chrome (Physical Android)

**Setup:**
1. Connect Android via USB
2. Chrome → http://YOUR_IP:3000/dev-chat-mobile-dev
3. Desktop Chrome → chrome://inspect → Inspect

**Critical tests:**
- L6 (No notch/home bar fallback)
- A1-A12 (Scroll behavior)
- I4 (Textarea auto-height)

---

## 7. SCREENSHOT COMPARISON

### 7.1 Before/After Screenshots

**Capture baseline (if available):**
```bash
# Si tienes screenshots de versión anterior (flexbox)
ls docs/fixed-layout-migration/baseline/
```

**Capture current (position:fixed):**
1. DevTools → Device: iPhone 15 Pro Max
2. Scroll to welcome message
3. Cmd+Shift+4 → Save to `/docs/fixed-layout-migration/fase-4/screenshots/welcome-devdev-after.png`

**Compare:**
- Use Preview app → Open both images → side-by-side
- Verify: IDENTICAL layout

**Key screenshots needed:**
- Welcome message (centered)
- 10+ messages (scroll)
- Photo carousel
- Suggestion pills
- Error banner
- Pull-to-refresh indicator

### 7.2 Responsive Screenshots

**Capture all breakpoints:**
- 360px (Galaxy S24)
- 393px (iPhone 14 Pro)
- 430px (iPhone 15 Pro Max)
- 768px (Tablet - bonus)

---

## 8. REGRESSION CHECKLIST SIGN-OFF

### 8.1 Final Verification

**Before marking tests complete:**

- [ ] All 120 tests executed
- [ ] DevChatMobileDev: 60/60 passed
- [ ] ChatMobile: 60/60 passed
- [ ] Lighthouse scores ≥ targets
- [ ] Zero console errors
- [ ] Screenshots captured
- [ ] Performance metrics documented

### 8.2 Known Issues Log

**If any test fails:**

1. Document in REGRESSION_TESTS.md → CRITICAL ISSUES section
2. Create GitHub issue (if applicable)
3. Assign severity: High / Medium / Low
4. Add to TODO.md if fix required

### 8.3 Sign-off

**Update REGRESSION_TESTS.md:**

```markdown
## SIGN-OFF

- [x] All 120 tests executed
- [x] DevChatMobileDev: 60/60 passed
- [x] ChatMobile: 60/60 passed
- [x] Zero critical issues
- [x] Ready for production

**Tester:** [Your Name]
**Date:** Octubre 5, 2025
**Signature:** [Initials]
```

---

## 9. COMMON ISSUES & SOLUTIONS

### Issue: Scroll stuttering on iPhone

**Diagnosis:**
- DevTools Performance tab → Low FPS

**Solution:**
- Add `-webkit-overflow-scrolling: touch` (if not present)
- Verify `will-change: transform` on messages container

### Issue: Safe areas not working

**Diagnosis:**
- Content tapado por notch/home bar

**Solution:**
- Verify viewport meta: `viewport-fit=cover`
- Verify CSS: `env(safe-area-inset-top)` present

### Issue: Pull-to-refresh activates during mid-scroll

**Diagnosis:**
- Pull gesture works cuando scroll > 0

**Solution:**
- Verify `handleTouchStart`: `scrollTop === 0` check

### Issue: Keyboard tapa input (iOS)

**Diagnosis:**
- Input NO visible cuando keyboard aparece

**Solution:**
- Use `100dvh` en vez de `100vh` (if applicable)
- Verify input `position: fixed` con `bottom: calc(...)`

---

## 10. QUICK REFERENCE

### Test URLs

- DevChatMobileDev: http://localhost:3000/dev-chat-mobile-dev
- ChatMobile: http://localhost:3000/chat-mobile

### localStorage Keys

- DevChatMobileDev: `dev_chat_session_id`
- ChatMobile: `public_chat_session_id`

### API Endpoints

- DevChatMobileDev: `/api/dev/chat`, `/api/dev/reset-session`
- ChatMobile: `/api/public/chat`, `/api/public/reset-session`

### Safe Area Values

| Device | Top (notch) | Bottom (home bar) |
|--------|-------------|-------------------|
| iPhone 15 Pro Max | 59px | 34px |
| iPhone 14 Pro | 54px | 34px |
| Pixel 8 Pro | 48px | 0px |
| Galaxy S24 | 0px | 0px |

---

**Last Updated:** Octubre 5, 2025
**Version:** 1.0
