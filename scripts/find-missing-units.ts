import { createClient } from '@supabase/supabase-js';

const prodClient = createClient(
  'https://ooaumjzaztmutltifhoq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vYXVtanphenRtdXRsdGlmaG9xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg1NDIwOSwiZXhwIjoyMDcyNDMwMjA5fQ.ngQSR4E9UHWLcbDAhi0QJy3ffriuV2bi4rGxyHy8Eoc'
);

const stagingClient = createClient(
  'https://qlvkgniqcoisbnwwjfte.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsdmtnbmlxY29pc2Jud3dqZnRlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTUzNzgyNCwiZXhwIjoyMDc3MTEzODI0fQ.J51Dfz5-VokawODX4tI3Jx8Mz8-MuwWHCJnvp-7sZCI'
);

async function findMissingUnits() {
  console.log('Finding missing accommodation_units_public rows...\n');
  
  const { data: prodUnits } = await prodClient
    .from('accommodation_units_public')
    .select('unit_id')
    .order('unit_id');
  
  const { data: stagingUnits } = await stagingClient
    .from('accommodation_units_public')
    .select('unit_id')
    .order('unit_id');
  
  const prodIds = new Set(prodUnits?.map(u => u.unit_id) || []);
  const stagingIds = new Set(stagingUnits?.map(u => u.unit_id) || []);
  
  const missingIds = Array.from(prodIds).filter(id => !stagingIds.has(id));
  
  console.log(`Production: ${prodIds.size} rows`);
  console.log(`Staging: ${stagingIds.size} rows`);
  console.log(`Missing: ${missingIds.length} rows\n`);
  
  if (missingIds.length > 0) {
    console.log('Missing unit_ids:');
    missingIds.forEach(id => console.log(`  - ${id}`));
    
    console.log('\nFetching missing rows...');
    const { data: missingRows } = await prodClient
      .from('accommodation_units_public')
      .select('*')
      .in('unit_id', missingIds);
    
    if (missingRows && missingRows.length > 0) {
      console.log(`\nCopying ${missingRows.length} rows to staging...`);
      const { error } = await stagingClient
        .from('accommodation_units_public')
        .insert(missingRows);
      
      if (error) {
        console.error('Error:', error);
      } else {
        console.log('SUCCESS!');
        
        const { count } = await stagingClient
          .from('accommodation_units_public')
          .select('*', { count: 'exact', head: true });
        
        console.log(`\nFinal staging count: ${count}`);
      }
    }
  }
}

findMissingUnits().catch(console.error);
