import { createClient } from '@supabase/supabase-js';

const prodClient = createClient(
  'https://ooaumjzaztmutltifhoq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vYXVtanphenRtdXRsdGlmaG9xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg1NDIwOSwiZXhwIjoyMDcyNDMwMjA5fQ.ngQSR4E9UHWLcbDAhi0QJy3ffriuV2bi4rGxyHy8Eoc'
);

const stagingClient = createClient(
  'https://qlvkgniqcoisbnwwjfte.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsdmtnbmlxY29pc2Jud3dqZnRlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTUzNzgyNCwiZXhwIjoyMDc3MTEzODI0fQ.J51Dfz5-VokawODX4tI3Jx8Mz8-MuwWHCJnvp-7sZCI'
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
