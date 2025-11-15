# TenantChatPage - Testing Guide

## Test Scenarios

### 1. Simmer Down (Blue Theme)

```typescript
<TenantChatPage
  subdomain="simmerdown"
  tenant={{
    tenant_id: "b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf",
    business_name: "Simmer Down Guest House",
    logo_url: "https://simmerdown.house/wp-content/uploads/2021/10/fav-icon-logo.png",
    primary_color: "#3B82F6" // Blue
  }}
/>
```

**Expected:**
- ✅ Header gradient: Blue (#3B82F6) → Lighter blue
- ✅ Logo: Simmer Down favicon
- ✅ Title: "Simmer Down Guest House Chat"
- ✅ Send button: Same blue gradient
- ✅ No "DEV" badge visible

### 2. Test Tenant (Green Theme)

```typescript
<TenantChatPage
  subdomain="test-hotel"
  tenant={{
    tenant_id: "00000000-0000-0000-0000-000000000000",
    business_name: "Test Hotel & Spa",
    logo_url: null, // No logo (fallback to Bot icon)
    primary_color: "#10B981" // Green
  }}
/>
```

**Expected:**
- ✅ Header gradient: Green (#10B981) → Lighter green
- ✅ Logo: Bot icon (fallback)
- ✅ Title: "Test Hotel & Spa Chat"
- ✅ Send button: Same green gradient
- ✅ No "DEV" badge visible

### 3. Red Theme Test

```typescript
<TenantChatPage
  subdomain="luxe-resort"
  tenant={{
    tenant_id: "11111111-1111-1111-1111-111111111111",
    business_name: "Luxe Resort",
    logo_url: "https://example.com/logo.png",
    primary_color: "#EF4444" // Red
  }}
/>
```

**Expected:**
- ✅ Header gradient: Red (#EF4444) → Lighter red
- ✅ Logo: Custom logo URL
- ✅ Title: "Luxe Resort Chat"
- ✅ Send button: Same red gradient

### 4. Purple Theme Test

```typescript
<TenantChatPage
  subdomain="boutique-inn"
  tenant={{
    tenant_id: "22222222-2222-2222-2222-222222222222",
    business_name: "Boutique Inn",
    logo_url: "https://example.com/boutique-logo.png",
    primary_color: "#8B5CF6" // Purple
  }}
/>
```

**Expected:**
- ✅ Header gradient: Purple (#8B5CF6) → Lighter purple
- ✅ Logo: Custom logo URL
- ✅ Title: "Boutique Inn Chat"
- ✅ Send button: Same purple gradient

## Visual Checks

### Header (TenantHeader Component)
- [ ] Logo displays correctly (or Bot icon if null)
- [ ] Business name is visible and readable
- [ ] Gradient uses tenant's primary_color
- [ ] New conversation button (RotateCcw icon) works
- [ ] No "DEV" badge present
- [ ] Header respects safe area insets (iPhone notch)

### Chat Interface
- [ ] Welcome message displays correctly
- [ ] Messages scroll smoothly
- [ ] User messages (blue bubbles) on right
- [ ] Assistant messages (white bubbles) on left
- [ ] Suggestions buttons use teal color (not tenant color)
- [ ] Photo carousel displays if sources present
- [ ] Timestamps show in es-CO format

### Input Area
- [ ] Textarea expands with content
- [ ] Send button uses tenant's primary_color gradient
- [ ] Send button disabled when empty
- [ ] Enter key sends message
- [ ] Shift+Enter creates new line
- [ ] Loading state shows (disabled + bouncing dots)

### Error Handling
- [ ] Error banner displays at bottom
- [ ] Retry button works
- [ ] Close button (✕) dismisses error

## Functional Tests

### 1. New Conversation
```typescript
// Click "New Conversation" button
// Expected:
// - localStorage cleared (dev_chat_session_id)
// - Messages reset to welcome message only
// - sessionId set to null
// - Error cleared
```

### 2. Send Message
```typescript
// Type "Hello" and click send
// Expected:
// - User message added immediately
// - Assistant message with loading dots appears
// - Stream starts, content fills in
// - session_id saved to localStorage
// - Scroll to bottom automatically
```

### 3. Suggestions
```typescript
// Click a suggestion button
// Expected:
// - Text populates input field
// - Input focused
// - Ready to send or edit
```

### 4. Touch Interactions (Mobile)
```typescript
// Pull down from top when at scroll top
// Expected:
// - "↓ Ir al inicio" indicator shows
// - Smooth scroll to top on release
```

## Accessibility Tests

### Keyboard Navigation
- [ ] Tab to textarea
- [ ] Tab to send button
- [ ] Tab to new conversation button
- [ ] Enter sends message
- [ ] Shift+Enter adds line break
- [ ] Escape closes error (if implemented)

### ARIA Labels
- [ ] Textarea: `aria-label="Message input"`
- [ ] Send button: `aria-label="Send message"`
- [ ] New conversation: `aria-label="Start new conversation"`
- [ ] Messages container: `role="log" aria-live="polite"`
- [ ] Main container: `role="main"`

### Screen Reader
- [ ] Business name announced in header
- [ ] Messages announced as they arrive
- [ ] Suggestions buttons have descriptive labels
- [ ] Error messages announced

## Performance Tests

### 1. Initial Load
```bash
# Chrome DevTools → Lighthouse → Mobile
# Target scores:
# - Performance: ≥ 90
# - Accessibility: 100
# - Best Practices: ≥ 90
# - SEO: 100
```

### 2. Streaming Performance
- [ ] No lag during stream
- [ ] Smooth scroll to bottom
- [ ] No layout shifts
- [ ] 60fps maintained

### 3. Image Loading
- [ ] Photos lazy-load correctly
- [ ] Carousel transitions smooth
- [ ] No layout shifts when images load

## Responsive Tests

### iPhone 15 Pro Max (430px)
- [ ] Header fits without truncation
- [ ] Messages readable (max-w-[85%])
- [ ] Input area respects safe area bottom
- [ ] Touch targets ≥ 44px × 44px

### iPhone SE (375px)
- [ ] Header fits
- [ ] Messages readable
- [ ] Input area fits
- [ ] Touch targets adequate

### Pixel 8 (412px)
- [ ] Same checks as iPhone

### iPad (768px)
- [ ] Layout still mobile-first
- [ ] Messages not too wide
- [ ] Input area centered

## Integration Tests

### 1. With Real Tenant Data
```typescript
// Fetch tenant from database
const tenant = await getTenantBySubdomain('simmerdown')

// Render TenantChatPage
<TenantChatPage
  subdomain="simmerdown"
  tenant={{
    tenant_id: tenant.id,
    business_name: tenant.business_name,
    logo_url: tenant.logo_url,
    primary_color: tenant.primary_color
  }}
/>

// Expected:
// - All data loads correctly
// - Chat uses correct tenant_id in API calls
// - Branding matches tenant settings
```

### 2. With Missing Logo
```typescript
// Test with null logo_url
<TenantChatPage
  subdomain="test"
  tenant={{
    ...tenant,
    logo_url: null
  }}
/>

// Expected:
// - Bot icon fallback displays
// - No broken image icon
// - No console errors
```

### 3. With Invalid Hex Color
```typescript
// Test with invalid primary_color
<TenantChatPage
  subdomain="test"
  tenant={{
    ...tenant,
    primary_color: "invalid-color"
  }}
/>

// Expected:
// - adjustColor() handles gracefully
// - Fallback to default color (or black)
// - No console errors
```

## Edge Cases

### 1. Very Long Business Name
```typescript
tenant.business_name = "The Very Long Name Hotel & Resort Spa and Conference Center"
// Expected: Truncates with ellipsis, no overflow
```

### 2. Very Light Primary Color
```typescript
tenant.primary_color = "#F0F0F0" // Almost white
// Expected: Text still readable (white text on light bg)
// Consider: Dark text if color is too light
```

### 3. Very Dark Primary Color
```typescript
tenant.primary_color = "#1A1A1A" // Almost black
// Expected: Gradient still visible, button accessible
```

### 4. Rapid Message Sending
```typescript
// Send 10 messages rapidly
// Expected:
// - All messages queue correctly
// - No race conditions
// - session_id persists across messages
```

## Comparison vs DevChatMobileDev

### Side-by-Side Test
```typescript
// Open DevChatMobileDev in one tab
// Open TenantChatPage (Simmer Down) in another

// Expected differences:
// 1. Header: DevChatMobileDev has "DEV" badge
// 2. Color: DevChatMobileDev uses teal-cyan
// 3. Logo: DevChatMobileDev uses Bot icon
// 4. Title: DevChatMobileDev says "Simmer Down Chat" (hardcoded)

// Expected similarities:
// 1. Chat functionality identical
// 2. Message bubbles same style
// 3. Suggestions same behavior
// 4. Input area same layout
```

## Automated Tests (Suggested)

```typescript
// cypress/e2e/tenant-chat-page.cy.ts

describe('TenantChatPage', () => {
  it('renders with tenant branding', () => {
    cy.mount(<TenantChatPage subdomain="simmerdown" tenant={simmerDownTenant} />)
    cy.get('header').should('contain', 'Simmer Down Guest House Chat')
    cy.get('header img').should('have.attr', 'alt', 'Simmer Down Guest House')
  })

  it('sends message successfully', () => {
    cy.mount(<TenantChatPage subdomain="simmerdown" tenant={simmerDownTenant} />)
    cy.get('textarea').type('Hello{enter}')
    cy.get('[role="log"]').should('contain', 'Hello')
  })

  it('applies primary color to send button', () => {
    cy.mount(<TenantChatPage subdomain="simmerdown" tenant={simmerDownTenant} />)
    cy.get('button[aria-label="Send message"]')
      .should('have.css', 'background')
      .and('include', 'rgb(59, 130, 246)') // #3B82F6
  })

  it('does not show DEV badge', () => {
    cy.mount(<TenantChatPage subdomain="simmerdown" tenant={simmerDownTenant} />)
    cy.contains('🚧 DEV').should('not.exist')
  })
})
```

## Manual Test Checklist

**Tester:** _____________
**Date:** _____________
**Device:** _____________

### Core Functionality
- [ ] Component renders without errors
- [ ] Props passed correctly
- [ ] tenant_id logs to console
- [ ] Welcome message displays
- [ ] Can send message
- [ ] Receives streamed response
- [ ] session_id saved to localStorage

### Branding
- [ ] Header shows correct business name
- [ ] Logo displays (or Bot fallback)
- [ ] Primary color applied to header gradient
- [ ] Primary color applied to send button
- [ ] No "DEV" badge visible

### Mobile UX
- [ ] Touch targets ≥ 44px
- [ ] Safe areas respected
- [ ] Pull-to-refresh works
- [ ] Scroll smooth
- [ ] Keyboard pushes input up (iOS)

### Accessibility
- [ ] All interactive elements keyboard accessible
- [ ] ARIA labels present
- [ ] Focus states visible
- [ ] Color contrast WCAG AA compliant

### Performance
- [ ] No console errors
- [ ] No console warnings
- [ ] Smooth 60fps animations
- [ ] Quick initial render

---

**Status:** Ready for testing
**Last updated:** 2025-10-11
