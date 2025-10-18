#!/usr/bin/env ts-node
/**
 * MUVA Universal Accommodation Sync Script
 *
 * Syncs accommodation data from markdown v3.0 files to accommodation_units_public table.
 * Works for ANY hotel/tenant in MUVA platform - completely standardized.
 *
 * Usage:
 *   set -a && source .env.local && set +a && npx tsx scripts/sync-accommodations-to-public.ts --tenant tucasamar
 *   set -a && source .env.local && set +a && npx tsx scripts/sync-accommodations-to-public.ts --all
 *   set -a && source .env.local && set +a && npx tsx scripts/sync-accommodations-to-public.ts --tenant simmerdown --dry-run
 *
 * @author MUVA Platform
 * @version 1.0.0
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { glob } from 'glob';

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
  description: string;
  shortDescription: string;
  amenities: Record<string, any>;
  pricing: Record<string, any>;
  photos: string[];
  metadata: Record<string, any>;
  isActive: boolean;
  isBookable: boolean;
}

interface ProcessingStats {
  tenantName: string;
  tenantId: string;
  processed: number;
  pricingComplete: number;
  amenitiesComplete: number;
  metadataComplete: number;
  totalScore: number;
  totalChunks: number;
}

/**
 * Generate Tier 1 embedding using OpenAI text-embedding-3-large (Fast/1024d)
 */
async function generateEmbeddingTier1(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-large', // CRITICAL: Must match public-chat-search.ts
    input: text,
    dimensions: 1024, // Tier 1 - Fast
  });
  return response.data[0].embedding;
}

/**
 * Generate Tier 2 embedding using OpenAI text-embedding-3-large (Balanced/1536d)
 */
async function generateEmbeddingTier2(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: text,
    dimensions: 1536, // Tier 2 - Balanced
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

  // Fallback: Look for multi-line extractions
  const multilineRegex = new RegExp(`<!-- EXTRAE: ${field} -->[\\s\\S]*?(?=<!--|$)`, 'i');
  const multiMatch = markdown.match(multilineRegex);
  if (multiMatch) {
    return multiMatch[0]
      .replace(`<!-- EXTRAE: ${field} -->`, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .trim()
      .split('\n')
      .map(line => line.replace(/^[*\-•]\s*/, '').trim())
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

  // Match patterns like "1 matrimonial", "2 Camas Sencillas", etc.
  const patterns = [
    { regex: /(\d+)\s*(?:cama\s*)?matrimonial/i, type: 'double' },
    { regex: /(\d+)\s*(?:camas?\s*)?sencillas?/i, type: 'single' },
    { regex: /(\d+)\s*(?:camas?\s*)?individuales?/i, type: 'single' },
    { regex: /sofá\s*cama\s*individual/i, type: 'sofa_bed', count: 1 },
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
function extractAccommodationData(filePath: string): AccommodationData | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const { data: frontmatter, content: markdown } = matter(content);

    // Validate version 3.0
    if (frontmatter.version !== '3.0') {
      console.warn(`⚠️  Skipping ${filePath} - not version 3.0`);
      return null;
    }

    // Extract tenant info
    const tenantId = frontmatter.tenant_id;
    const tenantName = path.basename(path.dirname(path.dirname(path.dirname(filePath))));

    if (!tenantId) {
      console.warn(`⚠️  Skipping ${filePath} - missing tenant_id`);
      return null;
    }

    // Extract basic fields
    const name = frontmatter.document?.title || 'Unknown';
    const shortDescription = frontmatter.document?.description || '';
    const description = markdown.trim();
    const unitType = frontmatter.accommodation?.unit_type || 'room';
    const photos = frontmatter.accommodation?.images || [];

    // Extract unit_number from markdown
    const unitNumber = extractFromMarkdown(markdown, 'unit_number') || null;

    // Build PRICING object (complete)
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

    // Build AMENITIES object
    const amenitiesFeatures = frontmatter.accommodation?.amenities?.features || [];
    const amenitiesText = amenitiesFeatures.join(', ');
    const bedConfig = frontmatter.accommodation?.bed_configuration || '';

    const amenities = {
      bed_type: bedConfig,
      capacity_max: frontmatter.accommodation?.capacity || 0,
      unit_amenities: amenitiesText || extractFromMarkdown(markdown, 'unit_amenities'),
      bed_configuration: bedConfig,
    };

    // Build METADATA object (complete 14+ fields like Simmerdown)
    const specialFeatures = frontmatter.accommodation?.amenities?.attributes?.special_features || [];
    const uniqueFeaturesFromMarkdown = extractFromMarkdown(markdown, 'unique_features');
    const uniqueFeatures = specialFeatures.length > 0
      ? specialFeatures
      : (uniqueFeaturesFromMarkdown ? uniqueFeaturesFromMarkdown.split(',').map(s => s.trim()) : []);

    const metadata = {
      name: name,
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

    const isActive = frontmatter.accommodation?.status === 'active';
    const isBookable = true;

    return {
      filePath,
      tenantId,
      tenantName,
      name,
      unitNumber,
      unitType,
      description,
      shortDescription,
      amenities,
      pricing,
      photos,
      metadata,
      isActive,
      isBookable,
    };
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error);
    return null;
  }
}

/**
 * Calculate field completeness score (0-100%)
 */
function calculateCompletenessScore(data: AccommodationData): number {
  let score = 0;
  const checks = [
    data.pricing?.currency && data.pricing?.base_price > 0,
    data.amenities?.unit_amenities && data.amenities.unit_amenities.length > 0,
    data.metadata?.size_m2 && data.metadata.size_m2 > 0,
    data.metadata?.capacity && data.metadata.capacity > 0,
    data.metadata?.view_type && data.metadata.view_type.length > 0,
    data.metadata?.unique_features && data.metadata.unique_features.length > 0,
    data.metadata?.booking_policies && data.metadata.booking_policies.length > 10,
    data.metadata?.location_details && data.metadata.location_details.length > 10,
    data.photos && data.photos.length > 0,
  ];

  score = (checks.filter(Boolean).length / checks.length) * 100;
  return Math.round(score);
}

/**
 * Divide documento markdown por secciones semánticas
 * Cada sección ## Título {#anchor} se convierte en un chunk
 */
function chunkByMarkdownSections(
  accommodationName: string,
  markdown: string
): Array<{ sectionType: string; sectionTitle: string; content: string }> {
  // Dividir por headers de nivel 2 (## )
  const sections = markdown.split(/(?=^## )/m).filter(s => s.trim().length > 0);

  const chunks: Array<{ sectionType: string; sectionTitle: string; content: string }> = [];

  for (const section of sections) {
    const lines = section.split('\n');
    const headerLine = lines[0];

    // Extraer título: "## Tarifas y Precios Detallados {#tarifas-precios}"
    const match = headerLine.match(/^##\s*(.+?)\s*(?:{#([^}]+)})?$/);
    if (!match) continue;

    const sectionTitle = match[1].trim();
    const sectionAnchor = match[2] || '';

    // Detectar tipo de sección
    const sectionType = detectSectionType(sectionTitle, sectionAnchor);

    // Construir contenido del chunk con contexto
    const chunkContent = `${accommodationName} - ${sectionTitle}\n\n${section.trim()}`;

    chunks.push({
      sectionType,
      sectionTitle,
      content: chunkContent
    });
  }

  return chunks;
}

/**
 * Detecta el tipo semántico de sección
 */
function detectSectionType(title: string, anchor: string): string {
  const titleLower = title.toLowerCase();
  const anchorLower = anchor.toLowerCase();

  if (titleLower.includes('overview') || anchorLower.includes('overview')) return 'overview';
  if (titleLower.includes('capacidad') || anchorLower.includes('capacidad')) return 'capacity';
  if (titleLower.includes('tarifa') || titleLower.includes('precio') || anchorLower.includes('precio')) return 'pricing';
  if (titleLower.includes('amenities') || titleLower.includes('características')) return 'amenities';
  if (titleLower.includes('ubicación') || titleLower.includes('visual') || titleLower.includes('location')) return 'location';
  if (titleLower.includes('política') || anchorLower.includes('politica')) return 'policies';
  if (titleLower.includes('reserva') || titleLower.includes('booking')) return 'booking';

  return 'general';
}

/**
 * Insert or update accommodation in database
 */
async function syncAccommodation(
  data: AccommodationData,
  embeddingFast: number[],
  embeddingBalanced: number[]
): Promise<boolean> {
  try {
    // Check if exists
    const { data: existing, error: checkError } = await supabase
      .from('accommodation_units_public')
      .select('unit_id, description')
      .eq('tenant_id', data.tenantId)
      .eq('name', data.name)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error(`   ❌ Error checking existence: ${checkError.message}`);
      return false;
    }

    const record = {
      tenant_id: data.tenantId,
      name: data.name,
      unit_number: data.unitNumber,
      unit_type: data.unitType,
      description: data.description,
      short_description: data.shortDescription,
      amenities: data.amenities,
      pricing: data.pricing,
      photos: data.photos,
      metadata: data.metadata,
      embedding_fast: embeddingFast,
      embedding: embeddingBalanced, // Tier 2 - Balanced (1536d)
      is_active: data.isActive,
      is_bookable: data.isBookable,
    };

    if (existing) {
      // Update existing
      const { error: updateError } = await supabase
        .from('accommodation_units_public')
        .update(record)
        .eq('unit_id', existing.unit_id);

      if (updateError) {
        console.error(`   ❌ Error updating: ${updateError.message}`);
        return false;
      }

      return true;
    } else {
      // Insert new
      const { error: insertError } = await supabase
        .from('accommodation_units_public')
        .insert(record);

      if (insertError) {
        console.error(`   ❌ Error inserting: ${insertError.message}`);
        return false;
      }

      return true;
    }
  } catch (error) {
    console.error(`   ❌ Error syncing accommodation:`, error);
    return false;
  }
}

/**
 * Process all accommodations for a tenant
 */
async function processTenant(tenantName: string, files: string[]): Promise<ProcessingStats> {
  const stats: ProcessingStats = {
    tenantName,
    tenantId: '',
    processed: 0,
    pricingComplete: 0,
    amenitiesComplete: 0,
    metadataComplete: 0,
    totalScore: 0,
    totalChunks: 0,
  };

  console.log(`\n📊 ${tenantName.toUpperCase()}`);
  console.log('━'.repeat(50));

  for (const file of files) {
    const data = extractAccommodationData(file);
    if (!data) continue;

    if (!stats.tenantId) stats.tenantId = data.tenantId;

    const score = calculateCompletenessScore(data);
    stats.totalScore += score;
    stats.processed++;

    // Track completeness
    if (data.pricing?.base_price > 0) stats.pricingComplete++;
    if (data.amenities?.unit_amenities?.length > 0) stats.amenitiesComplete++;
    if (data.metadata && Object.keys(data.metadata).length >= 10) stats.metadataComplete++;

    console.log(`\n   📄 ${data.name}`);
    console.log(`      Completeness: ${score}%`);
    console.log(`      Pricing: ${data.pricing?.currency} ${data.pricing?.base_price?.toLocaleString()}`);
    console.log(`      Amenities: ${data.amenities?.unit_amenities?.substring(0, 50)}...`);
    console.log(`      Metadata fields: ${Object.keys(data.metadata).length}`);

    // ✅ NUEVO: Dividir en chunks semánticos
    const chunks = chunkByMarkdownSections(data.name, data.description);
    console.log(`      📦 Chunks: ${chunks.length} secciones semánticas`);
    stats.totalChunks += chunks.length;

    if (isDryRun) {
      console.log(`      🔍 DRY RUN - Would create ${chunks.length} chunks`);
      chunks.forEach((chunk, i) => {
        console.log(`         ${i + 1}. ${chunk.sectionTitle} (${chunk.content.length} chars)`);
      });
      continue;
    }

    // ✅ NUEVO: Procesar cada chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      console.log(`      ⏳ [${i + 1}/${chunks.length}] Generating embeddings (Tier 1 + Tier 2) for: ${chunk.sectionTitle}...`);

      // Generate BOTH Tier 1 and Tier 2 embeddings in parallel
      const [embeddingFast, embeddingBalanced] = await Promise.all([
        generateEmbeddingTier1(chunk.content),  // Tier 1 - Fast (1024d)
        generateEmbeddingTier2(chunk.content)   // Tier 2 - Balanced (1536d)
      ]);

      // Crear data del chunk con nombre único
      const chunkData = {
        ...data,
        name: `${data.name} - ${chunk.sectionTitle}`,
        description: chunk.content,
        metadata: {
          ...data.metadata,
          section_type: chunk.sectionType,
          section_title: chunk.sectionTitle,
          original_accommodation: data.name,
          chunk_index: i + 1,
          total_chunks: chunks.length
        }
      };

      console.log(`      💾 [${i + 1}/${chunks.length}] Syncing chunk to database...`);
      const success = await syncAccommodation(chunkData, embeddingFast, embeddingBalanced);

      if (success) {
        console.log(`      ✅ [${i + 1}/${chunks.length}] Chunk synced: ${chunk.sectionTitle}`);
      } else {
        console.log(`      ❌ [${i + 1}/${chunks.length}] Chunk sync failed`);
      }
    }

    console.log(`      ✅ All ${chunks.length} chunks synced for ${data.name}`);
  }

  return stats;
}

/**
 * Print summary statistics
 */
function printSummary(allStats: ProcessingStats[]) {
  console.log('\n\n');
  console.log('═'.repeat(60));
  console.log('📊 MUVA ACCOMMODATION SYNC - SUMMARY');
  console.log('═'.repeat(60));

  for (const stats of allStats) {
    const avgScore = stats.processed > 0 ? Math.round(stats.totalScore / stats.processed) : 0;
    const pricingPct = stats.processed > 0 ? Math.round((stats.pricingComplete / stats.processed) * 100) : 0;
    const amenitiesPct = stats.processed > 0 ? Math.round((stats.amenitiesComplete / stats.processed) * 100) : 0;
    const metadataPct = stats.processed > 0 ? Math.round((stats.metadataComplete / stats.processed) * 100) : 0;

    console.log(`\n📦 ${stats.tenantName.toUpperCase()} (${stats.tenantId})`);
    console.log(`   Accommodations: ${stats.processed}`);
    console.log(`   Total chunks created: ${stats.totalChunks}`);
    console.log(`   Pricing: ${pricingPct}% (${stats.pricingComplete}/${stats.processed}) ${pricingPct === 100 ? '✅' : '⚠️'}`);
    console.log(`   Amenities: ${amenitiesPct}% (${stats.amenitiesComplete}/${stats.processed}) ${amenitiesPct === 100 ? '✅' : '⚠️'}`);
    console.log(`   Metadata: ${metadataPct}% (${stats.metadataComplete}/${stats.processed}) ${metadataPct === 100 ? '✅' : '⚠️'}`);
    console.log(`   Overall Completeness: ${avgScore}% ${avgScore >= 90 ? '⭐' : avgScore >= 70 ? '✅' : '⚠️'}`);
  }

  console.log('\n' + '═'.repeat(60));

  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes were made to the database');
  } else {
    console.log('✅ All accommodations synced successfully!');
  }

  console.log('═'.repeat(60) + '\n');
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 MUVA Universal Accommodation Sync');
  console.log('━'.repeat(60));

  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made');
  }

  // Discover all accommodation files
  const allFiles = await glob('_assets/*/accommodations/**/*.md', {
    cwd: process.cwd(),
    absolute: true,
  });

  if (allFiles.length === 0) {
    console.error('❌ No accommodation files found');
    process.exit(1);
  }

  console.log(`📁 Found ${allFiles.length} accommodation files\n`);

  // Group by tenant
  const filesByTenant: Record<string, string[]> = {};
  for (const file of allFiles) {
    const tenant = path.basename(path.dirname(path.dirname(path.dirname(file))));
    if (!filesByTenant[tenant]) filesByTenant[tenant] = [];
    filesByTenant[tenant].push(file);
  }

  // Filter by tenant if specified
  let tenantsToProcess: string[] = Object.keys(filesByTenant);
  if (!processAll && tenantName) {
    if (!filesByTenant[tenantName]) {
      console.error(`❌ Tenant "${tenantName}" not found`);
      console.log('   Available tenants:', Object.keys(filesByTenant).join(', '));
      process.exit(1);
    }
    tenantsToProcess = [tenantName];
  }

  // Process tenants
  const allStats: ProcessingStats[] = [];
  for (const tenant of tenantsToProcess) {
    const stats = await processTenant(tenant, filesByTenant[tenant]);
    allStats.push(stats);
  }

  // Print summary
  printSummary(allStats);
}

// Execute
main().catch(console.error);
