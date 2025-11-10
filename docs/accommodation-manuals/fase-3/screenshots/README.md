# Manual Screenshots Guide

This directory contains visual testing screenshots for the Accommodation Manuals feature.

## How to Take Screenshots

### Preparation

1. Start staging server:
```bash
pnpm run dev:staging
```

2. Navigate to:
```
http://simmerdown.localhost:3001/accommodations/units
```

3. Authenticate as staff (if needed)

---

## Screenshot Checklist

### 01-empty-state.png
**What to capture:** Dropzone in empty state (no manuals)
**Steps:**
1. Ensure no manuals exist for this unit
2. Capture the entire manuals section showing:
   - Header: "Manuals (0)" with FileText icon
   - Empty dropzone with dashed border
   - Text: "Drag & drop .md file or click to select"
   - Text: "Maximum 10MB"

---

### 02-uploading.png
**What to capture:** Uploading state with progress bar
**Steps:**
1. Select a test .md file (use `/docs/accommodation-manuals/fase-3/test-manual.md`)
2. Immediately after selecting, capture screenshot showing:
   - Loader2 icon spinning
   - Text: "Processing manual..."
   - Progress bar (try to catch it around 40-60%)
   - Percentage text below bar

**Note:** This is time-sensitive - be ready to screenshot quickly!

---

### 03-list-state.png
**What to capture:** Manual list with uploaded file
**Steps:**
1. Wait for upload to complete
2. Capture showing:
   - Header: "Manuals (1)" with Plus icon button
   - Manual item card with:
     - Filename (test-manual.md)
     - Chunk count ("X chunks")
     - Eye icon button (blue)
     - Trash2 icon button (red)
   - Additional dropzone below with text: "Drop .md file or click to add another"

---

### 04-modal-closed.png
**What to capture:** Modal with all accordions collapsed
**Steps:**
1. Click Eye icon on a manual
2. Wait for modal to open and chunks to load
3. Ensure all accordions are closed (default state)
4. Capture showing:
   - Dark backdrop (30% opacity)
   - Modal panel centered
   - Header: "Manual Content" with X button
   - All chunk accordions closed (ChevronDown icons pointing down)

---

### 05-modal-open.png
**What to capture:** Modal with first accordion expanded
**Steps:**
1. With modal open, click on first chunk accordion
2. Wait for accordion to expand
3. Capture showing:
   - First chunk expanded with:
     - ChevronDown rotated 180deg (pointing up)
     - Markdown content rendered
     - Headers, lists, formatting visible
   - Other chunks still collapsed

---

### 06-after-delete.png
**What to capture:** Manual list after deleting a manual
**Steps:**
1. Close modal (click X or press ESC)
2. Click Trash2 icon on a manual
3. Click "OK" on confirmation dialog
4. Wait for manual to be deleted
5. Capture showing:
   - Manual removed from list
   - If last manual: Empty state returns
   - If other manuals exist: Remaining manuals visible

---

### 07-mobile.png
**What to capture:** Mobile responsive view (375px width)
**Steps:**
1. Open Chrome DevTools (F12)
2. Toggle device toolbar (Cmd+Shift+M or Ctrl+Shift+M)
3. Select "iPhone 15 Pro" or set custom width to 375px
4. Refresh page to ensure proper responsive rendering
5. Capture showing:
   - Entire page layout at mobile width
   - Manual list items stacked vertically
   - Touch targets clearly visible
   - No horizontal overflow

**Note:** Take screenshot of both empty state and list state if possible.

---

### 08-desktop.png
**What to capture:** Desktop responsive view (1440px width)
**Steps:**
1. Exit device toolbar (back to desktop view)
2. Set browser window width to ~1440px
3. Refresh page to ensure proper rendering
4. Capture showing:
   - Entire page layout at desktop width
   - Adequate whitespace around elements
   - Hover states visible (hover over manual item or button)

---

## Screenshot Specifications

### Format
- File type: PNG
- Color space: sRGB
- Resolution: Actual screen resolution (1x or 2x)

### Framing
- Include relevant context (parent containers)
- Don't capture entire browser chrome (just the content area)
- Ensure component is fully visible (no cut-off edges)

### Tools
- macOS: Cmd+Shift+4, then Space, then click window
- Windows: Snipping Tool or Snip & Sketch
- Chrome DevTools: Cmd+Shift+P → "Capture screenshot"

---

## Automated Screenshot Script

For automation, you can use Playwright:

```bash
# Install Playwright (if not already installed)
pnpm add -D @playwright/test

# Run screenshot script
pnpm dlx playwright test screenshots.spec.ts
```

See `screenshots.spec.ts` in this directory for the automation script.

---

## Verification

After taking screenshots, verify:
- [ ] All 8 screenshots captured
- [ ] Filenames match exactly (01-empty-state.png, etc.)
- [ ] Images are clear and readable
- [ ] UI elements are fully visible
- [ ] No sensitive data visible (tokens, passwords, etc.)

---

**Last Updated:** 2025-11-09
