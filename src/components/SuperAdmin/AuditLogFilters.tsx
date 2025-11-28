'use client';

import React, { useState, useEffect } from 'react';
import { Search, X, Download, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AuditLogFilters as AuditLogFiltersType } from '@/types/super-admin';

interface AuditLogFiltersProps {
  filters: AuditLogFiltersType;
  onFilterChange: (filters: AuditLogFiltersType) => void;
  onExport: () => void;
  exporting?: boolean;
}

export function AuditLogFilters({
  filters,
  onFilterChange,
  onExport,
  exporting = false,
}: AuditLogFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.search || '');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        onFilterChange({ ...filters, search: searchInput });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleReset = () => {
    setSearchInput('');
    onFilterChange({
      action: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      search: undefined,
    });
  };

  const hasActiveFilters =
    filters.action || filters.dateFrom || filters.dateTo || filters.search;

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-4">
        {/* First Row: Search + Action */}
        <div className="flex flex-col gap-4 md:flex-row">
          {/* Search Input */}
          <div className="flex-1 space-y-2">
            <Label htmlFor="search">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="search"
                type="text"
                placeholder="Search by target ID or description..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Action Filter */}
          <div className="space-y-2 md:w-64">
            <Label htmlFor="action">Action Type</Label>
            <Select
              value={filters.action || 'all'}
              onValueChange={(value) =>
                onFilterChange({
                  ...filters,
                  action: value === 'all' ? undefined : value,
                })
              }
            >
              <SelectTrigger id="action">
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="login">Login</SelectItem>
                <SelectItem value="tenant.update">Tenant Update</SelectItem>
                <SelectItem value="content.upload">Content Upload</SelectItem>
                <SelectItem value="settings.update">Settings Update</SelectItem>
                <SelectItem value="user.create">User Create</SelectItem>
                <SelectItem value="user.delete">User Delete</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Second Row: Date Range + Actions */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          {/* Date From */}
          <div className="flex-1 space-y-2">
            <Label htmlFor="dateFrom">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                From Date
              </div>
            </Label>
            <Input
              id="dateFrom"
              type="date"
              value={filters.dateFrom || ''}
              onChange={(e) =>
                onFilterChange({
                  ...filters,
                  dateFrom: e.target.value || undefined,
                })
              }
              max={filters.dateTo || new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Date To */}
          <div className="flex-1 space-y-2">
            <Label htmlFor="dateTo">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                To Date
              </div>
            </Label>
            <Input
              id="dateTo"
              type="date"
              value={filters.dateTo || ''}
              onChange={(e) =>
                onFilterChange({
                  ...filters,
                  dateTo: e.target.value || undefined,
                })
              }
              min={filters.dateFrom}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {/* Export CSV */}
            <Button
              variant="outline"
              onClick={onExport}
              disabled={exporting}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {exporting ? 'Exporting...' : 'Export CSV'}
            </Button>

            {/* Reset Filters */}
            {hasActiveFilters && (
              <Button variant="outline" onClick={handleReset} className="gap-2">
                <X className="h-4 w-4" />
                Reset
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
