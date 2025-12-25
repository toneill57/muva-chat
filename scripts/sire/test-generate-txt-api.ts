/**
 * Test Script for SIRE TXT Generation API
 *
 * Tests /api/sire/generate-txt endpoint with real database data.
 *
 * Usage:
 *   pnpm dlx tsx scripts/sire/test-generate-txt-api.ts
 *
 * Prerequisites:
 *   - Dev server running on http://localhost:3000
 *   - Valid tenant_id with SIRE data in guest_reservations
 *   - .env.local configured with SUPABASE credentials
 */

import { config } from 'dotenv';
import * as path from 'path';

// Load environment variables
config({ path: path.join(process.cwd(), '.env.local') });

const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// ============================================================================
// TEST SCENARIOS
// ============================================================================

interface TestCase {
  name: string;
  payload: {
    tenant_id: string;
    date?: string;
    date_from?: string;
    date_to?: string;
    movement_type?: 'E' | 'S' | 'both';
  };
}

const TEST_CASES: TestCase[] = [
  {
    name: 'All foreign guests (both E and S)',
    payload: {
      tenant_id: 'hotelsanandres', // Replace with actual tenant_id
    },
  },
  {
    name: 'Check-ins only (E)',
    payload: {
      tenant_id: 'hotelsanandres',
      movement_type: 'E',
    },
  },
  {
    name: 'Check-outs only (S)',
    payload: {
      tenant_id: 'hotelsanandres',
      movement_type: 'S',
    },
  },
  {
    name: 'Single date (2025-12-23)',
    payload: {
      tenant_id: 'hotelsanandres',
      date: '2025-12-23',
    },
  },
  {
    name: 'Date range (Dec 1-31, 2025)',
    payload: {
      tenant_id: 'hotelsanandres',
      date_from: '2025-12-01',
      date_to: '2025-12-31',
    },
  },
];

// ============================================================================
// TEST RUNNER
// ============================================================================

async function testGenerateTXT(testCase: TestCase) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`TEST: ${testCase.name}`);
  console.log(`${'='.repeat(80)}\n`);

  console.log('Request Payload:');
  console.log(JSON.stringify(testCase.payload, null, 2));
  console.log('');

  try {
    const response = await fetch(`${API_BASE_URL}/api/sire/generate-txt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testCase.payload),
    });

    const data = await response.json();

    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log('');

    if (!response.ok) {
      console.error('❌ Error:', data.error);
      if (data.details) {
        console.error('Details:', data.details);
      }
      return;
    }

    console.log('✅ Success!');
    console.log('');
    console.log('Response Summary:');
    console.log(`  - Filename: ${data.filename}`);
    console.log(`  - Guests Included: ${data.guest_count}`);
    console.log(`  - Guests Excluded: ${data.excluded_count}`);
    console.log(`  - Generated At: ${data.generated_at}`);
    console.log('');

    if (data.excluded_count > 0) {
      console.log('Excluded Guests:');
      data.excluded.forEach((exc: any, idx: number) => {
        console.log(`  ${idx + 1}. ${exc.guest_name} (${exc.reservation_id})`);
        console.log(`     Reason: ${exc.reason}`);
      });
      console.log('');
    }

    if (data.guest_count > 0) {
      console.log('TXT Content Preview (first 500 chars):');
      console.log('─'.repeat(80));
      console.log(data.txt_content.substring(0, 500));
      if (data.txt_content.length > 500) {
        console.log('...');
        console.log(`[${data.txt_content.length - 500} more characters]`);
      }
      console.log('─'.repeat(80));
      console.log('');

      // Show line breakdown
      const lines = data.txt_content.split('\r\n').filter((l: string) => l.trim());
      console.log(`Total Lines: ${lines.length}`);

      if (lines.length > 0) {
        console.log('');
        console.log('First Line Fields (tab-delimited):');
        const fields = lines[0].split('\t');
        const fieldNames = [
          'Hotel Code',
          'City Code',
          'Doc Type',
          'Doc Number',
          'Nationality',
          'First Surname',
          'Second Surname',
          'Given Names',
          'Movement Type',
          'Movement Date',
          'Origin',
          'Destination',
          'Birth Date',
        ];
        fields.forEach((field, idx) => {
          console.log(`  ${idx + 1}. ${fieldNames[idx]}: "${field}"`);
        });
      }
    } else {
      console.log('ℹ️ No guests found matching criteria');
    }

  } catch (error) {
    console.error('❌ Request Failed:', error);
    if (error instanceof Error) {
      console.error('Message:', error.message);
    }
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║           SIRE TXT Generation API - Test Suite                            ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log(`Total Test Cases: ${TEST_CASES.length}`);
  console.log('');
  console.log('⚠️  IMPORTANT: Make sure dev server is running (pnpm run dev)');
  console.log('');

  // Check if server is running
  try {
    const healthCheck = await fetch(`${API_BASE_URL}/api/health`);
    if (!healthCheck.ok) {
      throw new Error('Server health check failed');
    }
    console.log('✅ Server is running\n');
  } catch (error) {
    console.error('❌ Cannot connect to server. Is it running?');
    console.error('   Run: pnpm run dev');
    process.exit(1);
  }

  // Run all test cases
  for (const testCase of TEST_CASES) {
    await testGenerateTXT(testCase);

    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                         All Tests Completed                                ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝');
  console.log('\n');
}

main().catch(console.error);
