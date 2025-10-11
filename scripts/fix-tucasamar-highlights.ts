#!/usr/bin/env node
/**
 * Fix Tucasamar Highlights
 *
 * Problem: All 6 Tucasamar units have generic highlights ("ubicación privilegiada")
 * Solution: Extract specific highlights from markdown files
 *
 * Extracts:
 * - room_type (specific description)
 * - capacity (if notable, e.g., 6 personas)
 * - unique amenities (cocina equipada, horno, microondas)
 * - location features (a 2 cuadras de playa)
 */

import { createClient } from '@supabase/supabase-js';
import { readFile } from 'fs/promises';
import { join } from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const TUCASAMAR_TENANT_ID = '2263efba-b62b-417b-a422-a84638bc632f';

interface HighlightData {
  roomType: string | null;
  capacity: number | null;
  uniqueAmenities: string[];
  locationFeatures: string[];
}

/**
 * Find markdown file path (checks both /rooms/ and /apartments/)
 */
async function findMarkdownPath(unitName: string): Promise<string | null> {
  const filename = unitName.toLowerCase().replace(/\s+/g, '-') + '.md';
  const paths = [
    join(process.cwd(), '_assets', 'tucasamar', 'accommodations', 'rooms', filename),
    join(process.cwd(), '_assets', 'tucasamar', 'accommodations', 'apartments', filename),
  ];

  for (const path of paths) {
    try {
      await readFile(path, 'utf-8');
      return path;
    } catch {
      // File not found, try next path
    }
  }
  return null;
}

/**
 * Extract highlights from markdown
 */
async function extractHighlights(unitName: string): Promise<HighlightData> {
  const filepath = await findMarkdownPath(unitName);
  if (!filepath) {
    console.warn(`⚠️  Markdown not found for: ${unitName}`);
    return { roomType: null, capacity: null, uniqueAmenities: [], locationFeatures: [] };
  }

  const content = await readFile(filepath, 'utf-8');
  const highlights: HighlightData = {
    roomType: null,
    capacity: null,
    uniqueAmenities: [],
    locationFeatures: [],
  };

  // Extract room_type (specific description)
  const roomTypeMatch = content.match(/- \*\*Tipo\*\*:\s*(.+?)\s*<!--\s*EXTRAE:\s*room_type\s*-->/);
  if (roomTypeMatch) {
    highlights.roomType = roomTypeMatch[1].trim();
  }

  // Extract capacity
  const capacityMatch = content.match(/- \*\*Capacidad máxima\*\*:\s*(\d+)\s*personas/);
  if (capacityMatch) {
    highlights.capacity = parseInt(capacityMatch[1]);
  }

  // Extract unique amenities (cocina, horno, microondas)
  const uniqueAmenityPatterns = [
    /- \*\*(Cocina equipada[^*]*)\*\*/g,
    /- \*\*(Horno[^*]*)\*\*/g,
    /- \*\*(Microondas[^*]*)\*\*/g,
    /- \*\*(Cocineta[^*]*)\*\*/g,
  ];

  for (const pattern of uniqueAmenityPatterns) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && match[0].includes('EXTRAE: amenities_list')) {
        highlights.uniqueAmenities.push(match[1].trim());
      }
    }
  }

  // Extract location features (a X cuadras de...)
  const locationMatch = content.match(/a\s+(\d+\s+cuadras?\s+de[^,<]+)/i);
  if (locationMatch) {
    highlights.locationFeatures.push(locationMatch[1].trim());
  }

  return highlights;
}

/**
 * Build highlights array from extracted data
 */
function buildHighlightsArray(data: HighlightData, unitType: string): string[] {
  const highlights: string[] = [];

  // Add room type if specific
  if (data.roomType && !data.roomType.toLowerCase().includes('ubicación privilegiada')) {
    highlights.push(data.roomType);
  }

  // Add capacity if notable (4+ people)
  if (data.capacity && data.capacity >= 4) {
    highlights.push(`Capacidad para ${data.capacity} personas`);
  }

  // Add unique amenities
  if (data.uniqueAmenities.length > 0) {
    highlights.push(...data.uniqueAmenities);
  }

  // Add location features
  if (data.locationFeatures.length > 0) {
    highlights.push(...data.locationFeatures);
  }

  // If no highlights found, use type-specific defaults
  if (highlights.length === 0) {
    if (unitType === 'apartment') {
      highlights.push('Apartamento completo con todas las comodidades');
    } else {
      highlights.push('Habitación confortable en excelente ubicación');
    }
  }

  // Limit to 5 highlights max
  return highlights.slice(0, 5);
}

/**
 * Main execution
 */
async function main() {
  console.log('🔧 Fixing Tucasamar Highlights\n');

  // Get all Tucasamar units
  const { data: units, error } = await supabase
    .from('accommodation_units_public')
    .select('unit_id, name, unit_type, highlights')
    .eq('tenant_id', TUCASAMAR_TENANT_ID)
    .order('name');

  if (error) {
    console.error('❌ Error fetching units:', error);
    process.exit(1);
  }

  if (!units || units.length === 0) {
    console.error('❌ No units found for Tucasamar');
    process.exit(1);
  }

  console.log(`Found ${units.length} units to process\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const unit of units) {
    console.log(`📝 Processing: ${unit.name}`);
    console.log(`   Current highlights: ${JSON.stringify(unit.highlights)}`);

    try {
      // Extract highlights from markdown
      const highlightData = await extractHighlights(unit.name);
      const newHighlights = buildHighlightsArray(highlightData, unit.unit_type || 'room');

      console.log(`   New highlights: ${JSON.stringify(newHighlights)}`);

      // Update database
      const { error: updateError } = await supabase
        .from('accommodation_units_public')
        .update({ highlights: newHighlights })
        .eq('unit_id', unit.unit_id);

      if (updateError) {
        console.error(`   ❌ Update failed: ${updateError.message}`);
        errorCount++;
      } else {
        console.log(`   ✅ Updated successfully`);
        successCount++;
      }
    } catch (err) {
      console.error(`   ❌ Error: ${err}`);
      errorCount++;
    }

    console.log('');
  }

  console.log('\n📊 Summary');
  console.log(`   ✅ Success: ${successCount}/${units.length}`);
  console.log(`   ❌ Errors: ${errorCount}/${units.length}`);

  if (successCount === units.length) {
    console.log('\n🎉 All highlights updated successfully!');
  } else {
    console.error('\n⚠️  Some updates failed');
    process.exit(1);
  }
}

main();
