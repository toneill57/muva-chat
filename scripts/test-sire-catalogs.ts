/**
 * Test Script for SIRE Catalogs Integration
 *
 * Tests fuzzy search integration with official SIRE codes
 * and Colombian DIVIPOLA city codes.
 *
 * Usage:
 *   npx tsx scripts/test-sire-catalogs.ts
 *
 * Expected Result: 27/27 tests passed (100%)
 */

import { getSIRECountryCode, getDIVIPOLACityCode, formatDateToSIRE } from '../src/lib/sire/sire-catalogs';

console.log('🧪 Testing SIRE Catalogs Integration\n');

// ============================================================================
// Test 1: Country Codes (SIRE oficial, NOT ISO)
// ============================================================================

console.log('📍 Test 1: SIRE Country Codes');
const countryCases = [
  { input: 'ESTADOS UNIDOS', expected: '249', iso: '840' },
  { input: 'Estados Unidos', expected: '249', iso: '840' },
  { input: 'estados unidos', expected: '249', iso: '840' },
  { input: 'COLOMBIA', expected: '169', iso: '170' },
  { input: 'Colombia', expected: '169', iso: '170' },
  { input: 'BRASIL', expected: '105', iso: '076' },
  { input: 'Brasil', expected: '105', iso: '076' },
  { input: 'ESPAÑA', expected: '245', iso: '724' },
  { input: 'España', expected: '245', iso: '724' },
  { input: 'MÉXICO', expected: '493', iso: '484' },
  { input: 'ARGENTINA', expected: '63', iso: '032' },
  { input: 'CHILE', expected: '211', iso: '152' },
  { input: 'CHINA', expected: '215', iso: '156' },
  { input: 'JAPÓN', expected: '399', iso: '392' },
];

let countryPass = 0;
countryCases.forEach(({ input, expected, iso }) => {
  const result = getSIRECountryCode(input);
  const status = result === expected ? '✅' : '❌';
  const warning = result === iso ? ' ⚠️ RETURNING ISO CODE (WRONG!)' : '';
  console.log(`  ${status} "${input}" → ${result} (expected: ${expected})${warning}`);
  if (result === expected) countryPass++;
});
console.log(`\n  Result: ${countryPass}/${countryCases.length} passed\n`);

// ============================================================================
// Test 2: Colombian City Codes (DIVIPOLA)
// ============================================================================

console.log('🏙️  Test 2: DIVIPOLA City Codes');
const cityCases = [
  { input: 'BOGOTÁ', expected: '11001' },
  { input: 'Bogota', expected: '11001' }, // Sin acento
  { input: 'bogotá', expected: '11001' }, // lowercase
  { input: 'MEDELLÍN', expected: '5001' },
  { input: 'Medellin', expected: '5001' }, // Sin acento
  { input: 'CARTAGENA', expected: '13001' },
  { input: 'CALI', expected: '76001' }, // Valle del Cauca
  { input: 'BARRANQUILLA', expected: '8001' }, // Atlántico
  { input: 'PEREIRA', expected: '66001' }, // Ciudad secundaria
  { input: 'TUNJA', expected: '15001' }, // Ciudad secundaria
];

let cityPass = 0;
cityCases.forEach(({ input, expected }) => {
  const result = getDIVIPOLACityCode(input);
  const status = result === expected ? '✅' : '❌';
  console.log(`  ${status} "${input}" → ${result} (expected: ${expected})`);
  if (result === expected) cityPass++;
});
console.log(`\n  Result: ${cityPass}/${cityCases.length} passed\n`);

// ============================================================================
// Test 3: Date Formatting (DB → SIRE)
// ============================================================================

console.log('📅 Test 3: Date Formatting (DB → SIRE)');
const dateCases = [
  { input: '1985-03-25', expected: '25/03/1985' }, // YYYY-MM-DD string (DB format)
  { input: '2025-10-09', expected: '09/10/2025' },
  { input: '1990-05-15', expected: '15/05/1990' },
];

let datePass = 0;
dateCases.forEach(({ input, expected }) => {
  const result = formatDateToSIRE(input);
  const status = result === expected ? '✅' : '❌';
  const inputStr = typeof input === 'string' ? input : input.toISOString().split('T')[0];
  console.log(`  ${status} ${inputStr} → ${result} (expected: ${expected})`);
  if (result === expected) datePass++;
});
console.log(`\n  Result: ${datePass}/${dateCases.length} passed\n`);

// ============================================================================
// Summary
// ============================================================================

const totalTests = countryCases.length + cityCases.length + dateCases.length;
const totalPass = countryPass + cityPass + datePass;
const percentage = ((totalPass / totalTests) * 100).toFixed(1);

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`📊 SUMMARY: ${totalPass}/${totalTests} tests passed (${percentage}%)`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

if (totalPass === totalTests) {
  console.log('✅ ALL TESTS PASSED - Ready for production!');
  console.log('\n🎯 Next Steps:');
  console.log('  1. Run type check: npm run type-check');
  console.log('  2. Verify no hardcoded ISO codes: grep -r "\'840\'" src/');
  console.log('  3. Update TODO.md FASE 11.8 as completed');
  console.log('  4. Deploy to dev environment for integration testing\n');
  process.exit(0);
} else {
  console.log('❌ SOME TESTS FAILED - Review implementation');
  console.log('\n🔍 Debugging Tips:');
  console.log('  - Check _assets/sire/codigos-pais.json has correct SIRE codes');
  console.log('  - Check _assets/sire/ciudades-colombia.json has DIVIPOLA codes');
  console.log('  - Verify Fuse.js fuzzy search threshold (should be 0.3)');
  console.log('  - Check getSIRECountryCode() and getDIVIPOLACityCode() implementations\n');
  process.exit(1);
}
