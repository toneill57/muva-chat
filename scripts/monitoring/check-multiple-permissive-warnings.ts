#!/usr/bin/env tsx
/**
 * Check for multiple_permissive_policies warnings after consolidation
 */

const projectId = 'iyeueszchbvlutlcmvcb';
const url = `https://api.supabase.com/v1/projects/${projectId}/database/lint`;

const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error('❌ SUPABASE_ACCESS_TOKEN not found');
  process.exit(1);
}

const res = await fetch(url, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

if (!res.ok) {
  console.error('❌ API request failed:', res.status, res.statusText);
  process.exit(1);
}

const data = await res.json();
const warnings = data.filter((d: any) => d.name === 'multiple_permissive_policies');

console.log('📊 VALIDATION REPORT - RLS Policy Consolidation');
console.log('='.repeat(60));
console.log(`Total lint items: ${data.length}`);
console.log(`multiple_permissive_policies warnings: ${warnings.length}`);
console.log('='.repeat(60));

if (warnings.length > 0) {
  console.log('\n⚠️ REMAINING WARNINGS:');
  const byTable = new Map<string, any[]>();

  warnings.forEach((w: any) => {
    const table = w.metadata?.name || 'unknown';
    if (!byTable.has(table)) {
      byTable.set(table, []);
    }
    byTable.get(table)!.push(w);
  });

  byTable.forEach((warns, table) => {
    console.log(`\n  Table: ${table} (${warns.length} warnings)`);
    warns.forEach((w: any) => {
      console.log(`    - ${w.description}`);
    });
  });

  console.log('\n❌ CONSOLIDATION INCOMPLETE');
  process.exit(1);
} else {
  console.log('\n✅ SUCCESS! No multiple_permissive_policies warnings found!');
  console.log('✅ All 96 warnings eliminated');
  console.log('✅ RLS policy consolidation complete');
  process.exit(0);
}
