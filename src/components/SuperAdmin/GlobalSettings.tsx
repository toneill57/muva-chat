'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Save } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface Settings {
  maintenanceMode: boolean;
  globalAnnouncement: string;
  maxFileSize: number;
  defaultModel: string;
}

export function GlobalSettings() {
  const [settings, setSettings] = useState<Settings>({
    maintenanceMode: false,
    globalAnnouncement: '',
    maxFileSize: 10,
    defaultModel: 'claude-sonnet-4-5'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('super_admin_token');
      const response = await fetch('/api/super-admin/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          setSettings(data.settings);
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('super_admin_token');
      const response = await fetch('/api/super-admin/settings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' });
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success/Error Message */}
      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{message.type === 'success' ? 'Success' : 'Error'}</AlertTitle>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Maintenance Mode Warning */}
      {settings.maintenanceMode && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Maintenance Mode Active</AlertTitle>
          <AlertDescription>
            All tenant access is currently disabled. Users will see a maintenance page.
          </AlertDescription>
        </Alert>
      )}

      {/* Maintenance Mode */}
      <Card>
        <CardHeader>
          <CardTitle>Maintenance Mode</CardTitle>
          <CardDescription>
            Disable access to all tenants and display a maintenance page
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <Switch
              checked={settings.maintenanceMode}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, maintenanceMode: checked })
              }
            />
            <Label>
              {settings.maintenanceMode ? 'Maintenance mode is ON' : 'Maintenance mode is OFF'}
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Global Announcement */}
      <Card>
        <CardHeader>
          <CardTitle>Global Announcement</CardTitle>
          <CardDescription>
            Display a banner message across all tenant chats
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="announcement">Announcement Message</Label>
            <Textarea
              id="announcement"
              placeholder="e.g., System maintenance scheduled for..."
              value={settings.globalAnnouncement}
              onChange={(e) =>
                setSettings({ ...settings, globalAnnouncement: e.target.value })
              }
              rows={3}
              className="mt-2"
            />
          </div>

          {/* Preview */}
          {settings.globalAnnouncement && (
            <div className="border-l-4 border-primary bg-primary/10 p-4 rounded">
              <p className="text-sm">{settings.globalAnnouncement}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* File Upload Settings */}
      <Card>
        <CardHeader>
          <CardTitle>File Upload Settings</CardTitle>
          <CardDescription>
            Configure maximum file size for content uploads
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="maxFileSize">Maximum File Size (MB)</Label>
            <Input
              id="maxFileSize"
              type="number"
              min={1}
              max={100}
              value={settings.maxFileSize}
              onChange={(e) =>
                setSettings({ ...settings, maxFileSize: parseInt(e.target.value) || 10 })
              }
              className="w-32"
            />
            <p className="text-sm text-muted-foreground">
              Recommended: 10-20 MB for markdown files
            </p>
          </div>
        </CardContent>
      </Card>

      {/* AI Model Settings */}
      <Card>
        <CardHeader>
          <CardTitle>AI Model Settings</CardTitle>
          <CardDescription>
            Default Claude model for embeddings generation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="defaultModel">Default Model</Label>
            <Select
              value={settings.defaultModel}
              onValueChange={(value) =>
                setSettings({ ...settings, defaultModel: value })
              }
            >
              <SelectTrigger className="w-[280px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="claude-sonnet-4-5">
                  Claude Sonnet 4.5 (Recommended)
                </SelectItem>
                <SelectItem value="claude-opus-4">
                  Claude Opus 4 (Premium)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
