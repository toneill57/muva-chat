#!/usr/bin/env tsx
/**
 * Check sequential scan improvement for muva_content
 */

const PROJECT_ID = 'ooaumjzaztmutltifhoq';

async function queryDatabase(sql: string): Promise<any> {
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error('SUPABASE_ACCESS_TOKEN not found');
  }

  const response = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_ID}/database/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: sql })
    }
  );

  const result = await response.json();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${JSON.stringify(result)}`);
  }
  return result;
}

async function main() {
  console.log('Checking muva_content scan statistics...\n');

  const sql = `
    SELECT schemaname || '.' || relname as table_name,
           seq_scan,
           idx_scan,
           ROUND(100.0 * seq_scan / NULLIF(seq_scan + idx_scan, 0), 1) as seq_scan_pct,
           n_live_tup,
           n_dead_tup
    FROM pg_stat_user_tables
    WHERE schemaname = 'public' 
      AND relname = 'muva_content';
  `;

  const result = await queryDatabase(sql);
  
  console.log('muva_content scan statistics:');
  console.table(result);
  
  if (result[0]) {
    const row = result[0];
    console.log(`\nSequential scan percentage: ${row.seq_scan_pct}%`);
    console.log(`Previous: 93.7%`);
    console.log(`Improvement: ${(93.7 - parseFloat(row.seq_scan_pct)).toFixed(1)}% reduction\n`);
    
    if (parseFloat(row.seq_scan_pct) < 20) {
      console.log('✅ Sequential scans are now below 20% threshold');
    } else {
      console.log('⚠️ Sequential scans still above 20% threshold');
      console.log('Note: Statistics may need time to update after VACUUM');
    }
  }
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
