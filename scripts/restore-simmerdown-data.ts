import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function restore() {
  const { error } = await supabase
    .from('tenant_registry')
    .update({
      nombre_comercial: 'SimmerDown Guest House',
      razon_social: 'SimmerDown Guest House SAS'
    })
    .eq('subdomain', 'simmerdown');

  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('✅ Restored original SimmerDown data');
  }
}

restore();
