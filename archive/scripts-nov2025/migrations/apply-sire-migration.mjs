import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { Client } = pg;

async function applyMigration() {
  console.log('📦 Applying sire_submissions migration...\n');

  // Read DATABASE_URL from environment
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not found in environment variables');
    process.exit(1);
  }

  console.log('🔗 Connecting to database...');

  const client = new Client({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Read migration file
    const migrationPath = join(__dirname, '../migrations/20251126180000_create_sire_submissions.sql');
    const sql = readFileSync(migrationPath, 'utf-8');

    console.log('📄 Executing migration SQL...');
    console.log('---');
    console.log(sql.substring(0, 200) + '...\n');

    await client.query(sql);

    console.log('✅ Migration applied successfully!\n');

    // Verify table was created
    console.log('🔍 Verifying table creation...');
    const result = await client.query(`
      SELECT
        table_name,
        column_name,
        data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'sire_submissions'
      ORDER BY ordinal_position;
    `);

    if (result.rows.length > 0) {
      console.log('✅ Table sire_submissions created with columns:');
      result.rows.forEach(row => {
        console.log(`   - ${row.column_name} (${row.data_type})`);
      });
    } else {
      console.log('⚠️  Table verification failed - no columns found');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.code === '42P07') {
      console.log('ℹ️  Table already exists - migration may have been applied previously');
    } else {
      process.exit(1);
    }
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

applyMigration();
