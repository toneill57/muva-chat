'use client';

import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TenantFilters } from '@/components/SuperAdmin/TenantFilters';
import { TenantsTable } from '@/components/SuperAdmin/TenantsTable';
import { TenantDetailsModal } from '@/components/SuperAdmin/TenantDetailsModal';
import type { Tenant, TenantDetails, TenantFilters as TenantFiltersType } from '@/types/super-admin';

export default function TenantsPage() {
  // State
  const [filters, setFilters] = useState<TenantFiltersType>({
    status: 'all',
    tier: 'all',
    search: '',
  });
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('last_activity');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedTenant, setSelectedTenant] = useState<TenantDetails | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Fetch tenants when filters, page, sort, or order change
  useEffect(() => {
    fetchTenants();
  }, [filters, page, sort, order]);


  const fetchTenants = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        sort,
        order,
        ...(filters.status !== 'all' && { status: filters.status }),
        ...(filters.tier !== 'all' && { tier: filters.tier }),
        ...(filters.search && { search: filters.search }),
      });

      const token = localStorage.getItem('super_admin_token');
      const response = await fetch(`/api/super-admin/tenants?${params}`, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tenants');
      }

      const data = await response.json();

      console.log('[TenantsPage] API Response:', {
        total: data.total,
        tenantsCount: data.tenants?.length,
        tenants: data.tenants,
        page: data.page,
        totalPages: data.totalPages
      });

      setTenants(data.tenants || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('Error fetching tenants:', error);
      setTenants([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (tenantId: string, newStatus: boolean) => {
    try {
      const token = localStorage.getItem('super_admin_token');
      const response = await fetch(`/api/super-admin/tenants/${tenantId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ is_active: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update status');

      // Refetch to update list
      fetchTenants();
    } catch (error) {
      console.error('Error updating tenant status:', error);
      throw error; // Re-throw so Table can revert optimistic update
    }
  };

  const handleViewDetails = async (tenant: Tenant) => {
    try {
      // Fetch complete tenant details
      const token = localStorage.getItem('super_admin_token');
      const response = await fetch(`/api/super-admin/tenants/${tenant.tenant_id}`, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tenant details');
      }

      const data = await response.json();
      setSelectedTenant(data.tenant);
      setModalOpen(true);
    } catch (error) {
      console.error('Error fetching tenant details:', error);
    }
  };

  const handleSort = (field: string) => {
    if (sort === field) {
      setOrder(order === 'asc' ? 'desc' : 'asc');
    } else {
      setSort(field);
      setOrder('desc');
    }
  };

  const handleFiltersChange = (newFilters: TenantFiltersType) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page when filters change
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tenant Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage all hotels and tourism businesses on the platform
          </p>
        </div>
        <Button disabled variant="outline" className="sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Add Tenant
        </Button>
      </div>

      {/* Filters */}
      <TenantFilters filters={filters} onChange={handleFiltersChange} />

      {/* Table */}
      <TenantsTable
        tenants={tenants}
        loading={loading}
        page={page}
        totalPages={totalPages}
        sort={sort}
        order={order}
        onSort={handleSort}
        onPageChange={setPage}
        onToggleStatus={handleToggleStatus}
        onViewDetails={handleViewDetails}
      />

      {/* Details Modal */}
      <TenantDetailsModal
        tenant={selectedTenant}
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedTenant(null);
        }}
      />
    </div>
  );
}
