#!/usr/bin/env tsx
/**
 * Verify ONLY Phase 1 & 2 targeted tables
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
  console.log('========================================');
  console.log('PHASE 1 & 2 TARGETED TABLES VERIFICATION');
  console.log('========================================\n');

  const targetTables = [
    'calendar_events',
    'prospective_sessions',
    'guest_reservations',
    'reservation_accommodations',
    'guest_conversations',
    'muva_content',
    'sire_cities'
  ];

  const tableList = targetTables.map(t => `'${t}'`).join(', ');

  // Check dead tuples for targeted tables
  console.log('Dead Tuple Status (Phase 1 & 2 Tables):');
  const deadTuples = await queryDatabase(`
    SELECT schemaname || '.' || relname as table_name,
           n_dead_tup, n_live_tup,
           ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup, 0), 1) as dead_pct
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
      AND relname IN (${tableList})
    ORDER BY dead_pct DESC NULLS LAST;
  `);
  console.table(deadTuples);

  // Check if all are < 1%
  const allClean = deadTuples.every((row: any) => 
    parseFloat(row.dead_pct || '0') < 1
  );

  console.log('\n========================================');
  if (allClean) {
    console.log('✅ SUCCESS: All 7 Phase 1 & 2 tables have <1% bloat!');
  } else {
    console.log('⚠️ WARNING: Some tables still have bloat');
    const bloated = deadTuples.filter((row: any) => 
      parseFloat(row.dead_pct || '0') >= 1
    );
    console.table(bloated);
  }
  console.log('========================================\n');

  // Summary stats
  const totalDeadTuples = deadTuples.reduce((sum: number, row: any) => 
    sum + row.n_dead_tup, 0
  );
  const totalLiveTuples = deadTuples.reduce((sum: number, row: any) => 
    sum + row.n_live_tup, 0
  );

  console.log('SUMMARY:');
  console.log(`Tables checked: ${deadTuples.length}`);
  console.log(`Total live tuples: ${totalLiveTuples.toLocaleString()}`);
  console.log(`Total dead tuples: ${totalDeadTuples.toLocaleString()}`);
  console.log(`Overall bloat: ${(100.0 * totalDeadTuples / totalLiveTuples).toFixed(2)}%`);
  console.log('');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
