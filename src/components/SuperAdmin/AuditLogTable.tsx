'use client';

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Clock,
  User,
  Target,
  Activity,
  MapPin,
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { AuditLog } from '@/types/super-admin';

interface AuditLogTableProps {
  logs: AuditLog[];
  loading?: boolean;
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}

const getActionBadgeColor = (action: string) => {
  if (action.includes('login')) {
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
  }
  if (action.includes('tenant.update') || action.includes('update')) {
    return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
  }
  if (action.includes('content.upload') || action.includes('upload') || action.includes('create')) {
    return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
  }
  if (action.includes('settings.update') || action.includes('settings')) {
    return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
  }
  if (action.includes('delete')) {
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  }
  return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
};

const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return `${diffSeconds} second${diffSeconds !== 1 ? 's' : ''} ago`;
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;

  return date.toLocaleDateString();
};

const formatAbsoluteTime = (dateString: string) => {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const formatActionLabel = (action: string) => {
  return action
    .split('.')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const LoadingRow = () => (
  <TableRow>
    <TableCell className="w-8">
      <Skeleton className="h-4 w-4" />
    </TableCell>
    <TableCell>
      <Skeleton className="h-4 w-32" />
    </TableCell>
    <TableCell className="hidden md:table-cell">
      <Skeleton className="h-4 w-24" />
    </TableCell>
    <TableCell>
      <Skeleton className="h-6 w-28" />
    </TableCell>
    <TableCell className="hidden lg:table-cell">
      <Skeleton className="h-4 w-40" />
    </TableCell>
    <TableCell className="hidden xl:table-cell">
      <Skeleton className="h-4 w-32" />
    </TableCell>
  </TableRow>
);

interface ExpandedChangesProps {
  changes?: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  };
}

const ExpandedChanges: React.FC<ExpandedChangesProps> = ({ changes }) => {
  if (!changes || (!changes.before && !changes.after)) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        No change details available
      </div>
    );
  }

  const renderValue = (value: unknown): string => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  const allKeys = new Set([
    ...Object.keys(changes.before || {}),
    ...Object.keys(changes.after || {}),
  ]);

  return (
    <div className="p-4 space-y-3">
      <div className="text-sm font-semibold text-foreground mb-2">Changes:</div>
      <div className="space-y-2">
        {Array.from(allKeys).map((key) => {
          const before = changes.before?.[key];
          const after = changes.after?.[key];
          const hasChanged = JSON.stringify(before) !== JSON.stringify(after);

          if (!hasChanged && !before && !after) return null;

          return (
            <div key={key} className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div className="font-mono">
                <div className="text-muted-foreground mb-1">{key}:</div>
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded p-2">
                  <div className="text-red-700 dark:text-red-300 font-semibold mb-1">Before:</div>
                  <pre className="text-red-600 dark:text-red-400 whitespace-pre-wrap break-all">
                    {renderValue(before)}
                  </pre>
                </div>
              </div>
              <div className="font-mono">
                <div className="text-muted-foreground mb-1 md:invisible">_</div>
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded p-2">
                  <div className="text-green-700 dark:text-green-300 font-semibold mb-1">After:</div>
                  <pre className="text-green-600 dark:text-green-400 whitespace-pre-wrap break-all">
                    {renderValue(after)}
                  </pre>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export function AuditLogTable({
  logs,
  loading = false,
  totalPages,
  currentPage,
  onPageChange,
}: AuditLogTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Timestamp</TableHead>
              <TableHead className="hidden md:table-cell">Admin</TableHead>
              <TableHead>Action</TableHead>
              <TableHead className="hidden lg:table-cell">Target</TableHead>
              <TableHead className="hidden xl:table-cell">IP Address</TableHead>
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

  if (logs.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-12 text-center shadow-sm">
        <div className="mx-auto max-w-md">
          <div className="mb-4 text-muted-foreground">
            <Activity className="mx-auto h-24 w-24" strokeWidth={1} />
          </div>
          <h3 className="mb-2 text-lg font-semibold">No audit logs found</h3>
          <p className="text-sm text-muted-foreground">
            Try adjusting your filters or date range
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
              <TableHead className="w-8"></TableHead>
              <TableHead>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Timestamp
                </div>
              </TableHead>
              <TableHead className="hidden md:table-cell">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Admin
                </div>
              </TableHead>
              <TableHead>
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Action
                </div>
              </TableHead>
              <TableHead className="hidden lg:table-cell">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Target
                </div>
              </TableHead>
              <TableHead className="hidden xl:table-cell">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  IP Address
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => {
              const isExpanded = expandedRows.has(log.log_id);
              const hasChanges = log.changes && (log.changes.before || log.changes.after);

              return (
                <React.Fragment key={log.log_id}>
                  <TableRow className={isExpanded ? 'border-b-0' : ''}>
                    {/* Expand Toggle */}
                    <TableCell className="w-8">
                      {hasChanges && (
                        <button
                          onClick={() => toggleRow(log.log_id)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </TableCell>

                    {/* Timestamp */}
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="text-sm cursor-help">
                              {formatRelativeTime(log.created_at)}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{formatAbsoluteTime(log.created_at)}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>

                    {/* Admin */}
                    <TableCell className="hidden md:table-cell">
                      <div className="text-sm">
                        {log.admin_full_name || log.admin_username || log.super_admin_id.substring(0, 8)}
                      </div>
                    </TableCell>

                    {/* Action */}
                    <TableCell>
                      <Badge className={getActionBadgeColor(log.action)}>
                        {formatActionLabel(log.action)}
                      </Badge>
                    </TableCell>

                    {/* Target */}
                    <TableCell className="hidden lg:table-cell">
                      <div className="text-sm text-muted-foreground">
                        {log.target_type && log.target_id ? (
                          <div className="space-y-1">
                            <div className="font-medium text-foreground">{log.target_type}</div>
                            <div className="font-mono text-xs">{log.target_id.substring(0, 16)}...</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>

                    {/* IP Address */}
                    <TableCell className="hidden xl:table-cell">
                      <div className="text-sm font-mono text-muted-foreground">
                        {log.ip_address || '-'}
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Expanded Row */}
                  {isExpanded && hasChanges && (
                    <TableRow>
                      <TableCell colSpan={6} className="bg-muted/50 dark:bg-muted/20">
                        <ExpandedChanges changes={log.changes} />
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
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
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? 'default' : 'outline'}
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
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
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
