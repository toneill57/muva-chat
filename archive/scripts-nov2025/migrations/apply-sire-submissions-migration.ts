import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

(async () => {
  try {
    console.log('📦 Applying sire_submissions migration...');

    const migrationPath = join(process.cwd(), 'migrations/20251126180000_create_sire_submissions.sql');
    const sql = readFileSync(migrationPath, 'utf-8');

    // Execute the migration
    const { data, error } = await supabase.rpc('execute_sql', { query: sql });

    if (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }

    console.log('✅ Migration applied successfully!');
    console.log('📊 Result:', data);

    // Verify table was created
    const { data: tables, error: verifyError } = await supabase
      .from('sire_submissions')
      .select('*')
      .limit(0);

    if (verifyError) {
      console.error('⚠️  Table verification failed:', verifyError);
    } else {
      console.log('✅ Table sire_submissions verified!');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
})();
