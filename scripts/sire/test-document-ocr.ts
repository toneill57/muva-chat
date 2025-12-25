/**
 * Test Script for Document OCR Integration
 *
 * Tests Claude Vision OCR extraction with sample passport data
 *
 * Usage:
 *   pnpm dlx tsx scripts/sire/test-document-ocr.ts
 *
 * @created December 23, 2025
 */

import { extractPassportData, extractVisaData, extractDocumentData, type OCRResult } from '../../src/lib/sire/document-ocr';
import fs from 'fs';
import path from 'path';

async function testPassportOCR() {
  console.log('\n=== Testing Passport OCR ===\n');

  // Check if test image exists
  const testImagePath = path.join(process.cwd(), 'test-passport.jpg');

  if (!fs.existsSync(testImagePath)) {
    console.log('⚠️  No test image found at:', testImagePath);
    console.log('\nTo test OCR:');
    console.log('1. Place a passport image at: test-passport.jpg');
    console.log('2. Run: pnpm dlx tsx scripts/sire/test-document-ocr.ts\n');
    return;
  }

  try {
    // Read test image
    const imageBuffer = fs.readFileSync(testImagePath);
    const mimeType = 'image/jpeg';

    console.log('📸 Processing image:', testImagePath);
    console.log('📦 Image size:', (imageBuffer.length / 1024).toFixed(2), 'KB\n');

    // Extract passport data
    const result: OCRResult = await extractPassportData(imageBuffer, mimeType);

    console.log('✅ OCR Result:');
    console.log('  Success:', result.success);
    console.log('  Confidence:', (result.confidence * 100).toFixed(1) + '%');
    console.log('  Processing time:', result.processingTimeMs + 'ms');

    if (result.error) {
      console.log('  Error:', result.error);
    }

    if (result.structuredData) {
      console.log('\n📄 Extracted Data:');
      console.log(JSON.stringify(result.structuredData, null, 2));
    }

    console.log('\n📝 Raw Response:');
    console.log(result.extractedText.substring(0, 500));

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

async function testVisaOCR() {
  console.log('\n=== Testing Visa OCR ===\n');

  const testImagePath = path.join(process.cwd(), 'test-visa.jpg');

  if (!fs.existsSync(testImagePath)) {
    console.log('⚠️  No test visa image found at:', testImagePath);
    console.log('\nTo test visa OCR:');
    console.log('1. Place a visa image at: test-visa.jpg');
    console.log('2. Run: pnpm dlx tsx scripts/sire/test-document-ocr.ts\n');
    return;
  }

  try {
    const imageBuffer = fs.readFileSync(testImagePath);
    const mimeType = 'image/jpeg';

    console.log('📸 Processing visa image:', testImagePath);
    console.log('📦 Image size:', (imageBuffer.length / 1024).toFixed(2), 'KB\n');

    const result: OCRResult = await extractVisaData(imageBuffer, mimeType);

    console.log('✅ OCR Result:');
    console.log('  Success:', result.success);
    console.log('  Confidence:', (result.confidence * 100).toFixed(1) + '%');
    console.log('  Processing time:', result.processingTimeMs + 'ms');

    if (result.structuredData) {
      console.log('\n📄 Extracted Visa Data:');
      console.log(JSON.stringify(result.structuredData, null, 2));
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

async function testAutoDetection() {
  console.log('\n=== Testing Auto Document Type Detection ===\n');

  const testImagePath = path.join(process.cwd(), 'test-document.jpg');

  if (!fs.existsSync(testImagePath)) {
    console.log('⚠️  No test document image found at:', testImagePath);
    console.log('\nTo test auto-detection:');
    console.log('1. Place a document image at: test-document.jpg');
    console.log('2. Run: pnpm dlx tsx scripts/sire/test-document-ocr.ts\n');
    return;
  }

  try {
    const imageBuffer = fs.readFileSync(testImagePath);
    const mimeType = 'image/jpeg';

    console.log('📸 Processing document (auto-detect type):', testImagePath);
    console.log('📦 Image size:', (imageBuffer.length / 1024).toFixed(2), 'KB\n');

    const result: OCRResult = await extractDocumentData(imageBuffer, mimeType);

    console.log('✅ OCR Result:');
    console.log('  Success:', result.success);
    console.log('  Confidence:', (result.confidence * 100).toFixed(1) + '%');
    console.log('  Processing time:', result.processingTimeMs + 'ms');

    if (result.structuredData) {
      console.log('\n📄 Extracted Data:');
      console.log(JSON.stringify(result.structuredData, null, 2));
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   SIRE Document OCR - Integration Test      ║');
  console.log('╚══════════════════════════════════════════════╝');

  // Test passport OCR
  await testPassportOCR();

  // Test visa OCR
  await testVisaOCR();

  // Test auto-detection
  await testAutoDetection();

  console.log('\n✅ All tests completed!\n');
}

main().catch(console.error);
