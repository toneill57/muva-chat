'use client';

import React from 'react';
import {
  Building2,
  Users,
  MessageSquare,
  Clock,
  Calendar,
  Mail,
  Phone,
  MapPin,
  FileText,
  Activity,
  Plug,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import type { TenantDetails } from '@/types/super-admin';

interface TenantDetailsModalProps {
  tenant: TenantDetails | null;
  isOpen: boolean;
  onClose: () => void;
}

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

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatNumber = (num: number | undefined) => {
  if (num === undefined) return '0';
  return new Intl.NumberFormat('en-US').format(num);
};

const InfoRow = ({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | undefined;
}) => (
  <div className="flex items-start gap-3 py-3">
    <Icon className="h-5 w-5 text-muted-foreground mt-0.5" />
    <div className="flex-1">
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div className="text-sm">{value || 'N/A'}</div>
    </div>
  </div>
);

export function TenantDetailsModal({ tenant, isOpen, onClose }: TenantDetailsModalProps) {
  if (!tenant) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header with Logo and Basic Info */}
        <DialogHeader>
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              {tenant.logo_url && (
                <AvatarImage src={tenant.logo_url} alt={tenant.business_name} />
              )}
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                {getInitials(tenant.business_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <DialogTitle className="text-2xl mb-2">{tenant.business_name}</DialogTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={getTierColor(tenant.subscription_tier)}>
                  {tenant.subscription_tier.charAt(0).toUpperCase() +
                    tenant.subscription_tier.slice(1)}
                </Badge>
                <Badge variant={tenant.is_active ? 'default' : 'secondary'}>
                  {tenant.is_active ? 'Active' : 'Inactive'}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {tenant.subdomain}.muva.chat
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="stats">Stats</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>

          {/* Tab 1: Overview */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Business Information
                </CardTitle>
              </CardHeader>
              <CardContent className="divide-y">
                <InfoRow icon={FileText} label="NIT / Tax ID" value={tenant.nit} />
                <InfoRow icon={Building2} label="Legal Name" value={tenant.legal_name} />
                <InfoRow icon={MapPin} label="Address" value={tenant.address} />
                <InfoRow icon={Phone} label="Phone" value={tenant.phone} />
                <InfoRow icon={Mail} label="Contact Email" value={tenant.contact_email} />
                <InfoRow
                  icon={Calendar}
                  label="Created"
                  value={formatDate(tenant.created_at)}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Stats */}
          <TabsContent value="stats" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatNumber(tenant.conversation_count)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">All time</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatNumber(tenant.active_users)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Team members</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Accommodations</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatNumber(tenant.accommodation_count)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Properties listed</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {tenant.avg_response_time
                      ? `${Math.round(tenant.avg_response_time)}s`
                      : 'N/A'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab 3: Integrations */}
          <TabsContent value="integrations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Plug className="h-5 w-5" />
                  Connected Services
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tenant.integrations && tenant.integrations.length > 0 ? (
                  <div className="space-y-4">
                    {tenant.integrations.map((integration, index) => (
                      <div key={index}>
                        {index > 0 && <Separator className="my-4" />}
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="rounded-lg bg-primary/10 p-2">
                              <Plug className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <div className="font-semibold capitalize">
                                {integration.provider}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {integration.last_sync
                                  ? `Last synced: ${formatDate(integration.last_sync)}`
                                  : 'Never synced'}
                              </div>
                            </div>
                          </div>
                          <Badge variant={integration.is_enabled ? 'default' : 'secondary'}>
                            {integration.is_enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Plug className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No integrations configured yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 4: Users */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Team Members
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tenant.users && tenant.users.length > 0 ? (
                  <div className="space-y-4">
                    {tenant.users.map((user, index) => (
                      <div key={user.user_id}>
                        {index > 0 && <Separator className="my-4" />}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                {user.email.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{user.email}</div>
                              <div className="text-sm text-muted-foreground capitalize">
                                {user.role}
                              </div>
                            </div>
                          </div>
                          <Badge variant={user.is_active ? 'default' : 'secondary'}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No users assigned yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
