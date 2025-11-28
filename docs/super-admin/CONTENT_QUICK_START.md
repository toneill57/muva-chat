# Content Management - Quick Start Guide

**Created:** November 26, 2025
**Status:** Frontend Complete - Awaiting Backend APIs

---

## Access

**URL:** http://localhost:3000/super-admin/content

**Requirements:**
- Super Admin authentication (localStorage token)
- Backend APIs must be deployed

---

## User Actions

### Upload Content

1. **Select Category**
   - Choose from dropdown: actividades, accommodations, restaurants, rentals, spots, culture

2. **Add Files**
   - Drag & drop .md files onto the zone
   - OR click to browse and select files
   - Multiple files supported

3. **Review Files**
   - See filename, size, status
   - Remove individual files (X button)
   - Clear all files

4. **Upload**
   - Click "Upload All (N)" button
   - Watch progress bars
   - See completion status

### Manage Content

1. **Browse**
   - View paginated table (50 items/page)
   - See filename, category, title, embeddings count, created date

2. **Search**
   - Type in search box
   - Searches filename and title

3. **Filter**
   - Select category from dropdown
   - Choose "All Categories" to see all

4. **Delete**
   - Click trash icon
   - Confirm in dialog
   - Content removed

---

## Developer Notes

### File Locations

```
src/components/SuperAdmin/
├── ContentUploader.tsx    # Upload UI
└── ContentTable.tsx       # Table UI

src/app/super-admin/content/
└── page.tsx               # Main page

src/types/super-admin.ts   # TypeScript types
```

### API Endpoints (Backend)

```typescript
// Upload
POST /api/super-admin/content/upload
Body: FormData { file, category }
Response: { success, embeddings, error? }

// List
GET /api/super-admin/content/list?page=1&limit=50&category=actividades&search=hotel
Response: { content: ContentItem[], totalPages }

// Stats
GET /api/super-admin/content/stats
Response: { total, byCategory: { ... } }

// Delete
DELETE /api/super-admin/content/delete?id=uuid
Response: { success }
```

### Types

```typescript
interface ContentItem {
  id: string;
  title: string;
  category: string;
  metadata: { filename?: string };
  embeddings_1024?: number[];
  created_at: string;
}

type FileStatus = 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
```

### Dependencies

```bash
# Already installed
pnpm add react-dropzone date-fns
```

### Testing Locally

```bash
# Start dev server
pnpm dev

# Navigate to
http://localhost:3000/super-admin/content

# Test upload with existing .md files
_assets/muva/listings/actividades/*.md
```

---

## Troubleshooting

### Upload Fails
- Check backend APIs are running
- Verify file is valid .md
- Check browser console for errors
- Check server logs

### Table Empty
- Check `/api/super-admin/content/list` response
- Verify database has content
- Check network tab for API errors

### Auth Errors
- Verify super admin token in localStorage
- Check `/super-admin/layout.tsx` auth logic
- Re-login at `/sign-in`

---

## Next Steps

1. Backend agent creates API endpoints
2. Test upload with real .md files
3. Verify embeddings generation
4. Test pagination with 50+ items
5. Test delete functionality
6. Verify stats accuracy

---

**Ready for backend integration!**
