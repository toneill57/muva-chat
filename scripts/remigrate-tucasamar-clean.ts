#!/usr/bin/env npx tsx
/**
 * Tucasamar Clean Re-migration Script
 * Description: Re-migrate Tucasamar units with CLEAN data parsing from hotels.accommodation_units
 * Problem: Original migration copied mal-formatted JSONBs (images as template_comments, empty amenities)
 * Solution: Parse/clean data + regenerate embeddings + overwrite in accommodation_units_public
 * Usage: set -a && source .env.local && set +a && npx tsx scripts/remigrate-tucasamar-clean.ts
 * Created: 2025-01-11
 */

import { createClient } from '@supabase/supabase-js';
import { readFile } from 'fs/promises';
import { join } from 'path';
import * as dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const TUCASAMAR_TENANT_ID = '2263efba-b62b-417b-a422-a84638bc632f';

interface AccommodationUnit {
  id: string;
  tenant_id: string;
  hotel_id: string | null;
  name: string;
  unit_number: string | null;
  unit_type: string | null;
  description: string | null;
  short_description: string | null;
  capacity: any; // { max_capacity: number }
  bed_configuration: any;
  size_m2: number | null;
  view_type: string | null;
  images: any; // MAL-FORMATTED: array of {type: "template_comment", description: "..."}
  amenities_list: any; // Empty or minimal
  unique_features: any; // Array with generic strings
  base_price_low_season: number | null;
  base_price_high_season: number | null;
  floor_number: number | null;
  motopress_type_id: number | null;
}

interface PublicAccommodation {
  tenant_id: string;
  name: string;
  unit_number: string;
  unit_type: string;
  description: string;
  short_description: string;
  highlights: string[];
  amenities: any;
  pricing: any;
  photos: any[];
  embedding: number[];
  embedding_fast: number[];
  metadata: any;
}

/**
 * Parse mal-formatted images array to extract clean photo URLs
 */
function parseImages(images: any): string[] {
  const urls: string[] = [];

  if (!Array.isArray(images)) return urls;

  for (const img of images) {
    if (img.type === 'template_comment' && img.description) {
      // Extract URLs from markdown: "- **Imagen X**: https://..."
      const urlMatch = img.description.match(/https?:\/\/[^\s)]+\.jpg/);
      if (urlMatch) {
        urls.push(urlMatch[0]);
      }
    } else if (typeof img === 'string' && img.startsWith('http')) {
      urls.push(img);
    } else if (img.url) {
      urls.push(img.url);
    }
  }

  return urls;
}

/**
 * Extract price from markdown file
 */
async function extractPriceFromMarkdown(unitName: string): Promise<number | null> {
  try {
    const filename = unitName.toLowerCase().replace(/\s+/g, '-') + '.md';
    const filepath = join(process.cwd(), '_assets', 'tucasamar', 'accommodations', 'rooms', filename);
    const content = await readFile(filepath, 'utf-8');

    // Look for: "Precio por noche**: $280,000 COP"
    const priceMatch = content.match(/\*\*Precio por noche\*\*:\s*\$?([\d,]+)\s*COP/);
    if (priceMatch) {
      const priceStr = priceMatch[1].replace(/,/g, '');
      return parseInt(priceStr, 10);
    }

    return null;
  } catch (error) {
    // File not found or parse error - return null
    return null;
  }
}

/**
 * Generate embeddings using OpenAI Matryoshka architecture
 */
async function generateEmbeddings(text: string): Promise<{
  embedding_3072: number[];
  embedding_1024: number[];
}> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: text,
      dimensions: 3072, // Full precision
    });

    const embedding_3072 = response.data[0].embedding;
    
    // Matryoshka: Tier 1 is first 1024 dimensions
    const embedding_1024 = embedding_3072.slice(0, 1024);

    return { embedding_3072, embedding_1024 };
  } catch (error) {
    console.error('Error generating embeddings:', error);
    throw error;
  }
}

/**
 * Transform accommodation unit to marketing-focused public format with CLEAN data parsing
 */
async function transformToPublic(unit: AccommodationUnit): Promise<Omit<PublicAccommodation, 'embedding' | 'embedding_fast'>> {
  // Extract highlights from unique_features array (mal-formatted but usable)
  const highlights: string[] = [];
  if (unit.view_type) highlights.push(`${unit.view_type} view`);
  if (Array.isArray(unit.unique_features)) {
    highlights.push(...unit.unique_features.slice(0, 3));
  }
  // Fallback
  if (highlights.length === 0) {
    highlights.push('Ubicación privilegiada en San Andrés');
  }

  // Build amenities object from capacity
  const max_capacity = unit.capacity?.max_capacity || unit.capacity || 2;
  const amenities = {
    bedrooms: 1, // Tucasamar units are mostly rooms
    bathrooms: 1,
    max_guests: typeof max_capacity === 'number' ? max_capacity : 2,
    size_sqm: unit.size_m2 || null,
    features: [], // Empty in source data
    accessibility: [],
  };

  // Build pricing - try DB first, then markdown fallback
  let base_price_night = unit.base_price_low_season || unit.base_price_high_season;
  if (!base_price_night) {
    base_price_night = await extractPriceFromMarkdown(unit.name);
  }

  const pricing = {
    base_price_night: base_price_night || 250000, // Fallback: 250k COP avg
    currency: 'COP',
    seasonal_pricing: [],
    min_nights: 1,
  };

  // Parse mal-formatted images to extract clean URLs
  const imageUrls = parseImages(unit.images);
  const photos = imageUrls.map((url: string, idx: number) => ({
    url,
    alt: `${unit.name} - Foto ${idx + 1}`,
    order: idx + 1,
    type: idx === 0 ? 'main' : 'gallery',
  }));

  // Marketing-optimized description
  const description = unit.description || `${unit.name} en Tu Casa en el Mar, San Andrés`;
  const short_description = unit.short_description || description.substring(0, 150);

  return {
    tenant_id: unit.tenant_id,
    name: unit.name,
    unit_number: unit.unit_number || unit.name,
    unit_type: unit.unit_type || 'room',
    description,
    short_description,
    highlights,
    amenities,
    pricing,
    photos,
    metadata: {
      source_unit_id: unit.id,
      hotel_id: unit.hotel_id,
      bed_configuration: unit.bed_configuration,
      floor_number: unit.floor_number,
      motopress_type_id: unit.motopress_type_id,
    },
  };
}

/**
 * Main migration function
 */
async function migrateAccommodations() {
  console.log('🚀 Tucasamar Clean Re-migration');
  console.log('=====================================\n');

  try {
    // STEP 1: Delete existing Tucasamar records
    console.log('🗑️  Deleting existing Tucasamar records from accommodation_units_public...');
    const { error: deleteError } = await supabase
      .from('accommodation_units_public')
      .delete()
      .eq('tenant_id', TUCASAMAR_TENANT_ID);

    if (deleteError) {
      console.error('❌ Error deleting existing records:', deleteError);
      throw deleteError;
    }
    console.log('✅ Existing records deleted\n');

    // STEP 2: Fetch units from hotels.accommodation_units using execute_sql
    console.log('📊 Querying Tucasamar units from hotels.accommodation_units...');
    const { data: queryResult, error: fetchError } = await supabase.rpc('execute_sql', {
      query: `
        SELECT
          id, tenant_id, hotel_id, name, description, short_description,
          unit_number, unit_type, capacity, bed_configuration, size_m2,
          view_type, images, amenities_list, unique_features,
          base_price_low_season, base_price_high_season,
          floor_number, motopress_type_id
        FROM hotels.accommodation_units
        WHERE tenant_id = '${TUCASAMAR_TENANT_ID}'
        ORDER BY name
      `
    });

    if (fetchError) {
      console.error('❌ Error querying units:', fetchError);
      throw fetchError;
    }

    const units = (Array.isArray(queryResult) ? queryResult : []) as AccommodationUnit[];

    if (!units || units.length === 0) {
      console.log('⚠️  No Tucasamar units found in hotels.accommodation_units');
      return;
    }

    console.log(`✅ Found ${units.length} units to re-migrate\n`);

    let successCount = 0;
    let errorCount = 0;

    // STEP 3: Process each unit with clean parsing
    for (const unit of units) {
      try {
        console.log(`📦 Processing: ${unit.name}...`);

        // Transform to public format with CLEAN data parsing
        const publicUnit = await transformToPublic(unit);

        // Generate marketing-focused embedding text
        const embeddingText = `
${publicUnit.name}
${publicUnit.description}
Type: ${publicUnit.unit_type}
Highlights: ${publicUnit.highlights.join(', ')}
Amenities: ${publicUnit.amenities.features.join(', ')}
Capacity: ${publicUnit.amenities.max_guests} guests, ${publicUnit.amenities.bedrooms} bedrooms
Price: $${publicUnit.pricing.base_price_night}/night
        `.trim();

        // Generate embeddings with CLEAN data
        console.log('   → Generating Matryoshka embeddings (3072d + 1024d)...');
        const { embedding_3072, embedding_1024 } = await generateEmbeddings(embeddingText);

        // Insert into accommodation_units_public with clean data
        const { error: insertError } = await supabase
          .from('accommodation_units_public')
          .insert({
            ...publicUnit,
            embedding: embedding_3072,
            embedding_fast: embedding_1024,
            is_active: true, // CRITICAL: Must be true for RPC match_accommodations_public
            is_bookable: true,
          });

        if (insertError) {
          console.error(`   ❌ Insert error:`, insertError);
          throw insertError;
        }

        console.log(`   ✅ Migrated with ${publicUnit.photos.length} photos, price: ${publicUnit.pricing.base_price_night} COP\n`);
        successCount++;

        // Rate limiting for OpenAI API
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`   ❌ Error: ${error}\n`);
        errorCount++;
      }
    }

    console.log('\n=====================================');
    console.log('✅ Clean Re-migration Complete');
    console.log('=====================================');
    console.log(`📊 Results:`);
    console.log(`   ✅ Successfully migrated: ${successCount}/${units.length}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📦 Clean embeddings generated: ${successCount}`);
    console.log('=====================================\n');

  } catch (error) {
    console.error('Fatal migration error:', error);
    process.exit(1);
  }
}

// Run migration
migrateAccommodations().catch(console.error);
