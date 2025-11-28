# Super Admin Audit Log UI

Complete UI implementation for viewing and analyzing super admin audit logs.

## Overview

The Audit Log UI provides comprehensive visibility into all administrative actions performed in the MUVA platform, including login events, tenant modifications, content uploads, settings changes, and more.

## Components

### 1. AuditLogTable (`/src/components/SuperAdmin/AuditLogTable.tsx`)

Main table component displaying audit log entries with expandable change details.

**Features:**
- Expandable rows showing before/after JSON diffs
- Color-coded action badges
- Relative timestamps with absolute tooltip
- Responsive design (mobile/tablet/desktop)
- Loading skeletons
- Empty state
- Pagination (50 per page)

**Action Badge Colors:**
- **Blue**: Login events
- **Yellow**: Updates (tenant.update, etc.)
- **Green**: Uploads/Creates (content.upload, etc.)
- **Purple**: Settings changes
- **Red**: Delete operations
- **Gray**: Other actions

**Columns:**
- Expand toggle (if changes exist)
- Timestamp (relative + absolute on hover)
- Admin (email or ID)
- Action (color-coded badge)
- Target (type + ID)
- IP Address

**Props:**
```typescript
interface AuditLogTableProps {
  logs: AuditLog[];
  loading?: boolean;
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}
```

### 2. AuditLogFilters (`/src/components/SuperAdmin/AuditLogFilters.tsx`)

Filter component for narrowing down audit log results.

**Features:**
- Action type dropdown (All, login, tenant.update, content.upload, settings.update, etc.)
- Date range picker (from/to)
- Search input (debounced 300ms)
- Export CSV button
- Reset filters button (shown when filters active)

**Props:**
```typescript
interface AuditLogFiltersProps {
  filters: AuditLogFilters;
  onFilterChange: (filters: AuditLogFilters) => void;
  onExport: () => void;
  exporting?: boolean;
}
```

### 3. Audit Log Page (`/src/app/super-admin/audit-log/page.tsx`)

Main page integrating table and filters with API calls.

**Features:**
- Auto-fetch on filter/page change
- CSV export with dynamic filename
- Loading states
- Error handling
- Super admin auth check (via layout)

**API Endpoints Expected:**
```
GET /api/super-admin/audit-log?page=1&limit=50&action=login&dateFrom=2025-01-01&dateTo=2025-01-31&search=tenant_123
GET /api/super-admin/audit-log?format=csv&action=login&dateFrom=2025-01-01
```

## Types

Added to `/src/types/super-admin.ts`:

```typescript
export interface AuditLog {
  id: string;
  admin_id: string;
  admin_email?: string;
  action: string;
  target_type?: string;
  target_id?: string;
  changes?: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  };
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface AuditLogFilters {
  action?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface AuditLogListResponse {
  logs: AuditLog[];
  totalPages: number;
  totalCount: number;
  page: number;
  limit: number;
}
```

## Navigation

Added to SuperAdminSidebar menu:
- Icon: Shield
- Label: "Audit Log"
- Route: `/super-admin/audit-log`

## Responsive Design

### Mobile (320px - 768px)
- Hides Admin column
- Hides Target column
- Hides IP Address column
- Shows only essential: Timestamp, Action
- Expandable rows still work
- Stacked filter layout

### Tablet (768px - 1024px)
- Shows Admin column
- Hides Target column
- Hides IP Address column

### Desktop (1024px+)
- Shows all columns
- Horizontal filter layout
- Page number controls visible

## Dark Mode Support

Full dark mode support via ThemeContext:
- Dark background colors for tables/cards
- Dark text colors
- Adjusted badge colors (dark variants)
- Proper contrast ratios (WCAG AA compliant)

## CSV Export

**Functionality:**
- Exports filtered results (respects current filters)
- Dynamic filename: `audit-log_2025-01-01_to_2025-01-31_2025-11-27.csv`
- Automatic download via blob URL
- Loading state during export

**Expected CSV Format:**
```csv
ID,Timestamp,Admin,Action,Target Type,Target ID,IP Address,Changes
abc123,2025-11-27T10:30:00Z,admin@muva.com,login,,,192.168.1.1,{}
def456,2025-11-27T11:00:00Z,admin@muva.com,tenant.update,tenant,tenant_123,192.168.1.1,"{""before"":{""is_active"":false},""after"":{""is_active"":true}}"
```

## Expandable Changes Component

Shows before/after diff for log entries with changes:
- Side-by-side comparison (desktop)
- Red background: before values
- Green background: after values
- JSON pretty-printing
- Handles nested objects
- Handles null/undefined values

## Performance Optimizations

1. **Debounced Search**: 300ms delay on search input
2. **Pagination**: 50 records per page (configurable)
3. **Conditional Rendering**: Only renders expanded changes when clicked
4. **Skeleton Loading**: Shows loading state without layout shift
5. **Memoization**: Could add React.memo to table rows if performance issues

## Testing Checklist

- [ ] Table displays logs correctly
- [ ] Expandable changes show before/after diff
- [ ] Filters update table in real-time
- [ ] Pagination works (prev/next/numbers)
- [ ] Export CSV downloads file
- [ ] Dark mode applies correctly
- [ ] Responsive on mobile (iPhone 15 Pro Max)
- [ ] Responsive on tablet (iPad)
- [ ] Responsive on desktop (1920x1080)
- [ ] Loading states visible
- [ ] Empty state displays when no results
- [ ] Tooltips show absolute timestamps
- [ ] Action badges have correct colors
- [ ] Search debounce works (300ms)
- [ ] Date range validation works
- [ ] Reset filters button appears/works

## API Implementation TODO

The UI is complete, but the backend API needs to be implemented:

1. **Create API route**: `/src/app/api/super-admin/audit-log/route.ts`
2. **Implement queries**:
   - Filter by action type
   - Filter by date range
   - Search by target_id/description
   - Pagination
   - CSV export
3. **Database table**: `super_admin_audit_log` (likely already exists)
4. **RLS Policies**: Ensure super admins can read all audit logs
5. **Logging middleware**: Ensure all admin actions are being logged

## File Structure

```
src/
├── app/
│   └── super-admin/
│       └── audit-log/
│           └── page.tsx                 # Main page
├── components/
│   └── SuperAdmin/
│       ├── AuditLogTable.tsx           # Table component
│       ├── AuditLogFilters.tsx         # Filters component
│       └── SuperAdminSidebar.tsx       # Navigation (updated)
├── types/
│   └── super-admin.ts                  # Types (updated)
└── docs/
    └── super-admin/
        └── AUDIT_LOG_UI.md             # This file
```

## Build Output

```
├ ○ /super-admin/audit-log              20.8 kB    222 kB
```

Component successfully compiles with no errors.

---

**Last Updated**: November 27, 2025
**Status**: UI Complete, Backend API Pending
**Next Steps**: Implement `/api/super-admin/audit-log` endpoint
