#!/usr/bin/env tsx
async function copyViaAPI(projectId: string, query: string, key: string) {
  const response = await fetch(
    `https://${projectId}.supabase.co/rest/v1/rpc/execute_sql`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({ query }),
    }
  );

  if (!response.ok) throw new Error(await response.text());
  return await response.json();
}

async function main() {
  const PROD_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const STAGING_KEY = process.env.SUPABASE_STAGING_SERVICE_ROLE_KEY!;
  const PROD_ID = 'ooaumjzaztmutltifhoq';
  const STAGING_ID = 'qlvkgniqcoisbnwwjfte';

  console.log('📋 Copying hotels.policies...\n');

  const batch = await copyViaAPI(PROD_ID, 'SELECT * FROM hotels.policies', PROD_KEY);
  console.log(`   Found ${batch.length} rows`);

  if (batch.length === 0) {
    console.log('⏭️  No data to copy');
    return;
  }

  const escape = (val: any): string => {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
    if (typeof val === 'boolean') return val ? 'true' : 'false';
    if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
    return String(val);
  };

  const values = batch.map((row: any) => {
    const cols = [
      row.policy_id, row.tenant_id, row.property_id, row.policy_type,
      row.policy_title, row.policy_content, row.is_active, row.created_at,
      row.updated_at, row.embedding, row.embedding_fast
    ].map(escape);
    return `(${cols.join(', ')})`;
  }).join(',\n');

  const insertQuery = `
    INSERT INTO hotels.policies (
      policy_id, tenant_id, property_id, policy_type, policy_title,
      policy_content, is_active, created_at, updated_at, embedding, embedding_fast
    ) VALUES ${values}
  `;

  await copyViaAPI(STAGING_ID, insertQuery, STAGING_KEY);
  console.log(`✅ ${batch.length} rows copied`);
}

main().catch(console.error);
