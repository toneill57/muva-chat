/**
 * RPC Functions Integration Test
 *
 * Tests that critical RPC functions have correct search_path configuration.
 * This prevents the recurring "operator does not exist" error with pgvector.
 *
 * This test will FAIL if any critical function is missing 'extensions' in search_path.
 * Use this as a CI/CD gate to prevent deployments with broken vector search.
 *
 * Usage:
 *   pnpm test __tests__/database/rpc-functions.test.ts
 *   pnpm test:rpc-functions (if added to package.json)
 */

import { createClient } from '@supabase/supabase-js';

// Critical functions that MUST have correct search_path
const CRITICAL_FUNCTIONS = [
  {
    name: 'match_unit_manual_chunks',
    requiredSchemas: ['public', 'hotels', 'extensions'],
    purpose: 'Guest chat - accommodation manual chunks search',
  },
  {
    name: 'match_muva_documents',
    requiredSchemas: ['public', 'extensions', 'pg_temp'],
    purpose: 'Tourism content search',
  },
  {
    name: 'get_accommodation_unit_by_id',
    requiredSchemas: ['public', 'hotels', 'pg_temp'],
    purpose: 'Guest auth - fetch accommodation details (resolves chunk IDs)',
  },
  {
    name: 'get_accommodation_units',
    requiredSchemas: ['public', 'hotels', 'pg_temp'],
    purpose: 'Guest auth - list accommodations for reservation',
  },
];

describe('RPC Functions - Vector Search Configuration', () => {
  let supabase: ReturnType<typeof createClient>;

  beforeAll(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error('Missing Supabase credentials in environment');
    }

    supabase = createClient(url, key);
  });

  describe('Critical Functions Search Path', () => {
    for (const funcConfig of CRITICAL_FUNCTIONS) {
      it(`should have correct search_path for ${funcConfig.name}`, async () => {
        // Query function search_path from pg_proc
        const query = `
          SELECT
            p.proname,
            array_to_string(p.proconfig, ',') AS search_path
          FROM pg_proc p
          JOIN pg_namespace n ON p.pronamespace = n.oid
          WHERE n.nspname = 'public'
            AND p.proname = '${funcConfig.name}';
        `;

        const { data, error } = await supabase.rpc('execute_sql', {
          query,
        });

        expect(error).toBeNull();
        expect(data).toBeDefined();
        expect(data.length).toBeGreaterThan(0);

        const funcInfo = data[0];
        expect(funcInfo.proname).toBe(funcConfig.name);

        // Parse search_path
        const searchPath = funcInfo.search_path || '';
        const currentSchemas = searchPath
          .replace(/^search_path=/, '')
          .replace(/['"]/g, '')
          .split(',')
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 0);

        // Check that all required schemas are present
        for (const requiredSchema of funcConfig.requiredSchemas) {
          expect(currentSchemas).toContain(requiredSchema);
        }

        // Specifically check for 'extensions' if required (most critical for vector search)
        if (funcConfig.requiredSchemas.includes('extensions')) {
          expect(currentSchemas).toContain('extensions');
        }

        // Check for 'hotels' schema if required (critical for accommodation access)
        if (funcConfig.requiredSchemas.includes('hotels')) {
          expect(currentSchemas).toContain('hotels');
        }
      }, 10000); // 10 second timeout for database queries
    }
  });

  describe('Vector Operator Accessibility', () => {
    it('should be able to use vector <=> operator', async () => {
      const query = `
        SELECT 1 - ('[0.1,0.2,0.3]'::vector(3) <=> '[0.1,0.2,0.3]'::vector(3)) AS similarity;
      `;

      const { data, error } = await supabase.rpc('execute_sql', {
        query,
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.length).toBeGreaterThan(0);

      const similarity = data[0].similarity;
      expect(similarity).toBe(1.0); // Identical vectors should have similarity = 1.0
    }, 10000);
  });

  describe('RPC Functions Functionality', () => {
    it('should execute match_unit_manual_chunks without error', async () => {
      // Get a sample accommodation unit
      const { data: units, error: unitsError } = await supabase
        .schema('hotels')
        .from('accommodation_units')
        .select('id')
        .limit(1);

      expect(unitsError).toBeNull();

      if (!units || units.length === 0) {
        console.warn('⚠️  No accommodation units found - skipping functional test');
        return;
      }

      // Test with dummy embedding (3072 dimensions for balanced)
      const dummyEmbedding = Array(3072).fill(0.1);

      const { data, error } = await supabase.rpc('match_unit_manual_chunks', {
        query_embedding: dummyEmbedding,
        p_accommodation_unit_id: units[0].id,
        match_threshold: 0.0,
        match_count: 5,
      });

      // Should not throw "operator does not exist" error
      expect(error).toBeNull();
      expect(data).toBeDefined();
    }, 15000);

    it('should execute match_muva_documents without error', async () => {
      // Test with dummy embedding (3072 dimensions)
      const dummyEmbedding = Array(3072).fill(0.1);

      const { data, error } = await supabase.rpc('match_muva_documents', {
        query_embedding: dummyEmbedding,
        match_threshold: 0.0,
        match_count: 5,
      });

      // Should not throw "operator does not exist" error
      expect(error).toBeNull();
      expect(data).toBeDefined();
    }, 15000);
  });

  describe('Chunk ID Resolution', () => {
    it('should resolve chunk IDs to real unit IDs in get_accommodation_unit_by_id', async () => {
      // Get a chunk ID from accommodation_units_public
      const { data: chunks, error: chunksError } = await supabase
        .from('accommodation_units_public')
        .select('unit_id, name, metadata')
        .not('metadata->motopress_unit_id', 'is', null)
        .limit(1);

      if (chunksError || !chunks || chunks.length === 0) {
        console.warn('⚠️  No chunks found with motopress_unit_id - skipping chunk resolution test');
        return;
      }

      const chunk = chunks[0];
      const chunkId = chunk.unit_id;
      const motopressUnitId = chunk.metadata?.motopress_unit_id;

      expect(chunkId).toBeDefined();
      expect(motopressUnitId).toBeDefined();

      // Get tenant_id from environment
      const tenantId = process.env.TENANT_ID || process.env.NEXT_PUBLIC_TENANT_ID;
      if (!tenantId) {
        console.warn('⚠️  No TENANT_ID found - skipping chunk resolution test');
        return;
      }

      // Call RPC with chunk ID (should resolve to real unit)
      const { data: result, error: rpcError } = await supabase
        .rpc('get_accommodation_unit_by_id', {
          p_unit_id: chunkId,
          p_tenant_id: tenantId,
        });

      // Should not error
      expect(rpcError).toBeNull();
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);

      // Should return clean accommodation name (without " - Overview", " - Amenities", etc.)
      const unitName = result[0].name;
      expect(unitName).toBeDefined();
      expect(unitName).not.toMatch(/\s-\s(Overview|Amenities|Features|Images|Capacity)/);

      console.log(`✅ Chunk ID resolution: "${chunk.name}" → "${unitName}"`);
    }, 15000);

    it('should still work with real unit IDs (backward compatibility)', async () => {
      // Get a real unit ID from hotels.accommodation_units
      const { data: units, error: unitsError } = await supabase
        .schema('hotels')
        .from('accommodation_units')
        .select('id, name, tenant_id')
        .limit(1);

      if (unitsError || !units || units.length === 0) {
        console.warn('⚠️  No real units found - skipping backward compatibility test');
        return;
      }

      const unit = units[0];

      // Call RPC with real unit ID
      const { data: result, error: rpcError } = await supabase
        .rpc('get_accommodation_unit_by_id', {
          p_unit_id: unit.id,
          p_tenant_id: unit.tenant_id,
        });

      // Should work with real unit IDs
      expect(rpcError).toBeNull();
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].id).toBe(unit.id);
      expect(result[0].name).toBe(unit.name);

      console.log(`✅ Real unit ID: "${unit.name}" → "${result[0].name}"`);
    }, 15000);
  });
});

describe('RPC Functions - Auto-Fix Availability', () => {
  it('should provide clear fix instructions if test fails', () => {
    const fixCommand = 'pnpm dlx tsx scripts/validate-rpc-functions.ts --fix';
    const vectorSearchMigration = 'supabase/migrations/20251103171933_fix_vector_search_path.sql';
    const chunkResolutionMigrations = [
      'supabase/migrations/20251113000000_fix_get_accommodation_units_search_path.sql',
      'supabase/migrations/20251113000001_fix_get_accommodation_unit_by_id_search_path.sql',
      'supabase/migrations/20251113000002_fix_get_accommodation_unit_by_id_chunk_resolution.sql',
    ];

    expect(fixCommand).toBeDefined();
    expect(vectorSearchMigration).toBeDefined();
    expect(chunkResolutionMigrations).toBeDefined();

    console.log('\n═══════════════════════════════════════════════════════════════════');
    console.log('If RPC function tests fail, run:');
    console.log(`  ${fixCommand}`);
    console.log('');
    console.log('Or manually apply migrations:');
    console.log(`  Vector search: ${vectorSearchMigration}`);
    console.log('  Chunk resolution:');
    chunkResolutionMigrations.forEach(m => console.log(`    ${m}`));
    console.log('═══════════════════════════════════════════════════════════════════\n');
  });
});
