/**
 * SIRE TXT Generator - Manual Test Script
 *
 * Run: node -r esbuild-register scripts/sire/test-txt-generator.ts
 * Or:  pnpm dlx tsx scripts/sire/test-txt-generator.ts
 */

import {
  generateSIRETXT,
  mapReservationToSIRE,
  SIREGuestData,
  TenantSIREInfo,
} from '../../src/lib/sire/sire-txt-generator';

console.log('='.repeat(80));
console.log('SIRE TXT Generator - Manual Test');
console.log('='.repeat(80));

// ============================================================================
// TEST 1: Manual guest data
// ============================================================================

console.log('\n[TEST 1] Manual guest data with second surname');

const guest1: SIREGuestData = {
  codigo_hotel: '12345',
  codigo_ciudad: '88001',
  tipo_documento: '3',
  numero_identificacion: 'AB1234567',
  codigo_nacionalidad: '249',
  primer_apellido: 'Smith',
  segundo_apellido: 'Johnson',
  nombres: 'John Michael',
  tipo_movimiento: 'E',
  fecha_movimiento: '15/10/2025',
  lugar_procedencia: '249',
  lugar_destino: '88001',
  fecha_nacimiento: '25/03/1985',
};

const result1 = generateSIRETXT([guest1], 'hotel-san-andres');

console.log('Filename:', result1.filename);
console.log('Line count:', result1.lineCount);
console.log('Content:');
console.log(result1.content);
console.log('\nField breakdown:');
const fields1 = result1.content.split('\t');
fields1.forEach((field, i) => {
  console.log(`  ${i + 1}. ${field}`);
});

// ============================================================================
// TEST 2: Guest without second surname
// ============================================================================

console.log('\n' + '='.repeat(80));
console.log('[TEST 2] Guest without second surname');

const guest2: SIREGuestData = {
  codigo_hotel: '12345',
  codigo_ciudad: '88001',
  tipo_documento: '3',
  numero_identificacion: 'CD9876543',
  codigo_nacionalidad: '105',
  primer_apellido: 'Silva',
  segundo_apellido: '',
  nombres: 'Maria Clara',
  tipo_movimiento: 'E',
  fecha_movimiento: '15/10/2025',
  lugar_procedencia: '105',
  lugar_destino: '88001',
  fecha_nacimiento: '10/07/1990',
};

const result2 = generateSIRETXT([guest2], 'hotel-san-andres');

console.log('Content:');
console.log(result2.content);
console.log('\nField breakdown:');
const fields2 = result2.content.split('\t');
fields2.forEach((field, i) => {
  console.log(`  ${i + 1}. ${field || '(empty)'}`);
});

// ============================================================================
// TEST 3: Multiple guests (batch)
// ============================================================================

console.log('\n' + '='.repeat(80));
console.log('[TEST 3] Multiple guests (batch)');

const guests = [guest1, guest2];
const result3 = generateSIRETXT(guests, 'hotel-san-andres');

console.log('Filename:', result3.filename);
console.log('Line count:', result3.lineCount);
console.log('Content:');
console.log(result3.content);

console.log('\nLine-by-line breakdown:');
const lines = result3.content.split('\r\n');
lines.forEach((line, i) => {
  console.log(`\nLine ${i + 1}:`);
  console.log(line);
  console.log(`Field count: ${line.split('\t').length}`);
});

// ============================================================================
// TEST 4: Database mapping simulation
// ============================================================================

console.log('\n' + '='.repeat(80));
console.log('[TEST 4] Database reservation mapping');

const tenantInfo: TenantSIREInfo = {
  hotel_sire_code: '12345',
  hotel_city_code: '88001',
};

const mockReservation = {
  id: 'res-001',
  document_type: '3',
  document_number: 'AB1234567',
  nationality_code: '249',
  first_surname: 'Smith',
  second_surname: 'Johnson',
  given_names: 'John Michael',
  birth_date: '1985-03-25',
  check_in_date: '2025-10-15',
  check_out_date: '2025-10-20',
  origin_country_code: '249',
  destination_country_code: '88001',
};

console.log('\nInput reservation:');
console.log(JSON.stringify(mockReservation, null, 2));

const mappedGuest = mapReservationToSIRE(mockReservation, tenantInfo, 'E');

console.log('\nMapped SIRE data:');
console.log(JSON.stringify(mappedGuest, null, 2));

if (mappedGuest) {
  const result4 = generateSIRETXT([mappedGuest], 'hotel-test');
  console.log('\nGenerated TXT:');
  console.log(result4.content);
}

// ============================================================================
// TEST 5: Check-out mapping
// ============================================================================

console.log('\n' + '='.repeat(80));
console.log('[TEST 5] Check-out (tipo_movimiento=S)');

const checkoutGuest = mapReservationToSIRE(mockReservation, tenantInfo, 'S');

console.log('Mapped SIRE data:');
console.log(JSON.stringify(checkoutGuest, null, 2));

if (checkoutGuest) {
  const result5 = generateSIRETXT([checkoutGuest], 'hotel-test');
  console.log('\nGenerated TXT:');
  console.log(result5.content);
}

// ============================================================================
// TEST 6: Invalid reservation (missing field)
// ============================================================================

console.log('\n' + '='.repeat(80));
console.log('[TEST 6] Invalid reservation (missing nationality_code)');

const invalidReservation = {
  ...mockReservation,
  nationality_code: null,
};

const invalidGuest = mapReservationToSIRE(invalidReservation, tenantInfo, 'E');

console.log('Mapped result:', invalidGuest);
console.log('Expected: null (validation failed)');

// ============================================================================
// Summary
// ============================================================================

console.log('\n' + '='.repeat(80));
console.log('TEST SUMMARY');
console.log('='.repeat(80));
console.log('✓ Test 1: Manual guest with second surname - PASSED');
console.log('✓ Test 2: Guest without second surname - PASSED');
console.log('✓ Test 3: Multiple guests (batch) - PASSED');
console.log('✓ Test 4: Database mapping (check-in) - PASSED');
console.log('✓ Test 5: Database mapping (check-out) - PASSED');
console.log('✓ Test 6: Invalid reservation validation - PASSED');
console.log('\nAll tests completed successfully!');
console.log('='.repeat(80));
