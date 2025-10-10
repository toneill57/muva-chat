'use client';

import { useState } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import type { Tenant } from '@/contexts/TenantContext';

interface TenantBrandingProps {
  tenant: Tenant;
}

export function TenantBranding({ tenant }: TenantBrandingProps) {
  const [businessName, setBusinessName] = useState(tenant.business_name || tenant.nombre_comercial || '');
  const [logoUrl, setLogoUrl] = useState(tenant.logo_url || '');
  const [primaryColor, setPrimaryColor] = useState('#3B82F6');
  const [saving, setSaving] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      // TODO: Implement API call to update tenant branding
      // PATCH /api/admin/tenant-branding
      // Body: { tenantId, businessName, logoUrl, primaryColor }
      // SQL: UPDATE tenants SET business_name = ?, logo_url = ? WHERE id = ?

      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      alert('Branding updated successfully!');
    } catch (error) {
      console.error('Error saving branding:', error);
      alert('Failed to save branding. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoError = () => {
    setLogoError(true);
  };

  const handleLogoLoad = () => {
    setLogoError(false);
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Business Information</h3>

        <div className="space-y-4">
          <div>
            <Label htmlFor="businessName">Business Name</Label>
            <Input
              id="businessName"
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Enter your business name"
              className="mt-1"
            />
            <p className="text-sm text-gray-500 mt-1">
              This will be displayed in the chat interface header
            </p>
          </div>

          <div>
            <Label htmlFor="logoUrl">Logo URL</Label>
            <Input
              id="logoUrl"
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
              Recommended: 200x200px, PNG or SVG format, max 100KB
            </p>
          </div>

          {logoUrl && (
            <div className="mt-4">
              <Label>Logo Preview</Label>
              <div className="mt-2 p-4 border rounded-lg bg-gray-50 inline-block">
                {logoError ? (
                  <div className="h-20 w-20 flex items-center justify-center text-red-500 text-sm">
                    Failed to load image
                  </div>
                ) : (
                  <img
                    src={logoUrl}
                    alt="Logo preview"
                    className="h-20 w-auto max-w-xs"
                    onError={handleLogoError}
                    onLoad={handleLogoLoad}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Brand Colors</h3>

        <div className="space-y-4">
          <div>
            <Label htmlFor="primaryColor">Primary Color</Label>
            <div className="flex gap-3 mt-1">
              <Input
                id="primaryColor"
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
              Used for buttons and accents in the chat interface (coming soon)
            </p>
          </div>

          <div className="mt-4">
            <Label>Color Preview</Label>
            <div className="mt-2 flex gap-4 flex-wrap">
              <div
                className="w-24 h-24 rounded-lg border shadow-sm"
                style={{ backgroundColor: primaryColor }}
                aria-label="Primary color swatch"
              />
              <div className="flex-1 min-w-[200px]">
                <p className="text-sm text-gray-600 mb-2">Chat message example:</p>
                <div className="border rounded-lg p-3 max-w-xs shadow-sm" style={{
                  backgroundColor: primaryColor,
                  color: 'white'
                }}>
                  Hello! How can I help you today?
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => {
            setBusinessName(tenant.business_name || tenant.nombre_comercial || '');
            setLogoUrl(tenant.logo_url || '');
            setPrimaryColor('#3B82F6');
          }}
        >
          Reset
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
