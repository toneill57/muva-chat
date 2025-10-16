#!/usr/bin/env tsx
/**
 * Fix Tu Casa Mar Accommodation Data
 *
 * Fixes 4 critical issues identified in validation audit:
 * 1. ❌ unit_type = null → Extract from YAML frontmatter
 * 2. ❌ short_description = null → Generate from description
 * 3. ❌ YAML frontmatter pollution → Strip from description
 * 4. ❌ Missing from accommodation_units table → Insert copy
 *
 * Usage:
 *   set -a && source .env.local && set +a && npx tsx scripts/fix-tucasamar-data.ts
 *
 * Safety: Dry-run by default, use --apply to execute changes
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

interface FixPlan {
  unit_id: string;
  unit_name: string;
  changes: Array<{
    field: string;
    before: any;
    after: any;
    action: string;
  }>;
}

function extractYAMLFrontmatter(content: string): { frontmatter: any; cleanContent: string } {
  const yamlMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!yamlMatch) {
    return { frontmatter: null, cleanContent: content };
  }

  const yamlContent = yamlMatch[1];
  const cleanContent = yamlMatch[2].trim();

  // Simple YAML parser (for our specific use case)
  const frontmatter: any = {};
  const lines = yamlContent.split('\n');
  let currentKey = '';

  for (const line of lines) {
    if (line.includes(':')) {
      const [key, ...valueParts] = line.split(':');
      const value = valueParts.join(':').trim();
      currentKey = key.trim();

      // Handle quoted strings
      if (value.startsWith('"') && value.endsWith('"')) {
        frontmatter[currentKey] = value.slice(1, -1);
      } else {
        frontmatter[currentKey] = value || null;
      }
    }
  }

  return { frontmatter, cleanContent };
}

function generateShortDescription(description: string): string {
  // Remove YAML if present
  const { cleanContent } = extractYAMLFrontmatter(description);

  // Remove markdown heading
  const withoutHeading = cleanContent.replace(/^#.*\n/, '').trim();

  // Remove section headers and Q&A markers
  const withoutSections = withoutHeading
    .replace(/^##.*\n/gm, '')
    .replace(/\*\*Q:.*?\*\*/g, '')
    .replace(/\*\*A:\*\*/g, '')
    .trim();

  // Get first sentence or 150 chars
  const firstSentence = withoutSections.split(/[.!?]\s/)[0];
  const truncated = firstSentence.substring(0, 150);

  return truncated;
}

async function analyzeTuCasaMar(): Promise<FixPlan[]> {
  log('\n🔍 Analyzing Tu Casa Mar data...', colors.blue);

  // Get Tu Casa Mar tenant_id
  const { data: tenant } = await supabase
    .from('tenant_registry')
    .select('tenant_id')
    .eq('slug', 'tucasamar')
    .single();

  if (!tenant) {
    log('❌ Tu Casa Mar tenant not found', colors.red);
    process.exit(1);
  }

  const tenant_id = tenant.tenant_id;

  // Get all units for Tu Casa Mar
  const { data: units, error } = await supabase
    .from('accommodation_units_public')
    .select('*')
    .eq('tenant_id', tenant_id);

  if (error || !units || units.length === 0) {
    log('❌ No units found for Tu Casa Mar', colors.red);
    process.exit(1);
  }

  log(`Found ${units.length} unit(s)\n`, colors.dim);

  const fixPlans: FixPlan[] = [];

  for (const unit of units) {
    const changes: FixPlan['changes'] = [];

    // Fix 1: Extract unit_type from YAML frontmatter
    if (!unit.unit_type && unit.description) {
      const { frontmatter } = extractYAMLFrontmatter(unit.description);
      if (frontmatter && frontmatter.unit_type) {
        changes.push({
          field: 'unit_type',
          before: null,
          after: frontmatter.unit_type,
          action: 'Extract from YAML frontmatter',
        });
      } else {
        // Default to 'room' if not found
        changes.push({
          field: 'unit_type',
          before: null,
          after: 'room',
          action: 'Set default value',
        });
      }
    }

    // Fix 2: Generate short_description
    if (!unit.short_description && unit.description) {
      const shortDesc = generateShortDescription(unit.description);
      changes.push({
        field: 'short_description',
        before: null,
        after: shortDesc,
        action: 'Auto-generate from description',
      });
    }

    // Fix 3: Strip YAML frontmatter from description
    if (unit.description && unit.description.trim().startsWith('---\n')) {
      const { cleanContent } = extractYAMLFrontmatter(unit.description);
      changes.push({
        field: 'description',
        before: `YAML frontmatter (${unit.description.split('\n---\n')[0].split('\n').length} lines)`,
        after: 'Clean markdown',
        action: 'Strip YAML frontmatter',
      });
    }

    // Fix 4: Check if missing from main table
    const { data: mainTableUnit } = await supabase
      .from('accommodation_units')
      .select('unit_id')
      .eq('unit_id', unit.unit_id)
      .single();

    if (!mainTableUnit) {
      changes.push({
        field: 'table_sync',
        before: 'Only in accommodation_units_public',
        after: 'Present in both tables',
        action: 'Insert into accommodation_units',
      });
    }

    if (changes.length > 0) {
      fixPlans.push({
        unit_id: unit.unit_id,
        unit_name: unit.name,
        changes,
      });
    }
  }

  return fixPlans;
}

async function applyFixes(fixPlans: FixPlan[], dryRun: boolean = true) {
  log('\n' + (dryRun ? '📋 DRY RUN' : '⚙️  APPLYING FIXES'), colors.bold);
  log('═'.repeat(80) + '\n', colors.reset);

  for (const plan of fixPlans) {
    log(`📦 ${plan.unit_name}`, colors.bold);
    log(`   Unit ID: ${plan.unit_id}`, colors.dim);
    log(`   Changes: ${plan.changes.length}\n`, colors.dim);

    for (const change of plan.changes) {
      log(`   ${change.field}:`, colors.blue);
      log(`      Before: ${JSON.stringify(change.before)}`, colors.red);
      log(`      After: ${JSON.stringify(change.after)}`, colors.green);
      log(`      Action: ${change.action}\n`, colors.dim);
    }

    if (!dryRun) {
      // Get current unit data
      const { data: currentUnit } = await supabase
        .from('accommodation_units_public')
        .select('*')
        .eq('unit_id', plan.unit_id)
        .single();

      if (!currentUnit) {
        log(`   ❌ Unit not found, skipping`, colors.red);
        continue;
      }

      // Build update object
      const updates: any = {};

      for (const change of plan.changes) {
        if (change.field === 'unit_type') {
          updates.unit_type = change.after;
        } else if (change.field === 'short_description') {
          updates.short_description = change.after;
        } else if (change.field === 'description') {
          const { cleanContent } = extractYAMLFrontmatter(currentUnit.description);
          updates.description = cleanContent;
        } else if (change.field === 'table_sync') {
          // Insert into main table (will be done separately)
          continue;
        }
      }

      // Apply updates to public table
      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from('accommodation_units_public')
          .update(updates)
          .eq('unit_id', plan.unit_id);

        if (updateError) {
          log(`   ❌ Update failed: ${updateError.message}`, colors.red);
        } else {
          log(`   ✅ Updated accommodation_units_public`, colors.green);
        }
      }

      // Insert into main table if missing
      const needsMainTableInsert = plan.changes.some(c => c.field === 'table_sync');
      if (needsMainTableInsert) {
        // Apply updates to current unit data before inserting
        const unitToInsert = { ...currentUnit, ...updates };

        const { error: insertError } = await supabase
          .from('accommodation_units')
          .insert(unitToInsert);

        if (insertError) {
          log(`   ❌ Insert into main table failed: ${insertError.message}`, colors.red);
        } else {
          log(`   ✅ Inserted into accommodation_units`, colors.green);
        }
      }
    }

    log('', colors.reset);
  }

  if (dryRun) {
    log('\n💡 This was a dry run. Use --apply to execute changes.', colors.yellow);
  } else {
    log('\n✅ All fixes applied!', colors.green);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const applyMode = args.includes('--apply');

  log('\n🔧 Tu Casa Mar Data Fix Script', colors.bold);
  log(`Mode: ${applyMode ? 'APPLY' : 'DRY RUN'}`, colors.dim);
  log(`Timestamp: ${new Date().toISOString()}\n`, colors.dim);

  const fixPlans = await analyzeTuCasaMar();

  if (fixPlans.length === 0) {
    log('\n✅ No issues found! Tu Casa Mar data is already compliant.', colors.green);
    process.exit(0);
  }

  await applyFixes(fixPlans, !applyMode);

  if (!applyMode) {
    log('\n📚 To apply these fixes, run:', colors.dim);
    log('   set -a && source .env.local && set +a && npx tsx scripts/fix-tucasamar-data.ts --apply\n', colors.yellow);
  }
}

main().catch(error => {
  log(`\n❌ Script failed: ${error.message}`, colors.red);
  console.error(error);
  process.exit(1);
});
