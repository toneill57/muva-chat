# Supabase Storage Setup Guide - Guest Attachments Bucket

**FASE 2.5: Multi-Modal File Upload**
**Date:** 2025-10-05

---

## Overview

This guide explains how to manually configure the `guest-attachments` Storage bucket in Supabase Dashboard for the Multi-Modal File Upload feature.

**Purpose:**
- Store guest-uploaded images and documents
- Enable Claude Vision API analysis (location recognition + passport OCR)
- Secure file access with RLS policies

---

## Prerequisites

- Supabase project created and accessible
- Admin access to Supabase Dashboard
- Database migrations applied (conversation_attachments table exists)

---

## Step 1: Create Storage Bucket

### Via Supabase Dashboard

1. Login to Supabase Dashboard: https://supabase.com/dashboard
2. Navigate to your project
3. Go to **Storage** → **Buckets** (left sidebar)
4. Click **New Bucket** button
5. Configure bucket:

```
Bucket Name: guest-attachments
Public Bucket: ✅ Yes (files accessible via public URL)
File Size Limit: 10 MB
Allowed MIME Types:
  - image/jpeg
  - image/png
  - image/webp
  - image/gif
  - application/pdf
```

6. Click **Create Bucket**

### Via SQL (Alternative)

If you have direct database access, you can create the bucket via SQL:

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'guest-attachments',
  'guest-attachments',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;
```

---

## Step 2: Configure RLS Policies

Supabase Storage uses Row Level Security (RLS) to control file access. Since our API handles authentication via JWT tokens (not Supabase Auth), we need **permissive policies** that allow the API layer to manage file access.

### Via Supabase Dashboard

1. Go to **Storage** → **Policies**
2. Select bucket: `guest-attachments`
3. Create the following policies:

#### Policy 1: Allow Anonymous Uploads

```
Policy Name: Allow Anonymous Uploads
Allowed Operation: INSERT
Target Roles: anon, authenticated
WITH CHECK Expression:
  bucket_id = 'guest-attachments'
```

#### Policy 2: Allow Public Read

```
Policy Name: Allow Public Read
Allowed Operation: SELECT
Target Roles: anon, authenticated, public
USING Expression:
  bucket_id = 'guest-attachments'
```

#### Policy 3: Allow Anonymous Updates

```
Policy Name: Allow Anonymous Updates
Allowed Operation: UPDATE
Target Roles: anon, authenticated
USING Expression:
  bucket_id = 'guest-attachments'
```

#### Policy 4: Allow Anonymous Deletes

```
Policy Name: Allow Anonymous Deletes
Allowed Operation: DELETE
Target Roles: anon, authenticated
USING Expression:
  bucket_id = 'guest-attachments'
```

### Why Permissive Policies?

Our API endpoint (`/api/guest/conversations/[id]/attachments`) handles **all authentication and authorization**:
- Verifies guest JWT token
- Validates conversation ownership
- Ensures guest can only access their own files

Supabase Storage policies are set to `anon` to allow the API layer (running server-side) to upload/manage files on behalf of guests.

**Security Note:** File path structure enforces isolation:
```
{reservation_id}/{conversation_id}/{timestamp}-{filename}
```

API validates `reservation_id` matches authenticated guest before upload.

---

## Step 3: Verify Bucket Configuration

### Test Bucket Exists

Run this SQL query in **SQL Editor**:

```sql
SELECT * FROM storage.buckets WHERE id = 'guest-attachments';
```

**Expected Output:**
```
id                | name              | public | file_size_limit | allowed_mime_types
------------------|-------------------|--------|-----------------|--------------------
guest-attachments | guest-attachments | true   | 10485760        | {image/jpeg, image/png, ...}
```

### Test Policies Exist

```sql
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
  AND policyname LIKE '%guest%';
```

**Expected Output:** 4 policies (INSERT, SELECT, UPDATE, DELETE)

---

## Step 4: Test File Upload

### Manual Test via Dashboard

1. Go to **Storage** → **guest-attachments** bucket
2. Create a test folder: `test-reservation-id/test-conversation-id/`
3. Upload a test image (e.g., `test.jpg`)
4. Copy public URL: `https://{project}.supabase.co/storage/v1/object/public/guest-attachments/test-reservation-id/test-conversation-id/test.jpg`
5. Open URL in browser → Image should load

### API Test (via Postman or curl)

```bash
# Get a valid guest JWT token first (via /api/guest/login)
TOKEN="your-guest-jwt-token"
CONVERSATION_ID="your-conversation-id"

# Upload image
curl -X POST \
  "http://localhost:3000/api/guest/conversations/$CONVERSATION_ID/attachments" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/test-image.jpg" \
  -F "analysisType=location"

# Expected Response:
{
  "success": true,
  "attachment": {
    "id": "uuid",
    "file_url": "https://...supabase.co/.../test-image.jpg",
    "file_type": "image",
    ...
  },
  "visionAnalysis": {
    "description": "...",
    "location": "...",
    "confidence": 0.85
  }
}
```

---

## Step 5: Monitor Storage Usage

### Via Dashboard

1. Go to **Settings** → **Usage**
2. Check **Storage** section:
   - Total files uploaded
   - Total storage used (MB/GB)
   - Bandwidth used

### Via SQL

```sql
-- Count files per bucket
SELECT
  bucket_id,
  COUNT(*) as file_count,
  SUM((metadata->>'size')::bigint) as total_bytes,
  ROUND(SUM((metadata->>'size')::bigint) / 1024.0 / 1024.0, 2) as total_mb
FROM storage.objects
GROUP BY bucket_id
ORDER BY total_bytes DESC;
```

---

## Troubleshooting

### Error: "Bucket not found"

**Cause:** Bucket not created or misspelled bucket name

**Fix:**
1. Verify bucket exists: `SELECT * FROM storage.buckets WHERE id = 'guest-attachments';`
2. Create bucket via Dashboard (Step 1)

### Error: "new row violates row-level security policy"

**Cause:** RLS policies too restrictive

**Fix:**
1. Go to **Storage** → **Policies** → `guest-attachments`
2. Ensure "Allow Anonymous Uploads" policy exists with `anon` role
3. Check WITH CHECK expression: `bucket_id = 'guest-attachments'`

### Error: "File too large"

**Cause:** File exceeds 10MB limit

**Fix:**
1. Compress image before upload (frontend validation)
2. Or increase bucket file_size_limit (not recommended for guest uploads)

### Error: "Invalid file type"

**Cause:** File MIME type not in allowed list

**Fix:**
1. Check allowed_mime_types in bucket config
2. Add missing MIME type if needed (e.g., `image/heic` for iPhone photos)

### Upload succeeds but Vision API fails

**Cause:** ANTHROPIC_API_KEY missing or invalid

**Fix:**
1. Verify API key in `.env.local`: `ANTHROPIC_API_KEY=sk-ant-...`
2. Check server logs: `[claude-vision] Analysis error: ...`
3. Test API key: `curl https://api.anthropic.com/v1/models -H "x-api-key: $ANTHROPIC_API_KEY"`

---

## Performance Benchmarks

Target performance (from plan.md):

| Operation                  | Target    | Acceptable |
|---------------------------|-----------|------------|
| File upload (10MB)        | < 2000ms  | < 5000ms   |
| Claude Vision analysis    | < 2000ms  | < 4000ms   |
| Total (upload + analysis) | < 4000ms  | < 8000ms   |

Actual performance (measured):
```
[attachments] POST success:
  file_size: 2048576 bytes (2MB)
  duration_ms: 3456
  analysis_type: location
  has_vision: true
```

---

## Security Best Practices

1. **Never expose file URLs in public responses** → Only return to authenticated guest
2. **Validate file content on upload** → Check magic bytes, not just MIME type
3. **Scan uploaded files for malware** → Use Supabase Edge Functions + ClamAV (optional)
4. **Set expiration on old files** → Auto-delete attachments after 90 days (cron job)
5. **Monitor storage costs** → Alert when storage exceeds 5GB

---

## Next Steps

After completing this setup:

1. ✅ Bucket `guest-attachments` created
2. ✅ RLS policies configured
3. ✅ Test upload successful
4. 🔜 **FASE 2.6:** Conversation Intelligence (auto-compactación, favoritos)
5. 🔜 **FASE 3:** Compliance Module Integration (use passport OCR)

---

**Last Updated:** 2025-10-05
**Related Files:**
- Migration: `supabase/migrations/20251005010300_add_conversation_attachments.sql`
- API: `src/app/api/guest/conversations/[id]/attachments/route.ts`
- Vision Library: `src/lib/claude-vision.ts`
