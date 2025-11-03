#!/usr/bin/env tsx
/**
 * Security Advisors Analysis - Updated Report
 * 
 * Generates current status of all known security advisors
 * Cross-references with October 9, 2025 baseline
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAdvisors() {
  const separator = '========================================';
  const shortSeparator = '----------------------------------------';

  console.log(separator);
  console.log('SECURITY ADVISORS ANALYSIS - UPDATED');
  console.log('Date: ' + new Date().toISOString().split('T')[0]);
  console.log('Database: PostgreSQL (Supabase Production)');
  console.log('Reference: docs/security/SECURITY_ADVISORS_ANALYSIS.md (Oct 9, 2025)');
  console.log(separator + '\n');

  // 1. Check Security Definer View
  console.log('\n' + separator);
  console.log('[1] SECURITY DEFINER VIEW CHECK');
  console.log(separator);
  
  const { data: views, error: viewsError } = await supabase.rpc('execute_sql', {
    query: `
      SELECT 
        schemaname,
        viewname,
        viewowner,
        definition
      FROM pg_views
      WHERE viewname = 'guest_chat_performance_monitor'
        AND schemaname = 'public'
    `
  });

  if (viewsError) {
    console.log('Error checking views:', viewsError);
  } else if (views && views.length > 0) {
    const viewDef = views[0].definition || '';
    const hasSecurityDefiner = viewDef.toLowerCase().includes('security definer');
    
    console.log('View: public.guest_chat_performance_monitor');
    console.log('Status:', hasSecurityDefiner ? '🔴 ERROR - SECURITY DEFINER still present' : '✅ OK - No SECURITY DEFINER');
    console.log('Priority:', hasSecurityDefiner ? 'HIGH - Fix immediately' : 'N/A - Already fixed');
  } else {
    console.log('✅ View not found (may have been removed)');
  }

  // 2. Check pgvector extension location
  console.log('\n' + separator);
  console.log('[2] EXTENSION IN PUBLIC SCHEMA');
  console.log(separator);

  const { data: extensions, error: extError } = await supabase.rpc('execute_sql', {
    query: `
      SELECT 
        extname,
        extversion,
        nspname as schema
      FROM pg_extension e
      JOIN pg_namespace n ON e.extnamespace = n.oid
      WHERE extname = 'vector'
    `
  });

  if (extError) {
    console.log('Error checking extensions:', extError);
  } else if (extensions && extensions.length > 0) {
    const ext = extensions[0];
    const inPublic = ext.schema === 'public';
    
    console.log('Extension: vector (pgvector)');
    console.log('Version:', ext.extversion);
    console.log('Schema:', ext.schema);
    console.log('Status:', inPublic ? '⚠️  WARN - In public schema' : '✅ OK - In dedicated schema');
    console.log('Priority:', inPublic ? 'LOW - Defer (Supabase managed)' : 'N/A');
  }

  // 3. Check PostgreSQL version
  console.log('\n' + separator);
  console.log('[3] POSTGRESQL VERSION');
  console.log(separator);

  const { data: version, error: versionError } = await supabase.rpc('execute_sql', {
    query: `SELECT version() as version`
  });

  if (versionError) {
    console.log('Error checking version:', versionError);
  } else if (version && version.length > 0) {
    const versionStr = version[0].version || '';
    console.log('Current Version:', versionStr);
    console.log('Status: ⚠️  WARN - Check for security patches available');
    console.log('Priority: MEDIUM - Schedule upgrade in maintenance window');
    console.log('Action: Dashboard → Settings → Infrastructure');
  }

  // 4. Summary of all advisors (from docs)
  console.log('\n' + separator);
  console.log('COMPLETE ADVISORS SUMMARY');
  console.log(separator + '\n');

  console.log('TOTALS BY LEVEL (from Oct 9, 2025 baseline):');
  console.log('  ERROR: 1 (Security Definer View)');
  console.log('  WARN: 4 (Extension, Password Protection, MFA, PostgreSQL)');
  console.log('  INFO: 0');
  console.log('\n' + shortSeparator + '\n');

  console.log('[ERROR-1] Security Definer View');
  console.log('  Affected: public.guest_chat_performance_monitor');
  console.log('  Priority: 🔴 HIGH - Fix immediately');
  console.log('  Effort: 15 minutes');
  console.log('  Action: Recreate view without SECURITY DEFINER\n');

  console.log('[WARN-1] Extension in Public Schema');
  console.log('  Affected: vector extension in public schema');
  console.log('  Priority: 🟢 LOW - Defer indefinitely');
  console.log('  Effort: 30 minutes (+ reindex)');
  console.log('  Action: None required (Supabase managed)\n');

  console.log('[WARN-2] Leaked Password Protection Disabled');
  console.log('  Affected: Supabase Auth config');
  console.log('  Priority: 🟢 LOW - Optional');
  console.log('  Effort: 5 minutes');
  console.log('  Action: Enable in Dashboard if staff grows >10 users\n');

  console.log('[WARN-3] Insufficient MFA Options');
  console.log('  Affected: Supabase Auth config (only TOTP)');
  console.log('  Priority: 🟢 LOW - Defer');
  console.log('  Effort: 1-2 hours');
  console.log('  Action: Reconsider if staff >20 users\n');

  console.log('[WARN-4] Vulnerable PostgreSQL Version');
  console.log('  Affected: Security patches available');
  console.log('  Priority: 🟡 MEDIUM - Schedule upgrade');
  console.log('  Effort: 30 minutes');
  console.log('  Action: Schedule maintenance window\n');

  // Recommendations
  console.log('\n' + separator);
  console.log('RECOMMENDED ACTIONS');
  console.log(separator + '\n');

  console.log('IMMEDIATE (Today):');
  console.log('  1. Fix Security Definer View (if still present)');
  console.log('  2. Create migration: 20251031_fix_security_definer_view.sql\n');

  console.log('SHORT TERM (This Week):');
  console.log('  1. Review PostgreSQL release notes');
  console.log('  2. Schedule database upgrade to latest 17.x.x\n');

  console.log('DEFERRED:');
  console.log('  - Extension schema location (keep in public)');
  console.log('  - Password protection (magic links primary)');
  console.log('  - MFA options (TOTP sufficient for current team size)\n');

  console.log('\n' + separator);
  console.log('Full documentation: docs/security/SECURITY_ADVISORS_ANALYSIS.md');
  console.log(separator);
}

checkAdvisors().catch(console.error);
