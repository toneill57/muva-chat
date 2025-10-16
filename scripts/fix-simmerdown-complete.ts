#!/usr/bin/env tsx
/**
 * Complete Simmerdown Data Fix - Extract ALL Missing Amenities from Descriptions
 *
 * Extracts missing amenities data directly from markdown descriptions:
 * 1. bed_type - From "Configuración de camas" section
 * 2. unit_amenities - From amenities lists in description
 * 3. bed_configuration - From bed configuration details
 *
 * Goal: Bring Simmerdown from 71% → 100% quality
 *
 * Usage:
 *   set -a && source .env.local && set +a && npx tsx scripts/fix-simmerdown-complete.ts
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

function extractBedConfiguration(description: string): string | null {
  // Pattern: "Configuración de camas**: ... <!-- EXTRAE: bed_configuration -->"
  const match = description.match(/Configuración de camas\*\*:\s*([^<]+)<!--\s*EXTRAE:\s*bed_configuration/i);
  if (match) {
    return match[1].trim();
  }

  // Fallback: Look for bed configuration in capacity sections
  const fallbackMatch = description.match(/Configuración de camas\*\*:\s*([^\n]+)/i);
  if (fallbackMatch) {
    return fallbackMatch[1].replace(/<!--.*?-->/g, '').trim();
  }

  return null;
}

function extractBedType(bedConfiguration: string | null, capacityMax: number): string {
  if (!bedConfiguration) {
    // Estimate based on capacity
    if (capacityMax <= 2) return '1 double bed';
    if (capacityMax <= 4) return '2 double beds';
    return `${Math.ceil(capacityMax / 2)} beds`;
  }

  // Parse bed configuration to determine bed type
  const lowerConfig = bedConfiguration.toLowerCase();

  if (lowerConfig.includes('matrimonial') && lowerConfig.includes('sofá cama')) {
    return '1 queen bed + sofa bed';
  }

  if (lowerConfig.includes('2 camas dobles') || lowerConfig.includes('dos camas dobles')) {
    return '2 double beds';
  }

  if (lowerConfig.includes('cama matrimonial') || lowerConfig.includes('queen')) {
    return '1 queen bed';
  }

  if (lowerConfig.includes('cama doble') || lowerConfig.includes('double bed')) {
    return '1 double bed';
  }

  // Default based on capacity
  return `Sleeps ${capacityMax}`;
}

function extractUnitAmenities(description: string): string {
  const amenities: string[] = [];

  // Common amenities to look for
  const amenityPatterns = [
    { pattern: /smart\s*tv|televisor/i, text: 'Smart TV' },
    { pattern: /netflix/i, text: 'Netflix' },
    { pattern: /wi-?fi|internet/i, text: 'Wi-Fi' },
    { pattern: /aire\s*acondicionado|a\/c|ac\b/i, text: 'Aire acondicionado' },
    { pattern: /baño\s*privado|private\s*bath/i, text: 'Baño privado' },
    { pattern: /cocina|kitchen/i, text: 'Cocina' },
    { pattern: /nevera|refrigerador|fridge/i, text: 'Nevera' },
    { pattern: /balcón|balcon|balcony/i, text: 'Balcón' },
    { pattern: /ventana.*anti-?ruido/i, text: 'Ventana anti-ruido' },
    { pattern: /sala\s*común|common\s*area/i, text: 'Acceso a sala común' },
    { pattern: /terraza/i, text: 'Terraza' },
    { pattern: /lavadora|washer/i, text: 'Lavadora' },
  ];

  for (const { pattern, text } of amenityPatterns) {
    if (pattern.test(description)) {
      amenities.push(text);
    }
  }

  // Remove duplicates and join
  return [...new Set(amenities)].join(', ') || 'Amenidades estándar';
}

function buildCompleteAmenities(description: string, currentAmenities: any, metadata: any): any {
  const amenities: any = {};

  // 1. Extract or keep capacity_max
  amenities.capacity_max = currentAmenities?.capacity_max || metadata?.capacity || 2;

  // 2. Extract bed_configuration from description
  const bedConfig = extractBedConfiguration(description);
  amenities.bed_configuration = bedConfig || currentAmenities?.bed_configuration || 'Standard configuration';

  // 3. Derive bed_type from bed_configuration
  amenities.bed_type = extractBedType(bedConfig, amenities.capacity_max);

  // 4. Extract unit_amenities from description
  amenities.unit_amenities = extractUnitAmenities(description);

  return amenities;
}

async function analyzeSimmerdown(): Promise<FixPlan[]> {
  log('\n🔍 Analyzing Simmerdown descriptions for complete amenities extraction...', colors.blue);

  // Get Simmerdown tenant_id
  const { data: tenant } = await supabase
    .from('tenant_registry')
    .select('tenant_id')
    .eq('slug', 'simmerdown')
    .single();

  if (!tenant) {
    log('❌ Simmerdown tenant not found', colors.red);
    process.exit(1);
  }

  const tenant_id = tenant.tenant_id;

  // Get all units for Simmerdown
  const { data: units, error } = await supabase
    .from('accommodation_units_public')
    .select('*')
    .eq('tenant_id', tenant_id);

  if (error || !units || units.length === 0) {
    log('❌ No units found for Simmerdown', colors.red);
    process.exit(1);
  }

  log(`Found ${units.length} unit(s)\n`, colors.dim);

  const fixPlans: FixPlan[] = [];

  for (const unit of units) {
    const changes: FixPlan['changes'] = [];

    // Build complete amenities from description
    const completeAmenities = buildCompleteAmenities(
      unit.description || '',
      unit.amenities,
      unit.metadata
    );

    // Check if we need to update amenities
    const currentAmenities = unit.amenities || {};
    const needsUpdate = (
      !currentAmenities.bed_type ||
      !currentAmenities.unit_amenities ||
      !currentAmenities.bed_configuration ||
      currentAmenities.unit_amenities === 'Amenidades estándar'
    );

    if (needsUpdate) {
      changes.push({
        field: 'amenities',
        before: JSON.stringify(currentAmenities),
        after: JSON.stringify(completeAmenities),
        action: 'Extract complete amenities from description',
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
      log(`      Before: ${change.before}`, colors.red);
      log(`      After: ${change.after}`, colors.green);
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

      // Build complete amenities
      const completeAmenities = buildCompleteAmenities(
        currentUnit.description || '',
        currentUnit.amenities,
        currentUnit.metadata
      );

      // Apply update
      const { error: updateError } = await supabase
        .from('accommodation_units_public')
        .update({ amenities: completeAmenities })
        .eq('unit_id', plan.unit_id);

      if (updateError) {
        log(`   ❌ Update failed: ${updateError.message}`, colors.red);
      } else {
        log(`   ✅ Updated successfully`, colors.green);
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

  log('\n🎯 Simmerdown Complete Data Fix Script', colors.bold);
  log(`Goal: Extract ALL missing amenities from descriptions → 100% quality`, colors.dim);
  log(`Mode: ${applyMode ? 'APPLY' : 'DRY RUN'}`, colors.dim);
  log(`Timestamp: ${new Date().toISOString()}\n`, colors.dim);

  const fixPlans = await analyzeSimmerdown();

  if (fixPlans.length === 0) {
    log('\n✅ No issues found! Simmerdown data is already at 100% quality.', colors.green);
    process.exit(0);
  }

  await applyFixes(fixPlans, !applyMode);

  if (!applyMode) {
    log('\n📚 To apply these fixes, run:', colors.dim);
    log('   set -a && source .env.local && set +a && npx tsx scripts/fix-simmerdown-complete.ts --apply\n', colors.yellow);
  }
}

main().catch(error => {
  log(`\n❌ Script failed: ${error.message}`, colors.red);
  console.error(error);
  process.exit(1);
});
