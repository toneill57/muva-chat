#!/usr/bin/env tsx
/**
 * Fix Simmerdown Accommodation Data
 *
 * Fixes JSONB structure issues identified in validation audit:
 * 1. ❌ amenities = [] (empty array) → Reconstruct from metadata
 * 2. ❌ pricing missing currency and base_price → Add from existing data
 * 3. ❌ photos = template comments → Clean invalid entries
 *
 * Usage:
 *   set -a && source .env.local && set +a && npx tsx scripts/fix-simmerdown-data.ts
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

function reconstructAmenities(metadata: any): any {
  const amenities: any = {};

  // Extract bed_type from bed_configuration
  if (metadata.bed_configuration && Array.isArray(metadata.bed_configuration)) {
    const bedConfig = metadata.bed_configuration[0];
    if (bedConfig) {
      amenities.bed_type = `${bedConfig.count} ${bedConfig.type} bed${bedConfig.count > 1 ? 's' : ''}`;
    }
  }

  // Extract capacity_max
  if (metadata.capacity) {
    amenities.capacity_max = metadata.capacity;
  }

  // Extract unit_amenities
  if (metadata.unit_amenities) {
    amenities.unit_amenities = metadata.unit_amenities;
  }

  // Extract bed_configuration as string
  if (metadata.bed_configuration) {
    const configs = metadata.bed_configuration.map((bed: any) =>
      `${bed.count} ${bed.type} bed${bed.count > 1 ? 's' : ''}`
    );
    amenities.bed_configuration = configs.join(', ');
  }

  return amenities;
}

function fixPricing(currentPricing: any): any {
  const fixed: any = { ...currentPricing };

  // Add currency if missing
  if (!fixed.currency) {
    fixed.currency = 'COP';
  }

  // Add base_price if missing (use low season price or calculate average)
  if (!fixed.base_price) {
    if (fixed.base_price_low_season) {
      fixed.base_price = fixed.base_price_low_season;
    } else if (fixed.base_price_high_season) {
      fixed.base_price = fixed.base_price_high_season;
    } else {
      fixed.base_price = 150000; // Default fallback
    }
  }

  return fixed;
}

function cleanPhotos(photos: any): any {
  if (!photos || !Array.isArray(photos)) {
    return [];
  }

  // Filter out template comments and keep only valid photo objects
  const validPhotos = photos.filter((photo: any) => {
    // Valid photo must have 'url' and 'order' fields
    return photo.url && typeof photo.order === 'number';
  });

  // If no valid photos found, return empty array
  if (validPhotos.length === 0) {
    return [];
  }

  return validPhotos;
}

async function analyzeSimmerdown(): Promise<FixPlan[]> {
  log('\n🔍 Analyzing Simmerdown data...', colors.blue);

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

    // Fix 1: Reconstruct amenities from metadata
    if (!unit.amenities || Array.isArray(unit.amenities) || Object.keys(unit.amenities).length === 0) {
      const reconstructed = reconstructAmenities(unit.metadata || {});

      if (Object.keys(reconstructed).length > 0) {
        changes.push({
          field: 'amenities',
          before: Array.isArray(unit.amenities) ? '[]' : JSON.stringify(unit.amenities),
          after: JSON.stringify(reconstructed),
          action: 'Reconstruct from metadata',
        });
      }
    }

    // Fix 2: Add missing pricing fields
    if (unit.pricing) {
      const needsCurrencyFix = !unit.pricing.currency;
      const needsBasePriceFix = !unit.pricing.base_price;

      if (needsCurrencyFix || needsBasePriceFix) {
        const fixed = fixPricing(unit.pricing);
        changes.push({
          field: 'pricing',
          before: `currency=${unit.pricing.currency || 'null'}, base_price=${unit.pricing.base_price || 'null'}`,
          after: `currency=${fixed.currency}, base_price=${fixed.base_price}`,
          action: 'Add missing currency and base_price',
        });
      }
    }

    // Fix 3: Clean photos array
    if (unit.photos) {
      const cleaned = cleanPhotos(unit.photos);
      const currentPhotoCount = Array.isArray(unit.photos) ? unit.photos.length : 0;
      const cleanedPhotoCount = cleaned.length;

      if (currentPhotoCount !== cleanedPhotoCount) {
        changes.push({
          field: 'photos',
          before: `${currentPhotoCount} items (with template comments)`,
          after: `${cleanedPhotoCount} valid photos`,
          action: 'Remove template comments',
        });
      }
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

      // Build update object
      const updates: any = {};

      for (const change of plan.changes) {
        if (change.field === 'amenities') {
          updates.amenities = reconstructAmenities(currentUnit.metadata || {});
        } else if (change.field === 'pricing') {
          updates.pricing = fixPricing(currentUnit.pricing);
        } else if (change.field === 'photos') {
          updates.photos = cleanPhotos(currentUnit.photos);
        }
      }

      // Apply updates
      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from('accommodation_units_public')
          .update(updates)
          .eq('unit_id', plan.unit_id);

        if (updateError) {
          log(`   ❌ Update failed: ${updateError.message}`, colors.red);
        } else {
          log(`   ✅ Updated successfully`, colors.green);
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

  log('\n🔧 Simmerdown Data Fix Script', colors.bold);
  log(`Mode: ${applyMode ? 'APPLY' : 'DRY RUN'}`, colors.dim);
  log(`Timestamp: ${new Date().toISOString()}\n`, colors.dim);

  const fixPlans = await analyzeSimmerdown();

  if (fixPlans.length === 0) {
    log('\n✅ No issues found! Simmerdown data is already compliant.', colors.green);
    process.exit(0);
  }

  await applyFixes(fixPlans, !applyMode);

  if (!applyMode) {
    log('\n📚 To apply these fixes, run:', colors.dim);
    log('   set -a && source .env.local && set +a && npx tsx scripts/fix-simmerdown-data.ts --apply\n', colors.yellow);
  }
}

main().catch(error => {
  log(`\n❌ Script failed: ${error.message}`, colors.red);
  console.error(error);
  process.exit(1);
});
