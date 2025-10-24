import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  duration: number;
  metadata?: Record<string, any>;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const checks: HealthCheck[] = [];

  // Check 1: Manual chunks exist
  const chunksCheck = await checkManualChunks();
  checks.push(chunksCheck);

  // Check 2: Embeddings have correct dimensions
  const embeddingsCheck = await checkEmbeddingDimensions();
  checks.push(embeddingsCheck);

  // Check 3: No orphaned chunks
  const mappingCheck = await checkChunkMapping();
  checks.push(mappingCheck);

  // Check 4: RPC functions work
  const rpcCheck = await checkRPCFunctionality();
  checks.push(rpcCheck);

  // Determine overall status
  const hasUnhealthy = checks.some(c => c.status === 'unhealthy');
  const hasDegraded = checks.some(c => c.status === 'degraded');

  const overallStatus = hasUnhealthy
    ? 'unhealthy'
    : hasDegraded
    ? 'degraded'
    : 'healthy';

  const statusCode = overallStatus === 'healthy' ? 200 : 503;

  return NextResponse.json(
    {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      checks,
    },
    { status: statusCode }
  );
}

async function checkManualChunks(): Promise<HealthCheck> {
  const start = Date.now();

  try {
    const { data, error, count } = await supabase
      .from('accommodation_units_manual_chunks')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;

    const chunkCount = count || 0;

    return {
      name: 'manual_chunks_exist',
      status: chunkCount > 100 ? 'healthy' : chunkCount > 0 ? 'degraded' : 'unhealthy',
      message: `${chunkCount} manual chunks found`,
      duration: Date.now() - start,
      metadata: { chunk_count: chunkCount },
    };
  } catch (error: any) {
    return {
      name: 'manual_chunks_exist',
      status: 'unhealthy',
      message: `Error: ${error.message}`,
      duration: Date.now() - start,
    };
  }
}

async function checkEmbeddingDimensions(): Promise<HealthCheck> {
  const start = Date.now();

  try {
    const { data, error } = await supabase
      .from('accommodation_units_manual_chunks')
      .select('embedding_balanced, embedding_fast')
      .limit(1);

    if (error) throw error;

    if (!data || data.length === 0) {
      return {
        name: 'embedding_dimensions',
        status: 'degraded',
        message: 'No chunks found to check dimensions',
        duration: Date.now() - start,
      };
    }

    // Check if embeddings exist and have approximate expected dimensions
    // Note: We can't check exact dimensions without pgvector SQL functions
    const hasBalanced = data[0].embedding_balanced !== null;
    const hasFast = data[0].embedding_fast !== null;

    const isCorrect = hasBalanced && hasFast;

    return {
      name: 'embedding_dimensions',
      status: isCorrect ? 'healthy' : 'unhealthy',
      message: isCorrect
        ? 'Embeddings present (balanced and fast)'
        : `Missing embeddings: balanced=${hasBalanced}, fast=${hasFast}`,
      duration: Date.now() - start,
      metadata: { has_balanced: hasBalanced, has_fast: hasFast },
    };
  } catch (error: any) {
    return {
      name: 'embedding_dimensions',
      status: 'unhealthy',
      message: `Error: ${error.message}`,
      duration: Date.now() - start,
    };
  }
}

async function checkChunkMapping(): Promise<HealthCheck> {
  const start = Date.now();

  try {
    // Check for orphaned chunks by querying chunks and checking if their accommodation_unit_id exists
    const { data: chunks, error: chunksError } = await supabase
      .from('accommodation_units_manual_chunks')
      .select('accommodation_unit_id');

    if (chunksError) throw chunksError;

    if (!chunks || chunks.length === 0) {
      return {
        name: 'chunk_mapping',
        status: 'degraded',
        message: 'No chunks found to check mapping',
        duration: Date.now() - start,
      };
    }

    // Get unique unit IDs from chunks
    const unitIds = [...new Set(chunks.map(c => c.accommodation_unit_id))];

    // Check if these units exist in hotels schema
    const { data: units, error: unitsError } = await supabase
      .schema('hotels')
      .from('accommodation_units')
      .select('id')
      .in('id', unitIds);

    if (unitsError) throw unitsError;

    const existingUnitIds = new Set(units?.map(u => u.id) || []);
    const orphanedCount = unitIds.filter(id => !existingUnitIds.has(id)).length;

    return {
      name: 'chunk_mapping',
      status: orphanedCount === 0 ? 'healthy' : orphanedCount < 10 ? 'degraded' : 'unhealthy',
      message: `${orphanedCount} orphaned chunks`,
      duration: Date.now() - start,
      metadata: { orphaned_count: orphanedCount },
    };
  } catch (error: any) {
    return {
      name: 'chunk_mapping',
      status: 'unhealthy',
      message: `Error: ${error.message}`,
      duration: Date.now() - start,
    };
  }
}

async function checkRPCFunctionality(): Promise<HealthCheck> {
  const start = Date.now();

  try {
    // Get a sample unit ID
    const { data: units, error: unitsError } = await supabase
      .schema('hotels')
      .from('accommodation_units')
      .select('id')
      .limit(1);

    if (unitsError) throw unitsError;
    if (!units || units.length === 0) {
      return {
        name: 'rpc_functionality',
        status: 'degraded',
        message: 'No accommodation units found to test RPC',
        duration: Date.now() - start,
      };
    }

    // Test RPC with dummy embedding (1024 dimensions for balanced embedding)
    const dummyEmbedding = Array(1024).fill(0.1);

    const { data, error } = await supabase.rpc('match_unit_manual_chunks', {
      query_embedding: dummyEmbedding,
      p_accommodation_unit_id: units[0].id,
      match_threshold: 0.0,
      match_count: 5,
    });

    if (error) throw error;

    const chunkCount = data?.length || 0;

    return {
      name: 'rpc_functionality',
      status: chunkCount > 0 ? 'healthy' : 'degraded',
      message: `RPC returned ${chunkCount} chunks`,
      duration: Date.now() - start,
      metadata: { chunks_returned: chunkCount },
    };
  } catch (error: any) {
    return {
      name: 'rpc_functionality',
      status: 'unhealthy',
      message: `Error: ${error.message}`,
      duration: Date.now() - start,
    };
  }
}
