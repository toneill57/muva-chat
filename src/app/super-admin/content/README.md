# Super Admin - Content Management

Content upload and management interface for MUVA tourism listings.

## Features

- **Drag & Drop Upload**: Drop multiple .md files to upload
- **Category Selection**: Assign content to categories (actividades, accommodations, restaurants, etc.)
- **Batch Processing**: Upload multiple files sequentially
- **Progress Tracking**: Real-time progress for each file (pending → uploading → processing → completed/error)
- **Content Library**: Browse, search, filter, and delete existing content
- **Statistics**: View content counts by category

## Components

### `ContentUploader.tsx`
Drag & drop upload component with:
- File validation (.md only)
- Category selector
- Individual file progress tracking
- Batch upload support
- Error handling per file

### `ContentTable.tsx`
Content management table with:
- Search by filename/title
- Filter by category
- Pagination (50 items per page)
- Delete with confirmation
- Embeddings count display
- Created date formatting

### `page.tsx`
Main page integrating:
- Stats cards (total, by category)
- Upload section
- Content table

## APIs Required

These APIs are being created in parallel by the backend agent:

- `POST /api/super-admin/content/upload` - Upload and process .md file
- `GET /api/super-admin/content/list` - List content with filters
- `GET /api/super-admin/content/stats` - Get content statistics
- `DELETE /api/super-admin/content/delete` - Delete content by ID

## Usage

1. Navigate to `/super-admin/content`
2. Select a category from the dropdown
3. Drag & drop .md files or click to browse
4. Click "Upload All" to process files
5. View progress and status for each file
6. Browse existing content in the table below
7. Use filters/search to find specific content
8. Delete content with the trash icon (requires confirmation)

## Technical Details

- **File Types**: Only .md (Markdown) files accepted
- **Upload Flow**:
  - 0-30%: Uploading file to server
  - 30-60%: Processing (embedding generation)
  - 60-100%: Completed
- **Batch Processing**: Sequential upload (not parallel) to avoid rate limits
- **Error Handling**: Individual file errors don't block batch upload
- **Responsive**: Mobile, tablet, desktop layouts
- **Dark Mode**: Full support

## Dependencies

- `react-dropzone`: Drag & drop functionality
- `date-fns`: Date formatting
- `shadcn/ui`: UI components (Progress, AlertDialog, etc.)
