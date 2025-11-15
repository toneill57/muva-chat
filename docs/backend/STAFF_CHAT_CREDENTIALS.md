# Staff Chat System - Credentials & Testing Guide

**Status**: ✅ FULLY OPERATIONAL
**Last Updated**: October 1, 2025
**Environment**: Development (localhost:3000)

---

## 🏨 Available Tenant

**SimmerDown Guest House**
- Tenant ID: `b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf`
- Slug: `simmerdown`
- Features:
  - ✅ Staff Chat Enabled
  - ✅ Guest Chat Enabled
  - ✅ MUVA Access
  - ✅ Premium Chat

---

## 👥 Staff User Credentials

All staff users use the same password: **`Staff2024!`**

### 1. CEO Account (Full Access)
```
Username:     admin_ceo
Password:     Staff2024!
Full Name:    Carlos Ospina (CEO)
Email:        carlos@simmerdown.com
Role:         ceo
Staff ID:     ed0b94df-18d1-4f98-b9b3-69667a7226fc

Permissions:
  ✅ Admin Panel Access
  ✅ SIRE Access
  ✅ Reports Access
  ✅ Modify Operations
```

### 2. Admin Account (Operational Access)
```
Username:     admin_simmer
Password:     Staff2024!
Full Name:    Laura Martínez (Admin)
Email:        laura@simmerdown.com
Role:         admin
Staff ID:     f92c1c7d-5987-433e-b334-531fb2cc54ca

Permissions:
  ✅ Admin Panel Access
  ✅ SIRE Access
  ✅ Reports Access
  ❌ Modify Operations
```

### 3. Housekeeper Account (Limited Access)
```
Username:     housekeeping_maria
Password:     Staff2024!
Full Name:    María Rodríguez (Housekeeping)
Role:         housekeeper
Staff ID:     4c16fa0a-c4f9-408e-8a43-5d8eaceb7a00

Permissions:
  ✅ SIRE Access
  ❌ Admin Panel Access
  ❌ Reports Access
  ❌ Modify Operations
```

---

## 🧪 Quick Test

### 1. Start Dev Server
```bash
pnpm run dev
```

### 2. Navigate to Login
```
http://localhost:3000/staff/login
```

### 3. Login Steps
1. Select tenant: **SimmerDown Guest House**
2. Enter username: `admin_ceo`
3. Enter password: `Staff2024!`
4. Click "Sign In"
5. ✅ Should redirect to `/staff` with chat interface

### 4. Test API Directly
```bash
node -e "
fetch('http://localhost:3000/api/staff/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'admin_ceo',
    password: 'Staff2024!',
    tenant_id: 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
  })
})
.then(res => res.json())
.then(data => console.log(JSON.stringify(data, null, 2)))
"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGc...",
    "staff_info": {
      "staff_id": "ed0b94df-18d1-4f98-b9b3-69667a7226fc",
      "username": "admin_ceo",
      "full_name": "Carlos Ospina (CEO)",
      "role": "ceo",
      "permissions": {
        "admin_panel": true,
        "sire_access": true,
        "reports_access": true,
        "modify_operations": true
      }
    },
    "session_expires_at": "2025-10-02T06:13:09.276Z"
  }
}
```

---

## 🎯 Test Scenarios

### Scenario 1: CEO Full Access
```
Login as:   admin_ceo
Action:     Ask "¿Cómo puedo acceder a los reportes financieros?"
Expected:   ✅ Detailed response with sources
```

### Scenario 2: Admin Limited Access
```
Login as:   admin_simmer
Action:     Ask "¿Cuál es el procedimiento para check-in?"
Expected:   ✅ Operational response
Action:     Ask "¿Cómo modifico las operaciones?"
Expected:   ⚠️ Limited or denied access
```

### Scenario 3: Housekeeper Basic Access
```
Login as:   housekeeping_maria
Action:     Ask "¿Cuál es el checklist de limpieza?"
Expected:   ✅ Housekeeping procedures
Action:     Ask "¿Cómo accedo al panel administrativo?"
Expected:   ❌ Access denied
```

### Scenario 4: Invalid Credentials
```
Login as:   invalid-user / wrongpassword
Expected:   ❌ "Invalid credentials" error
```

---

## 📋 Manual Testing Checklist

Use `STAFF_CHAT_TESTING_CHECKLIST.md` for comprehensive testing (50+ checkpoints).

**Quick Checks:**
- [ ] Login page loads at `/staff/login`
- [ ] Tenant dropdown shows "SimmerDown Guest House"
- [ ] Can login with CEO credentials
- [ ] Chat interface loads with user info
- [ ] Role badge shows "CEO" (gold color)
- [ ] Can send message and receive response
- [ ] Sources drawer expands and shows sources
- [ ] Logout button works
- [ ] Mobile responsive (sidebar collapses)

---

## 🧪 Run E2E Tests

```bash
# Run all staff chat tests
npx playwright test e2e/staff-chat.spec.ts

# Run specific test
npx playwright test e2e/staff-chat.spec.ts -g "CEO Full Access"

# Run with UI
npx playwright test e2e/staff-chat.spec.ts --ui

# Run in headed mode (see browser)
npx playwright test e2e/staff-chat.spec.ts --headed
```

**Test Coverage:**
- ✅ Authentication flow (5 tests)
- ✅ Role-based permissions (3 tests)
- ✅ Content queries (5 tests)
- ✅ Conversation management (3 tests)
- ✅ UI/UX interactions (4 tests)
- ✅ Error handling (3 tests)

**Total**: 20+ test scenarios

---

## 🔐 Security Notes

**JWT Token:**
- Stored in: `localStorage` with key `staff_token`
- Expiration: 24 hours
- Contains: staff_id, tenant_id, role, permissions

**Token Verification:**
```
GET /api/staff/verify-token
Authorization: Bearer <token>
```

**Logout:**
- Clears token from localStorage
- Redirects to `/staff/login`

**Protected Routes:**
- `/staff` - Requires valid JWT
- `/staff/login` - Public

---

## 🚀 Next Steps

1. **Manual Testing** - Use checklist to verify all features
2. **E2E Testing** - Run Playwright tests
3. **Performance Testing** - Test with multiple concurrent users
4. **Production Deploy** - Once testing passes

---

## 📞 Support

**Issues?**
- Check server logs: `pnpm run dev` output
- Check browser console: F12 → Console
- Check database: `SELECT * FROM staff_users WHERE username = 'admin_ceo'`
- Review: `STAFF_CHAT_TESTING_CHECKLIST.md`

**Files to Review:**
- Backend: `/src/app/api/staff/login/route.ts`
- Auth: `/src/lib/staff-auth.ts`
- Frontend: `/src/components/Staff/StaffLogin.tsx`
- Tests: `/e2e/staff-chat.spec.ts`

---

**Implementation Status**: ✅ COMPLETE
**Last Tested**: October 1, 2025
**Test Result**: ✅ LOGIN WORKING
**Ready for**: Manual QA Testing → E2E Tests → Production
