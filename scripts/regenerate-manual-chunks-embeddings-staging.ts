import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Staging Supabase
const staging = createClient(
  'https://hoaiwcueleiemeplrurv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvYWl3Y3VlbGVpZW1lcGxydXJ2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQ3ODMxNiwiZXhwIjoyMDc4MDU0MzE2fQ.ddsf2Jl8--jbN05avrNjxLr4335VGTX-Xg3RQvH6IE4'
);

// OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ''
});

interface ChunkToProcess {
  id: string;
  chunk_content: string;
  section_title: string | null;
  tenant_id: string;
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateEmbeddings(text: string) {
  // Matryoshka embeddings - 3 tamaños según schema
  console.log(`    Generando embeddings para texto de ${text.length} caracteres...`);

  // 1. Full size (3072 dim) - mejor calidad
  const embedding = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: text,
    dimensions: 3072
  });

  // 2. Balanced (1536 dim) - balance calidad/velocidad
  const embeddingBalanced = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: text,
    dimensions: 1536
  });

  // 3. Fast (1024 dim) - más rápido
  const embeddingFast = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: text,
    dimensions: 1024
  });

  return {
    embedding: embedding.data[0].embedding,
    embedding_balanced: embeddingBalanced.data[0].embedding,
    embedding_fast: embeddingFast.data[0].embedding
  };
}

async function regenerateEmbeddings() {
  console.log('=== REGENERACIÓN DE EMBEDDINGS - STAGING ===\n');

  // Verificar API key
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ ERROR: OPENAI_API_KEY no encontrada en .env.local');
    console.log('\nEjecuta:');
    console.log('  set -a && source .env.local && set +a');
    console.log('  pnpm dlx tsx scripts/regenerate-manual-chunks-embeddings-staging.ts');
    return;
  }

  console.log('✅ OpenAI API key encontrada\n');

  // 1. Fetch chunks sin embeddings
  console.log('1. Buscando chunks sin embeddings...');
  const { data: chunks, error: fetchError } = await staging
    .from('accommodation_units_manual_chunks')
    .select('id, chunk_content, section_title, tenant_id')
    .is('embedding', null)
    .order('chunk_index');

  if (fetchError) {
    console.error('❌ Error fetching chunks:', fetchError);
    return;
  }

  const totalChunks = chunks?.length || 0;
  console.log(`   Encontrados: ${totalChunks} chunks\n`);

  if (totalChunks === 0) {
    console.log('✅ No hay chunks pendientes - todos tienen embeddings!');
    return;
  }

  // Estimación de costo
  const estimatedCost = totalChunks * 3 * 0.00013; // 3 embeddings por chunk
  console.log(`💰 Costo estimado: ~$${estimatedCost.toFixed(2)} USD\n`);
  console.log('⏳ Iniciando procesamiento (con delays para evitar rate limits)...\n');

  // 2. Procesar cada chunk
  let processed = 0;
  let failed = 0;

  for (const chunk of chunks as ChunkToProcess[]) {
    try {
      console.log(`[${processed + 1}/${totalChunks}] Procesando chunk ${chunk.id.substring(0, 8)}...`);
      console.log(`    Sección: "${chunk.section_title || 'Sin título'}"`);

      // Generar embeddings
      const embeddings = await generateEmbeddings(chunk.chunk_content);

      // Actualizar en DB
      const { error: updateError } = await staging
        .from('accommodation_units_manual_chunks')
        .update({
          embedding: embeddings.embedding,
          embedding_balanced: embeddings.embedding_balanced,
          embedding_fast: embeddings.embedding_fast,
          updated_at: new Date().toISOString()
        })
        .eq('id', chunk.id);

      if (updateError) {
        console.error(`    ❌ Error actualizando: ${updateError.message}`);
        failed++;
      } else {
        console.log(`    ✅ Embeddings guardados`);
        processed++;
      }

      // Delay para evitar rate limits (500ms entre requests)
      if (processed % 10 === 0) {
        console.log(`\n⏸️  Pausa de 2s después de 10 chunks...\n`);
        await sleep(2000);
      } else {
        await sleep(500);
      }

    } catch (error: any) {
      console.error(`    ❌ Error procesando chunk: ${error.message}`);
      failed++;

      // Si es rate limit, esperar más tiempo
      if (error.message.includes('rate_limit')) {
        console.log('    ⏸️  Rate limit detectado - esperando 10s...');
        await sleep(10000);
      }
    }
  }

  // 3. Resumen final
  console.log('\n=== RESUMEN FINAL ===');
  console.log(`✅ Procesados exitosamente: ${processed}/${totalChunks}`);
  if (failed > 0) {
    console.log(`❌ Fallidos: ${failed}`);
  }

  // 4. Verificar resultado
  console.log('\n4. Verificando resultado...');
  const { count: remainingNull } = await staging
    .from('accommodation_units_manual_chunks')
    .select('*', { count: 'exact', head: true })
    .is('embedding', null);

  console.log(`   Chunks pendientes: ${remainingNull || 0}`);

  if (remainingNull === 0) {
    console.log('\n🎉 ¡TODOS LOS EMBEDDINGS REGENERADOS EXITOSAMENTE!');
    console.log('\nPróximos pasos:');
    console.log('1. Testear guest chat en staging');
    console.log('2. Verificar vector search funciona correctamente');
  } else {
    console.log(`\n⚠️  Aún quedan ${remainingNull} chunks sin embeddings`);
    console.log('Ejecuta el script nuevamente para procesar los faltantes');
  }
}

regenerateEmbeddings().catch(console.error);
