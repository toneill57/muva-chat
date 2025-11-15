import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function executeQuery(query: string): Promise<any[]> {
  const { data, error } = await supabase.rpc('execute_sql', { query });
  if (error) throw error;
  return typeof data === 'string' ? JSON.parse(data) : data;
}

async function checkSecurityAdvisors() {
  console.log('='.repeat(70));
  console.log('SECURITY ADVISORS CHECK');
  console.log('='.repeat(70));
  console.log('');

  const issues: Array<{name: string; level: string; message: string}> = [];

  // Check 1: RLS Enabled
  const rlsQuery = `
    SELECT tablename, rowsecurity
    FROM pg_tables
    WHERE schemaname IN ('public', 'hotels')
    AND rowsecurity = false
    ORDER BY tablename;
  `;
  const rlsResults = await executeQuery(rlsQuery);
  if (rlsResults.length > 0) {
    issues.push({
      name: 'tables_without_rls',
      level: 'WARN',
      message: rlsResults.length + ' tables without RLS enabled'
    });
  }

  // Check 2: Security Definer Views
  const viewsQuery = `
    SELECT schemaname, viewname
    FROM pg_views
    WHERE schemaname IN ('public', 'hotels')
    AND definition ILIKE '%security definer%';
  `;
  const viewsResults = await executeQuery(viewsQuery);
  if (viewsResults.length > 0) {
    issues.push({
      name: 'security_definer_views',
      level: 'ERROR',
      message: viewsResults.length + ' views with SECURITY DEFINER'
    });
  }

  // Check 3: Security Definer Functions
  const funcsQuery = `
    SELECT n.nspname, p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname IN ('public', 'hotels')
    AND p.prosecdef = true;
  `;
  const funcsResults = await executeQuery(funcsQuery);
  if (funcsResults.length > 0) {
    issues.push({
      name: 'security_definer_functions',
      level: 'WARN',
      message: funcsResults.length + ' functions with SECURITY DEFINER'
    });
  }

  return issues;
}

async function checkPerformanceAdvisors() {
  console.log('');
  console.log('='.repeat(70));
  console.log('PERFORMANCE ADVISORS CHECK');
  console.log('='.repeat(70));
  console.log('');

  const issues: Array<{name: string; level: string; message: string}> = [];

  // Check 1: Dead Tuples
  const deadTuplesQuery = `
    SELECT schemaname, tablename, n_dead_tup, n_live_tup,
           ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup, 0), 1) as dead_pct
    FROM pg_stat_user_tables
    WHERE schemaname IN ('public', 'hotels')
    AND n_live_tup > 50
    AND (100.0 * n_dead_tup / NULLIF(n_live_tup, 0)) > 20
    ORDER BY dead_pct DESC;
  `;
  const deadResults = await executeQuery(deadTuplesQuery);
  if (deadResults.length > 0) {
    const maxDeadPct = Math.max(...deadResults.map((r: any) => r.dead_pct));
    issues.push({
      name: 'tables_with_bloat',
      level: maxDeadPct > 50 ? 'ERROR' : 'WARN',
      message: deadResults.length + ' tables with >20% dead tuples (max: ' + maxDeadPct + '%)'
    });
  }

  // Check 2: Sequential Scans
  const seqScansQuery = `
    SELECT schemaname, tablename, seq_scan, idx_scan,
           ROUND(100.0 * seq_scan / NULLIF(seq_scan + idx_scan, 0), 1) as seq_pct
    FROM pg_stat_user_tables
    WHERE schemaname IN ('public', 'hotels')
    AND seq_scan > 1000
    AND seq_scan > idx_scan
    ORDER BY seq_scan DESC
    LIMIT 5;
  `;
  const seqResults = await executeQuery(seqScansQuery);
  if (seqResults.length > 0) {
    issues.push({
      name: 'excessive_sequential_scans',
      level: 'WARN',
      message: seqResults.length + ' tables with excessive sequential scans (missing indexes)'
    });
  }

  // Check 3: Unused Indexes
  const unusedQuery = `
    SELECT schemaname, tablename, indexname, idx_scan
    FROM pg_stat_user_indexes
    WHERE schemaname IN ('public', 'hotels')
    AND idx_scan = 0
    AND pg_relation_size(indexrelid) > 100000
    LIMIT 10;
  `;
  const unusedResults = await executeQuery(unusedQuery);
  if (unusedResults.length > 0) {
    issues.push({
      name: 'unused_indexes',
      level: 'INFO',
      message: unusedResults.length + '+ unused indexes (>100KB)'
    });
  }

  // Check 4: Stale Statistics
  const statsQuery = `
    SELECT schemaname, tablename,
           EXTRACT(DAY FROM (NOW() - GREATEST(last_analyze, last_autoanalyze))) as days_old
    FROM pg_stat_user_tables
    WHERE schemaname IN ('public', 'hotels')
    AND n_live_tup > 100
    AND EXTRACT(DAY FROM (NOW() - GREATEST(last_analyze, last_autoanalyze))) > 7
    ORDER BY days_old DESC;
  `;
  const statsResults = await executeQuery(statsQuery);
  if (statsResults.length > 0) {
    issues.push({
      name: 'stale_statistics',
      level: 'WARN',
      message: statsResults.length + ' tables with statistics >7 days old'
    });
  }

  return issues;
}

function printAdvisors(type: string, issues: Array<{name: string; level: string; message: string}>) {
  console.log(type.toUpperCase() + ' RESULTS:');
  
  const grouped: Record<string, typeof issues> = {
    ERROR: [],
    WARN: [],
    INFO: []
  };
  
  issues.forEach(issue => {
    grouped[issue.level].push(issue);
  });
  
  console.log('  ERROR: ' + grouped.ERROR.length);
  console.log('  WARN: ' + grouped.WARN.length);
  console.log('  INFO: ' + grouped.INFO.length);
  console.log('  TOTAL: ' + issues.length);
  console.log('');
  
  if (issues.length > 0) {
    issues.forEach((issue, idx) => {
      console.log((idx + 1) + '. [' + issue.level + '] ' + issue.name);
      console.log('   ' + issue.message);
    });
  } else {
    console.log('✅ No issues found');
  }
  
  return grouped;
}

async function main() {
  try {
    const securityIssues = await checkSecurityAdvisors();
    const secGrouped = printAdvisors('security', securityIssues);
    
    const perfIssues = await checkPerformanceAdvisors();
    const perfGrouped = printAdvisors('performance', perfIssues);
    
    console.log('');
    console.log('='.repeat(70));
    console.log('FINAL SUMMARY');
    console.log('='.repeat(70));
    console.log('');
    console.log('SECURITY:');
    console.log('  ERROR: ' + secGrouped.ERROR.length);
    console.log('  WARN: ' + secGrouped.WARN.length);
    console.log('  INFO: ' + secGrouped.INFO.length);
    console.log('  TOTAL: ' + securityIssues.length);
    console.log('');
    console.log('PERFORMANCE:');
    console.log('  ERROR: ' + perfGrouped.ERROR.length);
    console.log('  WARN: ' + perfGrouped.WARN.length);
    console.log('  INFO: ' + perfGrouped.INFO.length);
    console.log('  TOTAL: ' + perfIssues.length);
    console.log('');
    console.log('TOTAL ISSUES: ' + (securityIssues.length + perfIssues.length));
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
