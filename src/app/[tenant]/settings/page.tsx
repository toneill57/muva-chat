'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect} from 'react';
import { useRouter } from 'next/navigation';
import { Save, Info, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTenant } from '@/contexts/TenantContext';
import { CitySelect } from '@/components/forms/CitySelect';
import { extractHotelCodeFromNIT } from '@/lib/sire/nit-utils';

interface SocialMediaLinks {
  facebook: string;
  instagram: string;
  twitter: string;
  linkedin: string;
  tiktok: string;
}

type SearchMode = 'hotel' | 'agency' | 'hybrid';

export default function SettingsPage() {
  const { tenant, isLoading } = useTenant();
  const router = useRouter();

  const [formData, setFormData] = useState({
    nombre_comercial: '',
    razon_social: '',
    address: '',
    phone: '',
    email: '',
    nit: '',
    social_media_links: {
      facebook: '',
      instagram: '',
      twitter: '',
      linkedin: '',
      tiktok: ''
    } as SocialMediaLinks,
    seo_meta_description: '',
    seo_keywords: [] as string[],
    search_mode: 'hotel' as SearchMode,
    muva_match_count: 0,
    // SIRE Compliance fields
    sire_hotel_code: '',
    sire_city_code: '',
    sire_city_name: ''
  });

  const [keywordsInput, setKeywordsInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (tenant) {
      console.log('[Settings] Loading tenant data:', {
        phone: tenant.phone,
        email: tenant.email,
        address: tenant.address,
        search_mode: tenant.features?.search_mode,
        muva_match_count: tenant.features?.muva_match_count,
        full_tenant: tenant
      });

      const newFormData = {
        nombre_comercial: tenant.nombre_comercial || '',
        razon_social: tenant.razon_social || '',
        address: tenant.address || '',
        phone: tenant.phone || '',
        email: tenant.email || '',
        nit: tenant.nit || '',
        social_media_links: {
          facebook: tenant.social_media_links?.facebook || '',
          instagram: tenant.social_media_links?.instagram || '',
          twitter: tenant.social_media_links?.twitter || '',
          linkedin: tenant.social_media_links?.linkedin || '',
          tiktok: tenant.social_media_links?.tiktok || ''
        },
        seo_meta_description: tenant.seo_meta_description || '',
        seo_keywords: tenant.seo_keywords || [],
        search_mode: (tenant.features?.search_mode as SearchMode) || 'hotel',
        muva_match_count: typeof tenant.features?.muva_match_count === 'number' ? tenant.features.muva_match_count : 0,
        // SIRE Compliance fields from features (ensure string type)
        sire_hotel_code: typeof tenant.features?.sire_hotel_code === 'string' ? tenant.features.sire_hotel_code : '',
        sire_city_code: typeof tenant.features?.sire_city_code === 'string' ? tenant.features.sire_city_code : '',
        sire_city_name: '' // Will be populated by CitySelect
      };

      console.log('[Settings] Setting formData to:', {
        phone: newFormData.phone,
        email: newFormData.email,
        address: newFormData.address,
        search_mode: newFormData.search_mode,
        muva_match_count: newFormData.muva_match_count
      });

      setFormData(newFormData);
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
          seo_keywords: keywordsInput.split(',').map(k => k.trim()).filter(Boolean),
          features: {
            ...tenant?.features,
            search_mode: formData.search_mode,
            muva_match_count: formData.muva_match_count,
            accommodation_search_enabled: true, // Always enabled for now
            // SIRE Compliance codes
            sire_hotel_code: formData.sire_hotel_code || null,
            sire_city_code: formData.sire_city_code || null
          }
        })
      });

      if (response.ok) {
        setSaveSuccess(true);
        // Refresh router to re-fetch tenant data from server
        router.refresh();
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

      {/* Search Mode Configuration Section */}
      <Card>
        <CardHeader>
          <CardTitle>Search Mode Configuration</CardTitle>
          <CardDescription>Control how your chat displays content to visitors</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup
            value={formData.search_mode}
            onValueChange={(value: SearchMode) => {
              const newMuvaCount = value === 'hotel' ? 0 : value === 'hybrid' ? 2 : 4;
              setFormData({
                ...formData,
                search_mode: value,
                muva_match_count: newMuvaCount
              });
            }}
          >
            {/* Hotel Mode */}
            <div className="flex items-start space-x-3 border rounded-lg p-4 hover:bg-gray-50 transition-colors">
              <RadioGroupItem value="hotel" id="hotel-mode" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="hotel-mode" className="text-base font-semibold cursor-pointer">
                  Hotel Mode (Recommended)
                </Label>
                <p className="text-sm text-gray-600 mt-1">
                  Focus on your accommodations only. Best for hotels, hostels, and vacation rentals.
                </p>
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex items-center text-green-600">
                    <span className="mr-2">✓</span>
                    <span>Shows: Your rooms and units</span>
                  </div>
                  <div className="flex items-center text-gray-500">
                    <span className="mr-2">✗</span>
                    <span>Hides: Tourism content (tours, restaurants, activities)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Agency Mode */}
            <div className="flex items-start space-x-3 border rounded-lg p-4 hover:bg-gray-50 transition-colors">
              <RadioGroupItem value="agency" id="agency-mode" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="agency-mode" className="text-base font-semibold cursor-pointer">
                  Agency Mode
                </Label>
                <p className="text-sm text-gray-600 mt-1">
                  Promote your tourism listings and partner businesses. Best for travel agencies and tour operators.
                </p>
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex items-center text-green-600">
                    <span className="mr-2">✓</span>
                    <span>Shows: Your MUVA tourism listings + accommodations</span>
                  </div>
                  <div className="flex items-center text-blue-600">
                    <span className="mr-2">ℹ</span>
                    <span>Upload your listings to MUVA Content section</span>
                  </div>
                </div>
                {formData.search_mode === 'agency' && (
                  <div className="mt-4 space-y-2">
                    <Label className="text-sm">MUVA Documents per query: {formData.muva_match_count}</Label>
                    <Slider
                      value={[formData.muva_match_count]}
                      onValueChange={(values) => setFormData({ ...formData, muva_match_count: values[0] })}
                      min={1}
                      max={10}
                      step={1}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500">
                      Higher values show more tourism content (recommended: 4-6)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Hybrid Mode */}
            <div className="flex items-start space-x-3 border rounded-lg p-4 hover:bg-gray-50 transition-colors">
              <RadioGroupItem value="hybrid" id="hybrid-mode" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="hybrid-mode" className="text-base font-semibold cursor-pointer">
                  Hybrid Mode
                </Label>
                <p className="text-sm text-gray-600 mt-1">
                  Balanced mix of accommodations and tourism content. Best for boutique hotels with curated experiences.
                </p>
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex items-center text-green-600">
                    <span className="mr-2">✓</span>
                    <span>Shows: Accommodations + limited tourism content</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <span className="mr-2">⚖</span>
                    <span>Emphasis on bookings while highlighting local experiences</span>
                  </div>
                </div>
                {formData.search_mode === 'hybrid' && (
                  <div className="mt-4 space-y-2">
                    <Label className="text-sm">MUVA Documents per query: {formData.muva_match_count}</Label>
                    <Slider
                      value={[formData.muva_match_count]}
                      onValueChange={(values) => setFormData({ ...formData, muva_match_count: values[0] })}
                      min={1}
                      max={4}
                      step={1}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500">
                      Recommended: 1-2 for subtle promotion, 3-4 for more tourism focus
                    </p>
                  </div>
                )}
              </div>
            </div>
          </RadioGroup>

          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Changes take effect immediately. Your chat will reflect the new search mode as soon as you save.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* SIRE Compliance Section */}
      <Card>
        <CardHeader>
          <CardTitle>SIRE Compliance Configuration</CardTitle>
          <CardDescription>
            Required for Migración Colombia tourism reporting
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sire-hotel-code">Hotel Code (NIT)</Label>
              <Input
                id="sire-hotel-code"
                value={formData.sire_hotel_code}
                onChange={(e) => setFormData({ ...formData, sire_hotel_code: e.target.value })}
                placeholder="900222791"
                className="mt-1"
              />
              <p className="text-sm text-gray-500 mt-1">
                NIT without verification digit
              </p>
              {formData.nit && !formData.sire_hotel_code && (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="px-0 h-auto text-blue-600"
                  onClick={() => {
                    const extracted = extractHotelCodeFromNIT(formData.nit);
                    setFormData({ ...formData, sire_hotel_code: extracted });
                  }}
                >
                  Extract from NIT ({formData.nit})
                </Button>
              )}
            </div>
            <div>
              <Label htmlFor="sire-city-code">Hotel City</Label>
              <CitySelect
                value={formData.sire_city_code}
                onChange={(code, name) => {
                  setFormData({
                    ...formData,
                    sire_city_code: code,
                    sire_city_name: name
                  });
                }}
              />
              <p className="text-sm text-gray-500 mt-1">
                DIVIPOLA code for SIRE reports
              </p>
            </div>
          </div>

          {/* SIRE Status Indicator */}
          {formData.sire_hotel_code && formData.sire_city_code ? (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                SIRE configuration complete. Guests will be included in TXT exports.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                Missing configuration. Guests will appear as &quot;Excluded&quot; in SIRE exports until both fields are set.
              </AlertDescription>
            </Alert>
          )}
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
                nit: tenant.nit || '',
                social_media_links: {
                  facebook: tenant.social_media_links?.facebook || '',
                  instagram: tenant.social_media_links?.instagram || '',
                  twitter: tenant.social_media_links?.twitter || '',
                  linkedin: tenant.social_media_links?.linkedin || '',
                  tiktok: tenant.social_media_links?.tiktok || ''
                },
                seo_meta_description: tenant.seo_meta_description || '',
                seo_keywords: tenant.seo_keywords || [],
                search_mode: (tenant.features?.search_mode as SearchMode) || 'hotel',
                muva_match_count: typeof tenant.features?.muva_match_count === 'number' ? tenant.features.muva_match_count : 0,
                sire_hotel_code: typeof tenant.features?.sire_hotel_code === 'string' ? tenant.features.sire_hotel_code : '',
                sire_city_code: typeof tenant.features?.sire_city_code === 'string' ? tenant.features.sire_city_code : '',
                sire_city_name: ''
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
