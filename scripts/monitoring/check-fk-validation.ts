import { createClient } from '@supabase/supabase-js';

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('🔍 Checking FK constraints on accommodation_units_manual_chunks...\n');

  // Check tables exist
  const { data: tables, error: tablesError } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .in('table_name', ['accommodation_manuals', 'accommodation_units_manual_chunks']);

  if (tablesError) {
    console.error('Error checking tables:', tablesError);
  } else {
    console.log('📊 Tables found:');
    console.table(tables);
  }

  // Check FK constraints - let's query the pg_catalog directly
  const { data: constraints, error: constraintsError } = await supabase.rpc('execute_raw_sql', {
    sql: `
      SELECT
        con.conname AS constraint_name,
        att.attname AS column_name,
        cl.relname AS table_name,
        fcl.relname AS foreign_table_name,
        fatt.attname AS foreign_column_name
      FROM pg_constraint con
      JOIN pg_class cl ON con.conrelid = cl.oid
      JOIN pg_attribute att ON att.attnum = ANY(con.conkey) AND att.attrelid = cl.oid
      JOIN pg_class fcl ON con.confrelid = fcl.oid
      JOIN pg_attribute fatt ON fatt.attnum = ANY(con.confkey) AND fatt.attrelid = fcl.oid
      WHERE con.contype = 'f'
        AND cl.relname = 'accommodation_units_manual_chunks'
        AND att.attname = 'manual_id';
    `
  });

  if (constraintsError) {
    console.log('\n⚠️ RPC execute_raw_sql not available, trying alternative method...\n');

    // Alternative: Check via REST API metadata
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`,
      {
        headers: {
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`
        }
      }
    );

    console.log('API available, checking table structure via direct query...');

    // Let's check if the migration file exists and read it
    const fs = require('fs');
    const path = require('path');
    const migrationPath = path.join(__dirname, '../supabase/migrations/20251109000000_fix_manual_system_fk_and_rls.sql');

    if (fs.existsSync(migrationPath)) {
      const content = fs.readFileSync(migrationPath, 'utf-8');
      console.log('\n✅ Migration file found!');

      // Check if it contains the correct FK
      if (content.includes('REFERENCES accommodation_manuals(id)')) {
        console.log('✅ Migration contains correct FK: accommodation_manuals(id)');
      } else if (content.includes('REFERENCES accommodation_units_manuals')) {
        console.log('❌ Migration contains WRONG FK: accommodation_units_manuals');
      }

      // Check if it drops the old constraint
      if (content.includes('DROP CONSTRAINT IF EXISTS')) {
        console.log('✅ Migration drops old constraint');
      }
    } else {
      console.log('❌ Migration file not found at:', migrationPath);
    }
  } else {
    console.log('\n✅ FK Constraints found:');
    console.table(constraints);
  }
}

main().catch(console.error);
