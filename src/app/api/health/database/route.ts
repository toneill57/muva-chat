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

interface FunctionConfig {
  name: string;
  requiredSchemas: string[];
  purpose: string;
  critical: boolean;
}

const CRITICAL_FUNCTIONS: FunctionConfig[] = [
  {
    name: 'match_unit_manual_chunks',
    requiredSchemas: ['public', 'hotels', 'extensions'],
    purpose: 'Guest chat - accommodation manual chunks search',
    critical: true,
  },
  {
    name: 'match_muva_documents',
    requiredSchemas: ['public', 'extensions', 'pg_temp'],
    purpose: 'Tourism content search',
    critical: true,
  },
  {
    name: 'map_hotel_to_public_accommodation_id',
    requiredSchemas: ['public', 'hotels', 'extensions'],
    purpose: 'ID mapping between hotel and public schemas',
    critical: false,
  },
];

/**
 * Database Health Check API
 *
 * Validates critical database configurations that affect guest chat functionality.
 * Specifically checks that RPC functions have correct search_path to prevent
 * "operator does not exist" errors with pgvector.
 *
 * Returns 200 if all checks pass, 503 if any check fails.
 *
 * Example response:
 * {
 *   "status": "healthy",
 *   "timestamp": "2025-11-06T12:00:00.000Z",
 *   "duration": 123,
 *   "checks": [
 *     {
 *       "name": "rpc_search_path_match_unit_manual_chunks",
 *       "status": "healthy",
 *       "message": "Function has correct search_path",
 *       "duration": 45,
 *       "metadata": { ... }
 *     }
 *   ]
 * }
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const checks: HealthCheck[] = [];

  // Check each critical RPC function
  for (const funcConfig of CRITICAL_FUNCTIONS) {
    const check = await checkRPCSearchPath(funcConfig);
    checks.push(check);
  }

  // Check vector operator accessibility
  const vectorCheck = await checkVectorOperator();
  checks.push(vectorCheck);

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
      fix_command:
        overallStatus !== 'healthy'
          ? 'pnpm dlx tsx scripts/validate-rpc-functions.ts --fix'
          : undefined,
    },
    { status: statusCode }
  );
}

async function checkRPCSearchPath(funcConfig: FunctionConfig): Promise<HealthCheck> {
  const start = Date.now();

  try {
    // Query function search_path
    const query = `
      SELECT
        p.proname,
        array_to_string(p.proconfig, ',') AS search_path
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND p.proname = $1;
    `;

    let { data, error } = await supabase.rpc('exec_sql', {
      sql: query.replace('$1', `'${funcConfig.name}'`),
    });

    if (error) {
      // Try alternative approach using direct query
      const { data: altData, error: altError } = await supabase
        .from('pg_proc')
        .select('proname, proconfig')
        .eq('proname', funcConfig.name)
        .single();

      if (altError) {
        throw new Error(`Query failed: ${error.message} (alt: ${altError.message})`);
      }

      // Parse proconfig array
      const searchPathConfig = altData?.proconfig?.find((c: string) =>
        c.startsWith('search_path=')
      );

      if (!searchPathConfig) {
        return {
          name: `rpc_search_path_${funcConfig.name}`,
          status: funcConfig.critical ? 'unhealthy' : 'degraded',
          message: 'Function not found or has no search_path configured',
          duration: Date.now() - start,
          metadata: {
            function: funcConfig.name,
            expected_schemas: funcConfig.requiredSchemas,
            critical: funcConfig.critical,
            purpose: funcConfig.purpose,
          },
        };
      }

      data = [
        {
          proname: funcConfig.name,
          search_path: searchPathConfig,
        },
      ];
    }

    if (!data || data.length === 0) {
      return {
        name: `rpc_search_path_${funcConfig.name}`,
        status: funcConfig.critical ? 'unhealthy' : 'degraded',
        message: 'Function not found in database',
        duration: Date.now() - start,
        metadata: {
          function: funcConfig.name,
          expected_schemas: funcConfig.requiredSchemas,
          critical: funcConfig.critical,
          purpose: funcConfig.purpose,
        },
      };
    }

    const searchPath = data[0].search_path || '';
    const currentSchemas = searchPath
      .replace(/^search_path=/, '')
      .replace(/['"]/g, '')
      .split(',')
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);

    const missingSchemas = funcConfig.requiredSchemas.filter(
      schema => !currentSchemas.includes(schema)
    );

    const isValid = missingSchemas.length === 0;
    const hasExtensions = currentSchemas.includes('extensions');

    // Critical: Must have 'extensions' schema
    const status = !hasExtensions
      ? 'unhealthy'
      : !isValid && funcConfig.critical
      ? 'degraded'
      : !isValid
      ? 'degraded'
      : 'healthy';

    return {
      name: `rpc_search_path_${funcConfig.name}`,
      status,
      message: isValid
        ? 'Function has correct search_path'
        : `Missing schemas: ${missingSchemas.join(', ')}`,
      duration: Date.now() - start,
      metadata: {
        function: funcConfig.name,
        current_schemas: currentSchemas,
        expected_schemas: funcConfig.requiredSchemas,
        missing_schemas: missingSchemas,
        has_extensions: hasExtensions,
        critical: funcConfig.critical,
        purpose: funcConfig.purpose,
      },
    };
  } catch (error: any) {
    return {
      name: `rpc_search_path_${funcConfig.name}`,
      status: funcConfig.critical ? 'unhealthy' : 'degraded',
      message: `Error checking function: ${error.message}`,
      duration: Date.now() - start,
      metadata: {
        function: funcConfig.name,
        error: error.message,
        critical: funcConfig.critical,
      },
    };
  }
}

async function checkVectorOperator(): Promise<HealthCheck> {
  const start = Date.now();

  try {
    // Test if vector operator <=> is accessible
    const query = `
      SELECT 1 - ('[0.1,0.2,0.3]'::vector(3) <=> '[0.1,0.2,0.3]'::vector(3)) AS similarity;
    `;

    const { data, error } = await supabase.rpc('exec_sql', {
      sql: query,
    });

    if (error) {
      // If error contains "operator does not exist", it's critical
      const isCritical = error.message.includes('operator does not exist');

      return {
        name: 'vector_operator_accessible',
        status: isCritical ? 'unhealthy' : 'degraded',
        message: `Vector operator test failed: ${error.message}`,
        duration: Date.now() - start,
        metadata: {
          error: error.message,
          is_critical: isCritical,
        },
      };
    }

    // Check if similarity is 1.0 (identical vectors)
    const similarity = data?.[0]?.similarity;
    const isCorrect = similarity === 1.0;

    return {
      name: 'vector_operator_accessible',
      status: isCorrect ? 'healthy' : 'degraded',
      message: isCorrect
        ? 'Vector operator <=> is accessible'
        : `Unexpected similarity value: ${similarity}`,
      duration: Date.now() - start,
      metadata: {
        similarity,
        expected: 1.0,
      },
    };
  } catch (error: any) {
    return {
      name: 'vector_operator_accessible',
      status: 'unhealthy',
      message: `Error testing vector operator: ${error.message}`,
      duration: Date.now() - start,
      metadata: {
        error: error.message,
      },
    };
  }
}
