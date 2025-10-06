# Fixed Layout Migration - Performance Comparison

**Proyecto:** Fixed Layout Migration - FASE 4
**Fecha:** Octubre 5, 2025
**Objetivo:** Comparar performance antes (flexbox) vs después (position:fixed)

---

## OVERVIEW

Este documento compara métricas de performance entre:
- **BEFORE:** Arquitectura flexbox (`flex-1`)
- **AFTER:** Arquitectura position:fixed

**Archivos testeados:**
- `src/components/Dev/DevChatMobileDev.tsx`
- `src/components/Public/ChatMobile.tsx`

**Expectativa:** Performance IDÉNTICA o MEJOR (no regresiones)

---

## 1. LIGHTHOUSE SCORES

### 1.1 DevChatMobileDev.tsx

**URL:** http://localhost:3000/dev-chat-mobile-dev

| Metric | Target | BEFORE (flex-1) | AFTER (fixed) | Delta | Status |
|--------|--------|-----------------|---------------|-------|--------|
| Performance | ≥ 90 | __ | __ | __ | [ ] PASS / [ ] FAIL |
| Accessibility | 100 | __ | __ | __ | [ ] PASS / [ ] FAIL |
| Best Practices | ≥ 90 | __ | __ | __ | [ ] PASS / [ ] FAIL |
| SEO | ≥ 80 | __ | __ | __ | [ ] PASS / [ ] FAIL |

**How to measure:**
1. `npm run build && npm start`
2. Open http://localhost:3000/dev-chat-mobile-dev
3. DevTools → Lighthouse → Mobile → Analyze

**Notes:**
- Run 3 times, take median
- Incognito mode (no extensions)
- Network: Fast 3G (throttled)

### 1.2 ChatMobile.tsx

**URL:** http://localhost:3000/chat-mobile

| Metric | Target | BEFORE (flex-1) | AFTER (fixed) | Delta | Status |
|--------|--------|-----------------|---------------|-------|--------|
| Performance | ≥ 90 | __ | __ | __ | [ ] PASS / [ ] FAIL |
| Accessibility | 100 | __ | __ | __ | [ ] PASS / [ ] FAIL |
| Best Practices | ≥ 90 | __ | __ | __ | [ ] PASS / [ ] FAIL |
| SEO | ≥ 80 | __ | __ | __ | [ ] PASS / [ ] FAIL |

---

## 2. CORE WEB VITALS

### 2.1 DevChatMobileDev.tsx

| Metric | Target | BEFORE (flex-1) | AFTER (fixed) | Delta | Status |
|--------|--------|-----------------|---------------|-------|--------|
| **FCP** (First Contentful Paint) | < 1.5s | __s | __s | __s | [ ] PASS / [ ] FAIL |
| **LCP** (Largest Contentful Paint) | < 2.5s | __s | __s | __s | [ ] PASS / [ ] FAIL |
| **CLS** (Cumulative Layout Shift) | < 0.1 | __ | __ | __ | [ ] PASS / [ ] FAIL |
| **TBT** (Total Blocking Time) | < 300ms | __ms | __ms | __ms | [ ] PASS / [ ] FAIL |
| **SI** (Speed Index) | < 3.0s | __s | __s | __s | [ ] PASS / [ ] FAIL |

**Critical:** CLS debe ser ≤ BEFORE (no regresiones en layout shifts)

### 2.2 ChatMobile.tsx

| Metric | Target | BEFORE (flex-1) | AFTER (fixed) | Delta | Status |
|--------|--------|-----------------|---------------|-------|--------|
| **FCP** (First Contentful Paint) | < 1.5s | __s | __s | __s | [ ] PASS / [ ] FAIL |
| **LCP** (Largest Contentful Paint) | < 2.5s | __s | __s | __s | [ ] PASS / [ ] FAIL |
| **CLS** (Cumulative Layout Shift) | < 0.1 | __ | __ | __ | [ ] PASS / [ ] FAIL |
| **TBT** (Total Blocking Time) | < 300ms | __ms | __ms | __ms | [ ] PASS / [ ] FAIL |
| **SI** (Speed Index) | < 3.0s | __s | __s | __s | [ ] PASS / [ ] FAIL |

---

## 3. RUNTIME PERFORMANCE

### 3.1 Scroll Performance (FPS)

**Test scenario:**
1. Send 20+ messages (force long scroll)
2. DevTools → Performance tab → Record
3. Scroll from top to bottom (fast swipe)
4. Stop recording
5. Analyze FPS

**DevChatMobileDev:**

| Metric | Target | BEFORE (flex-1) | AFTER (fixed) | Delta | Status |
|--------|--------|-----------------|---------------|-------|--------|
| Average FPS | 60fps | __ | __ | __ | [ ] PASS / [ ] FAIL |
| Min FPS | ≥ 55fps | __ | __ | __ | [ ] PASS / [ ] FAIL |
| Dropped Frames | < 5% | __% | __% | __% | [ ] PASS / [ ] FAIL |
| Main Thread Idle | ≥ 50% | __% | __% | __% | [ ] PASS / [ ] FAIL |

**ChatMobile:**

| Metric | Target | BEFORE (flex-1) | AFTER (fixed) | Delta | Status |
|--------|--------|-----------------|---------------|-------|--------|
| Average FPS | 60fps | __ | __ | __ | [ ] PASS / [ ] FAIL |
| Min FPS | ≥ 55fps | __ | __ | __ | [ ] PASS / [ ] FAIL |
| Dropped Frames | < 5% | __% | __% | __% | [ ] PASS / [ ] FAIL |
| Main Thread Idle | ≥ 50% | __% | __% | __% | [ ] PASS / [ ] FAIL |

**How to measure:**
1. DevTools → Performance → Settings → Capture screenshots ON
2. Record during scroll
3. Performance summary → Bottom-Up tab
4. Check "Rendering" section

### 3.2 Message Rendering Performance

**Test scenario:**
1. Clear conversation (new session)
2. DevTools → Performance → Record
3. Send 1 message, wait for streaming complete
4. Stop recording
5. Measure time from "Send" click to message visible

**DevChatMobileDev:**

| Metric | Target | BEFORE (flex-1) | AFTER (fixed) | Delta | Status |
|--------|--------|-----------------|---------------|-------|--------|
| Time to First Byte (TTFB) | < 200ms | __ms | __ms | __ms | [ ] PASS / [ ] FAIL |
| First Chunk Render | < 300ms | __ms | __ms | __ms | [ ] PASS / [ ] FAIL |
| Full Message Render | < 2s | __s | __s | __s | [ ] PASS / [ ] FAIL |
| Layout Recalculations | < 5 | __ | __ | __ | [ ] PASS / [ ] FAIL |

**ChatMobile:**

| Metric | Target | BEFORE (flex-1) | AFTER (fixed) | Delta | Status |
|--------|--------|-----------------|---------------|-------|--------|
| Time to First Byte (TTFB) | < 200ms | __ms | __ms | __ms | [ ] PASS / [ ] FAIL |
| First Chunk Render | < 300ms | __ms | __ms | __ms | [ ] PASS / [ ] FAIL |
| Full Message Render | < 2s | __s | __s | __s | [ ] PASS / [ ] FAIL |
| Layout Recalculations | < 5 | __ | __ | __ | [ ] PASS / [ ] FAIL |

**Critical:** Layout Recalculations debe ser ≤ BEFORE

---

## 4. MEMORY USAGE

### 4.1 Heap Snapshots

**Test scenario:**
1. DevTools → Memory tab → Heap snapshot
2. Take snapshot BEFORE (idle state)
3. Send 50 messages
4. Take snapshot AFTER (50 messages state)
5. Compare heap size

**DevChatMobileDev:**

| Metric | Target | BEFORE (flex-1) | AFTER (fixed) | Delta | Status |
|--------|--------|-----------------|---------------|-------|--------|
| Heap Size (Idle) | < 20MB | __MB | __MB | __MB | [ ] PASS / [ ] FAIL |
| Heap Size (50 msgs) | < 50MB | __MB | __MB | __MB | [ ] PASS / [ ] FAIL |
| Memory Growth Rate | < 1MB/msg | __MB | __MB | __MB | [ ] PASS / [ ] FAIL |
| Detached DOM Nodes | 0 | __ | __ | __ | [ ] PASS / [ ] FAIL |

**ChatMobile:**

| Metric | Target | BEFORE (flex-1) | AFTER (fixed) | Delta | Status |
|--------|--------|-----------------|---------------|-------|--------|
| Heap Size (Idle) | < 20MB | __MB | __MB | __MB | [ ] PASS / [ ] FAIL |
| Heap Size (50 msgs) | < 50MB | __MB | __MB | __MB | [ ] PASS / [ ] FAIL |
| Memory Growth Rate | < 1MB/msg | __MB | __MB | __MB | [ ] PASS / [ ] FAIL |
| Detached DOM Nodes | 0 | __ | __ | __ | [ ] PASS / [ ] FAIL |

**Critical:** Detached DOM Nodes MUST be 0 (no memory leaks)

---

## 5. LAYOUT SHIFTS (CLS)

### 5.1 Zero Layout Shifts Goal

**Test scenario:**
1. DevTools → Rendering → Layout Shift Regions (ON)
2. Perform actions:
   - Load page (welcome message)
   - Send 5 messages
   - Scroll up/down
   - Open keyboard (iOS)
   - Close keyboard (iOS)
3. Watch for blue highlight (layout shift regions)

**DevChatMobileDev:**

| Action | BEFORE (flex-1) | AFTER (fixed) | Status |
|--------|-----------------|---------------|--------|
| Page load | [ ] No shifts | [ ] No shifts | [ ] PASS / [ ] FAIL |
| Send message | [ ] No shifts | [ ] No shifts | [ ] PASS / [ ] FAIL |
| Scroll | [ ] No shifts | [ ] No shifts | [ ] PASS / [ ] FAIL |
| Keyboard open (iOS) | [ ] No shifts | [ ] No shifts | [ ] PASS / [ ] FAIL |
| Keyboard close (iOS) | [ ] No shifts | [ ] No shifts | [ ] PASS / [ ] FAIL |

**ChatMobile:**

| Action | BEFORE (flex-1) | AFTER (fixed) | Status |
|--------|-----------------|---------------|--------|
| Page load | [ ] No shifts | [ ] No shifts | [ ] PASS / [ ] FAIL |
| Send message | [ ] No shifts | [ ] No shifts | [ ] PASS / [ ] FAIL |
| Scroll | [ ] No shifts | [ ] No shifts | [ ] PASS / [ ] FAIL |
| Keyboard open (iOS) | [ ] No shifts | [ ] No shifts | [ ] PASS / [ ] FAIL |
| Keyboard close (iOS) | [ ] No shifts | [ ] No shifts | [ ] PASS / [ ] FAIL |

**Expected:** AFTER (fixed) should have FEWER or SAME layout shifts as BEFORE

---

## 6. NETWORK PERFORMANCE

### 6.1 Streaming SSE Performance

**Test scenario:**
1. DevTools → Network tab → Clear
2. Send message
3. Watch SSE stream (`/api/dev/chat?stream=true`)
4. Measure time to first chunk, chunks/second

**DevChatMobileDev:**

| Metric | Target | BEFORE (flex-1) | AFTER (fixed) | Delta | Status |
|--------|--------|-----------------|---------------|-------|--------|
| Time to First Chunk | < 500ms | __ms | __ms | __ms | [ ] PASS / [ ] FAIL |
| Chunks per Second | ≥ 10 | __ | __ | __ | [ ] PASS / [ ] FAIL |
| Total Stream Duration | < 3s | __s | __s | __s | [ ] PASS / [ ] FAIL |
| Dropped Chunks | 0 | __ | __ | __ | [ ] PASS / [ ] FAIL |

**ChatMobile:**

| Metric | Target | BEFORE (flex-1) | AFTER (fixed) | Delta | Status |
|--------|--------|-----------------|---------------|-------|--------|
| Time to First Chunk | < 500ms | __ms | __ms | __ms | [ ] PASS / [ ] FAIL |
| Chunks per Second | ≥ 10 | __ | __ | __ | [ ] PASS / [ ] FAIL |
| Total Stream Duration | < 3s | __s | __s | __s | [ ] PASS / [ ] FAIL |
| Dropped Chunks | 0 | __ | __ | __ | [ ] PASS / [ ] FAIL |

**Note:** Network performance should be IDENTICAL (no changes to API)

---

## 7. MOBILE DEVICE PERFORMANCE

### 7.1 iOS Safari (iPhone 15 Pro Max)

**Test scenario:**
1. Physical iPhone 15 Pro Max
2. Safari → http://YOUR_IP:3000/dev-chat-mobile-dev
3. Xcode → Instruments → Time Profiler
4. Record during scroll (20+ messages)

**DevChatMobileDev:**

| Metric | Target | BEFORE (flex-1) | AFTER (fixed) | Delta | Status |
|--------|--------|-----------------|---------------|-------|--------|
| CPU Usage (Idle) | < 5% | __% | __% | __% | [ ] PASS / [ ] FAIL |
| CPU Usage (Scroll) | < 30% | __% | __% | __% | [ ] PASS / [ ] FAIL |
| GPU Usage (Scroll) | < 40% | __% | __% | __% | [ ] PASS / [ ] FAIL |
| Battery Impact | Low | __ | __ | __ | [ ] PASS / [ ] FAIL |

**ChatMobile:**

| Metric | Target | BEFORE (flex-1) | AFTER (fixed) | Delta | Status |
|--------|--------|-----------------|---------------|-------|--------|
| CPU Usage (Idle) | < 5% | __% | __% | __% | [ ] PASS / [ ] FAIL |
| CPU Usage (Scroll) | < 30% | __% | __% | __% | [ ] PASS / [ ] FAIL |
| GPU Usage (Scroll) | < 40% | __% | __% | __% | [ ] PASS / [ ] FAIL |
| Battery Impact | Low | __ | __ | __ | [ ] PASS / [ ] FAIL |

### 7.2 Android Chrome (Pixel 8 Pro)

**Test scenario:**
1. Physical Pixel 8 Pro
2. Chrome → http://YOUR_IP:3000/dev-chat-mobile-dev
3. Chrome DevTools remote debugging
4. Performance monitor during scroll

**DevChatMobileDev:**

| Metric | Target | BEFORE (flex-1) | AFTER (fixed) | Delta | Status |
|--------|--------|-----------------|---------------|-------|--------|
| FPS (Scroll) | 60fps | __ | __ | __ | [ ] PASS / [ ] FAIL |
| Jank Events | 0 | __ | __ | __ | [ ] PASS / [ ] FAIL |
| CPU Usage (Scroll) | < 40% | __% | __% | __% | [ ] PASS / [ ] FAIL |

**ChatMobile:**

| Metric | Target | BEFORE (flex-1) | AFTER (fixed) | Delta | Status |
|--------|--------|-----------------|---------------|-------|--------|
| FPS (Scroll) | 60fps | __ | __ | __ | [ ] PASS / [ ] FAIL |
| Jank Events | 0 | __ | __ | __ | [ ] PASS / [ ] FAIL |
| CPU Usage (Scroll) | < 40% | __% | __% | __% | [ ] PASS / [ ] FAIL |

---

## 8. BUNDLE SIZE

### 8.1 JavaScript Bundle

**Test scenario:**
1. `npm run build`
2. Check `.next/static/chunks/` folder
3. Measure main bundle size

**DevChatMobileDev:**

| Metric | Target | BEFORE (flex-1) | AFTER (fixed) | Delta | Status |
|--------|--------|-----------------|---------------|-------|--------|
| Main Bundle (gzip) | < 200KB | __KB | __KB | __KB | [ ] PASS / [ ] FAIL |
| Total JS (gzip) | < 500KB | __KB | __KB | __KB | [ ] PASS / [ ] FAIL |

**ChatMobile:**

| Metric | Target | BEFORE (flex-1) | AFTER (fixed) | Delta | Status |
|--------|--------|-----------------|---------------|-------|--------|
| Main Bundle (gzip) | < 200KB | __KB | __KB | __KB | [ ] PASS / [ ] FAIL |
| Total JS (gzip) | < 500KB | __KB | __KB | __KB | [ ] PASS / [ ] FAIL |

**Expected:** Bundle size IDENTICAL (no code changes, only CSS)

---

## 9. SUMMARY

### 9.1 Overall Results

**DevChatMobileDev:**

| Category | Tests | Passed | Failed | Notes |
|----------|-------|--------|--------|-------|
| Lighthouse | 4 | __ | __ | |
| Core Web Vitals | 5 | __ | __ | |
| Runtime Performance | 8 | __ | __ | |
| Memory | 4 | __ | __ | |
| Layout Shifts | 5 | __ | __ | |
| Network | 4 | __ | __ | |
| Mobile Device | 7 | __ | __ | |
| Bundle Size | 2 | __ | __ | |
| **TOTAL** | **39** | **__** | **__** | |

**ChatMobile:**

| Category | Tests | Passed | Failed | Notes |
|----------|-------|--------|--------|-------|
| Lighthouse | 4 | __ | __ | |
| Core Web Vitals | 5 | __ | __ | |
| Runtime Performance | 8 | __ | __ | |
| Memory | 4 | __ | __ | |
| Layout Shifts | 5 | __ | __ | |
| Network | 4 | __ | __ | |
| Mobile Device | 7 | __ | __ | |
| Bundle Size | 2 | __ | __ | |
| **TOTAL** | **39** | **__** | **__** | |

### 9.2 Critical Issues

**List any performance regressions:**

- **Issue ID:** [e.g., P1-DevDev-Scroll]
- **Description:** Scroll FPS dropped from 60 to 45
- **Severity:** High / Medium / Low
- **Root Cause:** ...
- **Fix Required:** YES / NO

### 9.3 Recommendations

**Based on test results:**

1. If CLS increased → Add `will-change: transform` to messages container
2. If FPS dropped → Verify GPU acceleration (`transform: translateZ(0)`)
3. If memory leaked → Check for detached DOM nodes
4. If bundle size increased → Investigate unexpected imports

---

## 10. SIGN-OFF

**Performance testing complete:**

- [ ] All 78 performance tests executed (39 per file)
- [ ] DevChatMobileDev: __/39 passed
- [ ] ChatMobile: __/39 passed
- [ ] Zero critical performance regressions
- [ ] Ready for production

**Tester:** ___________
**Date:** ___________
**Signature:** ___________

---

**Last Updated:** Octubre 5, 2025
**Version:** 1.0
