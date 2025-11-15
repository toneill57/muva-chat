#!/usr/bin/env tsx
/**
 * Final verification of Phase 2 completion
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
  console.log('PHASE 2 COMPLETION VERIFICATION');
  console.log('========================================\n');

  // 1. Check all high-priority tables are clean
  console.log('1. Dead Tuple Status (All Tables):');
  const deadTuples = await queryDatabase(`
    SELECT schemaname || '.' || relname as table_name,
           n_dead_tup, n_live_tup,
           ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup, 0), 1) as dead_pct
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
    ORDER BY dead_pct DESC NULLS LAST
    LIMIT 15;
  `);
  console.table(deadTuples);

  // 2. Find any tables with >10% bloat (should be none from Phase 1 & 2)
  const bloated = deadTuples.filter((row: any) => 
    parseFloat(row.dead_pct || '0') > 10
  );
  
  console.log('\n2. Tables with >10% Dead Tuples:');
  if (bloated.length === 0) {
    console.log('✅ None - All Phase 1 & 2 tables are clean!\n');
  } else {
    console.log('⚠️ Found tables with bloat:');
    console.table(bloated);
  }

  // 3. Check sequential scan issues
  console.log('\n3. Sequential Scan Analysis:');
  const seqScans = await queryDatabase(`
    SELECT schemaname || '.' || relname as table_name,
           seq_scan,
           idx_scan,
           ROUND(100.0 * seq_scan / NULLIF(seq_scan + idx_scan, 0), 1) as seq_scan_pct,
           n_live_tup
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
      AND (seq_scan + idx_scan) > 100
    ORDER BY seq_scan_pct DESC NULLS LAST
    LIMIT 10;
  `);
  console.table(seqScans);

  const highSeqScan = seqScans.filter((row: any) => 
    parseFloat(row.seq_scan_pct || '0') > 50
  );
  
  if (highSeqScan.length > 0) {
    console.log('\n⚠️ Tables with >50% sequential scans (may need indexes):');
    highSeqScan.forEach((row: any) => {
      console.log(`  - ${row.table_name}: ${row.seq_scan_pct}%`);
    });
  }

  // 4. Check tables that have never been analyzed
  console.log('\n4. Never Analyzed Tables:');
  const neverAnalyzed = await queryDatabase(`
    SELECT schemaname || '.' || relname as table_name,
           n_live_tup,
           last_analyze,
           last_autoanalyze
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
      AND last_analyze IS NULL 
      AND last_autoanalyze IS NULL
      AND n_live_tup > 0
    ORDER BY n_live_tup DESC;
  `);
  
  if (neverAnalyzed.length === 0) {
    console.log('✅ None - All tables with data have been analyzed!\n');
  } else {
    console.table(neverAnalyzed);
  }

  // 5. Summary
  console.log('\n========================================');
  console.log('SUMMARY:');
  console.log('========================================');
  console.log(`Total tables checked: ${deadTuples.length}`);
  console.log(`Tables with >10% bloat: ${bloated.length}`);
  console.log(`Tables with >50% seq scans: ${highSeqScan.length}`);
  console.log(`Never analyzed tables: ${neverAnalyzed.length}`);
  
  const phase1And2Tables = [
    'calendar_events',
    'prospective_sessions',
    'guest_reservations',
    'reservation_accommodations',
    'guest_conversations',
    'muva_content',
    'sire_cities'
  ];
  
  const phase1And2Clean = phase1And2Tables.every(table => {
    const row = deadTuples.find((r: any) => r.table_name === `public.${table}`);
    return row && parseFloat(row.dead_pct || '0') < 1;
  });
  
  console.log('\n✅ Phase 1 & 2 Tables Status:');
  if (phase1And2Clean) {
    console.log('   All 7 targeted tables have <1% bloat');
  } else {
    console.log('   ⚠️ Some tables still have bloat - investigate!');
  }
  
  console.log('\n========================================\n');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
