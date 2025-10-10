'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileUpload } from '@/components/admin/FileUpload';
import { KnowledgeBaseBrowser } from '@/components/admin/KnowledgeBaseBrowser';
import { useTenant } from '@/contexts/TenantContext';

export default function KnowledgeBasePage() {
  const { tenant } = useTenant();
  const [activeTab, setActiveTab] = useState('upload');

  if (!tenant) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading tenant data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Knowledge Base</h1>
        <p className="text-gray-600 mt-2">
          Manage documentation for {tenant.business_name || tenant.nombre_comercial}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="upload">Upload Documents</TabsTrigger>
          <TabsTrigger value="browse">Browse Knowledge Base</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-6">
          <FileUpload tenantId={tenant.tenant_id} />
        </TabsContent>

        <TabsContent value="browse" className="mt-6">
          <KnowledgeBaseBrowser tenantId={tenant.tenant_id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
