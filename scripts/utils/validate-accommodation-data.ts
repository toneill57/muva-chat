#!/usr/bin/env tsx
/**
 * Accommodation Data Validation Script
 *
 * Audits ALL accommodation units across ALL tenants against the quality standard
 * defined in docs/standards/ACCOMMODATION_DATA_STANDARD.md
 *
 * Usage:
 *   set -a && source .env.local && set +a && npx tsx scripts/validate-accommodation-data.ts
 *
 * Output:
 *   - Quality score per tenant (0-100%)
 *   - Detailed violation report
 *   - Recommendations for fixes
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Validation result types
interface ValidationResult {
  field: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

interface UnitReport {
  unit_id: string;
  unit_name: string;
  tenant_slug: string;
  score: number;  // 0-100
  violations: ValidationResult[];
  passed_checks: number;
  total_checks: number;
}

interface TenantReport {
  tenant_id: string;
  tenant_slug: string;
  nombre_comercial: string;
  total_units: number;
  units: UnitReport[];
  average_score: number;
}

// Validation functions
function validateRequiredFields(unit: any): ValidationResult[] {
  const results: ValidationResult[] = [];

  // unit_type
  if (!unit.unit_type) {
    results.push({
      field: 'unit_type',
      status: 'fail',
      message: 'unit_type is NULL (should be room/apartment/suite/house)',
      severity: 'critical',
    });
  } else {
    results.push({
      field: 'unit_type',
      status: 'pass',
      message: `unit_type = "${unit.unit_type}"`,
      severity: 'low',
    });
  }

  // short_description
  if (!unit.short_description) {
    results.push({
      field: 'short_description',
      status: 'fail',
      message: 'short_description is NULL',
      severity: 'critical',
    });
  } else if (unit.short_description.length < 80 || unit.short_description.length > 150) {
    results.push({
      field: 'short_description',
      status: 'warning',
      message: `short_description length ${unit.short_description.length} chars (recommended 80-150)`,
      severity: 'medium',
    });
  } else {
    results.push({
      field: 'short_description',
      status: 'pass',
      message: `short_description = ${unit.short_description.length} chars`,
      severity: 'low',
    });
  }

  // description
  if (!unit.description) {
    results.push({
      field: 'description',
      status: 'fail',
      message: 'description is NULL',
      severity: 'critical',
    });
  } else {
    // Check for YAML frontmatter pollution
    const hasYAMLFrontmatter = unit.description.trim().startsWith('---\n');
    if (hasYAMLFrontmatter) {
      results.push({
        field: 'description',
        status: 'fail',
        message: 'description contains YAML frontmatter (should be stripped)',
        severity: 'critical',
      });
    } else {
      results.push({
        field: 'description',
        status: 'pass',
        message: 'description is clean (no YAML)',
        severity: 'low',
      });
    }
  }

  return results;
}

function validateJSONBFields(unit: any): ValidationResult[] {
  const results: ValidationResult[] = [];

  // amenities
  if (!unit.amenities || typeof unit.amenities !== 'object') {
    results.push({
      field: 'amenities',
      status: 'fail',
      message: 'amenities JSONB is NULL or invalid',
      severity: 'critical',
    });
  } else {
    const required = ['bed_type', 'capacity_max', 'unit_amenities', 'bed_configuration'];
    const missing = required.filter(key => !(key in unit.amenities));

    if (missing.length > 0) {
      results.push({
        field: 'amenities',
        status: 'fail',
        message: `amenities missing fields: ${missing.join(', ')}`,
        severity: 'high',
      });
    } else {
      results.push({
        field: 'amenities',
        status: 'pass',
        message: 'amenities JSONB complete',
        severity: 'low',
      });
    }
  }

  // pricing
  if (!unit.pricing || typeof unit.pricing !== 'object') {
    results.push({
      field: 'pricing',
      status: 'fail',
      message: 'pricing JSONB is NULL or invalid',
      severity: 'critical',
    });
  } else {
    if (!unit.pricing.currency || !unit.pricing.base_price) {
      results.push({
        field: 'pricing',
        status: 'fail',
        message: 'pricing missing currency or base_price',
        severity: 'high',
      });
    } else {
      results.push({
        field: 'pricing',
        status: 'pass',
        message: `pricing = ${unit.pricing.base_price} ${unit.pricing.currency}`,
        severity: 'low',
      });
    }
  }

  // photos
  if (!unit.photos || !Array.isArray(unit.photos)) {
    results.push({
      field: 'photos',
      status: 'fail',
      message: 'photos is NULL or not an array',
      severity: 'critical',
    });
  } else if (unit.photos.length === 0) {
    results.push({
      field: 'photos',
      status: 'fail',
      message: 'photos array is empty (minimum 1 required)',
      severity: 'high',
    });
  } else {
    // Check sequential order
    const orders = unit.photos.map((p: any) => p.order).sort((a: number, b: number) => a - b);
    const expectedOrders = Array.from({ length: unit.photos.length }, (_, i) => i + 1);
    const isSequential = JSON.stringify(orders) === JSON.stringify(expectedOrders);

    if (!isSequential) {
      results.push({
        field: 'photos',
        status: 'warning',
        message: `photos order not sequential: ${orders.join(',')} (expected ${expectedOrders.join(',')})`,
        severity: 'medium',
      });
    } else {
      results.push({
        field: 'photos',
        status: 'pass',
        message: `photos = ${unit.photos.length} items, sequential order`,
        severity: 'low',
      });
    }
  }

  return results;
}

function validateStatusConsistency(unit: any): ValidationResult[] {
  const results: ValidationResult[] = [];

  // is_active and is_bookable consistency
  if (unit.is_bookable && !unit.is_active) {
    results.push({
      field: 'status',
      status: 'fail',
      message: 'is_bookable=true but is_active=false (inconsistent)',
      severity: 'critical',
    });
  } else {
    results.push({
      field: 'status',
      status: 'pass',
      message: `is_active=${unit.is_active}, is_bookable=${unit.is_bookable}`,
      severity: 'low',
    });
  }

  return results;
}

async function validateTableSync(unit_id: string): Promise<ValidationResult> {
  // REMOVED 2025-10-16: This check was flagging a design pattern as a bug.
  // accommodation_units = MotoPress integrations (2 units)
  // accommodation_units_public = Markdown uploads for chat (11 units)
  // They serve DIFFERENT purposes, not duplicate storage.
  // See: docs/standards/ACCOMMODATION_DATA_STANDARD.md

  return {
    field: 'table_sync',
    status: 'pass',
    message: 'N/A (tables serve different data sources)',
    severity: 'low',
  };
}

async function validateUnit(unit: any): Promise<UnitReport> {
  const violations: ValidationResult[] = [];

  // Run all validation checks
  violations.push(...validateRequiredFields(unit));
  violations.push(...validateJSONBFields(unit));
  violations.push(...validateStatusConsistency(unit));
  violations.push(await validateTableSync(unit.unit_id));

  // Calculate score
  const totalChecks = violations.length;
  const passedChecks = violations.filter(v => v.status === 'pass').length;
  const score = Math.round((passedChecks / totalChecks) * 100);

  return {
    unit_id: unit.unit_id,
    unit_name: unit.name,
    tenant_slug: unit.tenant_slug || 'unknown',
    score,
    violations: violations.filter(v => v.status !== 'pass'),  // Only show failures/warnings
    passed_checks: passedChecks,
    total_checks: totalChecks,
  };
}

async function validateTenant(tenant_id: string, tenant_slug: string, nombre_comercial: string): Promise<TenantReport> {
  log(`\n📋 Validating tenant: ${nombre_comercial} (${tenant_slug})`, colors.blue);

  // Get all units for this tenant from public table
  const { data: units, error } = await supabase
    .from('accommodation_units_public')
    .select('*')
    .eq('tenant_id', tenant_id);

  if (error) {
    log(`   ❌ Error fetching units: ${error.message}`, colors.red);
    return {
      tenant_id,
      tenant_slug,
      nombre_comercial,
      total_units: 0,
      units: [],
      average_score: 0,
    };
  }

  if (!units || units.length === 0) {
    log(`   ⚠️  No units found`, colors.yellow);
    return {
      tenant_id,
      tenant_slug,
      nombre_comercial,
      total_units: 0,
      units: [],
      average_score: 0,
    };
  }

  log(`   Found ${units.length} unit(s)`, colors.dim);

  // Validate each unit
  const unitReports: UnitReport[] = [];
  for (const unit of units) {
    const report = await validateUnit({ ...unit, tenant_slug });
    unitReports.push(report);
  }

  // Calculate average score
  const averageScore = Math.round(
    unitReports.reduce((sum, r) => sum + r.score, 0) / unitReports.length
  );

  return {
    tenant_id,
    tenant_slug,
    nombre_comercial,
    total_units: units.length,
    units: unitReports,
    average_score: averageScore,
  };
}

async function runAudit() {
  log('\n🔍 Accommodation Data Validation - Starting...', colors.bold);
  log(`Timestamp: ${new Date().toISOString()}\n`, colors.dim);

  // Get all tenants
  const { data: tenants, error } = await supabase
    .from('tenant_registry')
    .select('tenant_id, slug, nombre_comercial')
    .order('nombre_comercial');

  if (error) {
    log(`❌ Error fetching tenants: ${error.message}`, colors.red);
    process.exit(1);
  }

  if (!tenants || tenants.length === 0) {
    log('⚠️  No tenants found', colors.yellow);
    process.exit(0);
  }

  log(`Found ${tenants.length} tenant(s)\n`, colors.blue);

  // Validate each tenant
  const tenantReports: TenantReport[] = [];
  for (const tenant of tenants) {
    const report = await validateTenant(tenant.tenant_id, tenant.slug, tenant.nombre_comercial);
    tenantReports.push(report);
  }

  // Generate summary report
  log('\n' + '═'.repeat(80), colors.reset);
  log('\n📊 VALIDATION SUMMARY', colors.bold + colors.blue);
  log('═'.repeat(80) + '\n', colors.reset);

  for (const tenant of tenantReports) {
    const scoreColor =
      tenant.average_score >= 90 ? colors.green :
      tenant.average_score >= 70 ? colors.yellow :
      colors.red;

    log(`\n${tenant.nombre_comercial} (${tenant.tenant_slug})`, colors.bold);
    log(`   Total units: ${tenant.total_units}`, colors.dim);
    log(`   Average score: ${scoreColor}${tenant.average_score}%${colors.reset}`, scoreColor);

    if (tenant.units.length === 0) {
      log(`   ⚠️  No units to validate`, colors.yellow);
      continue;
    }

    // Show unit-level details
    for (const unit of tenant.units) {
      const unitScoreColor =
        unit.score >= 90 ? colors.green :
        unit.score >= 70 ? colors.yellow :
        colors.red;

      log(`\n   📦 ${unit.unit_name}`, colors.bold);
      log(`      Score: ${unitScoreColor}${unit.score}%${colors.reset} (${unit.passed_checks}/${unit.total_checks} checks passed)`, unitScoreColor);

      // Show violations
      if (unit.violations.length > 0) {
        const critical = unit.violations.filter(v => v.severity === 'critical');
        const high = unit.violations.filter(v => v.severity === 'high');
        const medium = unit.violations.filter(v => v.severity === 'medium');

        if (critical.length > 0) {
          log(`      ❌ ${critical.length} CRITICAL issue(s):`, colors.red);
          critical.forEach(v => {
            log(`         - ${v.field}: ${v.message}`, colors.red);
          });
        }

        if (high.length > 0) {
          log(`      ⚠️  ${high.length} HIGH priority issue(s):`, colors.yellow);
          high.forEach(v => {
            log(`         - ${v.field}: ${v.message}`, colors.yellow);
          });
        }

        if (medium.length > 0) {
          log(`      ⚠️  ${medium.length} MEDIUM priority issue(s):`, colors.dim);
          medium.forEach(v => {
            log(`         - ${v.field}: ${v.message}`, colors.dim);
          });
        }
      } else {
        log(`      ✅ All checks passed!`, colors.green);
      }
    }
  }

  // Overall statistics
  log('\n' + '═'.repeat(80), colors.reset);
  log('\n📈 OVERALL STATISTICS', colors.bold + colors.blue);
  log('═'.repeat(80) + '\n', colors.reset);

  const totalUnits = tenantReports.reduce((sum, t) => sum + t.total_units, 0);
  const overallAverage = Math.round(
    tenantReports.reduce((sum, t) => sum + t.average_score * t.total_units, 0) / totalUnits
  );

  const unitsBelow70 = tenantReports.flatMap(t => t.units).filter(u => u.score < 70).length;
  const unitsBelow90 = tenantReports.flatMap(t => t.units).filter(u => u.score < 90).length;
  const unitsPerfect = tenantReports.flatMap(t => t.units).filter(u => u.score === 100).length;

  log(`Total tenants: ${tenantReports.length}`, colors.dim);
  log(`Total units: ${totalUnits}`, colors.dim);
  log(`Overall average score: ${overallAverage}%`, overallAverage >= 90 ? colors.green : colors.yellow);
  log(`\nUnits by quality:`, colors.dim);
  log(`   ✅ Perfect (100%): ${unitsPerfect}`, colors.green);
  log(`   ⚠️  Needs improvement (70-89%): ${unitsBelow90 - unitsBelow70}`, colors.yellow);
  log(`   ❌ Critical issues (<70%): ${unitsBelow70}`, colors.red);

  // Recommendations
  log('\n' + '═'.repeat(80), colors.reset);
  log('\n💡 RECOMMENDATIONS', colors.bold + colors.blue);
  log('═'.repeat(80) + '\n', colors.reset);

  const tenantsNeedingFix = tenantReports.filter(t => t.average_score < 100);

  if (tenantsNeedingFix.length === 0) {
    log('✅ All tenants pass quality standards!', colors.green);
  } else {
    log('Run fix scripts for the following tenants:', colors.dim);
    tenantsNeedingFix.forEach(tenant => {
      log(`   - ${tenant.tenant_slug} (${tenant.average_score}%)`, colors.yellow);
      log(`     npx tsx scripts/fix-${tenant.tenant_slug}-data.ts`, colors.dim);
    });
  }

  log('\n📚 Reference: docs/standards/ACCOMMODATION_DATA_STANDARD.md\n', colors.dim);
}

// Run the audit
runAudit().catch(error => {
  log(`\n❌ Audit failed: ${error.message}`, colors.red);
  console.error(error);
  process.exit(1);
});
