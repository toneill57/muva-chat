/**
 * Test script for SIRE entity extraction functions
 *
 * Run with: pnpm dlx tsx scripts/test-entity-extraction.ts
 */

import { extractSIREEntity } from '@/lib/compliance-chat-engine';

console.log('=== SIRE Entity Extraction Tests ===\n');

// Test 1: Identification number
console.log('Test 1: Identification Number');
const test1 = extractSIREEntity("Mi pasaporte es AB-123456", "identification_number");
console.log('Input: "Mi pasaporte es AB-123456"');
console.log('Result:', test1);
console.log('Expected: { value: "AB123456", confidence: 0.95, normalized: "AB123456" }');
console.log('✅ PASS:', test1.value === 'AB123456' && test1.confidence === 0.95);
console.log();

// Test 2: First surname from full name
console.log('Test 2: First Surname (from "Juan Pérez García")');
const test2 = extractSIREEntity("Juan Pérez García", "first_surname");
console.log('Input: "Juan Pérez García"');
console.log('Result:', test2);
console.log('Expected: { value: "Pérez", confidence: 0.85 }');
console.log('✅ PASS:', test2.value === 'Pérez' && test2.confidence === 0.85);
console.log();

// Test 3: Names from full name
console.log('Test 3: Names (from "Juan Pablo Pérez García")');
const test3 = extractSIREEntity("Juan Pablo Pérez García", "names");
console.log('Input: "Juan Pablo Pérez García"');
console.log('Result:', test3);
console.log('Expected: { value: "Juan Pablo", confidence: 0.85 }');
console.log('✅ PASS:', test3.value === 'Juan Pablo' && test3.confidence === 0.85);
console.log();

// Test 4: Nationality (estadounidense)
console.log('Test 4: Nationality (estadounidense)');
const test4 = extractSIREEntity("Soy estadounidense", "nationality_code");
console.log('Input: "Soy estadounidense"');
console.log('Result:', test4);
console.log('Expected: { value: "249", confidence: 0.90 } (USA = SIRE 249)');
console.log('✅ PASS:', test4.value === '249' && test4.confidence === 0.90);
console.log();

// Test 5: Nationality (Estados Unidos)
console.log('Test 5: Nationality (Estados Unidos)');
const test5 = extractSIREEntity("Estados Unidos", "nationality_code");
console.log('Input: "Estados Unidos"');
console.log('Result:', test5);
console.log('Expected: { value: "249", confidence: 0.95 } (USA = SIRE 249)');
console.log('✅ PASS:', test5.value === '249' && test5.confidence === 0.95);
console.log();

// Test 6: Birth date (español)
console.log('Test 6: Birth Date (español)');
const test6 = extractSIREEntity("Nací el 25 de marzo de 1985", "birth_date");
console.log('Input: "Nací el 25 de marzo de 1985"');
console.log('Result:', test6);
console.log('Expected: { value: "25/03/1985", confidence: 0.95 }');
console.log('✅ PASS:', test6.value === '25/03/1985' && test6.confidence === 0.95);
console.log();

// Test 7: Birth date (inglés)
console.log('Test 7: Birth Date (inglés)');
const test7 = extractSIREEntity("March 25, 1985", "birth_date");
console.log('Input: "March 25, 1985"');
console.log('Result:', test7);
console.log('Expected: { value: "25/03/1985", confidence: 0.95 }');
console.log('✅ PASS:', test7.value === '25/03/1985' && test7.confidence === 0.95);
console.log();

// Test 8: Birth date (DD/MM/YYYY)
console.log('Test 8: Birth Date (DD/MM/YYYY)');
const test8 = extractSIREEntity("15/10/1990", "birth_date");
console.log('Input: "15/10/1990"');
console.log('Result:', test8);
console.log('Expected: { value: "15/10/1990", confidence: 0.95 }');
console.log('✅ PASS:', test8.value === '15/10/1990' && test8.confidence === 0.95);
console.log();

// Test 9: Location (Colombian city - Bogotá)
console.log('Test 9: Location (Bogotá → DIVIPOLA)');
const test9 = extractSIREEntity("Vengo de Bogotá", "origin_place");
console.log('Input: "Vengo de Bogotá"');
console.log('Result:', test9);
console.log('Expected: { value: "11001", confidence: 0.90 } (Bogotá DIVIPOLA)');
console.log('✅ PASS:', test9.value === '11001' && test9.confidence === 0.90);
console.log();

// Test 10: Location (Country - USA)
console.log('Test 10: Location (USA → SIRE)');
const test10 = extractSIREEntity("usa", "destination_place");
console.log('Input: "usa"');
console.log('Result:', test10);
console.log('Expected: { value: "249", confidence: 0.90 } (USA SIRE)');
console.log('✅ PASS:', test10.value === '249' && test10.confidence === 0.90);
console.log();

// Summary
const allTests = [test1, test2, test3, test4, test5, test6, test7, test8, test9, test10];
const passedTests = allTests.filter(t => t.value !== null).length;

console.log('=== Summary ===');
console.log(`Passed: ${passedTests}/10 tests`);
console.log(`All tests ${passedTests === 10 ? '✅ PASSED' : '❌ FAILED'}`);
