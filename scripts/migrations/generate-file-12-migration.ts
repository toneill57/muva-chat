import { createClient } from '@supabase/supabase-js';

const prodClient = createClient(
  'https://kprqghwdnaykxhostivv.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY_PROD || '[NEEDS_UPDATE]'
);

const stagingClient = createClient(
  'https://bddcvjoeoiekzfetvxoe.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY_STAGING || '[NEEDS_UPDATE]'
);

async function copySireContent() {
  console.log('Fetching all 8 rows from production sire_content...');
  
  const { data: prodData, error: prodError } = await prodClient
    .from('sire_content')
    .select('*')
    .order('id');
  
  if (prodError) {
    console.error('Error fetching production data:', prodError);
    process.exit(1);
  }
  
  console.log(`Found ${prodData.length} rows in production`);
  
  if (!prodData || prodData.length === 0) {
    console.log('No data to copy');
    process.exit(0);
  }
  
  console.log('Inserting into staging...');
  
  const { error: insertError } = await stagingClient
    .from('sire_content')
    .insert(prodData);
  
  if (insertError) {
    console.error('Error inserting data:', insertError);
    process.exit(1);
  }
  
  console.log(`Successfully copied ${prodData.length} rows`);
  
  const { count } = await stagingClient
    .from('sire_content')
    .select('*', { count: 'exact', head: true });
  
  console.log(`Final staging count: ${count}`);
}

copySireContent().catch(console.error);
