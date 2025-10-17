/**
 * ⚠️ DEPRECATED - Use sync-accommodations-to-public.ts instead
 *
 * This script is tenant-specific and has been replaced by the universal sync script.
 *
 * New script: scripts/sync-accommodations-to-public.ts
 * Usage: npx tsx scripts/sync-accommodations-to-public.ts --tenant tucasamar
 *
 * This file is kept for historical reference only.
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import fs from 'fs';
import matter from 'gray-matter';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const openaiKey = process.env.OPENAI_API_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);
const openai = new OpenAI({ apiKey: openaiKey });

const TENANT_ID = '2263efba-b62b-417b-a422-a84638bc632f'; // Tu Casa Mar

const files = [
  '_assets/tucasamar/accommodations/rooms/cotton-cay.md',
  '_assets/tucasamar/accommodations/rooms/crab-cay.md',
  '_assets/tucasamar/accommodations/rooms/haines-cay.md',
  '_assets/tucasamar/accommodations/rooms/queena-reef.md',
  '_assets/tucasamar/accommodations/rooms/serrana-cay.md',
  '_assets/tucasamar/accommodations/apartments/rose-cay.md',
];

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-large', // MATCH public-chat-search.ts model
    input: text,
    dimensions: 1024, // Tier 1 Matryoshka
  });
  return response.data[0].embedding;
}

async function main() {
  console.log('🚀 Insertando 6 unidades de Tu Casa Mar en accommodation_units_public...\n');

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const { data: frontmatter, content: markdown } = matter(content);

    const unitName = frontmatter.document?.title || 'Unknown';
    const description = markdown.trim();
    const shortDesc = frontmatter.document?.description || '';
    const unitType = frontmatter.accommodation?.unit_type || 'room';
    const images = frontmatter.accommodation?.images || [];

    // Extract pricing from YAML frontmatter
    const pricingData = frontmatter.accommodation?.pricing || {};
    const pricing = {
      currency: pricingData.currency || 'COP',
      base_price: pricingData.base_price_low_season || pricingData.base_price_high_season || 0,
      base_price_low_season: pricingData.base_price_low_season || 0,
      base_price_high_season: pricingData.base_price_high_season || 0,
    };

    console.log(`📄 Procesando: ${unitName}`);
    console.log(`  💰 Pricing: ${JSON.stringify(pricing)}`);

    // Generar embedding Tier 1 (1024d)
    const embedding = await generateEmbedding(description);
    console.log(`  ✅ Embedding generado (${embedding.length} dims)`);

    // Insertar en accommodation_units_public
    const { data, error } = await supabase
      .from('accommodation_units_public')
      .insert({
        tenant_id: TENANT_ID,
        name: unitName,
        unit_type: unitType,
        description: description,
        short_description: shortDesc,
        photos: images,
        pricing: pricing, // ADD PRICING FIELD
        embedding_fast: embedding,
        metadata: {
          source_type: 'markdown_v3',
          uploaded_at: new Date().toISOString(),
          file_path: filePath,
        },
        is_active: true,
        is_bookable: true,
      });

    if (error) {
      console.error(`  ❌ Error: ${error.message}`);
    } else {
      console.log(`  ✅ Insertado en accommodation_units_public\n`);
    }
  }

  console.log('✅ Proceso completado!');
}

main().catch(console.error);
