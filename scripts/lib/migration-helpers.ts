/**
 * MIGRATION HELPER FUNCTIONS
 *
 * Reusable functions for production → staging data migration
 */

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface MigrationStats {
  table: string;
  rowsCopied: number;
  duration: number;
  method: 'direct' | 'paginated' | 'admin_api' | 'two_pass' | 'skip';
  startTime?: number;
  endTime?: number;
}

export interface VerificationResult {
  table: string;
  schema: string;
  prodCount: number;
  stagingCount: number;
  match: boolean;
  difference: number;
}

/**
 * Get row count for a table
 */
export async function getRowCount(
  client: SupabaseClient,
  schema: string,
  table: string
): Promise<number> {
  const { count, error } = await client
    .from(table)
    .select('*', { count: 'exact', head: true });

  if (error) {
    // For auth schema tables, return 0 if not accessible
    if (schema === 'auth') {
      return 0;
    }
    throw error;
  }

  return count ?? 0;
}

/**
 * Execute raw SQL using RPC endpoint (for TRUNCATE, ALTER TABLE, etc.)
 */
export async function executeSQL(
  projectId: string,
  serviceRoleKey: string,
  query: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/rest/v1/rpc/execute_sql`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({ query }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Truncate a table (respecting FK constraints)
 */
export async function truncateTable(
  projectId: string,
  serviceRoleKey: string,
  schema: string,
  table: string
): Promise<void> {
  const fullTable = schema === 'public' ? table : `${schema}.${table}`;
  const result = await executeSQL(
    projectId,
    serviceRoleKey,
    `TRUNCATE TABLE ${fullTable} CASCADE;`
  );

  if (!result.success) {
    throw new Error(`Failed to truncate ${fullTable}: ${result.error}`);
  }
}

/**
 * Disable triggers for a table
 */
export async function disableTriggers(
  projectId: string,
  serviceRoleKey: string,
  schema: string,
  table: string
): Promise<void> {
  const fullTable = schema === 'public' ? table : `${schema}.${table}`;
  await executeSQL(
    projectId,
    serviceRoleKey,
    `ALTER TABLE ${fullTable} DISABLE TRIGGER ALL;`
  );
}

/**
 * Enable triggers for a table
 */
export async function enableTriggers(
  projectId: string,
  serviceRoleKey: string,
  schema: string,
  table: string
): Promise<void> {
  const fullTable = schema === 'public' ? table : `${schema}.${table}`;
  await executeSQL(
    projectId,
    serviceRoleKey,
    `ALTER TABLE ${fullTable} ENABLE TRIGGER ALL;`
  );
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

/**
 * Format number with commas
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

/**
 * Sleep for specified milliseconds
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
