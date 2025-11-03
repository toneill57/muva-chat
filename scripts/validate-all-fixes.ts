import { createClient } from '@supabase/supabase-js';

async function validateFixes() {
  const supabaseUrl = 'https://ooaumjzaztmutltifhoq.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const results = {
    deadTuples: null as any,
    stats: null as any,
    indexes: null as any
  };

  // 6.1 Verify dead tuples reduced
  console.log('\n=== 6.1 DEAD TUPLES VERIFICATION ===\n');
  const { data: deadTuples, error: error1 } = await supabase.rpc('execute_sql', {
    query: `SELECT schemaname || '.' || relname as table_name, n_dead_tup, n_live_tup, ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup, 0), 1) as dead_pct, CASE WHEN n_live_tup > 50 AND n_dead_tup::float / NULLIF(n_live_tup, 0) > 0.2 THEN 'NEEDS VACUUM' ELSE 'OK' END as status FROM pg_stat_user_tables WHERE schemaname IN ('public', 'hotels') AND n_live_tup > 50 ORDER BY dead_pct DESC NULLS LAST`
  });

  if (error1) {
    console.error('Error 6.1:', error1);
  } else {
    results.deadTuples = deadTuples;
    console.table(deadTuples);
  }

  // 6.2 Verify statistics updated
  console.log('\n=== 6.2 STATISTICS VERIFICATION ===\n');
  const { data: stats, error: error2 } = await supabase.rpc('execute_sql', {
    query: `SELECT schemaname || '.' || relname as table_name, last_analyze, last_autoanalyze, GREATEST(last_analyze, last_autoanalyze) as most_recent_analyze, n_live_tup FROM pg_stat_user_tables WHERE schemaname IN ('public', 'hotels') AND n_live_tup > 100 ORDER BY GREATEST(last_analyze, last_autoanalyze) ASC NULLS FIRST`
  });

  if (error2) {
    console.error('Error 6.2:', error2);
  } else {
    results.stats = stats;
    console.table(stats);
  }

  // 6.3 Verify new indexes created
  console.log('\n=== 6.3 NEW INDEXES VERIFICATION ===\n');
  const { data: indexes, error: error3 } = await supabase.rpc('execute_sql', {
    query: `SELECT schemaname, relname as tablename, indexrelname as indexname, pg_size_pretty(pg_relation_size(i.indexrelid)) as index_size FROM pg_stat_user_indexes i WHERE i.schemaname IN ('public', 'hotels') AND i.indexrelname LIKE 'idx_%_fk' ORDER BY i.schemaname, i.relname, i.indexrelname`
  });

  if (error3) {
    console.error('Error 6.3:', error3);
  } else {
    results.indexes = indexes;
    console.table(indexes);
  }
  
  // Summary report
  console.log('\n=== VALIDATION SUMMARY ===\n');
  
  const needsVacuumCount = Array.isArray(results.deadTuples) 
    ? results.deadTuples.filter((row: any) => row.status === 'NEEDS VACUUM').length 
    : 0;
  
  const indexCount = Array.isArray(results.indexes) ? results.indexes.length : 0;
  const expectedIndexes = 13;
  
  console.log('Dead Tuples:');
  console.log('  Tables needing VACUUM:', needsVacuumCount);
  console.log('  Status:', needsVacuumCount === 0 ? 'PASS' : 'FAIL');
  
  console.log('\nIndexes:');
  console.log('  FK indexes found:', indexCount);
  console.log('  FK indexes expected:', expectedIndexes);
  console.log('  Status:', indexCount >= expectedIndexes ? 'PASS' : 'FAIL');
  
  if (indexCount > 0 && Array.isArray(results.indexes)) {
    console.log('\n  Created indexes:');
    results.indexes.forEach((idx: any) => {
      console.log('    -', idx.schemaname + '.' + idx.tablename + ' ->', idx.indexname, '(' + idx.index_size + ')');
    });
  }
  
  if (Array.isArray(results.stats)) {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const fresh = results.stats.filter((row: any) => new Date(row.most_recent_analyze) > oneDayAgo).length;
    const stale = results.stats.filter((row: any) => new Date(row.most_recent_analyze) < sevenDaysAgo).length;
    
    console.log('\nStatistics:');
    console.log('  Fresh (<24h):', fresh);
    console.log('  Stale (>7 days):', stale);
    console.log('  Status:', stale === 0 ? 'PASS' : 'WARN');
    
    if (stale > 0) {
      console.log('\n  Tables with stale statistics:');
      results.stats
        .filter((row: any) => new Date(row.most_recent_analyze) < sevenDaysAgo)
        .forEach((row: any) => {
          console.log('    -', row.table_name, '(last analyzed:', row.most_recent_analyze + ')');
        });
    }
  }
}

validateFixes();
