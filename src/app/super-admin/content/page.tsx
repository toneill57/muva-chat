'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ContentUploader } from '@/components/SuperAdmin/ContentUploader';
import { ContentTable } from '@/components/SuperAdmin/ContentTable';
import { FileText, FolderOpen, Trash2, Loader2 } from 'lucide-react';

export default function ContentManagementPage() {
  const [stats, setStats] = useState<{
    total: number;
    byCategory: Record<string, number>;
  }>({ total: 0, byCategory: {} });
  const [isDeleting, setIsDeleting] = useState(false);
  const [tableKey, setTableKey] = useState(0);

  const handleDeleteAll = async () => {
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('super_admin_token');
      const response = await fetch('/api/super-admin/content/delete-all', {
        method: 'DELETE',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      const data = await response.json();

      if (data.success) {
        console.log(`Deleted ${data.deletedCount} records`);
        fetchStats();
        setTableKey(prev => prev + 1); // Force table refresh
      } else {
        console.error('Delete failed:', data.error);
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error deleting all content:', error);
      alert('Error deleting content');
    } finally {
      setIsDeleting(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('super_admin_token');
      const response = await fetch('/api/super-admin/content/stats', {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        cache: 'no-store', // Force fresh data, never cache
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

  // Handle successful upload - refresh both stats and table
  const handleUploadSuccess = () => {
    fetchStats();
    setTableKey(prev => prev + 1); // Force table refresh
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">MUVA Content Management</h1>
          <p className="text-muted-foreground mt-1">
            Upload and manage tourism content listings
          </p>
        </div>

        {stats.total > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isDeleting}>
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Delete All ({stats.total})
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete All Content?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete <strong>{stats.total}</strong> records from the MUVA content database.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAll}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Yes, Delete All
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
            <CardTitle className="text-sm font-medium">Activities</CardTitle>
            <FolderOpen className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.byCategory.activities || 0}</div>
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Spots</CardTitle>
            <FolderOpen className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.byCategory.spots || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Culture</CardTitle>
            <FolderOpen className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.byCategory.culture || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Upload Section */}
      <ContentUploader onSuccess={handleUploadSuccess} />

      {/* Content Table */}
      <Card>
        <CardHeader>
          <CardTitle>Existing Content</CardTitle>
        </CardHeader>
        <CardContent>
          <ContentTable key={tableKey} onRefresh={fetchStats} />
        </CardContent>
      </Card>
    </div>
  );
}
