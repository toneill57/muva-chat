#!/usr/bin/env node
/**
 * Database Query Helper - MUVA Chat Multi-Environment
 *
 * Soporta queries a DEV/TST/PRD con validaciones de seguridad
 *
 * Uso:
 *   node .claude/db-query.js "SELECT * FROM tabla"                    # DEV (default)
 *   node .claude/db-query.js dev "SELECT * FROM tabla"                # DEV (explícito)
 *   node .claude/db-query.js tst "SELECT * FROM tabla LIMIT 10"       # TST (requiere autorización)
 *   node .claude/db-query.js prd "SELECT * FROM tabla LIMIT 5"        # PRD (requiere autorización)
 */

// Configuración de ambientes
const ENVIRONMENTS = {
  dev: {
    name: 'DEVELOPMENT',
    projectId: 'zpyxgkvonrxbhvmkuzlt',
    color: '\x1b[32m', // Green
    warning: false
  },
  tst: {
    name: 'TESTING/STAGING',
    projectId: 'bddcvjoeoiekzfetvxoe',
    color: '\x1b[33m', // Yellow
    warning: true
  },
  prd: {
    name: 'PRODUCTION',
    projectId: 'kprqghwdnaykxhostivv',
    color: '\x1b[31m', // Red
    warning: true
  }
};

const ACCESS_TOKEN = 'sbp_32b777f1b90ca669a789023b6b0c0ba2e92974fa';
const RESET = '\x1b[0m';

// Parse argumentos
const args = process.argv.slice(2);
let env = 'dev';
let query = args[0];

if (args.length > 1 && ['dev', 'tst', 'prd'].includes(args[0])) {
  env = args[0];
  query = args[1];
}

if (!query) {
  console.error('❌ Error: No query provided\n');
  console.error('Usage:');
  console.error('  node .claude/db-query.js "SELECT * FROM table"');
  console.error('  node .claude/db-query.js dev "SELECT * FROM table"');
  console.error('  node .claude/db-query.js tst "SELECT * FROM table LIMIT 10"');
  console.error('  node .claude/db-query.js prd "SELECT * FROM table LIMIT 5"');
  process.exit(1);
}

const config = ENVIRONMENTS[env];

// Validar query para TST/PRD
if (config.warning) {
  const destructiveKeywords = /\b(DELETE|UPDATE|DROP|TRUNCATE|ALTER|CREATE|INSERT|GRANT|REVOKE)\b/i;

  if (destructiveKeywords.test(query)) {
    console.error(`\n${config.color}${'❌'.repeat(40)}${RESET}`);
    console.error(`${config.color}❌ ERROR: Queries destructivas no permitidas en ${env.toUpperCase()}${RESET}`);
    console.error(`${config.color}${'❌'.repeat(40)}${RESET}\n`);
    console.error('Solo se permiten queries SELECT (read-only) en TST/PRD');
    console.error('\nQuery rechazada:', query);
    process.exit(1);
  }

  // Mostrar warning visual
  console.log(`\n${config.color}${'⚠️ '.repeat(30)}${RESET}`);
  console.log(`${config.color}⚠️  CONECTANDO A ${config.name} (${config.projectId})${RESET}`);
  console.log(`${config.color}⚠️  Query: ${query.substring(0, 60)}${query.length > 60 ? '...' : ''}${RESET}`);
  console.log(`${config.color}⚠️  Esta operación accede a datos ${env === 'prd' ? 'REALES de PRODUCCIÓN' : 'de Testing/Staging'}${RESET}`);
  console.log(`${config.color}${'⚠️ '.repeat(30)}${RESET}\n`);
}

// Ejecutar query via Management API
async function executeSQL(sql, environment) {
  try {
    const startTime = Date.now();

    const response = await fetch(
      `https://api.supabase.com/v1/projects/${environment.projectId}/database/query`,
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
    const duration = Date.now() - startTime;

    if (!response.ok) {
      console.error(`${config.color}❌ Query failed (${environment.name}):${RESET}`, result);
      process.exit(1);
    }

    // Mostrar resultado con contexto
    console.log(`${config.color}✅ Query ejecutado en ${environment.name} (${duration}ms)${RESET}\n`);
    console.log(JSON.stringify(result, null, 2));

    // Warning adicional para TST/PRD
    if (environment.warning && result.length > 0) {
      console.log(`\n${config.color}⚠️  Resultados de ${environment.name} - ${Array.isArray(result) ? result.length : 'N/A'} filas${RESET}`);
    }

  } catch (error) {
    console.error(`${config.color}❌ Error:${RESET}`, error.message);
    process.exit(1);
  }
}

executeSQL(query, config);
