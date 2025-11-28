'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GlobalSettings } from '@/components/SuperAdmin/GlobalSettings';
import { SuperAdminUsers } from '@/components/SuperAdmin/SuperAdminUsers';
import { ThemeToggle } from '@/components/SuperAdmin/ThemeToggle';
import { useTheme } from '@/contexts/ThemeContext';
import { Settings, Users, Info, Palette } from 'lucide-react';

export default function SettingsPage() {
  const { theme } = useTheme();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure global platform settings and preferences
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="global" className="space-y-4">
        <TabsList>
          <TabsTrigger value="global">
            <Settings className="mr-2 h-4 w-4" />
            Global Settings
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="mr-2 h-4 w-4" />
            Super Admins
          </TabsTrigger>
          <TabsTrigger value="system">
            <Info className="mr-2 h-4 w-4" />
            System Info
          </TabsTrigger>
          <TabsTrigger value="appearance">
            <Palette className="mr-2 h-4 w-4" />
            Appearance
          </TabsTrigger>
        </TabsList>

        {/* Global Settings Tab */}
        <TabsContent value="global">
          <GlobalSettings />
        </TabsContent>

        {/* Super Admins Tab */}
        <TabsContent value="users">
          <SuperAdminUsers />
        </TabsContent>

        {/* System Info Tab */}
        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle>System Information</CardTitle>
              <CardDescription>
                Platform version and configuration details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Next.js Version</p>
                  <p className="text-sm text-muted-foreground">15.5.3</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Supabase Project</p>
                  <p className="text-sm text-muted-foreground">MUVA 1.0 (dev)</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Database Branch</p>
                  <p className="text-sm text-muted-foreground">dev</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Environment</p>
                  <p className="text-sm text-muted-foreground">Development</p>
                </div>
                <div>
                  <p className="text-sm font-medium">AI Model</p>
                  <p className="text-sm text-muted-foreground">Claude Sonnet 4.5</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Deployment</p>
                  <p className="text-sm text-muted-foreground">VPS (195.200.6.216)</p>
                </div>
                <div>
                  <p className="text-sm font-medium">React Version</p>
                  <p className="text-sm text-muted-foreground">19.2.0</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Tailwind CSS</p>
                  <p className="text-sm text-muted-foreground">4.1.16</p>
                </div>
              </div>

              {/* Build Info */}
              <div className="mt-6 pt-6 border-t border-border">
                <h4 className="text-sm font-medium mb-2">Build Configuration</h4>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Turbopack: Enabled
                  </p>
                  <p className="text-sm text-muted-foreground">
                    TypeScript: 5.9.3
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Package Manager: pnpm
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance Settings</CardTitle>
              <CardDescription>
                Customize the look and feel of the admin dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Dark Mode */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Theme Mode</p>
                  <p className="text-sm text-muted-foreground">
                    Currently using {theme} mode
                  </p>
                </div>
                <ThemeToggle />
              </div>

              {/* Future: Accent Color Picker */}
              <div className="opacity-50 pointer-events-none">
                <p className="font-medium">Accent Color</p>
                <p className="text-sm text-muted-foreground mb-2">
                  Customize primary color (Coming Soon)
                </p>
                <div className="flex gap-2">
                  {[
                    { name: 'teal', color: 'bg-teal-600' },
                    { name: 'blue', color: 'bg-blue-600' },
                    { name: 'purple', color: 'bg-purple-600' },
                    { name: 'green', color: 'bg-green-600' },
                  ].map((color) => (
                    <div
                      key={color.name}
                      className={`h-10 w-10 rounded-full ${color.color} cursor-not-allowed`}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {/* Future: Font Size */}
              <div className="opacity-50 pointer-events-none">
                <p className="font-medium">Font Size</p>
                <p className="text-sm text-muted-foreground">
                  Adjust interface text size (Coming Soon)
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
