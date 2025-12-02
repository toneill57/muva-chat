#!/usr/bin/env ts-node
/**
 * MUVA Accommodation Sync to hotels.accommodation_units (SINGLE SOURCE OF TRUTH)
 *
 * Syncs accommodation data from markdown v3.0 files to hotels.accommodation_units table.
 * Consolidates all chunks into ONE record per accommodation with public embeddings.
 *
 * Usage:
 *   set -a && source .env.local && set +a && npx tsx scripts/sync-accommodations-to-hotels.ts --tenant tucasamar
 *   set -a && source .env.local && set +a && npx tsx scripts/sync-accommodations-to-hotels.ts --all
 *   set -a && source .env.local && set +a && npx tsx scripts/sync-accommodations-to-hotels.ts --tenant simmerdown --dry-run
 *
 * @author MUVA Platform
 * @version 2.0.0 - Single Source of Truth Migration
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { glob } from 'glob';
import { v4 as uuidv4 } from 'uuid';

// Environment setup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const openaiKey = process.env.OPENAI_API_KEY || '';

if (!supabaseUrl || !supabaseKey || !openaiKey) {
  console.error('❌ Missing required environment variables');
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const openai = new OpenAI({ apiKey: openaiKey });

// CLI arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const processAll = args.includes('--all');
const tenantArg = args.find(arg => arg.startsWith('--tenant='))?.split('=')[1];
const tenantIndex = args.indexOf('--tenant');
const tenantName = tenantArg || (tenantIndex !== -1 ? args[tenantIndex + 1] : null);

interface AccommodationData {
  filePath: string;
  tenantId: string;
  tenantName: string;
  name: string;
  unitNumber: string | null;
  unitType: string;
  fullDescription: string; // Raw markdown
  shortDescription: string;
  amenities: Record<string, any>;
  pricing: Record<string, any>;
  photos: string[];
  metadata: Record<string, any>;
  isActive: boolean;
  capacity: any;
  bedConfiguration: any;
}

/**
 * Generate Matryoshka Tier 1 embedding (256d) - Fast
 */
async function generateEmbeddingTier1Fast(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: text,
    dimensions: 256, // Tier 1 - Ultra fast (for public chat)
  });
  return response.data[0].embedding;
}

/**
 * Generate Matryoshka Tier 2 embedding (1536d) - Full
 */
async function generateEmbeddingTier2Full(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: text,
    dimensions: 1536, // Tier 2 - Full precision
  });
  return response.data[0].embedding;
}

/**
 * Extract text content following a specific EXTRAE comment marker
 */
function extractFromMarkdown(markdown: string, field: string): string {
  const regex = new RegExp(`<!-- EXTRAE: ${field} -->\\s*\\n([^<]+?)(?=\\n|$)`, 'i');
  const match = markdown.match(regex);
  if (match && match[1]) {
    return match[1].trim();
  }

  const multilineRegex = new RegExp(`<!-- EXTRAE: ${field} -->[\\s\\S]*?(?=<!--|$)`, 'i');
  const multiMatch = markdown.match(multilineRegex);
  if (multiMatch) {
    return multiMatch[0]
      .replace(`<!-- EXTRAE: ${field} -->`, '')
      .replace(/<!--[\s\\S]*?-->/g, '')
      .trim()
      .split('\\n')
      .map(line => line.replace(/^[*\\-•]\\s*/, '').trim())
      .filter(line => line.length > 0)
      .join(', ');
  }

  return '';
}

/**
 * Parse bed configuration string into structured format
 */
function parseBedConfiguration(bedConfig: string): Array<{type: string, count: number}> {
  if (!bedConfig) return [];

  const beds: Array<{type: string, count: number}> = [];
  const patterns = [
    { regex: /(\\d+)\\s*(?:cama\\s*)?matrimonial/i, type: 'double' },
    { regex: /(\\d+)\\s*(?:camas?\\s*)?sencillas?/i, type: 'single' },
    { regex: /(\\d+)\\s*(?:camas?\\s*)?individuales?/i, type: 'single' },
    { regex: /sofá\\s*cama\\s*individual/i, type: 'sofa_bed', count: 1 },
  ];

  for (const pattern of patterns) {
    const match = bedConfig.match(pattern.regex);
    if (match) {
      beds.push({
        type: pattern.type,
        count: pattern.count || parseInt(match[1]) || 1
      });
    }
  }

  return beds.length > 0 ? beds : [{ type: bedConfig, count: 1 }];
}

/**
 * Extract all data from markdown v3.0 file
 */
async function extractAccommodationData(filePath: string): Promise<AccommodationData | null> {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const { data: frontmatter, content: markdown } = matter(content);

    if (frontmatter.version !== '3.0') {
      console.warn(`⚠️  Skipping ${filePath} - not version 3.0`);
      return null;
    }

    const tenantId = frontmatter.tenant_id;
    const tenantName = path.basename(path.dirname(path.dirname(path.dirname(filePath))));

    if (!tenantId) {
      console.warn(`⚠️  Skipping ${filePath} - missing tenant_id`);
      return null;
    }

    const name = frontmatter.document?.title || 'Unknown';
    const shortDescription = frontmatter.document?.description || '';
    const fullDescription = markdown.trim();
    const unitType = frontmatter.accommodation?.unit_type || 'room';
    const photos = frontmatter.accommodation?.images || [];
    const unitNumber = extractFromMarkdown(markdown, 'unit_number') || null;

    const pricingData = frontmatter.accommodation?.pricing || {};
    const pricing = {
      currency: pricingData.currency || 'COP',
      base_price: pricingData.base_price_low_season || pricingData.base_price_high_season || 0,
      base_price_low_season: pricingData.base_price_low_season || 0,
      base_price_high_season: pricingData.base_price_high_season || 0,
      price_per_person_low: pricingData.price_per_person_low || 0,
      price_per_person_high: pricingData.price_per_person_high || 0,
      minimum_stay: pricingData.minimum_stay || 1,
    };

    const amenitiesFeatures = frontmatter.accommodation?.amenities?.features || [];
    const amenitiesText = amenitiesFeatures.join(', ');
    const bedConfig = frontmatter.accommodation?.bed_configuration || '';

    const amenities = {
      bed_type: bedConfig,
      capacity_max: frontmatter.accommodation?.capacity || 0,
      unit_amenities: amenitiesText || extractFromMarkdown(markdown, 'unit_amenities'),
      bed_configuration: bedConfig,
    };

    const specialFeatures = frontmatter.accommodation?.amenities?.attributes?.special_features || [];
    const uniqueFeaturesFromMarkdown = extractFromMarkdown(markdown, 'unique_features');
    const uniqueFeatures = specialFeatures.length > 0
      ? specialFeatures
      : (uniqueFeaturesFromMarkdown ? uniqueFeaturesFromMarkdown.split(',').map(s => s.trim()) : []);

    const metadata: Record<string, any> = {
      name,
      size_m2: frontmatter.accommodation?.size_m2 || 0,
      capacity: frontmatter.accommodation?.capacity || 0,
      view_type: frontmatter.accommodation?.view_type || '',
      floor_number: frontmatter.accommodation?.floor_number || 0,
      display_order: frontmatter.accommodation?.display_order || 0,
      unit_amenities: amenities.unit_amenities,
      unique_features: uniqueFeatures,
      booking_policies: extractFromMarkdown(markdown, 'booking_policies') || 'Standard booking policies apply',
      location_details: extractFromMarkdown(markdown, 'location_details') || frontmatter.location || '',
      tourism_features: extractFromMarkdown(markdown, 'tourism_features') || 'Beach, sea, Caribbean culture',
      bed_configuration: parseBedConfiguration(bedConfig),
      accessibility_features: extractFromMarkdown(markdown, 'accessibility_features')?.split(',').map(s => s.trim()) || [],
      is_featured: frontmatter.accommodation?.is_featured || false,
      status: frontmatter.accommodation?.status || 'active',
      source_type: 'markdown_v3',
      uploaded_at: new Date().toISOString(),
      file_path: filePath,
    };

    const capacity = {
      adults: frontmatter.accommodation?.capacity || 0,
      children: 0,
      total: frontmatter.accommodation?.capacity || 0,
    };

    const bedConfiguration = parseBedConfiguration(bedConfig);

    return {
      filePath,
      tenantId,
      tenantName,
      name,
      unitNumber,
      unitType,
      fullDescription,
      shortDescription,
      amenities,
      pricing,
      photos,
      metadata,
      isActive: frontmatter.accommodation?.status === 'active',
      capacity,
      bedConfiguration,
    };
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error);
    return null;
  }
}

/**
 * Sync accommodation to hotels.accommodation_units (consolidated, single record)
 */
async function syncAccommodationToHotels(data: AccommodationData): Promise<boolean> {
  try {
    console.log(`\\n   📄 ${data.name}`);
    console.log(`      Tenant: ${data.tenantName} (${data.tenantId})`);
    console.log(`      Type: ${data.unitType}`);
    console.log(`      Pricing: ${data.pricing.currency} ${data.pricing.base_price?.toLocaleString()}`);

    if (isDryRun) {
      console.log(`      🔍 DRY RUN - Would sync to hotels.accommodation_units`);
      return true;
    }

    // Generate public_description (consolidated from all sections)
    const publicDescription = data.fullDescription;

    console.log(`      ⏳ Generating embeddings (Tier 1 Fast + Tier 2 Full)...`);

    // Generate BOTH embeddings in parallel
    const [embeddingPublicFast, embeddingPublicFull] = await Promise.all([
      generateEmbeddingTier1Fast(publicDescription),
      generateEmbeddingTier2Full(publicDescription)
    ]);

    console.log(`      ✅ Embeddings generated (256d + 1536d)`);

    // Use RPC function to upsert (Supabase JS client doesn't support hotels schema)
    const { data: resultId, error: upsertError } = await supabase.rpc('upsert_accommodation', {
      p_id: uuidv4(),
      p_tenant_id: data.tenantId,
      p_name: data.name,
      p_unit_number: data.unitNumber,
      p_unit_type: data.unitType,
      p_description: data.shortDescription,
      p_short_description: data.shortDescription,
      p_full_description: data.fullDescription,
      p_public_description: publicDescription,
      p_capacity: data.capacity,
      p_bed_configuration: data.bedConfiguration,
      p_amenities_list: data.amenities,
      p_pricing: data.pricing,
      p_images: data.photos,
      p_embedding_public_fast: embeddingPublicFast,
      p_embedding_public_full: embeddingPublicFull,
      p_status: data.isActive ? 'active' : 'inactive',
      p_is_featured: data.metadata.is_featured || false,
      p_display_order: data.metadata.display_order || 0,
      p_unique_features: data.metadata.unique_features || null,
      p_accessibility_features: data.metadata.accessibility_features || null,
      p_location_details: data.metadata.location_details || null,
      p_tourism_features: data.metadata.tourism_features || null,
      p_booking_policies: data.metadata.booking_policies || null,
    });

    if (upsertError) {
      console.error(`      ❌ Upsert error: ${upsertError.message}`);
      return false;
    }

    console.log(`      ✅ Synced to hotels.accommodation_units (ID: ${resultId})`);


    return true;
  } catch (error) {
    console.error(`   ❌ Error syncing:`, error);
    return false;
  }
}

/**
 * Process all accommodations for a tenant
 */
async function processTenant(tenantName: string, files: string[]): Promise<void> {
  console.log(`\\n📊 ${tenantName.toUpperCase()}`);
  console.log('━'.repeat(50));

  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  for (const file of files) {
    const data = await extractAccommodationData(file);
    if (!data) continue;

    processed++;
    const success = await syncAccommodationToHotels(data);
    if (success) succeeded++;
    else failed++;
  }

  console.log(`\\n   📈 Summary: ${processed} processed | ${succeeded} succeeded | ${failed} failed`);
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 MUVA Accommodation Sync to hotels.accommodation_units');
  console.log('📍 Single Source of Truth Migration v2.0');
  console.log('━'.repeat(50));

  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\\n');
  }

  // Find all markdown files
  const pattern = '_assets/**/accommodations/**/*.md';
  const allFiles = await glob(pattern);

  if (allFiles.length === 0) {
    console.error('❌ No accommodation files found');
    process.exit(1);
  }

  // Group by tenant
  const byTenant = new Map<string, string[]>();
  for (const file of allFiles) {
    const tenant = path.basename(path.dirname(path.dirname(path.dirname(file))));
    if (!byTenant.has(tenant)) byTenant.set(tenant, []);
    byTenant.get(tenant)!.push(file);
  }

  console.log(`📁 Found ${allFiles.length} files across ${byTenant.size} tenants\\n`);

  // Process tenants
  if (processAll) {
    for (const [tenant, files] of byTenant) {
      await processTenant(tenant, files);
    }
  } else if (tenantName) {
    const files = byTenant.get(tenantName);
    if (!files) {
      console.error(`❌ Tenant "${tenantName}" not found`);
      process.exit(1);
    }
    await processTenant(tenantName, files);
  } else {
    console.error('❌ Please specify --tenant or --all');
    process.exit(1);
  }

  console.log('\\n✅ Sync completed!');
}

main().catch(console.error);
