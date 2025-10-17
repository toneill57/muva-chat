export const dynamic = 'force-dynamic';

'use client';

import { useTenant } from '@/contexts/TenantContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Users, MessageSquare, TrendingUp } from 'lucide-react';

export default function AdminDashboardPage() {
  const { tenant } = useTenant();

  // TODO (Task 4D.5): Replace with real data from analytics
  const stats = [
    { label: 'Documents', value: '12', icon: BookOpen, color: 'text-blue-600' },
    { label: 'Chat Sessions', value: '248', icon: MessageSquare, color: 'text-green-600' },
    { label: 'Active Users', value: '45', icon: Users, color: 'text-purple-600' },
    { label: 'Growth', value: '+12%', icon: TrendingUp, color: 'text-orange-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome message */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          Welcome to {tenant?.nombre_comercial || 'MUVA'} Admin
        </h1>
        <p className="text-gray-600 mt-1">
          Manage your tenant configuration, content, and analytics
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.label}
                </CardTitle>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Get started with common tasks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <a
            href="/knowledge-base"
            className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <p className="font-medium text-gray-900">Upload Documents</p>
            <p className="text-sm text-gray-600">Add new documents to your knowledge base</p>
          </a>
          <a
            href="/settings"
            className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <p className="font-medium text-gray-900">Update Settings</p>
            <p className="text-sm text-gray-600">Configure your business information and SEO</p>
          </a>
          <a
            href="/branding"
            className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <p className="font-medium text-gray-900">Customize Branding</p>
            <p className="text-sm text-gray-600">Update your logo and color palette</p>
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
