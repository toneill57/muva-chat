'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ContentUploader } from '@/components/SuperAdmin/ContentUploader';
import { ContentTable } from '@/components/SuperAdmin/ContentTable';
import { FileText, FolderOpen } from 'lucide-react';

export default function ContentManagementPage() {
  const [stats, setStats] = useState<{
    total: number;
    byCategory: Record<string, number>;
  }>({ total: 0, byCategory: {} });

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('super_admin_token');
      const response = await fetch('/api/super-admin/content/stats', {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">MUVA Content Management</h1>
        <p className="text-muted-foreground mt-1">
          Upload and manage tourism content listings
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Listings</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Actividades</CardTitle>
            <FolderOpen className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.byCategory.actividades || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Accommodations</CardTitle>
            <FolderOpen className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.byCategory.accommodations || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Restaurants</CardTitle>
            <FolderOpen className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.byCategory.restaurants || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Upload Section */}
      <ContentUploader />

      {/* Content Table */}
      <Card>
        <CardHeader>
          <CardTitle>Existing Content</CardTitle>
        </CardHeader>
        <CardContent>
          <ContentTable onRefresh={fetchStats} />
        </CardContent>
      </Card>
    </div>
  );
}
