'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, Shield, ShieldOff, Key } from 'lucide-react';

interface SuperAdmin {
  super_admin_id: string;
  username: string;
  full_name: string | null;
  email: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

export function SuperAdminUsers() {
  const [admins, setAdmins] = useState<SuperAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      const token = localStorage.getItem('super_admin_token');
      const response = await fetch('/api/super-admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setAdmins(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching admins:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (adminId: string, currentStatus: boolean) => {
    setMessage(null);

    try {
      const token = localStorage.getItem('super_admin_token');
      const response = await fetch(`/api/super-admin/users/${adminId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: !currentStatus })
      });

      if (response.ok) {
        setMessage({
          type: 'success',
          text: `Admin ${currentStatus ? 'deactivated' : 'activated'} successfully.`
        });
        fetchAdmins(); // Refresh
      } else {
        throw new Error('Failed to update user');
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to update user status. Please try again.'
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Super Admin Users</CardTitle>
            <CardDescription>
              Manage platform administrators and their permissions
            </CardDescription>
          </div>
          <Button disabled>
            <UserPlus className="mr-2 h-4 w-4" />
            Add Admin (Coming Soon)
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Success/Error Message */}
        {message && (
          <div className={`p-4 rounded ${message.type === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
            <p className="text-sm">{message.text}</p>
          </div>
        )}

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Full Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.length > 0 ? (
                admins.map((admin) => (
                  <TableRow key={admin.super_admin_id}>
                    <TableCell className="font-medium">{admin.username}</TableCell>
                    <TableCell>{admin.full_name || '-'}</TableCell>
                    <TableCell>{admin.email || '-'}</TableCell>
                    <TableCell>
                      {admin.last_login_at ? (
                        <span className="text-sm">
                          {formatDistanceToNow(new Date(admin.last_login_at), { addSuffix: true })}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Never</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={admin.is_active ? 'default' : 'secondary'}>
                        {admin.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleActive(admin.super_admin_id, admin.is_active)}
                      >
                        {admin.is_active ? (
                          <>
                            <ShieldOff className="mr-1 h-3 w-3" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <Shield className="mr-1 h-3 w-3" />
                            Activate
                          </>
                        )}
                      </Button>
                      <Button variant="outline" size="sm" disabled>
                        <Key className="mr-1 h-3 w-3" />
                        Reset Password
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No administrators found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
