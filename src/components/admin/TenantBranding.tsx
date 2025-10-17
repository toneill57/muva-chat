'use client';

import { useState } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Tenant } from '@/lib/tenant-utils';

export function TenantBranding({ tenant }: { tenant: Tenant }) {
  const [businessName, setBusinessName] = useState(tenant.business_name || tenant.nombre_comercial || '');
  const [logoUrl, setLogoUrl] = useState(tenant.logo_url || '');
  const [primaryColor, setPrimaryColor] = useState(tenant.primary_color || '#3B82F6');
  const [saving, setSaving] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const handleSave = async () => {
    setSaving(true);

    const response = await fetch('/api/branding', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: tenant.tenant_id,
        logo_url: logoUrl,
        business_name: businessName,
        primary_color: primaryColor
      })
    });

    if (response.ok) {
      alert('Branding saved successfully!');
    } else {
      alert('Failed to save branding');
    }

    setSaving(false);
  };

  const handleReset = () => {
    setBusinessName(tenant.business_name || tenant.nombre_comercial || '');
    setLogoUrl(tenant.logo_url || '');
    setPrimaryColor(tenant.primary_color || '#3B82F6');
    setLogoError(false);
  };

  const handleLogoError = () => {
    setLogoError(true);
  };

  const handleLogoLoad = () => {
    setLogoError(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Column: Form */}
      <div className="space-y-6">
        {/* Business Name */}
        <div>
          <Label htmlFor="business-name">Business Name</Label>
          <Input
            id="business-name"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Simmerdown Surf School"
            className="mt-1"
          />
          <p className="text-sm text-gray-500 mt-1">
            This name appears in the chat header and messages
          </p>
        </div>

        {/* Logo URL */}
        <div>
          <Label htmlFor="logo-url">Logo URL</Label>
          <Input
            id="logo-url"
            type="url"
            value={logoUrl}
            onChange={(e) => {
              setLogoUrl(e.target.value);
              setLogoError(false);
            }}
            placeholder="https://example.com/logo.png"
            className="mt-1"
          />
          <p className="text-sm text-gray-500 mt-1">
            Recommended: 200x200px, PNG or JPG, max 100KB
          </p>
          {logoUrl && (
            <div className="mt-3 p-3 border rounded-lg bg-gray-50">
              <Label className="text-xs font-medium text-gray-600">Logo Preview</Label>
              <div className="mt-2">
                {logoError ? (
                  <div className="h-16 w-16 flex items-center justify-center text-red-500 text-xs border border-red-200 rounded">
                    Failed to load
                  </div>
                ) : (
                  <img
                    src={logoUrl}
                    alt="Logo preview"
                    className="h-16 w-auto max-w-xs rounded"
                    onError={handleLogoError}
                    onLoad={handleLogoLoad}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Primary Color */}
        <div>
          <Label htmlFor="primary-color">Primary Color</Label>
          <div className="flex gap-3 mt-1">
            <Input
              id="primary-color"
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="w-20 h-10 cursor-pointer"
            />
            <Input
              type="text"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              placeholder="#3B82F6"
              className="flex-1"
              pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
            />
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Used for buttons and accents in the chat interface
          </p>

          {/* Color Preview Swatch */}
          <div className="mt-3 p-3 border rounded-lg bg-gray-50">
            <Label className="text-xs font-medium text-gray-600">Color Preview</Label>
            <div className="mt-2 flex gap-3">
              <div
                className="w-16 h-16 rounded-lg border shadow-sm"
                style={{ backgroundColor: primaryColor }}
                aria-label="Primary color swatch"
              />
              <div className="flex-1">
                <p className="text-xs text-gray-600 mb-2">Sample button:</p>
                <div
                  className="px-4 py-2 rounded-lg text-white text-sm font-medium shadow-sm inline-block"
                  style={{ backgroundColor: primaryColor }}
                >
                  Send Message
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleReset}
            className="flex-1"
          >
            Reset
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex-1"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Right Column: Live Preview */}
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Live Preview</CardTitle>
            <CardDescription>How your chat will look to visitors</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-4 bg-gray-50">
              {/* Chat header preview */}
              <div className="flex items-center gap-3 pb-4 border-b">
                {logoUrl && !logoError ? (
                  <img
                    src={logoUrl}
                    alt="Logo"
                    className="w-10 h-10 rounded-full object-cover"
                    onError={handleLogoError}
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-semibold">
                    {businessName.charAt(0) || 'B'}
                  </div>
                )}
                <div>
                  <p className="font-semibold">{businessName || 'Business Name'}</p>
                  <p className="text-xs text-gray-500">Powered by MUVA</p>
                </div>
              </div>

              {/* Bot message preview with color */}
              <div className="mt-4 space-y-3">
                <div className="flex items-start gap-3">
                  {logoUrl && !logoError ? (
                    <img
                      src={logoUrl}
                      alt="Bot"
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                      style={{ backgroundColor: primaryColor }}
                    >
                      AI
                    </div>
                  )}
                  <div className="bg-white rounded-lg p-3 text-sm max-w-xs">
                    Hi! I'm here to help you with any questions about {businessName || 'your business'}.
                  </div>
                </div>

                {/* User message preview */}
                <div className="flex items-start gap-3 flex-row-reverse">
                  <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white text-sm">
                    U
                  </div>
                  <div
                    className="rounded-lg p-3 text-sm text-white max-w-xs"
                    style={{ backgroundColor: primaryColor }}
                  >
                    What are your check-in times?
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
