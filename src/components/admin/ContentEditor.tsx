'use client';

import { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

// ============================================================================
// TypeScript Interfaces
// ============================================================================

interface LandingPageContent {
  hero: {
    title: string;
    subtitle: string;
    cta_text: string;
    cta_link: string;
  };
  about: {
    title: string;
    content: string;
  };
  services: {
    title: string;
    items: Array<{ title: string; description: string }>;
  };
  contact: {
    title: string;
    email: string;
    phone: string;
    address: string;
  };
}

interface ContentEditorProps {
  tenantId: string;
}

// ============================================================================
// Default Content
// ============================================================================

const DEFAULT_CONTENT: LandingPageContent = {
  hero: {
    title: 'Welcome to Our Hotel',
    subtitle: 'Experience comfort and hospitality',
    cta_text: 'Book Now',
    cta_link: '/book',
  },
  about: {
    title: 'About Us',
    content: '<p>Tell your guests about your hotel, its history, and what makes it special.</p>',
  },
  services: {
    title: 'Our Services',
    items: [],
  },
  contact: {
    title: 'Get in Touch',
    email: 'info@hotel.com',
    phone: '+1 234 567 8900',
    address: '123 Main Street, City, Country',
  },
};

// ============================================================================
// Content Editor Component
// ============================================================================

export function ContentEditor({ tenantId }: ContentEditorProps) {
  const [content, setContent] = useState<LandingPageContent>(DEFAULT_CONTENT);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Initialize TipTap editor for About section
  const editor = useEditor({
    extensions: [StarterKit],
    content: content.about.content,
    immediatelyRender: false, // Required for Next.js SSR to avoid hydration mismatches
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none min-h-[200px] px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring',
      },
    },
    onUpdate: ({ editor }) => {
      setContent((prev) => ({
        ...prev,
        about: {
          ...prev.about,
          content: editor.getHTML(),
        },
      }));
    },
  });

  // Fetch content on mount
  useEffect(() => {
    const fetchContent = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/content?tenant_id=${tenantId}`);

        if (response.ok) {
          const data = await response.json();
          if (data.content) {
            setContent(data.content);
            // Update editor content
            if (editor) {
              editor.commands.setContent(data.content.about.content);
            }
          }
        } else if (response.status !== 404) {
          console.error('Failed to fetch content:', response.statusText);
        }
      } catch (error) {
        console.error('Error fetching content:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContent();
  }, [tenantId, editor]);

  // Update editor when content changes externally
  useEffect(() => {
    if (editor && !editor.isFocused) {
      editor.commands.setContent(content.about.content);
    }
  }, [content.about.content, editor]);

  // Handle save
  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    setErrorMessage('');

    try {
      const response = await fetch('/api/content', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenant_id: tenantId,
          content,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save content');
      }

      setSaveStatus('success');
      // Clear success message after 3 seconds
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Save error:', error);
      setSaveStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save content');
    } finally {
      setIsSaving(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Save Status Alerts */}
      {saveStatus === 'success' && (
        <Alert className="bg-green-50 border-green-200 text-green-800">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            Content saved successfully! Changes are now live.
          </AlertDescription>
        </Alert>
      )}

      {saveStatus === 'error' && (
        <Alert className="bg-red-50 border-red-200 text-red-800">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {errorMessage || 'Failed to save content. Please try again.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Content Tabs */}
      <Tabs defaultValue="hero" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="hero">Hero</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
        </TabsList>

        {/* Hero Section */}
        <TabsContent value="hero" className="space-y-4 mt-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="hero-title">Hero Title</Label>
              <Input
                id="hero-title"
                type="text"
                value={content.hero.title}
                onChange={(e) =>
                  setContent((prev) => ({
                    ...prev,
                    hero: { ...prev.hero, title: e.target.value },
                  }))
                }
                placeholder="Welcome to Our Hotel"
                required
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="hero-subtitle">Subtitle</Label>
              <Input
                id="hero-subtitle"
                type="text"
                value={content.hero.subtitle}
                onChange={(e) =>
                  setContent((prev) => ({
                    ...prev,
                    hero: { ...prev.hero, subtitle: e.target.value },
                  }))
                }
                placeholder="Experience comfort and hospitality"
                className="mt-1.5"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="hero-cta-text">Call-to-Action Text</Label>
                <Input
                  id="hero-cta-text"
                  type="text"
                  value={content.hero.cta_text}
                  onChange={(e) =>
                    setContent((prev) => ({
                      ...prev,
                      hero: { ...prev.hero, cta_text: e.target.value },
                    }))
                  }
                  placeholder="Book Now"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="hero-cta-link">Call-to-Action Link</Label>
                <Input
                  id="hero-cta-link"
                  type="url"
                  value={content.hero.cta_link}
                  onChange={(e) =>
                    setContent((prev) => ({
                      ...prev,
                      hero: { ...prev.hero, cta_link: e.target.value },
                    }))
                  }
                  placeholder="/book"
                  className="mt-1.5"
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* About Section */}
        <TabsContent value="about" className="space-y-4 mt-6">
          <div>
            <Label htmlFor="about-title">About Section Title</Label>
            <Input
              id="about-title"
              type="text"
              value={content.about.title}
              onChange={(e) =>
                setContent((prev) => ({
                  ...prev,
                  about: { ...prev.about, title: e.target.value },
                }))
              }
              placeholder="About Us"
              required
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="about-content">About Content</Label>

            {/* TipTap Toolbar */}
            {editor && (
              <div className="flex items-center gap-1 p-2 border border-input rounded-md bg-gray-50 mt-1.5 mb-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().toggleBold().run()}
                  className={editor.isActive('bold') ? 'bg-gray-200' : ''}
                  aria-label="Toggle bold"
                >
                  <Bold className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                  className={editor.isActive('italic') ? 'bg-gray-200' : ''}
                  aria-label="Toggle italic"
                >
                  <Italic className="h-4 w-4" />
                </Button>
                <div className="w-px h-6 bg-gray-300 mx-1" />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().toggleBulletList().run()}
                  className={editor.isActive('bulletList') ? 'bg-gray-200' : ''}
                  aria-label="Toggle bullet list"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().toggleOrderedList().run()}
                  className={editor.isActive('orderedList') ? 'bg-gray-200' : ''}
                  aria-label="Toggle ordered list"
                >
                  <ListOrdered className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* TipTap Editor */}
            <EditorContent editor={editor} id="about-content" />
            <p className="text-xs text-gray-500 mt-2">
              Use the toolbar to format your content with bold, italic, and lists.
            </p>
          </div>
        </TabsContent>

        {/* Services Section */}
        <TabsContent value="services" className="space-y-4 mt-6">
          <Alert className="bg-blue-50 border-blue-200 text-blue-800">
            <AlertDescription>
              <strong>Coming in Phase 2:</strong> The services section will allow you to
              add multiple service items with titles and descriptions. For now, this
              section is a placeholder.
            </AlertDescription>
          </Alert>

          <div>
            <Label htmlFor="services-title">Services Section Title</Label>
            <Input
              id="services-title"
              type="text"
              value={content.services.title}
              onChange={(e) =>
                setContent((prev) => ({
                  ...prev,
                  services: { ...prev.services, title: e.target.value },
                }))
              }
              placeholder="Our Services"
              className="mt-1.5"
            />
          </div>

          <div className="p-4 border border-dashed border-gray-300 rounded-lg text-center text-gray-500">
            <p className="text-sm">
              Service items management will be available in the next update.
            </p>
          </div>
        </TabsContent>

        {/* Contact Section */}
        <TabsContent value="contact" className="space-y-4 mt-6">
          <div>
            <Label htmlFor="contact-title">Contact Section Title</Label>
            <Input
              id="contact-title"
              type="text"
              value={content.contact.title}
              onChange={(e) =>
                setContent((prev) => ({
                  ...prev,
                  contact: { ...prev.contact, title: e.target.value },
                }))
              }
              placeholder="Get in Touch"
              required
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="contact-email">Email Address</Label>
            <Input
              id="contact-email"
              type="email"
              value={content.contact.email}
              onChange={(e) =>
                setContent((prev) => ({
                  ...prev,
                  contact: { ...prev.contact, email: e.target.value },
                }))
              }
              placeholder="info@hotel.com"
              required
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="contact-phone">Phone Number</Label>
            <Input
              id="contact-phone"
              type="tel"
              value={content.contact.phone}
              onChange={(e) =>
                setContent((prev) => ({
                  ...prev,
                  contact: { ...prev.contact, phone: e.target.value },
                }))
              }
              placeholder="+1 234 567 8900"
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="contact-address">Address</Label>
            <Input
              id="contact-address"
              type="text"
              value={content.contact.address}
              onChange={(e) =>
                setContent((prev) => ({
                  ...prev,
                  contact: { ...prev.contact, address: e.target.value },
                }))
              }
              placeholder="123 Main Street, City, Country"
              className="mt-1.5"
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          size="lg"
          className="min-w-[200px]"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </div>
  );
}
