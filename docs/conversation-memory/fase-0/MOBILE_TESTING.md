# MOBILE TESTING - Session Persistence Fix (FASE 0)

**Date**: 2025-10-03
**Fix Applied**: Cookie reading in `/api/public/chat` and `/api/dev/chat`
**Objective**: Validate session persistence across all mobile devices

---

## 🎯 Test Objective

Confirm that HttpOnly cookies are correctly read by backend after fixes in:
- `src/app/api/public/chat/route.ts` (lines 165-168)
- `src/app/api/dev/chat/route.ts` (lines 166-169)

**Expected Behavior**: Sessions persist across all devices, no context loss, no "first message" treatment on every message.

---

## 🧪 Test Plan

### 1. Desktop Testing

| Browser | Messages Sent | Session ID Consistent? | Context Maintained? | Status | Notes |
|---------|---------------|------------------------|---------------------|--------|-------|
| Chrome  | 5             | ☐ Yes ☐ No            | ☐ Yes ☐ No         | ⏳ Pending | Check Network tab for session_id |
| Safari  | 5             | ☐ Yes ☐ No            | ☐ Yes ☐ No         | ⏳ Pending | Check cookies in DevTools |

**How to verify:**
1. Open DevTools → Network tab
2. Send first message → Note `session_id` in response
3. Send 4 more messages → Verify same `session_id` in all requests
4. Check response includes context from previous messages

---

### 2. iPhone Testing

| Browser | Device | Messages Sent | Context Lost? | Cookies Present? | Status | Notes |
|---------|--------|---------------|---------------|------------------|--------|-------|
| Safari  | iPhone 15 | 10 | ☐ Yes ☐ No | ☐ Yes ☐ No | ⏳ Pending | Primary test - Safari is most restrictive |
| Chrome iOS | iPhone 15 | 10 | ☐ Yes ☐ No | ☐ Yes ☐ No | ⏳ Pending | Uses Safari engine |

**How to verify (Safari iOS):**
1. Open Settings → Safari → Advanced → Web Inspector
2. Connect iPhone to Mac
3. Safari Desktop → Develop → [Your iPhone] → [Page]
4. Check Storage tab for `session_id` cookie
5. Network tab → Verify cookie sent in requests

**Session ID from test:**
```
First message session_id: _______________________
Last message session_id:  _______________________
Match? ☐ Yes ☐ No
```

---

### 3. Android Testing

| Browser | Device | Messages Sent | Context Lost? | Cookies Present? | Status | Notes |
|---------|--------|---------------|---------------|------------------|--------|-------|
| Chrome  | Pixel 8 / Galaxy S24 | 10 | ☐ Yes ☐ No | ☐ Yes ☐ No | ⏳ Pending | |
| Samsung Internet | Galaxy S24 | 10 | ☐ Yes ☐ No | ☐ Yes ☐ No | ⏳ Pending | Samsung-specific browser |

**How to verify (Chrome Android):**
1. Enable USB Debugging on Android
2. Chrome Desktop → `chrome://inspect`
3. Select device → Inspect
4. Application tab → Cookies → Check `session_id`

**Session ID from test:**
```
First message session_id: _______________________
Last message session_id:  _______________________
Match? ☐ Yes ☐ No
```

---

### 4. Long Conversation Test (Mobile)

**Device**: iPhone 15
**Browser**: Safari
**Objective**: Verify context maintained in 25+ message conversation

| Message # | User Input | Bot Remembers Context? | Session ID | Notes |
|-----------|------------|------------------------|------------|-------|
| 1 | "My name is John" | N/A | | Initial context |
| 5 | "What's my name?" | ☐ Yes ☐ No | | Should say "John" |
| 10 | "What did we talk about?" | ☐ Yes ☐ No | | Should reference name |
| 15 | Test question | ☐ Yes ☐ No | | |
| 20 | Test question | ☐ Yes ☐ No | | Hitting 20-message limit |
| 25 | "Remember my name?" | ☐ Yes ☐ No | | **CRITICAL**: Should still remember |

**Session IDs collected:**
```
Message 1:  _______________________
Message 5:  _______________________
Message 10: _______________________
Message 15: _______________________
Message 20: _______________________
Message 25: _______________________

All identical? ☐ Yes ☐ No
```

**Context retention:**
- Message 25 remembered name from message 1? ☐ Yes ☐ No
- No "Hola! Cómo puedo ayudarte?" after message 1? ☐ Yes ☐ No

---

### 5. Incognito/Private Mode Testing

**Objective**: Verify cookies work when localStorage is disabled

| Browser | Mode | Messages Sent | Session Persists? | Status | Notes |
|---------|------|---------------|-------------------|--------|-------|
| Safari  | Private Browsing | 5 | ☐ Yes ☐ No | ⏳ Pending | localStorage restricted |
| Chrome  | Incognito | 5 | ☐ Yes ☐ No | ⏳ Pending | Cookies should work |

**How to verify:**
1. Open private/incognito window
2. Send 5 messages in same tab
3. Verify context maintained
4. Check DevTools → session_id cookie present
5. Close tab → Reopen → Session should be lost (expected)

---

## 📊 Success Criteria

- [ ] **Desktop**: 100% session persistence (Chrome + Safari)
- [ ] **iPhone**: 100% session persistence (Safari + Chrome iOS)
- [ ] **Android**: 100% session persistence (Chrome + Samsung Internet)
- [ ] **Long conversation**: Context maintained 25+ messages
- [ ] **Incognito**: Cookies work (no localStorage dependency)
- [ ] **No "first message" bug**: Bot doesn't treat every message as first contact

---

## 🐛 Issues Found

### Issue Template
```markdown
**Device**:
**Browser**:
**Issue**:
**Session IDs**:
**Expected**:
**Actual**:
**Screenshot**:
```

---

## 📸 Screenshots

### Desktop (Chrome)
- [ ] Network tab showing consistent session_id
- [ ] Cookies in Application tab

### iPhone (Safari)
- [ ] Web Inspector showing session_id cookie
- [ ] Network requests with cookie header

### Android (Chrome)
- [ ] DevTools Application tab with cookies
- [ ] Network requests showing session persistence

---

## 🔍 Verification Checklist

Before marking FASE 0 as complete:

- [ ] All desktop browsers pass
- [ ] All mobile devices pass (iOS + Android)
- [ ] Long conversation test passes (25+ messages)
- [ ] Incognito mode works correctly
- [ ] Screenshots collected for all platforms
- [ ] Session IDs documented and verified
- [ ] No critical issues found

---

## 📝 Notes & Observations

_(Add any additional observations, edge cases, or unexpected behavior here)_

---

## ✅ Final Status

**FASE 0 Status**: ⏳ Testing in Progress

**Date Completed**: __________
**Tested By**: __________
**Approved By**: __________

**Next Steps**: Proceed to FASE 1 (Conversation Compression System)
