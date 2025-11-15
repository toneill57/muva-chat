# Staff Chat Architecture

**Last Updated:** October 2025
**Feature:** Dual-Authentication Chat Route

---

## Overview

El Staff Chat permite que el personal del hotel (CEO, Admin, Staff) acceda a una interfaz de chat completa con historial de conversaciones, búsqueda en la knowledge base, y gestión de reservaciones, todo desde una URL compartida con el chat público pero con autenticación dual.

---

## URL Strategy: Dual Authentication

### Single URL, Multiple Experiences

**URL:** `simmerdown.localhost:3000/chat`

Esta URL funciona de manera diferente según la autenticación del usuario:

| User Type | Token | Experience |
|-----------|-------|------------|
| **Staff (CEO/Admin/Housekeeper)** | ✅ `staff_token` | Staff Chat Interface |
| **Public Visitor** | ❌ No token | Public Landing Page Chat |

---

## Authentication Flow

### 1. Check Staff Authentication

```typescript
// src/app/[tenant]/chat/page.tsx

useEffect(() => {
  const checkStaffAuth = async () => {
    const token = localStorage.getItem('staff_token');

    if (!token) {
      setIsCheckingAuth(false);
      return; // No token → Public visitor
    }

    try {
      const response = await fetch('/api/staff/verify-token', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setIsStaff(true); // Valid token → Staff user
      }
    } catch (err) {
      console.error('Staff auth check failed:', err);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  checkStaffAuth();
}, []);
```

### 2. Render Based on Authentication

```typescript
// Show loading state
if (isCheckingAuth) {
  return <LoadingSpinner />;
}

// Staff authenticated → Staff Interface
if (isStaff) {
  return <StaffChatInterface />;
}

// Public visitor → Landing Page Chat
return (
  <TenantChatPage
    subdomain={tenant.slug}
    tenant={tenant}
  />
);
```

---

## Staff Chat Interface

### Component: `StaffChatInterface`

**Location:** `src/components/Staff/StaffChatInterface.tsx`

#### Features

1. **Conversation List (Sidebar)**
   - View all past conversations
   - Filter by guest name, reservation, date
   - Create new conversations

2. **Chat Messages Area**
   - Real-time streaming responses
   - Markdown support
   - Sources display (knowledge base references)
   - Intent detection (check-in dates, guest count)

3. **Role-Based Permissions**
   - **CEO**: Full access (all conversations, SIRE docs, analytics)
   - **Admin**: Full access (all conversations, knowledge base)
   - **Staff/Housekeeper**: Limited access (assigned conversations only)

4. **Knowledge Base Integration**
   - Searches hotel docs, SIRE compliance, policies
   - Returns sources with each response
   - Access to accommodation unit details

#### UI Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Staff Portal                        [Carlos Ospina] [CEO] ⚙ │
├──────────────┬──────────────────────────────────────────────┤
│              │ Chat: Guest - Reservation #1234              │
│ Conversations│                                               │
│ ─────────────│ ┌───────────────────────────────────────────┐│
│ ○ John Doe   │ │ User: When is checkout?                   ││
│   Res #1234  │ │                                            ││
│              │ │ Assistant: Checkout is at 11:00 AM.       ││
│ ○ Jane Smith │ │ [Sources: House Rules, Checkout Policy]   ││
│   Res #5678  │ └───────────────────────────────────────────┘│
│              │                                               │
│ + New Chat   │ ┌───────────────────────────────────────────┐│
│              │ │ Type your message...                [Send]││
└──────────────┴─└───────────────────────────────────────────┘┘
```

---

## Public Chat Experience

### Component: `TenantChatPage`

**Location:** `src/components/Tenant/TenantChatPage.tsx`

#### Features

1. **Public Information Only**
   - Hotel info, amenities, location
   - Room availability (general info)
   - Pricing (public rates)
   - Booking instructions

2. **No Sensitive Data**
   - Cannot see other guests' conversations
   - No access to reservations
   - No internal documentation

3. **Same UI as Landing Page**
   - Consistent branding
   - Welcome message
   - Streaming responses
   - Photo carousel for units

#### UI Layout

```
┌─────────────────────────────────────────────────────────────┐
│ [Logo] Simmer Down Guest House              [New Convo] 🔄  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ Welcome! I'm your AI assistant for Simmer Down Guest    ││
│ │ House. How can I help you today?                         ││
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
│        ┌──────────────────────────────────────────────┐    │
│        │ User: What rooms do you have available?      │    │
│        └──────────────────────────────────────────────┘    │
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ We have 8 beautiful rooms: Dreamland, Jammin, Kaya...   ││
│ │ [Photos: Room carousel]                                  ││
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
│ ┌────────────────────────────────────────────────────[Send]┐│
│ │ Type your message...                                     ││
│ └──────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

## Access Paths

### 1. From Admin Sidebar (Staff Users)

**Dashboard → Chat**

```
User logged in at /login
↓
Dashboard at /dashboard (with sidebar)
↓
Clicks "Chat" in sidebar
↓
Navigates to /chat
↓
System detects staff_token
↓
Shows StaffChatInterface
```

**Sidebar Configuration:**
```typescript
// src/components/admin/AdminSidebar.tsx
{
  name: 'Chat',
  href: '/chat',
  icon: MessageSquare,
  roles: ['admin', 'owner', 'staff']
}
```

### 2. Direct URL (Public Visitors)

```
Visitor navigates to simmerdown.muva.chat/chat
↓
No staff_token in localStorage
↓
Shows TenantChatPage (public chat)
```

### 3. Configurable Link (Landing Page)

Admins can configure the call-to-action link in Content settings:

```
/content → Call-to-Action Link: /chat
```

This allows public visitors to access the chat from the landing page hero section.

---

## Chat Engines

### Staff Chat Engine

**API Route:** `POST /api/staff/chat`

#### Features:
- Access to full knowledge base (public + internal docs)
- SIRE compliance documents
- Reservation data
- Guest conversation history
- Administrative procedures

#### Request:
```typescript
{
  message: "What's the check-in policy for guests with pets?",
  conversation_id: "uuid-1234" // optional
}
```

#### Response:
```typescript
{
  response: "According to our pet policy...",
  sources: [
    {
      title: "Pet Policy - Internal Docs",
      content: "...",
      metadata: { ... }
    }
  ],
  conversation_id: "uuid-1234",
  session_id: "uuid-5678"
}
```

### Public Chat Engine

**API Route:** `POST /api/dev/chat`

#### Features:
- Public knowledge base only
- Hotel amenities, location, pricing
- Room availability (general)
- Booking instructions

#### Request:
```typescript
{
  message: "Do you have rooms available next week?",
  session_id: "uuid-9999",
  tenant_id: "b5c45f51-..."
}
```

#### Response:
```typescript
{
  response: "We have several rooms available...",
  sources: [
    {
      unit_name: "Dreamland Studio",
      photos: ["url1", "url2"],
      content: "..."
    }
  ],
  availability_url: "https://simmerdown.muva.chat/booking",
  suggestions: [
    "Tell me more about Dreamland",
    "What's the check-in process?",
    "Do you have parking?"
  ]
}
```

---

## Staff Roles & Permissions

### Role Hierarchy

```
CEO (owner)
├── Full access to all features
├── SIRE compliance documents
├── Analytics & financial reports
├── All settings & configurations
└── View all conversations

Admin
├── Full access to operational features
├── Knowledge base management
├── Guest conversations
├── Limited analytics
└── Settings (non-financial)

Staff (Housekeeper, Receptionist)
├── Assigned conversations only
├── Public knowledge base
├── Basic accommodation info
└── No settings access
```

### Permission Matrix

| Feature | CEO | Admin | Staff |
|---------|-----|-------|-------|
| View all conversations | ✅ | ✅ | ❌ |
| Create new conversations | ✅ | ✅ | ✅ |
| Access SIRE docs | ✅ | ✅ | ❌ |
| View analytics | ✅ | ⚠️ Limited | ❌ |
| Upload documents | ✅ | ✅ | ❌ |
| Modify branding | ✅ | ✅ | ❌ |
| Manage staff accounts | ✅ | ⚠️ Limited | ❌ |

---

## Database Schema

### Staff Users

```sql
CREATE TABLE public.staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant_registry(tenant_id),
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ceo', 'admin', 'housekeeper')),
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Example
INSERT INTO staff (tenant_id, username, full_name, role)
VALUES (
  'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf',
  'admin_ceo',
  'Carlos Ospina',
  'ceo'
);
```

### Conversations

```sql
CREATE TABLE public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant_registry(tenant_id),
  guest_name TEXT,
  reservation_id UUID REFERENCES guest_reservations(id),
  staff_id UUID REFERENCES staff(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Messages

```sql
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  sources JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Security Considerations

### 1. Token Storage

```typescript
// Stored in localStorage (NEVER sessionStorage)
localStorage.setItem('staff_token', token);
localStorage.setItem('staff_info', JSON.stringify(staffInfo));
```

**Why localStorage?**
- Persists across browser sessions
- Survives page refresh
- User stays logged in until explicit logout

### 2. Token Verification

```typescript
// Every protected API call verifies token
const token = localStorage.getItem('staff_token');

const response = await fetch('/api/staff/chat', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ ... })
});

if (response.status === 401) {
  // Token expired or invalid → redirect to login
  localStorage.removeItem('staff_token');
  localStorage.removeItem('staff_info');
  router.push('/login');
}
```

### 3. Row Level Security (RLS)

```sql
-- Staff can only access their tenant's data
CREATE POLICY "Staff tenant isolation"
  ON chat_conversations
  FOR ALL
  USING (tenant_id = (
    SELECT tenant_id FROM staff
    WHERE id = current_setting('app.current_user_id')::uuid
  ));
```

---

## Future Enhancements

### Planned Features

1. **Real-time Notifications**
   - Push notifications for new guest messages
   - Browser notifications
   - Email alerts for unread messages

2. **Conversation Assignment**
   - Assign conversations to specific staff members
   - Auto-routing based on reservation type
   - Escalation to admin/CEO

3. **Canned Responses**
   - Pre-saved responses for common questions
   - Template messages
   - Quick replies

4. **Chat Analytics**
   - Response time metrics
   - Most asked questions
   - Staff performance tracking

5. **Multi-channel Support**
   - WhatsApp integration
   - SMS integration
   - Email-to-chat

---

## Troubleshooting

### Issue: Staff sees public chat instead of staff interface
**Cause:** Token expired or invalid
**Fix:**
```bash
# Check localStorage
console.log(localStorage.getItem('staff_token'));

# Re-login
window.location.href = '/login';
```

### Issue: Logout redirects to wrong page
**Cause:** Old redirect URL in StaffChatInterface
**Fix:** Ensure `router.push('/login')` not `/staff/login`

### Issue: Conversations not loading
**Cause:** RLS policy blocking access
**Fix:** Verify staff record exists with correct tenant_id

---

## Testing

### Test Scenarios

#### 1. Staff Login Flow
```bash
# 1. Navigate to login
http://simmerdown.localhost:3000/login

# 2. Enter credentials (check .env.local for test accounts)
Username: admin_ceo
Password: [from .env.local]

# 3. Should redirect to /dashboard
# 4. Click "Chat" in sidebar
# 5. Should see StaffChatInterface
```

#### 2. Public Chat Flow
```bash
# 1. Open incognito window (no tokens)
# 2. Navigate to chat
http://simmerdown.localhost:3000/chat

# 3. Should see TenantChatPage (public)
# 4. Ask: "What rooms do you have?"
# 5. Should get public info only
```

#### 3. Token Expiry
```bash
# 1. Login as staff
# 2. Manually expire token in database
# 3. Refresh /chat page
# 4. Should auto-redirect to /login
```

---

## References

- **Main Chat Component:** `src/app/[tenant]/chat/page.tsx`
- **Staff Interface:** `src/components/Staff/StaffChatInterface.tsx`
- **Public Chat:** `src/components/Tenant/TenantChatPage.tsx`
- **Staff Login:** `src/app/[tenant]/login/page.tsx`
- **API Routes:** `src/app/api/staff/`
- **Multi-Tenant Routing:** `docs/architecture/MULTI_TENANT_ROUTING.md`

---

**Last Updated:** October 2025
**Maintained By:** Claude Code + Carlos Ospina
