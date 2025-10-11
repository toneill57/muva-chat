# New Tenant Onboarding Guide

**MUVA Multi-Tenant Subdomain Chat System**

This guide explains how to onboard a new client (hotel, surf school, tourism agency) to the MUVA platform with their own custom subdomain and isolated knowledge base.

---

## Overview

Each tenant gets:
- Custom subdomain: `{tenant}.muva.chat`
- Isolated knowledge base (documents, FAQs)
- Branded chat interface with their logo
- Admin dashboard for content management
- AI-powered chat assistant (Claude)

---

## Prerequisites

Before onboarding a new tenant, ensure you have:
- ✅ Tenant's business information (NIT, legal name, business name)
- ✅ Desired subdomain (lowercase, alphanumeric, hyphens only)
- ✅ Logo image (optional, PNG/JPG recommended)
- ✅ Access to production database (Supabase)
- ✅ Admin access to MUVA platform

---

## Step 1: Create Tenant in Database

### Option A: Using Supabase Dashboard (Recommended for non-technical users)

1. **Navigate to Supabase Dashboard**
   - Go to: https://supabase.com/dashboard/project/ooaumjzaztmutltifhoq
   - Select: `Table Editor` → `tenant_registry`

2. **Click "Insert row"**

3. **Fill in Required Fields:**
   ```
   nit: "900123456-7"                          # Tax ID (Colombia NIT)
   razon_social: "HOTEL ABC S.A.S."           # Legal business name
   nombre_comercial: "Hotel ABC"              # Display name
   subdomain: "hotel-abc"                      # Subdomain (lowercase, no special chars)
   slug: "hotel-abc"                           # Same as subdomain
   schema_name: "tenant_hotel_abc"             # Format: tenant_{subdomain_with_underscores}
   tenant_type: "hotel"                        # Options: hotel, surf_school, agency
   is_active: true
   subscription_tier: "premium"                # Options: free, basic, premium
   logo_url: "https://example.com/logo.png"   # Optional
   ```

4. **Set Features (JSONB field):**
   ```json
   {
     "muva_access": true,
     "premium_chat": true,
     "guest_chat_enabled": true,
     "staff_chat_enabled": true,
     "sire_city_code": "88001",
     "sire_hotel_code": "12345"
   }
   ```

5. **Click "Save"**

### Option B: Using Seed Script (Recommended for developers)

1. **Create tenant configuration in script:**
   ```bash
   # Edit scripts/seed-test-tenants.ts
   # Add new tenant to TEST_TENANTS array
   ```

2. **Run seeding script:**
   ```bash
   set -a && source .env.local && set +a
   npx tsx scripts/seed-test-tenants.ts
   ```

### Option C: Using SQL (Advanced)

```sql
INSERT INTO tenant_registry (
  nit,
  razon_social,
  nombre_comercial,
  subdomain,
  slug,
  schema_name,
  tenant_type,
  is_active,
  subscription_tier,
  features,
  logo_url
) VALUES (
  '900123456-7',
  'HOTEL ABC S.A.S.',
  'Hotel ABC',
  'hotel-abc',
  'hotel-abc',
  'tenant_hotel_abc',
  'hotel',
  true,
  'premium',
  '{"muva_access": true, "premium_chat": true, "guest_chat_enabled": true, "staff_chat_enabled": true}'::jsonb,
  'https://example.com/logo.png'
);
```

---

## Step 2: Configure Subdomain

### Subdomain Requirements

- **Format:** Lowercase letters, numbers, hyphens only (no underscores, spaces, or special chars)
- **Valid examples:** `simmerdown`, `hotel-abc`, `xyz-hotel-2024`
- **Invalid examples:** `Hotel_ABC`, `hotel abc`, `hôtel-français`

### DNS Configuration (Already configured via wildcard)

The wildcard DNS `*.muva.chat` is already pointing to the VPS, so no additional DNS configuration is needed. Once the tenant is created in the database, the subdomain will work immediately.

**Verify DNS:**
```bash
dig hotel-abc.muva.chat
# Should return: same IP as muva.chat
```

---

## Step 3: Upload Initial Documentation

### Via Admin Dashboard (Recommended)

1. **Access Admin Panel:**
   - Navigate to: `https://{tenant}.muva.chat/admin`
   - Login with admin credentials

2. **Go to Knowledge Base:**
   - Click: `Knowledge Base` in sidebar

3. **Upload Documents:**
   - Click: `Upload Content`
   - Select file type: `PDF`, `TXT`, `DOCX`, or `MD`
   - Upload files (max 10MB each)
   - Add metadata: title, description, tags

4. **Process Documents:**
   - System automatically:
     - Extracts text content
     - Generates embeddings (OpenAI)
     - Stores in `tenant_knowledge_embeddings` table
     - Associates with tenant_id

### Via Bulk Upload Script

For large document sets (>10 files):

```bash
# Run bulk upload script
set -a && source .env.local && set +a
npx tsx scripts/process-tenant-docs.ts \
  --tenant-id="<UUID>" \
  --directory="/path/to/docs" \
  --recursive
```

---

## Step 4: Customize Branding

### Logo Upload

1. **Access Settings:**
   - Navigate to: `https://{tenant}.muva.chat/admin/settings`

2. **Upload Logo:**
   - Click: `Branding` tab
   - Upload logo (PNG/JPG, max 2MB)
   - Recommended size: 512x512px or 1024x1024px
   - System automatically uploads to Supabase Storage

3. **Save Changes:**
   - Logo URL is automatically saved to `tenant_registry.logo_url`

### Color Customization

1. **Primary Color:**
   - Choose brand color (hex code)
   - Applied to buttons, links, headers

2. **Preview:**
   - Changes are reflected in real-time

---

## Step 5: Test Chat Functionality

### Automated Tests

Run the tenant isolation test suite:

```bash
# Test tenant chat isolation
npm run test:tenant-isolation

# Test knowledge base filtering
npm run test:knowledge-base
```

### Manual Testing

1. **Access Chat:**
   - Go to: `https://{tenant}.muva.chat/chat`

2. **Test Questions:**
   - Ask: "What services do you offer?"
   - Ask: "What are your check-in times?"
   - Ask: "Do you have Wi-Fi?"

3. **Verify Responses:**
   - ✅ Responses use ONLY tenant's documents
   - ✅ No data from other tenants appears
   - ✅ Logo/branding displays correctly
   - ✅ Response time < 2 seconds

4. **Test Admin Features:**
   - Upload a test document
   - Verify it appears in chat responses
   - Delete the test document
   - Verify it's removed from responses

---

## Step 6: Verify Tenant Isolation

### Security Checklist

- [ ] **RLS Policies Active:**
  ```sql
  SELECT tablename, policyname, permissive, roles, cmd
  FROM pg_policies
  WHERE tablename = 'tenant_knowledge_embeddings';
  ```

- [ ] **Data Isolation Test:**
  - Upload doc to Tenant A
  - Query chat on Tenant B
  - Verify Tenant B does NOT see Tenant A's doc

- [ ] **Admin Access Control:**
  - Tenant A admin cannot access Tenant B's admin panel
  - 403 Forbidden on cross-tenant access

### Performance Verification

```bash
# Test response times
curl -w "@curl-format.txt" -X POST https://{tenant}.muva.chat/api/tenant-chat \
  -H "Content-Type: application/json" \
  -d '{"message":"test","history":[]}'

# Expected: Total time < 2s
```

---

## Common Issues & Solutions

### Issue 1: Subdomain Not Resolving

**Symptom:** `nslookup {tenant}.muva.chat` fails

**Solution:**
1. Verify tenant exists in `tenant_registry`
2. Check subdomain spelling (lowercase, no special chars)
3. Wait 5-10 minutes for DNS propagation
4. Clear DNS cache: `sudo dscacheutil -flushcache` (macOS)

### Issue 2: Chat Shows "No Documents Found"

**Symptom:** Chat responds "I don't have information about that"

**Solution:**
1. Verify documents uploaded: Check `Knowledge Base` in admin
2. Check embeddings generated: Query `tenant_knowledge_embeddings`
3. Re-process documents: Delete and re-upload

### Issue 3: Logo Not Displaying

**Symptom:** Chat header shows initials instead of logo

**Solution:**
1. Verify logo URL in database: Check `tenant_registry.logo_url`
2. Test logo URL directly: Open in browser
3. Ensure logo is publicly accessible (no auth required)
4. Re-upload logo via Admin Settings

### Issue 4: Cross-Tenant Data Leak

**Symptom:** Tenant A sees Tenant B's documents

**Solution:**
1. **CRITICAL:** Report immediately to security team
2. Verify RLS policies are enabled:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'tenant_knowledge_embeddings';
   ```
3. Check API filtering logic in `/api/tenant-chat`

---

## FAQ

### Q: Can I change a tenant's subdomain after creation?

**A:** Yes, but requires careful steps:
1. Update `tenant_registry.subdomain`
2. Update `tenant_registry.slug` (if used)
3. Notify tenant of new URL
4. Set up redirect (optional)
5. Update bookmarks/links

### Q: How many documents can a tenant upload?

**A:** Depends on subscription tier:
- **Free:** 10 documents, 50MB total
- **Basic:** 100 documents, 500MB total
- **Premium:** Unlimited documents, 10GB total

### Q: Can a tenant have multiple subdomains?

**A:** No. Each tenant gets one primary subdomain. Use different tenants for separate brands.

### Q: How do I delete a tenant?

**A:**
1. Set `is_active = false` in `tenant_registry` (soft delete)
2. For hard delete (IRREVERSIBLE):
   ```sql
   DELETE FROM tenant_knowledge_embeddings WHERE tenant_id = '<UUID>';
   DELETE FROM tenant_registry WHERE tenant_id = '<UUID>';
   ```

### Q: Can I migrate a tenant to a different subscription tier?

**A:**
```sql
UPDATE tenant_registry
SET subscription_tier = 'premium',
    features = features || '{"muva_access": true}'::jsonb
WHERE subdomain = 'hotel-abc';
```

---

## Onboarding Checklist

Use this checklist for each new tenant:

### Database Setup
- [ ] Tenant created in `tenant_registry`
- [ ] Subdomain follows naming rules (lowercase, alphanumeric, hyphens)
- [ ] `schema_name` uses correct format: `tenant_{subdomain_underscores}`
- [ ] `is_active` set to `true`
- [ ] Features JSONB configured correctly

### Content Setup
- [ ] Initial documents uploaded (minimum 5 docs recommended)
- [ ] Embeddings generated successfully
- [ ] Documents visible in admin Knowledge Base

### Branding
- [ ] Logo uploaded and displaying correctly
- [ ] Primary color customized (if requested)
- [ ] Business name displays in chat header

### Testing
- [ ] Subdomain resolves: `dig {tenant}.muva.chat`
- [ ] Chat page loads: `https://{tenant}.muva.chat/chat`
- [ ] Admin panel accessible: `https://{tenant}.muva.chat/admin`
- [ ] Chat responds correctly to questions
- [ ] Response time < 2s
- [ ] Tenant isolation verified (no cross-tenant data)

### Security
- [ ] RLS policies active on `tenant_knowledge_embeddings`
- [ ] Admin access restricted to authorized users
- [ ] No data leaks between tenants

### Documentation
- [ ] Tenant details added to internal wiki
- [ ] Client notified of subdomain URL
- [ ] Admin credentials shared securely
- [ ] Onboarding complete email sent

---

## Support & Escalation

### For Technical Issues
- **Slack:** #innpilot-tech-support
- **Email:** dev@muva.chat
- **On-call:** PagerDuty rotation

### For Business Issues
- **Slack:** #innpilot-client-success
- **Email:** support@muva.chat

### Emergency (Production Down)
1. Check status page: https://status.muva.chat
2. Escalate to on-call engineer via PagerDuty
3. Post in #incidents Slack channel

---

**Last Updated:** October 2025
**Maintained by:** MUVA Platform Team
**Version:** 1.0
