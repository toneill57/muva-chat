#!/usr/bin/env node
/**
 * Content Sync Script - MUVA Chat Multi-Environment
 *
 * Sincroniza datos de muva_content entre ambientes (DEV → TST, TST → PRD, etc.)
 *
 * Uso:
 *   node scripts/database/sync-content.js                    # DEV → TST (default)
 *   node scripts/database/sync-content.js --from=dev --to=tst
 *   node scripts/database/sync-content.js --from=dev --to=prd
 *   node scripts/database/sync-content.js --clean            # Limpia destino antes de insertar
 *   node scripts/database/sync-content.js --dry-run          # Solo muestra qué haría
 */

// Configuración de ambientes
const ENVIRONMENTS = {
  dev: {
    name: 'DEVELOPMENT',
    projectId: 'zpyxgkvonrxbhvmkuzlt',
    color: '\x1b[32m', // Green
  },
  tst: {
    name: 'TESTING/STAGING',
    projectId: 'bddcvjoeoiekzfetvxoe',
    color: '\x1b[33m', // Yellow
  },
  prd: {
    name: 'PRODUCTION',
    projectId: 'kprqghwdnaykxhostivv',
    color: '\x1b[31m', // Red
  }
};

const ACCESS_TOKEN = 'sbp_32b777f1b90ca669a789023b6b0c0ba2e92974fa';
const RESET = '\x1b[0m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';

// Parse argumentos
const args = process.argv.slice(2);
let fromEnv = 'dev';
let toEnv = 'tst';
let cleanFirst = false;
let dryRun = false;

for (const arg of args) {
  if (arg.startsWith('--from=')) {
    fromEnv = arg.split('=')[1];
  } else if (arg.startsWith('--to=')) {
    toEnv = arg.split('=')[1];
  } else if (arg === '--clean') {
    cleanFirst = true;
  } else if (arg === '--dry-run') {
    dryRun = true;
  } else if (arg === '--help' || arg === '-h') {
    console.log(`
${BOLD}Content Sync Script - MUVA Chat${RESET}

${CYAN}Uso:${RESET}
  node scripts/database/sync-content.js [opciones]

${CYAN}Opciones:${RESET}
  --from=<env>   Ambiente origen (dev, tst, prd). Default: dev
  --to=<env>     Ambiente destino (dev, tst, prd). Default: tst
  --clean        Limpia la tabla destino antes de insertar
  --dry-run      Solo muestra qué haría, sin ejecutar
  --help, -h     Muestra esta ayuda

${CYAN}Ejemplos:${RESET}
  node scripts/database/sync-content.js                     # DEV → TST
  node scripts/database/sync-content.js --from=dev --to=prd # DEV → PRD
  node scripts/database/sync-content.js --clean             # Limpia TST, luego copia DEV
  node scripts/database/sync-content.js --dry-run           # Preview sin ejecutar
`);
    process.exit(0);
  }
}

// Validar ambientes
if (!ENVIRONMENTS[fromEnv]) {
  console.error(`❌ Error: Ambiente origen '${fromEnv}' no válido. Usa: dev, tst, prd`);
  process.exit(1);
}
if (!ENVIRONMENTS[toEnv]) {
  console.error(`❌ Error: Ambiente destino '${toEnv}' no válido. Usa: dev, tst, prd`);
  process.exit(1);
}
if (fromEnv === toEnv) {
  console.error(`❌ Error: Origen y destino no pueden ser iguales`);
  process.exit(1);
}

const sourceConfig = ENVIRONMENTS[fromEnv];
const targetConfig = ENVIRONMENTS[toEnv];

// Ejecutar SQL via Management API
async function executeSQL(projectId, sql) {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectId}/database/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: sql })
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(JSON.stringify(result));
  }

  return result;
}

// Escapar valores para SQL
function escapeSQL(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'number') return value.toString();
  if (Array.isArray(value)) {
    // Para arrays de floats (embeddings)
    if (value.length > 0 && typeof value[0] === 'number') {
      return `'[${value.join(',')}]'::vector`;
    }
    // Para arrays de strings (tags, keywords)
    return `ARRAY[${value.map(v => `'${String(v).replace(/'/g, "''")}'`).join(',')}]::text[]`;
  }
  if (typeof value === 'object') {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  }
  // String
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function main() {
  console.log(`
${BOLD}═══════════════════════════════════════════════════════════════${RESET}
${BOLD}  Content Sync: ${sourceConfig.color}${sourceConfig.name}${RESET} → ${targetConfig.color}${targetConfig.name}${RESET}
${BOLD}═══════════════════════════════════════════════════════════════${RESET}
`);

  if (dryRun) {
    console.log(`${CYAN}🔍 DRY RUN MODE - No se ejecutarán cambios${RESET}\n`);
  }

  try {
    // 1. Leer datos del origen
    console.log(`${sourceConfig.color}📖 Leyendo datos de ${sourceConfig.name}...${RESET}`);
    const sourceData = await executeSQL(sourceConfig.projectId, `
      SELECT * FROM muva_content ORDER BY created_at
    `);

    if (!sourceData || sourceData.length === 0) {
      console.log(`\n${CYAN}ℹ️  No hay datos en ${sourceConfig.name} para sincronizar${RESET}`);
      process.exit(0);
    }

    // Estadísticas
    const uniqueDocs = new Set(sourceData.map(r => r.source_file).filter(Boolean));
    console.log(`   ✓ ${sourceData.length} chunks encontrados`);
    console.log(`   ✓ ${uniqueDocs.size} documentos únicos`);

    // 2. Verificar estado del destino
    console.log(`\n${targetConfig.color}📊 Verificando ${targetConfig.name}...${RESET}`);
    const targetData = await executeSQL(targetConfig.projectId, `
      SELECT COUNT(*) as count FROM muva_content
    `);
    const targetCount = targetData[0]?.count || 0;
    console.log(`   ✓ ${targetCount} registros existentes`);

    // 3. Limpiar destino si se solicitó
    if (cleanFirst && targetCount > 0) {
      console.log(`\n${targetConfig.color}🗑️  Limpiando ${targetConfig.name}...${RESET}`);
      if (!dryRun) {
        await executeSQL(targetConfig.projectId, `DELETE FROM muva_content`);
        console.log(`   ✓ ${targetCount} registros eliminados`);
      } else {
        console.log(`   [DRY RUN] Eliminaría ${targetCount} registros`);
      }
    }

    // 4. Insertar datos
    console.log(`\n${targetConfig.color}📝 Insertando datos en ${targetConfig.name}...${RESET}`);

    // Columnas a copiar (excluyendo id que se genera automáticamente)
    const columns = Object.keys(sourceData[0]).filter(c => c !== 'id');

    let inserted = 0;
    let errors = 0;
    const batchSize = 10; // Insertar en lotes pequeños para evitar timeouts

    for (let i = 0; i < sourceData.length; i += batchSize) {
      const batch = sourceData.slice(i, i + batchSize);

      const values = batch.map(row => {
        const vals = columns.map(col => escapeSQL(row[col]));
        return `(${vals.join(', ')})`;
      }).join(',\n');

      const insertSQL = `
        INSERT INTO muva_content (${columns.join(', ')})
        VALUES ${values}
        ON CONFLICT (id) DO NOTHING
      `;

      if (!dryRun) {
        try {
          await executeSQL(targetConfig.projectId, insertSQL);
          inserted += batch.length;
        } catch (err) {
          console.error(`   ❌ Error en batch ${i}-${i + batch.length}:`, err.message);
          errors += batch.length;
        }
      } else {
        inserted += batch.length;
      }

      // Mostrar progreso
      const progress = Math.round(((i + batch.length) / sourceData.length) * 100);
      process.stdout.write(`\r   Progreso: ${progress}% (${i + batch.length}/${sourceData.length})`);
    }

    console.log(`\n`);

    // 5. Verificar resultado
    if (!dryRun) {
      const finalCount = await executeSQL(targetConfig.projectId, `
        SELECT COUNT(*) as count FROM muva_content
      `);
      console.log(`${BOLD}✅ Sincronización completada${RESET}`);
      console.log(`   • Registros insertados: ${inserted}`);
      console.log(`   • Errores: ${errors}`);
      console.log(`   • Total en ${targetConfig.name}: ${finalCount[0]?.count || 0}`);
    } else {
      console.log(`${CYAN}🔍 DRY RUN completado${RESET}`);
      console.log(`   • Se insertarían: ${inserted} registros`);
      console.log(`   • ${cleanFirst ? `Se eliminarían primero ${targetCount} registros existentes` : 'No se eliminarían registros existentes'}`);
    }

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

main();
