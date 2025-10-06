/**
 * Test script for guest_information search integration
 *
 * Validates that operational manual content (WiFi codes, AC instructions, etc.)
 * is correctly retrieved by the guest chat system.
 *
 * Usage: npx tsx test-guest-info-search.ts
 */

import { config } from 'dotenv'
import { generateConversationalResponse, ConversationalContext } from '../../src/lib/conversational-chat-engine'
import { GuestSession } from '../../src/lib/guest-auth'

// Load environment variables
config({ path: '.env.local' })

// Simmerdown tenant
const TENANT_ID = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'

interface TestCase {
  query: string
  expectedKeywords: string[]
  description: string
}

const testCases: TestCase[] = [
  {
    query: '¿Cuál es el código del WiFi en One Love?',
    expectedKeywords: ['wifi', 'one love', 'contraseña'],
    description: 'WiFi code from One Love operational manual'
  },
  {
    query: '¿Cómo funciona el aire acondicionado?',
    expectedKeywords: ['aire', 'acondicionado', 'temperatura'],
    description: 'AC instructions from operational manuals'
  },
  {
    query: '¿Dónde está la plancha?',
    expectedKeywords: ['plancha', 'closet', 'armario'],
    description: 'Iron location from operational manual'
  },
  {
    query: '¿Cuál es el código de la caja fuerte?',
    expectedKeywords: ['caja fuerte', 'código', 'safe'],
    description: 'Safe code from operational manual'
  },
  {
    query: '¿Qué incluye el apartamento?',
    expectedKeywords: ['cocina', 'baño', 'wifi'],
    description: 'General apartment features'
  }
]

async function testGuestInfoSearch() {
  console.log('🧪 Testing guest_information search integration\n')
  console.log('=' .repeat(80))

  // Create a test guest session
  const mockGuestInfo: GuestSession = {
    reservation_id: 'test-reservation-456',
    tenant_id: TENANT_ID,
    guest_name: 'Test Guest',
    check_in: new Date().toISOString(),
    check_out: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    reservation_code: 'TEST123',
    accommodation_unit: {
      id: 'one-love-apt',
      name: 'One Love',
      unit_number: '1A',
      view_type: 'garden'
    },
    tenant_features: {
      muva_access: true // Enable MUVA access for full testing
    }
  }

  let passedTests = 0
  let failedTests = 0

  for (let i = 0; i < testCases.length; i++) {
    const test = testCases[i]
    console.log(`\n📝 Test ${i + 1}/${testCases.length}: ${test.description}`)
    console.log(`Query: "${test.query}"`)
    console.log('-'.repeat(80))

    try {
      // Create conversational context
      const context: ConversationalContext = {
        query: test.query,
        history: [],
        guestInfo: mockGuestInfo,
        vectorResults: [] // Will be populated by the function
      }

      const result = await generateConversationalResponse(context)

      console.log(`\n📊 Response preview (first 200 chars):`)
      console.log(result.response.substring(0, 200) + '...')

      // Check if sources were retrieved
      if (result.sources && result.sources.length > 0) {
        console.log(`\n✅ Sources retrieved: ${result.sources.length} chunks`)

        // Check source tables
        const guestInfoSources = result.sources.filter((s: any) => s.table === 'guest_information')
        const accommodationSources = result.sources.filter((s: any) => s.table === 'accommodation_units')
        const muvaSources = result.sources.filter((s: any) => s.table === 'muva_content')

        console.log(`   - guest_information: ${guestInfoSources.length} chunks`)
        console.log(`   - accommodation_units: ${accommodationSources.length} chunks`)
        console.log(`   - muva_content: ${muvaSources.length} chunks`)

        // Display guest_information sources
        if (guestInfoSources.length > 0) {
          console.log(`\n📚 Guest Information sources:`)
          guestInfoSources.forEach((source: any, idx: number) => {
            console.log(`   ${idx + 1}. ${source.title} (similarity: ${source.similarity?.toFixed(3)})`)
          })
        }

        // Verify expected keywords appear somewhere in response or sources
        const allText = (result.response + ' ' + result.sources.map((s: any) => s.content || '').join(' ')).toLowerCase()
        const foundKeywords = test.expectedKeywords.filter(keyword =>
          allText.includes(keyword.toLowerCase())
        )

        if (foundKeywords.length > 0) {
          console.log(`\n✅ Found ${foundKeywords.length}/${test.expectedKeywords.length} expected keywords: ${foundKeywords.join(', ')}`)
          passedTests++
        } else {
          console.log(`\n⚠️  No expected keywords found. Expected: ${test.expectedKeywords.join(', ')}`)
          failedTests++
        }
      } else {
        console.log(`\n❌ No sources retrieved`)
        failedTests++
      }

    } catch (error: any) {
      console.error(`\n❌ Test failed with error:`, error.message)
      failedTests++
    }

    console.log('='.repeat(80))
  }

  // Summary
  console.log(`\n📈 Test Summary:`)
  console.log(`   ✅ Passed: ${passedTests}/${testCases.length}`)
  console.log(`   ❌ Failed: ${failedTests}/${testCases.length}`)
  console.log(`   📊 Success Rate: ${((passedTests / testCases.length) * 100).toFixed(1)}%`)

  if (passedTests === testCases.length) {
    console.log(`\n🎉 All tests passed! guest_information search is working correctly.`)
    process.exit(0)
  } else {
    console.log(`\n⚠️  Some tests failed. Review the results above.`)
    process.exit(1)
  }
}

// Run tests
testGuestInfoSearch().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
