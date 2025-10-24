import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

test.describe('Database - Embedding Validation', () => {

  let supabase: ReturnType<typeof createClient>;

  test.beforeAll(() => {
    supabase = createClient(supabaseUrl, supabaseKey);
  });

  test('should have manual chunks in database', async () => {
    const { data, error } = await supabase
      .from('accommodation_units_manual_chunks')
      .select('id, section_title, chunk_content', { count: 'exact' })
      .eq('tenant_id', 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf')
      .limit(1);

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.length).toBeGreaterThan(0);
  });

  test('should have accommodation unit references', async () => {
    const { data, error } = await supabase
      .from('accommodation_units_manual_chunks')
      .select('id, accommodation_unit_id')
      .eq('tenant_id', 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf')
      .limit(5);

    expect(error).toBeNull();
    expect(data).toBeDefined();

    // All chunks should have accommodation_unit_id
    data?.forEach(chunk => {
      expect(chunk.accommodation_unit_id).toBeTruthy();
    });
  });

});

test.describe('Database - RPC Validation', () => {

  let supabase: ReturnType<typeof createClient>;

  test.beforeAll(() => {
    supabase = createClient(supabaseUrl, supabaseKey);
  });

  test('should return manual chunks for Misty Morning', async () => {
    // Misty Morning UUID in hotels.accommodation_units
    const mistyMorningId = '11c6bdba-c595-432e-9b3f-abcb5eb1a8a4';

    // Generate dummy embedding (all zeros for test)
    // NOTE: embedding_balanced column contains 1536d data (not 1024d despite the name!)
    const dummyEmbedding = Array(1536).fill(0);

    const { data, error } = await supabase.rpc('match_unit_manual_chunks', {
      query_embedding: dummyEmbedding as any,
      p_accommodation_unit_id: mistyMorningId,
      match_threshold: 0.0, // Accept any similarity
      match_count: 10,
    } as any);

    expect(error).toBeNull();
    expect(data).toBeDefined();

    if (data && Array.isArray(data)) {
      expect((data as any[]).length).toBeGreaterThan(0);

      // Verify structure
      const firstResult = (data as any[])[0];
      expect(firstResult).toHaveProperty('chunk_content');
      expect(firstResult).toHaveProperty('section_title');
      expect(firstResult).toHaveProperty('similarity');
    }
  });

  test('should return no chunks for non-existent unit', async () => {
    const fakeUuid = '00000000-0000-0000-0000-000000000000';
    const dummyEmbedding = Array(1024).fill(0);

    const { data, error } = await supabase.rpc('match_unit_manual_chunks', {
      query_embedding: dummyEmbedding as any,
      p_accommodation_unit_id: fakeUuid,
      match_threshold: 0.0,
      match_count: 10,
    } as any);

    expect(error).toBeNull();
    expect(data).toBeDefined();

    if (Array.isArray(data)) {
      expect((data as any[]).length).toBe(0);
    }
  });

});
