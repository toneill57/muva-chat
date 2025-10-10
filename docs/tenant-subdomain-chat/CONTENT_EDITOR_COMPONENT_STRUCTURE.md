# Content Editor Component Structure

## Component Hierarchy

```
src/app/[tenant]/admin/content/page.tsx (Server Component)
│
├── Page Header
│   ├── Title: "Landing Page Content"
│   └── Description with subdomain
│
├── Info Banner (Blue)
│   └── Quick tip about saving changes
│
├── ContentEditor Component (Client Component)
│   │
│   ├── Save Status Alerts
│   │   ├── Success Alert (Green) - Auto-dismiss 3s
│   │   └── Error Alert (Red)
│   │
│   ├── Tabs Container
│   │   ├── TabsList (4 tabs)
│   │   │   ├── Hero Tab
│   │   │   ├── About Tab
│   │   │   ├── Services Tab
│   │   │   └── Contact Tab
│   │   │
│   │   ├── Hero TabsContent
│   │   │   ├── Hero Title Input (required)
│   │   │   ├── Subtitle Input
│   │   │   └── CTA Group (2-column grid)
│   │   │       ├── CTA Text Input
│   │   │       └── CTA Link Input (type=url)
│   │   │
│   │   ├── About TabsContent
│   │   │   ├── About Title Input (required)
│   │   │   └── TipTap Editor
│   │   │       ├── Toolbar
│   │   │       │   ├── Bold Button (B icon)
│   │   │       │   ├── Italic Button (I icon)
│   │   │       │   ├── Bullet List Button
│   │   │       │   └── Ordered List Button
│   │   │       └── EditorContent (min-height 200px)
│   │   │
│   │   ├── Services TabsContent
│   │   │   ├── Info Banner (Phase 2 notice)
│   │   │   ├── Services Title Input
│   │   │   └── Placeholder (dashed border)
│   │   │
│   │   └── Contact TabsContent
│   │       ├── Contact Title Input (required)
│   │       ├── Email Input (type=email, required)
│   │       ├── Phone Input (type=tel)
│   │       └── Address Input
│   │
│   └── Save Button (bottom border-top)
│       └── Loading state with spinner
│
└── Content Guidelines Section
    ├── Section Title: "Content Best Practices"
    └── 4-Card Grid (responsive)
        ├── Hero Section Guidelines
        ├── About Section Guidelines
        ├── Contact Section Guidelines
        └── SEO Tips
```

## Data Flow

### 1. Component Mount
```typescript
useEffect(() => {
  // Fetch content from API
  GET /api/admin/content?tenant_id={tenantId}

  // If 200 OK:
  setContent(data.content)
  editor.commands.setContent(data.content.about.content)

  // If 404:
  // Use DEFAULT_CONTENT (no error shown)

  // If error:
  // Log error, use DEFAULT_CONTENT
}, [tenantId])
```

### 2. User Edits Content
```typescript
// Hero/Contact sections:
<Input onChange={(e) =>
  setContent(prev => ({
    ...prev,
    hero: { ...prev.hero, title: e.target.value }
  }))
} />

// About section (TipTap):
editor.onUpdate(() => {
  setContent(prev => ({
    ...prev,
    about: { ...prev.about, content: editor.getHTML() }
  }))
})
```

### 3. User Saves
```typescript
handleSave = async () => {
  setIsSaving(true)

  // Send to API
  PUT /api/admin/content
  Body: { tenant_id, content }

  // If success:
  setSaveStatus('success')
  setTimeout(() => setSaveStatus('idle'), 3000)

  // If error:
  setSaveStatus('error')
  setErrorMessage(error.message)

  setIsSaving(false)
}
```

## State Management

### Content State
```typescript
interface LandingPageContent {
  hero: {
    title: string;        // "Welcome to Our Hotel"
    subtitle: string;     // "Experience comfort..."
    cta_text: string;     // "Book Now"
    cta_link: string;     // "/book"
  };
  about: {
    title: string;        // "About Us"
    content: string;      // "<p>HTML content...</p>"
  };
  services: {
    title: string;        // "Our Services"
    items: Array<{        // [] (Phase 2)
      title: string;
      description: string;
    }>;
  };
  contact: {
    title: string;        // "Get in Touch"
    email: string;        // "info@hotel.com"
    phone: string;        // "+1 234 567 8900"
    address: string;      // "123 Main St..."
  };
}
```

### UI State
```typescript
const [content, setContent] = useState<LandingPageContent>(DEFAULT_CONTENT)
const [isLoading, setIsLoading] = useState(true)
const [isSaving, setIsSaving] = useState(false)
const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
const [errorMessage, setErrorMessage] = useState('')
```

### TipTap Editor State
```typescript
const editor = useEditor({
  extensions: [StarterKit],
  content: content.about.content,
  onUpdate: ({ editor }) => {
    // Update content state
    setContent(prev => ({
      ...prev,
      about: { ...prev.about, content: editor.getHTML() }
    }))
  }
})
```

## Styling Classes

### Layout
```css
/* Container */
.max-w-7xl.mx-auto.space-y-6

/* Tabs */
.grid.grid-cols-4 /* TabsList */
.space-y-4.mt-6   /* TabsContent */

/* Inputs */
.mt-1.5 /* Label spacing */
.grid.grid-cols-1.md:grid-cols-2.gap-4 /* CTA inputs */
```

### TipTap Editor
```css
/* Editor wrapper */
.prose.prose-sm.max-w-none.min-h-[200px]
.px-3.py-2.border.border-input.rounded-md
.focus:outline-none.focus:ring-1.focus:ring-ring

/* Toolbar */
.flex.items-center.gap-1.p-2
.border.border-input.rounded-md.bg-gray-50

/* Toolbar buttons */
.bg-gray-200 /* Active state */
```

### Alerts
```css
/* Success */
.bg-green-50.border-green-200.text-green-800

/* Error */
.bg-red-50.border-red-200.text-red-800

/* Info */
.bg-blue-50.border-blue-200.text-blue-800
```

## TipTap Editor Configuration

### Extensions
```typescript
extensions: [StarterKit]
```

**StarterKit includes:**
- Bold (Cmd+B / Ctrl+B)
- Italic (Cmd+I / Ctrl+I)
- BulletList (toolbar button)
- OrderedList (toolbar button)
- Paragraph
- Heading (not exposed in UI yet)
- Blockquote (not exposed in UI yet)
- Code (not exposed in UI yet)
- HardBreak
- History (undo/redo with Cmd+Z)

### Toolbar Commands
```typescript
// Bold
editor.chain().focus().toggleBold().run()

// Italic
editor.chain().focus().toggleItalic().run()

// Bullet List
editor.chain().focus().toggleBulletList().run()

// Ordered List
editor.chain().focus().toggleOrderedList().run()
```

### Active State Check
```typescript
editor.isActive('bold')      // true if selection is bold
editor.isActive('italic')    // true if selection is italic
editor.isActive('bulletList') // true if in bullet list
```

## Accessibility Features

### ARIA Labels
```typescript
// All inputs have labels
<Label htmlFor="hero-title">Hero Title</Label>
<Input id="hero-title" ... />

// Toolbar buttons
<Button aria-label="Toggle bold">
  <Bold className="h-4 w-4" />
</Button>
```

### Keyboard Navigation
- **Tab**: Move between inputs
- **Shift+Tab**: Move backwards
- **Arrow keys**: Navigate tabs (Radix UI built-in)
- **Enter**: Submit form (browser default)
- **Cmd/Ctrl+B**: Toggle bold in editor
- **Cmd/Ctrl+I**: Toggle italic in editor
- **Cmd/Ctrl+Z**: Undo in editor

### Focus Management
- All interactive elements have visible focus rings
- Focus order follows visual layout
- Tab trap within modal/dialog (if added)

### Screen Reader Support
- Semantic HTML (`<nav>`, `<main>`, `<label>`)
- Role="alert" on Alert components
- Descriptive button labels
- Form validation messages

## Performance Optimizations

### 1. Editor Initialization
- Editor only initialized once on mount
- Content updates don't recreate editor instance

### 2. State Updates
- Minimal re-renders (only affected sections)
- Editor content updated via imperative API

### 3. API Calls
- Single fetch on mount
- No polling or real-time sync (yet)
- Debouncing handled by TipTap internally

### 4. Bundle Size
- TipTap: ~50 KB gzipped
- Total page bundle: 117 KB
- Code splitting by route (Next.js automatic)

## File Locations

```
src/
├── app/
│   └── [tenant]/
│       └── admin/
│           └── content/
│               └── page.tsx ...................... Server component (tenant fetch)
│
├── components/
│   ├── admin/
│   │   └── ContentEditor.tsx .................... Client component (editor logic)
│   └── ui/
│       ├── tabs.tsx ............................. Radix UI Tabs
│       ├── input.tsx ............................ Input component
│       ├── label.tsx ............................ Label component
│       ├── button.tsx ........................... Button component
│       └── alert.tsx ............................ Alert component
│
└── app/
    └── globals.css .............................. TipTap styles added
```

## API Contract

### GET /api/admin/content
**Request:**
```
GET /api/admin/content?tenant_id=uuid-here
```

**Response (200):**
```json
{
  "content": {
    "hero": { "title": "...", "subtitle": "...", "cta_text": "...", "cta_link": "..." },
    "about": { "title": "...", "content": "<p>...</p>" },
    "services": { "title": "...", "items": [] },
    "contact": { "title": "...", "email": "...", "phone": "...", "address": "..." }
  }
}
```

**Response (404):**
```json
{
  "error": "Content not found"
}
```

### PUT /api/admin/content
**Request:**
```json
{
  "tenant_id": "uuid-here",
  "content": {
    "hero": { ... },
    "about": { ... },
    "services": { ... },
    "contact": { ... }
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Content saved successfully"
}
```

**Response (400/500):**
```json
{
  "error": "Error message here"
}
```

---

**Last Updated:** October 10, 2025
**Status:** ✅ Implementation Complete
