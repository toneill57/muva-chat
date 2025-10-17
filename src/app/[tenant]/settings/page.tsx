'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect} from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTenant } from '@/contexts/TenantContext';

interface SocialMediaLinks {
  facebook: string;
  instagram: string;
  twitter: string;
  linkedin: string;
  tiktok: string;
}

export default function SettingsPage() {
  const { tenant, isLoading } = useTenant();

  const [formData, setFormData] = useState({
    nombre_comercial: '',
    razon_social: '',
    address: '',
    phone: '',
    email: '',
    social_media_links: {
      facebook: '',
      instagram: '',
      twitter: '',
      linkedin: '',
      tiktok: ''
    } as SocialMediaLinks,
    seo_meta_description: '',
    seo_keywords: [] as string[]
  });

  const [keywordsInput, setKeywordsInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (tenant) {
      setFormData({
        nombre_comercial: tenant.nombre_comercial || '',
        razon_social: tenant.razon_social || '',
        address: tenant.address || '',
        phone: tenant.phone || '',
        email: tenant.email || '',
        social_media_links: {
          facebook: tenant.social_media_links?.facebook || '',
          instagram: tenant.social_media_links?.instagram || '',
          twitter: tenant.social_media_links?.twitter || '',
          linkedin: tenant.social_media_links?.linkedin || '',
          tiktok: tenant.social_media_links?.tiktok || ''
        },
        seo_meta_description: tenant.seo_meta_description || '',
        seo_keywords: tenant.seo_keywords || []
      });
      setKeywordsInput((tenant.seo_keywords || []).join(', '));
    }
  }, [tenant]);

  async function handleSave() {
    setSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          seo_keywords: keywordsInput.split(',').map(k => k.trim()).filter(Boolean)
        })
      });

      if (response.ok) {
        setSaveSuccess(true);
        // Auto-hide success message after 3 seconds
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        const data = await response.json();
        setSaveError(data.error || 'Failed to save settings');
      }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Tenant not found</p>
      </div>
    );
  }

  const charCount = formData.seo_meta_description.length;
  const isDescriptionTooLong = charCount > 160;

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your business information and SEO settings</p>
      </div>

      {/* Success/Error Messages */}
      {saveSuccess && (
        <div className="bg-green-50 border-l-4 border-green-600 p-4 rounded">
          <p className="text-green-800 font-medium">Settings saved successfully!</p>
        </div>
      )}

      {saveError && (
        <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded">
          <p className="text-red-800 font-medium">Error: {saveError}</p>
        </div>
      )}

      {/* Business Info Section */}
      <Card>
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
          <CardDescription>Update your business details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="business-name">Business Name</Label>
              <Input
                id="business-name"
                value={formData.nombre_comercial}
                onChange={(e) => setFormData({ ...formData, nombre_comercial: e.target.value })}
                placeholder="Your Business Name"
                className="mt-1"
              />
              <p className="text-sm text-gray-500 mt-1">
                Public-facing business name
              </p>
            </div>
            <div>
              <Label htmlFor="legal-name">Legal Name</Label>
              <Input
                id="legal-name"
                value={formData.razon_social}
                onChange={(e) => setFormData({ ...formData, razon_social: e.target.value })}
                placeholder="Legal Company Name"
                className="mt-1"
              />
              <p className="text-sm text-gray-500 mt-1">
                Official registered business name
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="123 Main St, City, State, ZIP"
              rows={3}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 (555) 123-4567"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="info@business.com"
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Social Media Section */}
      <Card>
        <CardHeader>
          <CardTitle>Social Media Links</CardTitle>
          <CardDescription>Connect your social media profiles</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(['facebook', 'instagram', 'twitter', 'linkedin', 'tiktok'] as const).map((platform) => (
            <div key={platform}>
              <Label htmlFor={platform} className="capitalize">{platform}</Label>
              <Input
                id={platform}
                type="url"
                value={formData.social_media_links[platform]}
                onChange={(e) => setFormData({
                  ...formData,
                  social_media_links: {
                    ...formData.social_media_links,
                    [platform]: e.target.value
                  }
                })}
                placeholder={`https://${platform}.com/yourbusiness`}
                className="mt-1"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* SEO Section */}
      <Card>
        <CardHeader>
          <CardTitle>SEO Settings</CardTitle>
          <CardDescription>Optimize your landing page for search engines</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="meta-description">Meta Description</Label>
            <Textarea
              id="meta-description"
              value={formData.seo_meta_description}
              onChange={(e) => setFormData({ ...formData, seo_meta_description: e.target.value })}
              placeholder="A brief description of your business (160 characters max)"
              rows={3}
              maxLength={200}
              className="mt-1"
            />
            <p className={`text-sm mt-1 ${isDescriptionTooLong ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
              {charCount}/160 characters {isDescriptionTooLong && '(too long - may be truncated in search results)'}
            </p>
          </div>

          <div>
            <Label htmlFor="keywords">SEO Keywords</Label>
            <Input
              id="keywords"
              value={keywordsInput}
              onChange={(e) => setKeywordsInput(e.target.value)}
              placeholder="hotel, surf school, beach resort (comma-separated)"
              className="mt-1"
            />
            <p className="text-sm text-gray-500 mt-1">
              Separate keywords with commas
            </p>
          </div>

          {/* Google Search Preview */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <p className="text-xs text-gray-500 mb-2 font-medium">Google Search Preview</p>
            <div className="space-y-1">
              <p className="text-blue-600 text-lg hover:underline cursor-pointer">
                {formData.nombre_comercial || 'Your Business Name'}
              </p>
              <p className="text-green-700 text-sm">
                https://{tenant?.subdomain || 'yoursite'}.muva.chat
              </p>
              <p className="text-sm text-gray-600 line-clamp-2">
                {formData.seo_meta_description || 'Your meta description will appear here. This helps users understand what your business offers before they click on the search result.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-3 pb-6">
        <Button
          variant="outline"
          onClick={() => {
            if (tenant) {
              setFormData({
                nombre_comercial: tenant.nombre_comercial || '',
                razon_social: tenant.razon_social || '',
                address: tenant.address || '',
                phone: tenant.phone || '',
                email: tenant.email || '',
                social_media_links: {
                  facebook: tenant.social_media_links?.facebook || '',
                  instagram: tenant.social_media_links?.instagram || '',
                  twitter: tenant.social_media_links?.twitter || '',
                  linkedin: tenant.social_media_links?.linkedin || '',
                  tiktok: tenant.social_media_links?.tiktok || ''
                },
                seo_meta_description: tenant.seo_meta_description || '',
                seo_keywords: tenant.seo_keywords || []
              });
              setKeywordsInput((tenant.seo_keywords || []).join(', '));
            }
          }}
        >
          Reset
        </Button>
        <Button onClick={handleSave} disabled={saving} size="lg">
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
