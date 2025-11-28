'use client';

import React, { useState } from 'react';
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  Edit,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { Tenant } from '@/types/super-admin';

interface TenantsTableProps {
  tenants: Tenant[];
  loading: boolean;
  page: number;
  totalPages: number;
  sort: string;
  order: 'asc' | 'desc';
  onSort: (field: string) => void;
  onPageChange: (page: number) => void;
  onToggleStatus: (tenantId: string, newStatus: boolean) => Promise<void>;
  onViewDetails: (tenant: Tenant) => void;
}

const getTierBadgeVariant = (tier: string) => {
  switch (tier) {
    case 'free':
      return 'secondary';
    case 'basic':
      return 'default';
    case 'premium':
      return 'default';
    case 'enterprise':
      return 'default';
    default:
      return 'secondary';
  }
};

const getTierColor = (tier: string) => {
  switch (tier) {
    case 'free':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    case 'basic':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'premium':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    case 'enterprise':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
  }
};

const formatNumber = (num: number | undefined) => {
  if (num === undefined) return '0';
  return new Intl.NumberFormat('en-US').format(num);
};

const formatRelativeTime = (dateString: string | undefined) => {
  if (!dateString) return 'Never';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;

  return date.toLocaleDateString();
};

const getInitials = (name: string | undefined | null) => {
  if (!name) return '??';
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const LoadingRow = () => (
  <TableRow>
    <TableCell>
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
    </TableCell>
    <TableCell>
      <Skeleton className="h-4 w-24" />
    </TableCell>
    <TableCell className="hidden md:table-cell">
      <Skeleton className="h-6 w-20" />
    </TableCell>
    <TableCell className="hidden lg:table-cell">
      <Skeleton className="h-4 w-16" />
    </TableCell>
    <TableCell className="hidden lg:table-cell">
      <Skeleton className="h-4 w-24" />
    </TableCell>
    <TableCell>
      <Skeleton className="h-6 w-11" />
    </TableCell>
    <TableCell>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-16" />
      </div>
    </TableCell>
  </TableRow>
);

export function TenantsTable({
  tenants,
  loading,
  page,
  totalPages,
  sort,
  order,
  onSort,
  onPageChange,
  onToggleStatus,
  onViewDetails,
}: TenantsTableProps) {
  const [togglingStatus, setTogglingStatus] = useState<Record<string, boolean>>({});

  const handleStatusToggle = async (tenant: Tenant) => {
    const newStatus = !tenant.is_active;

    // Optimistic update
    setTogglingStatus((prev) => ({ ...prev, [tenant.tenant_id]: true }));

    try {
      await onToggleStatus(tenant.tenant_id, newStatus);
    } catch (error) {
      console.error('Failed to toggle status:', error);
      // Status will revert on refetch
    } finally {
      setTogglingStatus((prev) => ({ ...prev, [tenant.tenant_id]: false }));
    }
  };

  const SortableHeader = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <TableHead>
      <button
        onClick={() => onSort(field)}
        className="flex items-center gap-1 hover:text-foreground"
      >
        {children}
        <ArrowUpDown className="h-4 w-4" />
      </button>
    </TableHead>
  );

  if (loading) {
    return (
      <div className="rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tenant</TableHead>
              <TableHead>Subdomain</TableHead>
              <TableHead className="hidden md:table-cell">Plan</TableHead>
              <TableHead className="hidden lg:table-cell">Conversations</TableHead>
              <TableHead className="hidden lg:table-cell">Last Activity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 10 }).map((_, i) => (
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
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold">No tenants found</h3>
          <p className="text-sm text-muted-foreground">
            Try adjusting your filters or search criteria
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader field="business_name">Tenant</SortableHeader>
              <SortableHeader field="subdomain">Subdomain</SortableHeader>
              <TableHead className="hidden md:table-cell">Plan</TableHead>
              <SortableHeader field="public_conversations">
                <span className="hidden lg:inline">Public</span>
                <span className="lg:hidden">Pub</span>
              </SortableHeader>
              <SortableHeader field="authenticated_conversations">
                <span className="hidden lg:inline">Guests</span>
                <span className="lg:hidden">Gst</span>
              </SortableHeader>
              <SortableHeader field="last_activity">
                <span className="hidden lg:inline">Last Activity</span>
              </SortableHeader>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants.map((tenant) => (
              <TableRow key={tenant.tenant_id}>
                {/* Logo + Name */}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      {tenant.logo_url && (
                        <AvatarImage src={tenant.logo_url} alt={tenant.business_name} />
                      )}
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {getInitials(tenant.business_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-semibold">{tenant.business_name}</div>
                    </div>
                  </div>
                </TableCell>

                {/* Subdomain */}
                <TableCell>
                  <a
                    href={`https://${tenant.subdomain}.muva.chat`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    {tenant.subdomain}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </TableCell>

                {/* Plan/Tier */}
                <TableCell className="hidden md:table-cell">
                  <Badge className={getTierColor(tenant.subscription_tier)}>
                    {tenant.subscription_tier.charAt(0).toUpperCase() +
                      tenant.subscription_tier.slice(1)}
                  </Badge>
                </TableCell>

                {/* Public Conversations */}
                <TableCell className="hidden lg:table-cell text-center">
                  <span className="text-sm font-medium text-blue-600">
                    {formatNumber(tenant.public_conversations)}
                  </span>
                </TableCell>

                {/* Authenticated Conversations (Guests) */}
                <TableCell className="hidden lg:table-cell text-center">
                  <span className="text-sm font-medium text-teal-600">
                    {formatNumber(tenant.authenticated_conversations)}
                  </span>
                </TableCell>

                {/* Last Activity */}
                <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                  {formatRelativeTime(tenant.last_activity)}
                </TableCell>

                {/* Status Toggle */}
                <TableCell>
                  <Switch
                    checked={tenant.is_active}
                    onCheckedChange={() => handleStatusToggle(tenant)}
                    disabled={togglingStatus[tenant.tenant_id]}
                    aria-label={`Toggle ${tenant.business_name} status`}
                  />
                </TableCell>

                {/* Actions */}
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => onViewDetails(tenant)}
                      className="gap-1"
                    >
                      <Eye className="h-4 w-4" />
                      <span className="hidden sm:inline">Details</span>
                    </Button>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="sm" variant="outline" disabled>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Coming soon</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>

            {/* Page numbers */}
            <div className="hidden sm:flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }

                return (
                  <Button
                    key={pageNum}
                    variant={page === pageNum ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onPageChange(pageNum)}
                    className="w-9"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
