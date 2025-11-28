# Testing FASE 9 - Compliance APIs

## Prerequisites

1. **Super Admin JWT Token**

Run this to generate a valid token:
```bash
pnpm dlx tsx scripts/test-compliance-api.ts
```

Copy the token from the output.

2. **Sample Data** (Optional)

If `sire_submissions` table is empty, insert sample data manually in Supabase SQL Editor:

```sql
-- Get tenant ID first
SELECT tenant_id, nombre_comercial FROM tenant_registry LIMIT 1;

-- Insert sample submissions (replace <tenant_id> with actual ID)
INSERT INTO public.sire_submissions (tenant_id, submission_date, status, reservations_count)
VALUES
  ('<tenant_id>', NOW() - INTERVAL '5 days', 'completed', 15),
  ('<tenant_id>', NOW() - INTERVAL '25 days', 'completed', 23),
  ('<tenant_id>', NOW() - INTERVAL '45 days', 'completed', 18);
```

---

## Test 1: Compliance Summary API

**Endpoint:** `GET /api/super-admin/compliance`

**Expected Response:**
```json
{
  "tenants": [
    {
      "tenant_id": "...",
      "subdomain": "simmerdown",
      "nombre_comercial": "Simmer Down Guest House",
      "last_submission": "2025-11-21T22:34:42.528Z",
      "submissions_30d": 2,
      "total_reservations": 38,
      "status": "compliant",
      "days_since_last": 5
    }
  ],
  "summary": {
    "total_tenants": 1,
    "compliant": 1,
    "warning": 0,
    "overdue": 0,
    "never_submitted": 0,
    "compliance_rate": 100
  }
}
```

**Test Command:**
```bash
curl http://localhost:3000/api/super-admin/compliance \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -H "Content-Type: application/json" | jq
```

**Validation:**
- ✅ Status 200 OK
- ✅ `tenants` array contains all tenants from `tenant_registry`
- ✅ `status` is correct based on `days_since_last`:
  - `compliant` if ≤20 days
  - `warning` if 21-30 days
  - `overdue` if >30 days
  - `never_submitted` if no submissions
- ✅ `summary.compliance_rate` = (compliant count / total count) * 100

---

## Test 2: CSV Export API

**Endpoint:** `GET /api/super-admin/compliance/report`

**Test Command:**
```bash
curl http://localhost:3000/api/super-admin/compliance/report \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -o compliance-report.csv

# View CSV
cat compliance-report.csv
```

**Expected CSV:**
```csv
Tenant,Subdomain,Submission Date,Status,Reservations Count,Created At,Submission ID
Simmer Down Guest House,simmerdown,2025-11-21,completed,15,2025-11-21T22:34:42.528Z,abc123...
Simmer Down Guest House,simmerdown,2025-11-01,completed,23,2025-11-01T22:34:42.528Z,def456...
Simmer Down Guest House,simmerdown,2025-10-12,completed,18,2025-10-12T22:34:42.528Z,ghi789...
```

**Validation:**
- ✅ Status 200 OK
- ✅ File downloads with correct filename: `sire-compliance-YYYY-MM-DD.csv`
- ✅ CSV has header row
- ✅ Data rows sorted by submission_date DESC (most recent first)
- ✅ Opens correctly in Excel/Google Sheets (UTF-8 BOM)
- ✅ Commas in data fields are properly escaped

---

## Test 3: Authentication

**Test unauthorized access:**

```bash
# No token
curl http://localhost:3000/api/super-admin/compliance

# Invalid token
curl http://localhost:3000/api/super-admin/compliance \
  -H "Authorization: Bearer invalid_token"
```

**Expected:**
- ✅ Status 401 Unauthorized
- ✅ Error message: `{ "error": "Invalid or expired token" }`

---

## Test 4: Status Logic

Create test data with specific dates to validate status calculation:

```sql
-- Compliant (5 days ago)
INSERT INTO sire_submissions (tenant_id, submission_date, status, reservations_count)
VALUES ('<tenant_id>', NOW() - INTERVAL '5 days', 'completed', 10);

-- Warning (25 days ago)
INSERT INTO sire_submissions (tenant_id, submission_date, status, reservations_count)
VALUES ('<tenant_id>', NOW() - INTERVAL '25 days', 'completed', 15);

-- Overdue (35 days ago)
INSERT INTO sire_submissions (tenant_id, submission_date, status, reservations_count)
VALUES ('<tenant_id>', NOW() - INTERVAL '35 days', 'completed', 20);
```

**Query API and verify:**
- Tenant with last submission 5 days ago → status = `compliant`
- Tenant with last submission 25 days ago → status = `warning`
- Tenant with last submission 35 days ago → status = `overdue`

**Important:** Status is based on MOST RECENT submission, not all submissions.

---

## Test 5: Edge Cases

### No submissions
```sql
-- Delete all submissions for a tenant
DELETE FROM sire_submissions WHERE tenant_id = '<tenant_id>';
```

**Expected:** Tenant still appears in API response with:
- `last_submission: null`
- `submissions_30d: 0`
- `total_reservations: 0`
- `status: "never_submitted"`
- `days_since_last: null`

### Multiple tenants
Ensure API returns stats for ALL tenants in `tenant_registry`, even those without submissions.

---

## Troubleshooting

### Table not found error
```
Could not find the table 'public.sire_submissions' in the schema cache
```

**Solution:** Table was created but Supabase hasn't reloaded schema cache. Wait 1-2 minutes or restart Supabase dashboard.

### RLS policy blocks query
```
new row violates row-level security policy
```

**Solution:** Verify `super_admin_users` table has your user ID and JWT payload is correct.

### TypeScript errors in build
```
Cannot find module '@/lib/supabase'
```

**Solution:** These are API routes, they will work at runtime. Build errors may come from frontend pages, not the API endpoints.

---

## Success Checklist

- [ ] JWT token generated successfully
- [ ] Compliance API returns 200 with correct data
- [ ] Summary metrics calculate correctly
- [ ] Status badges match days_since_last calculation
- [ ] CSV export downloads successfully
- [ ] CSV opens in Excel without encoding issues
- [ ] Unauthorized requests return 401
- [ ] All tenants appear in response (including those without submissions)
- [ ] Edge cases handled (no submissions, multiple tenants)

---

## Next: Frontend Integration

Once all API tests pass, hand off to `@ux-interface` for:
1. ComplianceOverview component
2. ComplianceTable component
3. ComplianceAlerts component
4. Super Admin dashboard integration

See: `docs/super-admin/super-admin-prompt-workflow-fases-8-11.md` (FASE 9 - Part B)
