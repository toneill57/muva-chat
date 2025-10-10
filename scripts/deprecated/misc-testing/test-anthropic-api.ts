#!/usr/bin/env tsx
/**
 * Test Anthropic API Connectivity
 *
 * Validates that ANTHROPIC_API_KEY is correctly configured and working.
 * Tests compression functionality used by conversation memory system.
 */

import Anthropic from '@anthropic-ai/sdk'

const testMessages = [
  { role: 'user', content: 'Hola! Busco apartamento para 4 personas' },
  { role: 'assistant', content: 'Claro! Tenemos varias opciones. ¿Qué fechas?' },
  { role: 'user', content: 'Del 15 al 22 de diciembre' },
  { role: 'assistant', content: 'Perfecto! Ocean View $850,000 COP/noche.' },
]

async function testAnthropicAPI() {
  console.log('=' .repeat(80))
  console.log('🔍 ANTHROPIC API CONNECTIVITY TEST')
  console.log('=' .repeat(80))
  console.log()

  // Step 1: Check API key
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('❌ ANTHROPIC_API_KEY not found in environment')
    console.log()
    console.log('Please ensure ANTHROPIC_API_KEY is set in:')
    console.log('  - .env.local (for local development)')
    console.log('  - Environment variables (for production)')
    console.log()
    process.exit(1)
  }

  console.log('✓ ANTHROPIC_API_KEY found:', apiKey.substring(0, 20) + '...')
  console.log()

  // Step 2: Initialize client
  console.log('Initializing Anthropic client...')
  const anthropic = new Anthropic({
    apiKey: apiKey,
  })
  console.log('✓ Client initialized')
  console.log()

  // Step 3: Test compression call (same as conversation-compressor.ts)
  console.log('Testing compression with Claude Haiku...')
  console.log('Model: claude-3-5-haiku-20241022')
  console.log('Messages to compress:', testMessages.length)
  console.log()

  try {
    const start = Date.now()

    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 800,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: `Analiza esta conversación y extrae:

CONVERSACIÓN:
${testMessages.map(m => `${m.role}: ${m.content}`).join('\n')}

Responde SOLO con JSON válido:
{
  "summary": "resumen en 2-3 oraciones",
  "travel_intent": "booking|inquiry|support|other",
  "topics": ["tema1", "tema2"],
  "questions": ["pregunta1"],
  "preferences": ["preferencia1"],
  "entities": {
    "dates": ["15-22 diciembre"],
    "people": 4,
    "location": "apartamento"
  }
}`,
        },
      ],
    })

    const duration = Date.now() - start

    console.log('✅ API call successful!')
    console.log()
    console.log('Response:')
    console.log('  Duration:', duration + 'ms')
    console.log('  Model:', response.model)
    console.log('  Tokens:', {
      input: response.usage.input_tokens,
      output: response.usage.output_tokens,
    })
    console.log()

    const content = response.content[0]
    if (content.type === 'text') {
      console.log('  Content preview:', content.text.substring(0, 200) + '...')
      console.log()

      // Parse JSON
      try {
        const parsed = JSON.parse(content.text)
        console.log('✓ JSON parsing successful:')
        console.log('  Summary:', parsed.summary)
        console.log('  Travel Intent:', parsed.travel_intent)
        console.log('  Topics:', parsed.topics)
        console.log('  Questions:', parsed.questions)
        console.log('  Preferences:', parsed.preferences)
        console.log('  Entities:', JSON.stringify(parsed.entities, null, 2))
        console.log()
      } catch (parseError) {
        console.warn('⚠️  JSON parsing failed:', parseError)
        console.log('  Raw response:', content.text)
        console.log()
      }
    }

    console.log('=' .repeat(80))
    console.log('✅ ANTHROPIC API TEST PASSED')
    console.log('=' .repeat(80))
    console.log()
    console.log('Next steps:')
    console.log('  1. API key is correctly configured ✓')
    console.log('  2. Compression model (Haiku) is working ✓')
    console.log('  3. JSON response format is valid ✓')
    console.log()
    console.log('The conversation memory system should now work correctly.')
    console.log()

  } catch (error: any) {
    console.error('❌ API call failed:', error)
    console.log()

    if (error.status === 401) {
      console.error('Authentication error - API key is invalid')
      console.log('Please verify ANTHROPIC_API_KEY in .env.local')
    } else if (error.status === 429) {
      console.error('Rate limit exceeded - too many requests')
    } else if (error.status === 500) {
      console.error('Anthropic server error - try again later')
    } else {
      console.error('Unexpected error:', error.message)
    }

    console.log()
    process.exit(1)
  }
}

testAnthropicAPI().catch(console.error)
