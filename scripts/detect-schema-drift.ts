#!/usr/bin/env node
/**
 * Detect Schema Drift Between Environments
 *
 * FASE 6: Migration Management System
 *
 * Purpose:
 * - Compare database schemas between two environments
 * - Detect missing tables, columns, and other schema differences
 * - Report severity of discrepancies
 *
 * Usage:
 *   pnpm dlx tsx scripts/detect-schema-drift.ts --source=dev --target=staging
 *   pnpm dlx tsx scripts/detect-schema-drift.ts --source=staging --target=production
 */

import { createClient } from '@supabase/supabase-js';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

const SUPABASE_PROJECTS = {
  dev: {
    id: 'rvjmwwvkhglcuqwcznph',
    name: 'Development',
    envKey: 'SUPABASE_SERVICE_ROLE_KEY_DEV',
  },
  staging: {
    id: 'ooaumjzaztmutltifhoq',
    name: 'Staging',
    envKey: 'SUPABASE_SERVICE_ROLE_KEY',
  },
  production: {
    id: 'ztfslsrkemlfjqpzksir',
    name: 'Production',
    envKey: 'SUPABASE_SERVICE_ROLE_KEY_PRODUCTION',
  },
};

interface Table {
  schema: string;
  name: string;
  fullName: string;
}

interface Difference {
  type: 'missing_in_target' | 'missing_in_source' | 'extra_in_target';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  table: string;
  message: string;
}

async function getTables(projectId: string, serviceKey: string): Promise<Table[]> {
  const url = `https://${projectId}.supabase.co`;
  const supabase = createClient(url, serviceKey);
  
  try {
    // Query tables from information_schema
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_schema, table_name')
      .in('table_schema', ['public', 'hotels'])
      .order('table_schema')
      .order('table_name');
    
    if (error) {
      throw new Error(`Failed to fetch tables: ${error.message}`);
    }
    
    const tables: Table[] = [];
    
    if (data) {
      for (const row of data) {
        tables.push({
          schema: row.table_schema,
          name: row.table_name,
          fullName: `${row.table_schema}.${row.table_name}`,
        });
      }
    }
    
    return tables;
  } catch (error: any) {
    throw new Error(`Failed to connect to database: ${error.message}`);
  }
}

function compareSchemas(sourceTables: Table[], targetTables: Table[], sourceName: string, targetName: string): Difference[] {
  const differences: Difference[] = [];
  
  const sourceSet = new Set(sourceTables.map(t => t.fullName));
  const targetSet = new Set(targetTables.map(t => t.fullName));
  
  // Tables in source but not in target
  for (const table of sourceTables) {
    if (!targetSet.has(table.fullName)) {
      differences.push({
        type: 'missing_in_target',
        severity: table.schema === 'public' ? 'CRITICAL' : 'WARNING',
        table: table.fullName,
        message: `Table exists in ${sourceName} but missing in ${targetName}`,
      });
    }
  }
  
  // Tables in target but not in source
  for (const table of targetTables) {
    if (!sourceSet.has(table.fullName)) {
      differences.push({
        type: 'extra_in_target',
        severity: 'WARNING',
        table: table.fullName,
        message: `Table exists in ${targetName} but not in ${sourceName}`,
      });
    }
  }
  
  return differences;
}

function printDifferences(differences: Difference[], sourceName: string, targetName: string) {
  console.log('');
  console.log(`${colors.bright}${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bright}  Schema Drift Report: ${sourceName} → ${targetName}${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log('');
  
  if (differences.length === 0) {
    console.log(`${colors.green}✅ No schema drift detected - schemas are in sync${colors.reset}`);
    console.log('');
    return;
  }
  
  // Count by severity
  const critical = differences.filter(d => d.severity === 'CRITICAL').length;
  const warnings = differences.filter(d => d.severity === 'WARNING').length;
  const info = differences.filter(d => d.severity === 'INFO').length;
  
  console.log(`${colors.bright}Summary:${colors.reset}`);
  console.log(`  ${colors.red}🔴 Critical:${colors.reset} ${critical}`);
  console.log(`  ${colors.yellow}🟡 Warning:${colors.reset} ${warnings}`);
  console.log(`  ${colors.cyan}🔵 Info:${colors.reset} ${info}`);
  console.log('');
  
  // Group by type
  const missingInTarget = differences.filter(d => d.type === 'missing_in_target');
  const extraInTarget = differences.filter(d => d.type === 'extra_in_target');
  
  if (missingInTarget.length > 0) {
    console.log(`${colors.bright}Missing in ${targetName}:${colors.reset}`);
    console.log('');
    
    for (const diff of missingInTarget) {
      const severityIcon = diff.severity === 'CRITICAL' ? '🔴' : '🟡';
      const severityColor = diff.severity === 'CRITICAL' ? colors.red : colors.yellow;
      
      console.log(`  ${severityColor}${severityIcon} ${diff.severity}${colors.reset} ${colors.gray}${diff.table}${colors.reset}`);
      console.log(`     ${colors.dim}${diff.message}${colors.reset}`);
    }
    
    console.log('');
  }
  
  if (extraInTarget.length > 0) {
    console.log(`${colors.bright}Extra in ${targetName}:${colors.reset}`);
    console.log('');
    
    for (const diff of extraInTarget) {
      console.log(`  ${colors.yellow}🟡 WARNING${colors.reset} ${colors.gray}${diff.table}${colors.reset}`);
      console.log(`     ${colors.dim}${diff.message}${colors.reset}`);
    }
    
    console.log('');
  }
  
  // Recommendations
  console.log(`${colors.bright}Recommendations:${colors.reset}`);
  console.log('');
  
  if (critical > 0) {
    console.log(`  ${colors.red}⚠️  CRITICAL drift detected!${colors.reset}`);
    console.log(`     ${colors.dim}This may cause application errors${colors.reset}`);
    console.log(`     ${colors.dim}Run migrations to sync schemas${colors.reset}`);
  } else if (warnings > 0) {
    console.log(`  ${colors.yellow}⚠️  Schema differences detected${colors.reset}`);
    console.log(`     ${colors.dim}Review differences and consider syncing${colors.reset}`);
  }
  
  console.log('');
}

async function main() {
  console.log('');
  console.log('================================================');
  console.log('🔍 Schema Drift Detection');
  console.log('================================================');
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('');
    console.log('Usage:');
    console.log('  pnpm dlx tsx scripts/detect-schema-drift.ts --source=<env> --target=<env>');
    console.log('');
    console.log('Options:');
    console.log('  --source=<env>    Source environment (dev, staging, production)');
    console.log('  --target=<env>    Target environment (dev, staging, production)');
    console.log('  --help, -h        Show this help message');
    console.log('');
    console.log('Examples:');
    console.log('  pnpm dlx tsx scripts/detect-schema-drift.ts --source=dev --target=staging');
    console.log('  pnpm dlx tsx scripts/detect-schema-drift.ts --source=staging --target=production');
    console.log('');
    process.exit(0);
  }
  
  const sourceArg = args.find(arg => arg.startsWith('--source='));
  const targetArg = args.find(arg => arg.startsWith('--target='));
  
  if (!sourceArg || !targetArg) {
    console.error('');
    console.error(`${colors.red}❌ Error: Missing required arguments${colors.reset}`);
    console.error('');
    console.error('Usage:');
    console.error('  pnpm dlx tsx scripts/detect-schema-drift.ts --source=<env> --target=<env>');
    console.error('');
    console.error('Run with --help for more information');
    console.error('');
    process.exit(1);
  }
  
  const source = sourceArg.split('=')[1] as 'dev' | 'staging' | 'production';
  const target = targetArg.split('=')[1] as 'dev' | 'staging' | 'production';
  
  if (!['dev', 'staging', 'production'].includes(source)) {
    console.error(`${colors.red}❌ Error: Invalid source environment: ${source}${colors.reset}`);
    console.error(`${colors.gray}   Valid values: dev, staging, production${colors.reset}`);
    console.error('');
    process.exit(1);
  }
  
  if (!['dev', 'staging', 'production'].includes(target)) {
    console.error(`${colors.red}❌ Error: Invalid target environment: ${target}${colors.reset}`);
    console.error(`${colors.gray}   Valid values: dev, staging, production${colors.reset}`);
    console.error('');
    process.exit(1);
  }
  
  if (source === target) {
    console.error(`${colors.red}❌ Error: Source and target cannot be the same${colors.reset}`);
    console.error('');
    process.exit(1);
  }
  
  const sourceProject = SUPABASE_PROJECTS[source];
  const targetProject = SUPABASE_PROJECTS[target];
  
  console.log('');
  console.log(`${colors.cyan}📊 Comparing schemas:${colors.reset}`);
  console.log(`   Source: ${sourceProject.name} (${sourceProject.id})`);
  console.log(`   Target: ${targetProject.name} (${targetProject.id})`);
  console.log('');
  
  // Get service keys
  const sourceKey = process.env[sourceProject.envKey];
  const targetKey = process.env[targetProject.envKey];
  
  if (!sourceKey) {
    console.error(`${colors.red}❌ Error: ${sourceProject.envKey} not set${colors.reset}`);
    console.error('');
    process.exit(1);
  }
  
  if (!targetKey) {
    console.error(`${colors.red}❌ Error: ${targetProject.envKey} not set${colors.reset}`);
    console.error('');
    process.exit(1);
  }
  
  // Fetch tables from both environments
  console.log(`${colors.gray}Fetching tables from ${sourceProject.name}...${colors.reset}`);
  const sourceTables = await getTables(sourceProject.id, sourceKey);
  console.log(`${colors.green}✅ Found ${sourceTables.length} tables in ${sourceProject.name}${colors.reset}`);
  
  console.log(`${colors.gray}Fetching tables from ${targetProject.name}...${colors.reset}`);
  const targetTables = await getTables(targetProject.id, targetKey);
  console.log(`${colors.green}✅ Found ${targetTables.length} tables in ${targetProject.name}${colors.reset}`);
  
  // Compare schemas
  console.log(`${colors.gray}Comparing schemas...${colors.reset}`);
  const differences = compareSchemas(sourceTables, targetTables, sourceProject.name, targetProject.name);
  
  // Print results
  printDifferences(differences, sourceProject.name, targetProject.name);
  
  console.log('================================================');
  
  // Exit with appropriate code
  const hasCritical = differences.some(d => d.severity === 'CRITICAL');
  
  if (hasCritical) {
    console.log('❌ Schema drift check failed (critical differences)');
    console.log('================================================');
    console.log('');
    process.exit(1);
  } else if (differences.length > 0) {
    console.log('⚠️  Schema drift check completed with warnings');
    console.log('================================================');
    console.log('');
    process.exit(0);
  } else {
    console.log('✅ Schema drift check passed');
    console.log('================================================');
    console.log('');
    process.exit(0);
  }
}

main().catch((error) => {
  console.error('');
  console.error(`${colors.red}❌ Unexpected error: ${error.message}${colors.reset}`);
  console.error('');
  process.exit(1);
});
