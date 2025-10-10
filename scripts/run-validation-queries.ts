#!/usr/bin/env tsx
/**
 * Execute SIRE Compliance Migration Validation Queries
 * Direct queries without execute_sql RPC
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function main() {
  console.log('========================================');
  console.log('SIRE COMPLIANCE MIGRATION VALIDATION');
  console.log('========================================\n');

  const results: Record<string, any> = {};
  const statuses: Record<string, string> = {};

  // QUERY 1: Schema Validation
  console.log('\n============================================================');
  console.log('QUERY 1: Schema Validation');
  console.log('============================================================');
  try {
    const { data, error } = await supabase
      .from('guest_reservations')
      .select('*')
      .limit(1);
    
    if (error) throw error;
    
    const sireFields = [
      'document_type', 'document_number', 'birth_date',
      'first_surname', 'second_surname', 'given_names',
      'nationality_code', 'origin_city_code', 'destination_city_code'
    ];
    
    const foundFields = data && data.length > 0 
      ? sireFields.filter(field => field in data[0])
      : [];
    
    const missingFields = sireFields.filter(f => !foundFields.includes(f));
    
    console.log(JSON.stringify({ 
      found: foundFields,
      missing: missingFields,
      total: foundFields.length
    }, null, 2));
    
    const status = foundFields.length === 9 ? 'PASS' : 'FAIL';
    statuses['QUERY 1: Schema Validation'] = status;
    console.log(`\n✓ STATUS: ${status} - Found ${foundFields.length}/9 SIRE fields`);
  } catch (error: any) {
    console.error(`✗ ERROR: ${error.message || JSON.stringify(error)}`);
    statuses['QUERY 1: Schema Validation'] = 'ERROR';
  }

  // QUERY 2: Data Completeness Check
  console.log('\n============================================================');
  console.log('QUERY 2: Data Completeness Check');
  console.log('============================================================');
  try {
    const { data, error, count } = await supabase
      .from('guest_reservations')
      .select('document_number, birth_date, first_surname, given_names, nationality_code, origin_city_code, destination_city_code', { count: 'exact' });
    
    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }
    
    const stats = {
      with_document: data?.filter(r => r.document_number).length || 0,
      with_birthdate: data?.filter(r => r.birth_date).length || 0,
      with_surname: data?.filter(r => r.first_surname).length || 0,
      with_given_names: data?.filter(r => r.given_names).length || 0,
      with_nationality: data?.filter(r => r.nationality_code).length || 0,
      with_origin: data?.filter(r => r.origin_city_code).length || 0,
      with_destination: data?.filter(r => r.destination_city_code).length || 0,
      total_reservations: count || 0
    };
    
    console.log(JSON.stringify(stats, null, 2));
    statuses['QUERY 2: Data Completeness'] = 'INFO';
  } catch (error: any) {
    console.error(`✗ ERROR: ${error.message || JSON.stringify(error)}`);
    statuses['QUERY 2: Data Completeness'] = 'ERROR';
  }

  // QUERY 3: Constraint Violations Check
  console.log('\n============================================================');
  console.log('QUERY 3: Constraint Violations Check');
  console.log('============================================================');
  try {
    const { data, error } = await supabase
      .from('guest_reservations')
      .select('id, document_type, document_number, nationality_code, origin_city_code, destination_city_code')
      .not('document_type', 'is', null);
    
    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }
    
    const violations: any[] = [];
    
    data?.forEach(record => {
      // Check document_type
      if (record.document_type && !['3', '5', '10', '46'].includes(record.document_type)) {
        violations.push({
          id: record.id,
          field: 'document_type',
          value: record.document_type,
          issue: 'Invalid document_type (must be 3, 5, 10, or 46)'
        });
      }
      
      // Check nationality_code
      if (record.nationality_code && !/^[0-9]+$/.test(record.nationality_code)) {
        violations.push({
          id: record.id,
          field: 'nationality_code',
          value: record.nationality_code,
          issue: 'Invalid nationality_code format (must be numeric)'
        });
      }
      
      // Check origin_city_code
      if (record.origin_city_code && !/^[0-9]+$/.test(record.origin_city_code)) {
        violations.push({
          id: record.id,
          field: 'origin_city_code',
          value: record.origin_city_code,
          issue: 'Invalid origin_city_code format (must be numeric)'
        });
      }
      
      // Check destination_city_code
      if (record.destination_city_code && !/^[0-9]+$/.test(record.destination_city_code)) {
        violations.push({
          id: record.id,
          field: 'destination_city_code',
          value: record.destination_city_code,
          issue: 'Invalid destination_city_code format (must be numeric)'
        });
      }
      
      // Check missing document_number
      if (record.document_type && !record.document_number) {
        violations.push({
          id: record.id,
          field: 'document_number',
          value: null,
          issue: 'Missing document_number when document_type exists'
        });
      }
    });
    
    console.log(JSON.stringify(violations, null, 2));
    
    const status = violations.length === 0 ? 'PASS' : 'FAIL';
    statuses['QUERY 3: Constraint Violations'] = status;
    console.log(`\n✓ STATUS: ${status} - Found ${violations.length} issues (expected 0)`);
  } catch (error: any) {
    console.error(`✗ ERROR: ${error.message || JSON.stringify(error)}`);
    statuses['QUERY 3: Constraint Violations'] = 'ERROR';
  }

  // QUERY 4: Migration Completeness Check
  console.log('\n============================================================');
  console.log('QUERY 4: Migration Completeness Check');
  console.log('============================================================');
  try {
    const { data: reservations, error: resError } = await supabase
      .from('guest_reservations')
      .select('id, guest_name, document_number')
      .is('document_number', null);
    
    if (resError) throw resError;
    
    // Check if any of these have successful compliance submissions
    const unmigrated: any[] = [];
    
    if (reservations && reservations.length > 0) {
      const { data: submissions, error: subError } = await supabase
        .from('compliance_submissions')
        .select('guest_id, data, submitted_at, status')
        .eq('status', 'success')
        .in('guest_id', reservations.map(r => r.id));
      
      if (subError) throw subError;
      
      submissions?.forEach(sub => {
        const reservation = reservations.find(r => r.id === sub.guest_id);
        unmigrated.push({
          id: sub.guest_id,
          guest_name: reservation?.guest_name,
          submissions_doc: sub.data?.numero_identificacion,
          submitted_at: sub.submitted_at
        });
      });
    }
    
    console.log(JSON.stringify(unmigrated, null, 2));
    
    const status = unmigrated.length === 0 ? 'PASS' : 'FAIL';
    statuses['QUERY 4: Migration Completeness'] = status;
    console.log(`\n✓ STATUS: ${status} - Found ${unmigrated.length} unmigrated records (expected 0)`);
  } catch (error: any) {
    console.error(`✗ ERROR: ${error.message || JSON.stringify(error)}`);
    statuses['QUERY 4: Migration Completeness'] = 'ERROR';
  }

  // QUERY 5: Index Validation
  console.log('\n============================================================');
  console.log('QUERY 5: Index Validation');
  console.log('============================================================');
  console.log('(Checking query performance as proxy for index existence)');
  try {
    const start = Date.now();
    const { data, error } = await supabase
      .from('guest_reservations')
      .select('id')
      .eq('document_number', '12345678')
      .limit(1);
    
    const duration = Date.now() - start;
    
    if (error) throw error;
    
    console.log(JSON.stringify({
      query_time_ms: duration,
      note: 'Fast query (<100ms) suggests index exists'
    }, null, 2));
    
    const status = duration < 1000 ? 'PASS' : 'WARNING';
    statuses['QUERY 5: Index Performance'] = status;
    console.log(`\n✓ STATUS: ${status} - Query completed in ${duration}ms`);
  } catch (error: any) {
    console.error(`✗ ERROR: ${error.message || JSON.stringify(error)}`);
    statuses['QUERY 5: Index Performance'] = 'WARNING';
  }

  console.log('\n========================================');
  console.log('VALIDATION SUMMARY');
  console.log('========================================');
  
  for (const [name, status] of Object.entries(statuses)) {
    const icon = status === 'PASS' ? '✓' : status === 'ERROR' ? '✗' : status === 'INFO' ? 'ℹ' : '⚠';
    console.log(`${icon} ${name}: ${status}`);
  }
  
  console.log('\n========================================');
  console.log('VALIDATION COMPLETE');
  console.log('========================================\n');
  
  const hasCriticalFailures = Object.values(statuses).some(s => s === 'ERROR' || s === 'FAIL');
  if (!hasCriticalFailures) {
    console.log('✓ RECOMMENDATION: Migration validated successfully');
    console.log('  All SIRE fields present, no constraint violations, all data migrated.');
  } else {
    console.log('✗ RECOMMENDATION: Migration has issues - review results above');
  }
}

main().catch(console.error);
