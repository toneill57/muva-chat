# File Upload API - Quick Reference

**Endpoint:** `/api/admin/upload-docs`
**Version:** 1.0.0
**Last Updated:** October 10, 2025

---

## 🚀 QUICK START

### Basic Upload

```bash
curl -X POST http://localhost:3000/api/admin/upload-docs \
  -F "file=@/path/to/document.md" \
  -F "tenant_id=your-tenant-uuid"
```

### With Real Tenant ID

```bash
# Using a test tenant
curl -X POST http://localhost:3000/api/admin/upload-docs \
  -F "file=@./knowledge-base.md" \
  -F "tenant_id=test-tenant-123"
```

---

## 📋 API SPECIFICATION

### Request

**Method:** `POST`
**Content-Type:** `multipart/form-data`

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | ✅ Yes | Document file (.md, .txt, .pdf) |
| `tenant_id` | string | ✅ Yes | UUID of the tenant |

**Constraints:**
- **File types:** `.md`, `.txt`, `.pdf` only
- **Max size:** 10 MB (10,485,760 bytes)
- **MIME types:** `text/markdown`, `text/plain`, `application/pdf`

### Response (Success)

**Status:** `200 OK`

```json
{
  "success": true,
  "file_id": "test-tenant-123/knowledge-base.md",
  "message": "File uploaded. Processing will start shortly.",
  "metadata": {
    "fileName": "knowledge-base.md",
    "originalName": "knowledge-base.md",
    "fileSize": 1234,
    "fileType": "text/markdown",
    "uploadedAt": "2025-10-10T04:08:16.696Z",
    "tenantId": "test-tenant-123"
  }
}
```

### Response (Error)

**Status:** `400 Bad Request` or `500 Internal Server Error`

```json
{
  "success": false,
  "error": "File too large",
  "message": "Maximum file size is 10MB",
  "fileSize": 10486784,
  "maxSize": 10485760
}
```

---

## 🧪 TESTING EXAMPLES

### 1. Successful Upload (.md)

```bash
# Create test file
cat > test.md << 'EOF'
# Hotel Policies
Check-in: 3 PM
Check-out: 11 AM
EOF

# Upload
curl -X POST http://localhost:3000/api/admin/upload-docs \
  -F "file=@test.md" \
  -F "tenant_id=hotel-xyz" | jq .
```

**Expected:** `"success": true` + file saved to `data/temp/hotel-xyz/test.md`

### 2. Successful Upload (.txt)

```bash
echo "Q: What are your hours?\nA: We're open 24/7" > faq.txt

curl -X POST http://localhost:3000/api/admin/upload-docs \
  -F "file=@faq.txt" \
  -F "tenant_id=hotel-xyz" | jq .
```

### 3. Invalid File Type (.json)

```bash
echo '{"test": true}' > invalid.json

curl -X POST http://localhost:3000/api/admin/upload-docs \
  -F "file=@invalid.json" \
  -F "tenant_id=hotel-xyz" | jq .
```

**Expected:** `"error": "Invalid file type"`

### 4. File Too Large

```bash
# Create 11 MB file
dd if=/dev/zero of=large.txt bs=1M count=11 2>/dev/null

curl -X POST http://localhost:3000/api/admin/upload-docs \
  -F "file=@large.txt" \
  -F "tenant_id=hotel-xyz" | jq .

# Clean up
rm large.txt
```

**Expected:** `"error": "File too large"`

### 5. Missing Parameters

```bash
# Missing file
curl -X POST http://localhost:3000/api/admin/upload-docs \
  -F "tenant_id=hotel-xyz" | jq .

# Missing tenant_id
curl -X POST http://localhost:3000/api/admin/upload-docs \
  -F "file=@test.md" | jq .
```

**Expected:** `"error": "No file provided"` or `"error": "No tenant_id provided"`

### 6. Get API Documentation

```bash
curl http://localhost:3000/api/admin/upload-docs | jq .
```

**Expected:** Full API specification (JSON)

---

## 📁 FILE LOCATIONS

### Upload Directory Structure

```
data/temp/
├── tenant-uuid-1/
│   ├── document1.md
│   ├── policies.txt
│   └── guide.pdf
├── tenant-uuid-2/
│   └── faq.md
└── tenant-uuid-3/
    ├── about.md
    └── services.txt
```

**Path Pattern:** `data/temp/{tenant_id}/{filename}`

**File ID Format:** `{tenant_id}/{filename}`

### Filename Sanitization

**Input:** `"My Document (v2.1) - FINAL!.md"`
**Output:** `"My_Document__v2.1__-_FINAL_.md"`

**Rules:**
- Alphanumeric characters: Preserved
- Dots (`.`): Preserved
- Hyphens (`-`): Preserved
- Underscores (`_`): Preserved
- All other characters: Replaced with `_`

---

## 🔍 TROUBLESHOOTING

### Error: "No file provided"

**Cause:** Missing `file` field in form data

**Fix:**
```bash
# ❌ Wrong
curl -X POST http://localhost:3000/api/admin/upload-docs \
  -F "tenant_id=test"

# ✅ Correct
curl -X POST http://localhost:3000/api/admin/upload-docs \
  -F "file=@document.md" \
  -F "tenant_id=test"
```

### Error: "Invalid file type"

**Cause:** File extension not in whitelist

**Fix:** Only use `.md`, `.txt`, or `.pdf` files
```bash
# ❌ Wrong
-F "file=@document.docx"

# ✅ Correct
-F "file=@document.md"
```

### Error: "File too large"

**Cause:** File exceeds 10 MB limit

**Fix:** Split large documents or compress
```bash
# Check file size
ls -lh document.pdf

# If > 10MB, split into smaller files
split -b 5M document.md document_part_
```

### Error: "No tenant_id provided"

**Cause:** Missing `tenant_id` field

**Fix:**
```bash
# ✅ Add tenant_id
-F "tenant_id=your-tenant-uuid"
```

### File Not Found After Upload

**Cause:** Check directory path

**Debug:**
```bash
# List uploaded files
ls -la data/temp/

# Check specific tenant
ls -la data/temp/your-tenant-uuid/

# Verify file content
cat data/temp/your-tenant-uuid/document.md
```

---

## 🔒 SECURITY NOTES

### Current Implementation

1. **File Type Whitelist:** Only .md, .txt, .pdf allowed
2. **Size Limit:** 10 MB max
3. **Filename Sanitization:** Special characters removed
4. **MIME Type Logging:** Suspicious types logged

### TODO: Auth (Not Yet Implemented)

```bash
# Future: Include auth token
curl -X POST http://localhost:3000/api/admin/upload-docs \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@document.md" \
  -F "tenant_id=test"
```

**Note:** Auth verification is a placeholder in current version (v1.0.0)

---

## 📊 PERFORMANCE

### Typical Upload Times

| File Size | Upload Time | Notes |
|-----------|-------------|-------|
| < 1 KB | < 50ms | Very small files |
| 100 KB | < 100ms | Medium documents |
| 1 MB | < 200ms | Large documents |
| 10 MB | < 500ms | Maximum allowed |

**Network:** Localhost (add latency for remote)

### Optimization Tips

1. **Batch Uploads:** Upload multiple files sequentially
2. **Compression:** Use .md instead of .pdf when possible
3. **Chunking:** Split very large docs into smaller files
4. **Async:** Don't wait for processing (happens later)

---

## 🛠️ INTEGRATION EXAMPLES

### JavaScript/TypeScript (Fetch API)

```typescript
async function uploadDocument(file: File, tenantId: string) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('tenant_id', tenantId)

  const response = await fetch('/api/admin/upload-docs', {
    method: 'POST',
    body: formData
  })

  const result = await response.json()

  if (!result.success) {
    throw new Error(result.message)
  }

  return result.file_id
}

// Usage
const file = document.querySelector('input[type="file"]').files[0]
const fileId = await uploadDocument(file, 'tenant-uuid-here')
console.log('Uploaded:', fileId)
```

### React Component

```tsx
import { useState } from 'react'

function FileUploader({ tenantId }: { tenantId: string }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('tenant_id', tenantId)

    try {
      const res = await fetch('/api/admin/upload-docs', {
        method: 'POST',
        body: formData
      })

      const data = await res.json()

      if (!data.success) {
        setError(data.message)
        return
      }

      alert(`Uploaded: ${data.file_id}`)
    } catch (err) {
      setError('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <input type="file" onChange={handleUpload} disabled={uploading} />
      {uploading && <p>Uploading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  )
}
```

### Python (Requests)

```python
import requests

def upload_document(file_path: str, tenant_id: str) -> dict:
    url = 'http://localhost:3000/api/admin/upload-docs'

    with open(file_path, 'rb') as f:
        files = {'file': f}
        data = {'tenant_id': tenant_id}

        response = requests.post(url, files=files, data=data)
        return response.json()

# Usage
result = upload_document('knowledge-base.md', 'tenant-uuid-here')
print(f"File ID: {result['file_id']}")
```

---

## 📝 CHANGELOG

### Version 1.0.0 (October 10, 2025)

**Initial Release:**
- ✅ POST endpoint for file uploads
- ✅ File type validation (.md, .txt, .pdf)
- ✅ File size validation (max 10MB)
- ✅ Filename sanitization
- ✅ Error handling (400, 500)
- ✅ GET endpoint for API docs
- ✅ Comprehensive logging

**TODO for v1.1:**
- [ ] Auth verification (JWT tokens)
- [ ] Rate limiting
- [ ] Progress tracking
- [ ] Duplicate file detection

---

## 🔗 RELATED DOCUMENTATION

- **Completion Report:** `TASK_4.3_FILE_UPLOAD_API_COMPLETION_REPORT.md`
- **Project Plan:** `plan.md` (FASE 4D.2, line 336)
- **TODO:** `TODO.md` (FASE 4D.2)

---

**Questions?** Check the completion report or API documentation endpoint (`GET /api/admin/upload-docs`)
