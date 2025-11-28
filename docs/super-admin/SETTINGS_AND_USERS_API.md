# Super Admin Settings & Users API

**Status:** ✅ Implemented (November 26, 2025)
**Author:** @agent-backend-developer
**Part of:** FASE 8 - Settings & Dark Mode (Backend)

---

## Overview

This document describes the backend APIs for managing platform-wide settings and super admin user accounts.

### Architecture Decision: JSON File vs Database Table

The settings API uses a **dual-strategy approach**:

1. **Primary:** Attempts to use `platform_settings` table (if exists)
2. **Fallback:** Uses JSON file at `public/config/settings.json`

**Current Implementation:** JSON file (table migration optional)

---

## Endpoints

### 1. GET /api/super-admin/settings

Retrieves current platform settings.

**Request:**
```bash
curl http://localhost:3000/api/super-admin/settings \
  -H "Authorization: Bearer <token>"
```

**Response (200):**
```json
{
  "settings": {
    "maintenanceMode": false,
    "globalAnnouncement": "",
    "maxFileSize": 10,
    "defaultModel": "claude-sonnet-4-5"
  }
}
```

**Behavior:**
- First time: Creates `public/config/settings.json` with defaults
- Subsequent calls: Returns existing settings

---

### 2. POST /api/super-admin/settings

Updates platform settings.

**Request:**
```bash
curl http://localhost:3000/api/super-admin/settings \
  -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "maintenanceMode": true,
    "globalAnnouncement": "Maintenance in progress",
    "maxFileSize": 20,
    "defaultModel": "claude-sonnet-4-5"
  }'
```

**Response (200):**
```json
{
  "success": true,
  "settings": {
    "maintenanceMode": true,
    "globalAnnouncement": "Maintenance in progress",
    "maxFileSize": 20,
    "defaultModel": "claude-sonnet-4-5"
  }
}
```

**Validations:**
- `maintenanceMode`: Must be boolean
- `maxFileSize`: Must be number between 1-100 (MB)
- `globalAnnouncement`: Must be string (no length limit)
- `defaultModel`: Must be non-empty string

**Error Response (400):**
```json
{
  "error": "maxFileSize must be between 1-100 MB"
}
```

---

### 3. GET /api/super-admin/users

Retrieves list of all super admin users.

**Request:**
```bash
curl http://localhost:3000/api/super-admin/users \
  -H "Authorization: Bearer <token>"
```

**Response (200):**
```json
{
  "users": [
    {
      "super_admin_id": "cb8320eb-b935-4135-8463-058b91a9627f",
      "username": "oneill",
      "full_name": "O Neill",
      "email": null,
      "is_active": true,
      "last_login_at": "2025-11-26T22:17:01.111+00:00",
      "created_at": "2025-11-26T18:27:29.403854+00:00"
    }
  ]
}
```

**Security:**
- `password_hash` is **NEVER** returned
- Only authenticated super admins can access
- Results ordered by `created_at DESC`

---

### 4. PATCH /api/super-admin/users/[id]

Updates a super admin user (currently only `is_active` field).

**Request:**
```bash
curl http://localhost:3000/api/super-admin/users/cb8320eb-b935-4135-8463-058b91a9627f \
  -X PATCH \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{ "is_active": false }'
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "super_admin_id": "cb8320eb-b935-4135-8463-058b91a9627f",
    "username": "oneill",
    "full_name": "O Neill",
    "email": null,
    "is_active": false,
    "last_login_at": "2025-11-26T22:17:01.111+00:00",
    "created_at": "2025-11-26T18:27:29.403854+00:00",
    "updated_at": "2025-11-26T22:17:09.435+00:00"
  }
}
```

**Validations:**
- `is_active` must be boolean

**Error Response (400):**
```json
{
  "error": "is_active must be boolean"
}
```

**Error Response (404):**
```json
{
  "error": "Super admin user not found"
}
```

---

## File Structure

```
src/app/api/super-admin/
├── settings/
│   └── route.ts           # GET + POST settings endpoints
├── users/
│   ├── route.ts           # GET users list
│   └── [id]/
│       └── route.ts       # PATCH update user

public/config/
└── settings.json          # Platform settings (auto-created)

scripts/
├── test-super-admin-settings.sh  # Full test suite
├── get-super-admin-token.js      # Get auth token
└── reset-settings.sh             # Reset to defaults
```

---

## Testing

### Run Full Test Suite

```bash
# 1. Start dev server
pnpm run dev

# 2. Get auth token
TOKEN=$(node scripts/get-super-admin-token.js)

# 3. Run tests
bash scripts/test-super-admin-settings.sh "$TOKEN"
```

### Test Results (All Passing)

```
✅ GET  /api/super-admin/settings (creates defaults)
✅ POST /api/super-admin/settings (updates settings)
✅ GET  /api/super-admin/settings (verifies update)
✅ POST /api/super-admin/settings (validation errors)
✅ GET  /api/super-admin/users (lists users)
✅ PATCH /api/super-admin/users/[id] (updates is_active)
✅ Security: password_hash NOT exposed
✅ Settings JSON file created correctly
```

---

## Settings Schema

```typescript
interface Settings {
  maintenanceMode: boolean;      // Enable/disable maintenance mode
  globalAnnouncement: string;    // Platform-wide announcement message
  maxFileSize: number;           // Max upload size in MB (1-100)
  defaultModel: string;          // Default AI model to use
}
```

**Defaults:**
```json
{
  "maintenanceMode": false,
  "globalAnnouncement": "",
  "maxFileSize": 10,
  "defaultModel": "claude-sonnet-4-5"
}
```

---

## Database Schema (Optional Migration)

If you prefer using a database table instead of JSON file:

```sql
-- Create table
CREATE TABLE IF NOT EXISTS platform_settings (
  setting_key TEXT PRIMARY KEY,
  setting_value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert defaults
INSERT INTO platform_settings (setting_key, setting_value) VALUES
  ('maintenanceMode', 'false'::jsonb),
  ('globalAnnouncement', '""'::jsonb),
  ('maxFileSize', '10'::jsonb),
  ('defaultModel', '"claude-sonnet-4-5"'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

-- Enable RLS
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Policies (super admin only)
CREATE POLICY "Super admins can read settings"
  ON platform_settings FOR SELECT
  TO authenticated
  USING (auth.jwt()->>'role' = 'super_admin');

CREATE POLICY "Super admins can update settings"
  ON platform_settings FOR ALL
  TO authenticated
  USING (auth.jwt()->>'role' = 'super_admin')
  WITH CHECK (auth.jwt()->>'role' = 'super_admin');
```

**Note:** The API code already supports both strategies. It will automatically detect the table and use it if available.

---

## Security Considerations

### Authentication

All endpoints require:
- Valid super admin JWT token in `Authorization: Bearer <token>` header
- Token verified by `/src/lib/middleware-super-admin.ts`

### Password Protection

- `password_hash` is NEVER returned in API responses
- Only non-sensitive fields exposed in user objects
- Update endpoint only allows changing `is_active` (not passwords)

### Validation

- All inputs validated before processing
- Type checking enforced (boolean, string, number)
- Range validation (e.g., maxFileSize 1-100 MB)
- Invalid requests return 400 with error message

---

## Future Enhancements

### Settings
- [ ] Add `allowedFileTypes` array setting
- [ ] Add `rateLimitPerMinute` setting
- [ ] Add `sessionTimeoutMinutes` setting
- [ ] Add validation for `defaultModel` against allowed models

### Users
- [ ] Add password reset endpoint (PATCH with `new_password`)
- [ ] Add POST endpoint to create new super admins
- [ ] Add DELETE endpoint to remove super admins
- [ ] Add email verification flow
- [ ] Add 2FA support

---

## Troubleshooting

### Settings not persisting
- Check if `public/config/` directory exists
- Verify file permissions on `settings.json`
- Check server logs for write errors

### Users endpoint returns empty array
- Verify `super_admin_users` table has data
- Check database connection
- Verify RLS policies (if applicable)

### 404 errors
- Ensure dev server is running (`pnpm run dev`)
- Check middleware is not blocking requests
- Verify route files exist in correct locations

---

## Related Documentation

- `docs/super-admin/README.md` - Super Admin Dashboard overview
- `src/lib/middleware-super-admin.ts` - Authentication middleware
- `src/lib/super-admin-auth.ts` - Auth utility functions
