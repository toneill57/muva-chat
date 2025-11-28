#!/usr/bin/env tsx
/**
 * Generate INSERT statements from source data
 */

import fs from 'fs/promises';
import path from 'path';

// Mock MCP execute_sql - we'll paste the actual data
const accommodationUnitsData = [
  // We'll get this from MCP query
];

function escapeString(str: string): string {
  if (str === null || str === undefined) return 'NULL';
  return `'${str.replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
}

function jsonbValue(obj: any): string {
  if (obj === null || obj === undefined) return 'NULL';
  return `'${JSON.stringify(obj).replace(/'/g, "''")}'::jsonb`;
}

function generateInsert(table: string, schema: string, row: any): string {
  const columns = Object.keys(row);
  const values = columns.map(col => {
    const val = row[col];
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'object') return jsonbValue(val);
    if (typeof val === 'string') return escapeString(val);
    if (typeof val === 'boolean') return val ? 'true' : 'false';
    if (typeof val === 'number') return val.toString();
    return escapeString(String(val));
  });

  return `
INSERT INTO ${schema}.${table} (${columns.join(', ')})
VALUES (${values.join(', ')})
ON CONFLICT (id) DO UPDATE SET updated_at = EXCLUDED.updated_at;
  `.trim();
}

async function main() {
  console.log('-- Accommodation Units Inserts');
  console.log('-- Copy and paste into MCP execute_sql\n');
  
  // For now, just show the structure
  console.log('-- Run this query in source to get data:');
  console.log('SELECT * FROM hotels.accommodation_units;');
}

main();
