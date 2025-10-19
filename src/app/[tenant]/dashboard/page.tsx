'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Users, MessageSquare, TrendingUp, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminDashboardPage() {
  const { tenant } = useTenant();
  const [isClearing, setIsClearing] = useState(false);
  const [clearResult, setClearResult] = useState<{ success: boolean; message: string } | null>(null);

  // TODO (Task 4D.5): Replace with real data from analytics
  const stats = [
    { label: 'Documents', value: '12', icon: BookOpen, color: 'text-blue-600' },
    { label: 'Chat Sessions', value: '248', icon: MessageSquare, color: 'text-green-600' },
    { label: 'Active Users', value: '45', icon: Users, color: 'text-purple-600' },
    { label: 'Growth', value: '+12%', icon: TrendingUp, color: 'text-orange-600' },
  ];

  const handleClearConversations = async () => {
    if (!confirm('⚠️ Esta acción borrará TODAS las conversaciones de huéspedes. ¿Continuar?')) {
      return;
    }

    setIsClearing(true);
    setClearResult(null);

    try {
      const response = await fetch('/api/guest/conversations/clear-all', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        setClearResult({
          success: true,
          message: `✅ ${data.message}. Mensajes: ${data.result.messages_remaining}, Conversaciones: ${data.result.conversations_remaining}`,
        });
      } else {
        setClearResult({
          success: false,
          message: `❌ Error: ${data.error}`,
        });
      }
    } catch (error: any) {
      setClearResult({
        success: false,
        message: `❌ Error: ${error.message}`,
      });
    } finally {
      setIsClearing(false);
    }
  };

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

      {/* Development Tools - Only visible in development */}
      {process.env.NODE_ENV !== 'production' && (
        <Card className="border-orange-200 bg-orange-50/30">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-orange-900 flex items-center">
              <Trash2 className="w-4 h-4 mr-2" />
              Development Tools
            </CardTitle>
            <CardDescription className="text-orange-700">
              ⚠️ These actions are only available in development mode
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border border-orange-200 rounded-lg bg-white">
                <div>
                  <p className="text-sm font-medium text-gray-900">Clear All Guest Conversations</p>
                  <p className="text-xs text-gray-600">Delete all guest chat conversations and messages</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearConversations}
                  disabled={isClearing}
                  className="border-red-300 text-red-700 hover:bg-red-50"
                >
                  {isClearing ? (
                    <>
                      <div className="w-3 h-3 border-2 border-red-600 border-t-transparent rounded-full animate-spin mr-2" />
                      Clearing...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3 h-3 mr-2" />
                      Clear All
                    </>
                  )}
                </Button>
              </div>

              {clearResult && (
                <div
                  className={`p-3 rounded-lg text-sm ${
                    clearResult.success
                      ? 'bg-green-50 border border-green-200 text-green-800'
                      : 'bg-red-50 border border-red-200 text-red-800'
                  }`}
                >
                  {clearResult.message}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
