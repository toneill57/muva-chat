/**
 * Script: Populate SIRE Codes in sire_countries Table
 *
 * Purpose: Maps official SIRE country codes from codigos-pais.json to sire_countries table.
 *
 * Context: SIRE uses proprietary country codes different from ISO 3166-1.
 * Examples:
 * - USA: ISO 840 → SIRE 249
 * - Colombia: ISO 170 → SIRE 169
 * - Brasil: ISO 076 → SIRE 105
 *
 * Source: _assets/sire/codigos-pais.json (250 countries with official SIRE codes)
 * Target: public.sire_countries.sire_code column (added in migration 20251009000002)
 *
 * FASE: 11.2 - SIRE Compliance Corrections
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// TYPES
// ============================================================================

interface SIRECountryCode {
  codigo: string;  // SIRE code (e.g., "249")
  nombre: string;  // Country name in Spanish (e.g., "ESTADOS UNIDOS")
}

interface DatabaseCountry {
  iso_code: string;
  name_es: string;
  sire_code: string | null;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!SUPABASE_URL);
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!SUPABASE_SERVICE_KEY);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ============================================================================
// NAME NORMALIZATION
// ============================================================================

/**
 * Normalize country name for matching
 *
 * Rules:
 * - Convert to uppercase
 * - Remove accents (á→A, é→E, ñ→N)
 * - Remove extra spaces
 * - Trim
 *
 * Examples:
 * - "Estados Unidos" → "ESTADOS UNIDOS"
 * - "México" → "MEXICO"
 * - "Países Bajos" → "PAISES BAJOS"
 */
function normalizeName(name: string): string {
  return name
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/\s+/g, ' ')            // Normalize spaces
    .trim();
}

// ============================================================================
// DATA LOADING
// ============================================================================

/**
 * Load SIRE country codes from JSON file
 */
function loadSIRECodes(): SIRECountryCode[] {
  const filePath = path.join(process.cwd(), '_assets', 'sire', 'codigos-pais.json');

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(fileContent);

  console.log(`✅ Loaded ${data.length} SIRE country codes from codigos-pais.json`);
  return data;
}

/**
 * Load existing countries from database
 */
async function loadDatabaseCountries(): Promise<DatabaseCountry[]> {
  const { data, error } = await supabase
    .from('sire_countries')
    .select('iso_code, name_es, sire_code');

  if (error) {
    throw new Error(`Failed to load database countries: ${error.message}`);
  }

  console.log(`✅ Loaded ${data.length} countries from sire_countries table`);
  return data;
}

// ============================================================================
// MATCHING LOGIC
// ============================================================================

/**
 * Match SIRE codes to database countries by normalized name
 *
 * Returns:
 * - matched: Array of [iso_code, sire_code] pairs to update
 * - unmatched: SIRE countries that couldn't be matched
 * - alreadySet: Database countries that already have SIRE code (from migration)
 */
function matchCountries(
  sireCountries: SIRECountryCode[],
  dbCountries: DatabaseCountry[]
): {
  matched: Array<{ iso_code: string; sire_code: string; name: string }>;
  unmatched: SIRECountryCode[];
  alreadySet: DatabaseCountry[];
} {
  const matched: Array<{ iso_code: string; sire_code: string; name: string }> = [];
  const unmatched: SIRECountryCode[] = [];
  const alreadySet: DatabaseCountry[] = [];

  // Create map of normalized names to database countries
  const dbMap = new Map<string, DatabaseCountry>();
  for (const dbCountry of dbCountries) {
    const normalized = normalizeName(dbCountry.name_es);
    dbMap.set(normalized, dbCountry);
  }

  // Match each SIRE country
  for (const sireCountry of sireCountries) {
    const normalized = normalizeName(sireCountry.nombre);
    const dbCountry = dbMap.get(normalized);

    if (dbCountry) {
      if (dbCountry.sire_code) {
        // Already has SIRE code (from migration)
        alreadySet.push(dbCountry);
      } else {
        // Need to update
        matched.push({
          iso_code: dbCountry.iso_code,
          sire_code: sireCountry.codigo,
          name: dbCountry.name_es,
        });
      }
    } else {
      // No match found
      unmatched.push(sireCountry);
    }
  }

  return { matched, unmatched, alreadySet };
}

// ============================================================================
// DATABASE UPDATES
// ============================================================================

/**
 * Update sire_code for matched countries
 */
async function updateSIRECodes(
  matches: Array<{ iso_code: string; sire_code: string; name: string }>
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  console.log(`\n📝 Updating ${matches.length} countries...`);

  for (const match of matches) {
    const { error } = await supabase
      .from('sire_countries')
      .update({ sire_code: match.sire_code })
      .eq('iso_code', match.iso_code);

    if (error) {
      console.error(`   ❌ Failed to update ${match.name} (${match.iso_code}):`, error.message);
      failed++;
    } else {
      console.log(`   ✅ ${match.name}: ISO ${match.iso_code} → SIRE ${match.sire_code}`);
      success++;
    }
  }

  return { success, failed };
}

// ============================================================================
// MAIN SCRIPT
// ============================================================================

async function main() {
  console.log('🚀 Starting SIRE Code Population Script\n');
  console.log('=' .repeat(80));

  try {
    // Step 1: Load data
    console.log('\n📂 STEP 1: Loading Data\n');
    const sireCountries = loadSIRECodes();
    const dbCountries = await loadDatabaseCountries();

    // Step 2: Match countries
    console.log('\n🔍 STEP 2: Matching Countries\n');
    const { matched, unmatched, alreadySet } = matchCountries(sireCountries, dbCountries);

    console.log(`✅ Matched: ${matched.length} countries`);
    console.log(`⏭️  Already set: ${alreadySet.length} countries (from migration)`);
    console.log(`⚠️  Unmatched: ${unmatched.length} countries`);

    // Step 3: Update database
    console.log('\n💾 STEP 3: Updating Database\n');
    const { success, failed } = await updateSIRECodes(matched);

    // Step 4: Report results
    console.log('\n' + '=' .repeat(80));
    console.log('\n📊 FINAL RESULTS\n');
    console.log(`✅ Successfully updated: ${success} countries`);
    console.log(`⏭️  Already had SIRE code: ${alreadySet.length} countries`);
    console.log(`❌ Failed to update: ${failed} countries`);
    console.log(`⚠️  Unmatched SIRE entries: ${unmatched.length} countries`);

    // Show unmatched countries
    if (unmatched.length > 0) {
      console.log('\n⚠️  UNMATCHED SIRE COUNTRIES:\n');
      for (const country of unmatched) {
        console.log(`   - ${country.nombre} (SIRE: ${country.codigo})`);
      }
      console.log('\n   These countries exist in SIRE but not in our database.');
      console.log('   This is expected for some territories/regions.');
    }

    // Final summary
    const totalUpdated = success + alreadySet.length;
    const coverage = ((totalUpdated / sireCountries.length) * 100).toFixed(1);
    console.log(`\n🎯 Coverage: ${totalUpdated}/${sireCountries.length} (${coverage}%)`);
    console.log('\n✅ Script completed successfully!');

  } catch (error) {
    console.error('\n❌ Script failed with error:', error);
    process.exit(1);
  }
}

// Run script
main();
