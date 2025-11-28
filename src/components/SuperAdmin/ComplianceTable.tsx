'use client';

import { useState, useMemo } from 'react';
import {
  ArrowUpDown,
  Download,
  Eye,
  ExternalLink,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ComplianceTenant {
  tenant_id: string;
  subdomain: string;
  nombre_comercial: string;
  last_submission: string | null;
  submissions_30d: number;
  total_reservations: number;
  status: 'compliant' | 'warning' | 'overdue' | 'never_submitted';
  days_since_last: number | null;
}

interface ComplianceTableProps {
  tenants: ComplianceTenant[];
  loading?: boolean;
}

const statusConfig = {
  compliant: {
    label: 'Compliant',
    className: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800'
  },
  warning: {
    label: 'Warning',
    className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400 border-orange-200 dark:border-orange-800'
  },
  overdue: {
    label: 'Overdue',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 border-red-200 dark:border-red-800'
  },
  never_submitted: {
    label: 'Never Submitted',
    className: 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400 border-gray-200 dark:border-gray-800'
  }
};

const formatDate = (dateString: string | null) => {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatRelativeTime = (dateString: string | null) => {
  if (!dateString) return 'never';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 24) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
};

const LoadingRow = () => (
  <TableRow>
    <TableCell>
      <Skeleton className="h-4 w-32" />
    </TableCell>
    <TableCell className="hidden md:table-cell">
      <Skeleton className="h-4 w-24" />
    </TableCell>
    <TableCell>
      <Skeleton className="h-6 w-20" />
    </TableCell>
    <TableCell className="hidden lg:table-cell">
      <Skeleton className="h-4 w-12" />
    </TableCell>
    <TableCell className="hidden lg:table-cell">
      <Skeleton className="h-4 w-16" />
    </TableCell>
    <TableCell>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-24" />
      </div>
    </TableCell>
  </TableRow>
);

type SortField = 'nombre_comercial' | 'last_submission' | 'submissions_30d' | 'days_since_last' | 'status';
type SortOrder = 'asc' | 'desc';

export default function ComplianceTable({ tenants, loading = false }: ComplianceTableProps) {
  const [filter, setFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('days_since_last');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const filteredAndSortedTenants = useMemo(() => {
    let filtered = tenants;

    // Apply status filter
    if (filter !== 'all') {
      filtered = filtered.filter(t => t.status === filter);
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      // Handle null values (put them at the end)
      if (aVal === null && bVal === null) return 0;
      if (aVal === null) return 1;
      if (bVal === null) return -1;

      // Sort by field
      if (sortField === 'last_submission') {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      } else if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [tenants, filter, sortField, sortOrder]);

  const SortableHeader = ({ field, children, className = '' }: { field: SortField; children: React.ReactNode; className?: string }) => (
    <TableHead className={className}>
      <button
        onClick={() => handleSort(field)}
        className="flex items-center gap-1 hover:text-foreground font-medium"
      >
        {children}
        <ArrowUpDown className={`h-4 w-4 ${sortField === field ? 'text-primary' : 'text-muted-foreground'}`} />
      </button>
    </TableHead>
  );

  const handleDownloadReport = () => {
    const token = localStorage.getItem('super_admin_token');
    window.open(`/api/super-admin/compliance/report?token=${token}`, '_blank');
  };

  if (loading) {
    return (
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tenant</TableHead>
              <TableHead className="hidden md:table-cell">Last Submission</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Submissions (30d)</TableHead>
              <TableHead className="hidden lg:table-cell">Days Since Last</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <LoadingRow key={i} />
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (tenants.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-12 text-center shadow-sm">
        <div className="mx-auto max-w-md">
          <div className="mb-4 text-muted-foreground">
            <svg
              className="mx-auto h-24 w-24"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold">No compliance data</h3>
          <p className="text-sm text-muted-foreground">
            No tenants found with compliance information
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      {/* Header with filters and actions */}
      <div className="p-4 border-b">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Compliance Status by Tenant</h2>
            <p className="text-sm text-muted-foreground">
              {filteredAndSortedTenants.length} of {tenants.length} tenants
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="compliant">Compliant</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="never_submitted">Never Submitted</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadReport}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Download CSV</span>
              <span className="sm:hidden">CSV</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader field="nombre_comercial">Tenant</SortableHeader>
              <SortableHeader field="last_submission" className="hidden md:table-cell">
                Last Submission
              </SortableHeader>
              <SortableHeader field="status">Status</SortableHeader>
              <SortableHeader field="submissions_30d" className="hidden lg:table-cell">
                Submissions (30d)
              </SortableHeader>
              <SortableHeader field="days_since_last" className="hidden lg:table-cell">
                Days Since Last
              </SortableHeader>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedTenants.map((tenant) => (
              <TableRow key={tenant.tenant_id}>
                {/* Tenant Name + Subdomain */}
                <TableCell>
                  <div className="flex flex-col">
                    <div className="font-medium">{tenant.nombre_comercial}</div>
                    <a
                      href={`https://${tenant.subdomain}.muva.chat`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      {tenant.subdomain}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </TableCell>

                {/* Last Submission */}
                <TableCell className="hidden md:table-cell">
                  <div className="flex flex-col">
                    <div className="text-sm">{formatDate(tenant.last_submission)}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatRelativeTime(tenant.last_submission)}
                    </div>
                  </div>
                </TableCell>

                {/* Status Badge */}
                <TableCell>
                  <Badge
                    variant="outline"
                    className={statusConfig[tenant.status].className}
                  >
                    {statusConfig[tenant.status].label}
                  </Badge>
                </TableCell>

                {/* Submissions (30d) */}
                <TableCell className="hidden lg:table-cell">
                  <div className="text-center font-medium">
                    {tenant.submissions_30d}
                  </div>
                </TableCell>

                {/* Days Since Last */}
                <TableCell className="hidden lg:table-cell">
                  <div className="text-center">
                    {tenant.days_since_last !== null ? (
                      <span className={
                        tenant.days_since_last > 30 ? 'text-red-600 dark:text-red-400 font-medium' :
                        tenant.days_since_last > 20 ? 'text-orange-600 dark:text-orange-400 font-medium' :
                        'text-muted-foreground'
                      }>
                        {tenant.days_since_last}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </div>
                </TableCell>

                {/* Actions */}
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled
                      className="gap-1"
                    >
                      <Eye className="h-4 w-4" />
                      <span className="hidden sm:inline">Details</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {filteredAndSortedTenants.length === 0 && filter !== 'all' && (
        <div className="p-8 text-center text-muted-foreground">
          <p>No tenants found with status: <span className="font-medium">{statusConfig[filter as keyof typeof statusConfig]?.label}</span></p>
          <Button
            variant="link"
            onClick={() => setFilter('all')}
            className="mt-2"
          >
            Clear filter
          </Button>
        </div>
      )}
    </div>
  );
}
