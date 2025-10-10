import { readFileSync } from 'fs';

const SQL = readFileSync('scripts/FIX_FINAL_get_sire_guest_data.sql', 'utf-8');

async function executeDDL() {
  console.log('🔧 Executing get_sire_guest_data fix via Management API...\n');

  const response = await fetch('https://api.supabase.com/v1/projects/ooaumjzaztmutltifhoq/database/query', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: SQL })
  });

  const result = await response.json();

  if (!response.ok) {
    console.error('❌ HTTP Error:', response.status);
    console.error(result);
    process.exit(1);
  }

  // Management API returns [] for successful DDL
  if (Array.isArray(result) && result.length === 0) {
    console.log('✅ Function created successfully!\n');

    // Verify it exists
    console.log('🔍 Verifying function exists...');
    const verifyResponse = await fetch('https://api.supabase.com/v1/projects/ooaumjzaztmutltifhoq/database/query', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: "SELECT proname FROM pg_proc WHERE proname = 'get_sire_guest_data'"
      })
    });

    const verifyResult = await verifyResponse.json();
    console.log('Verification:', verifyResult);

    if (verifyResult.length > 0) {
      console.log('\n🎉 get_sire_guest_data function is now live!\n');
    }
  } else {
    console.error('❌ Unexpected result:', result);
    process.exit(1);
  }
}

executeDDL();
