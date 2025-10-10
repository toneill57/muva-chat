import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verify() {
  console.log('🔍 Verifying settings columns in tenant_registry...\n');

  // Test by selecting from tenant_registry with new columns
  const { data, error } = await supabase
    .from('tenant_registry')
    .select('tenant_id, nombre_comercial, address, phone, email, social_media_links, seo_meta_description, seo_keywords')
    .eq('subdomain', 'simmerdown')
    .single();

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  console.log('✅ Columns verified! Sample data from SimmerDown:');
  console.log('   - Tenant ID:', data.tenant_id);
  console.log('   - Business Name:', data.nombre_comercial);
  console.log('   - Address:', data.address || '(null)');
  console.log('   - Phone:', data.phone || '(null)');
  console.log('   - Email:', data.email || '(null)');
  console.log('   - Social Media:', JSON.stringify(data.social_media_links) || '(null)');
  console.log('   - SEO Description:', data.seo_meta_description || '(null)');
  console.log('   - SEO Keywords:', data.seo_keywords || '(null)');
}

verify();
