#!/usr/bin/env tsx
/**
 * Test script for Content Management API
 * Tests GET and PUT endpoints for landing page content
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

async function testContentAPI() {
  console.log('🧪 Testing Content Management API\n')

  // Initialize Supabase client to get a test tenant
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Get first tenant for testing
  console.log('📋 Fetching test tenant...')
  const { data: tenants, error: tenantError } = await supabase
    .from('tenant_registry')
    .select('tenant_id, subdomain')
    .limit(1)
    .single()

  if (tenantError || !tenants) {
    console.error('❌ Failed to fetch test tenant:', tenantError)
    process.exit(1)
  }

  const testTenantId = tenants.tenant_id
  const testSubdomain = tenants.subdomain
  console.log(`✅ Using tenant: ${testSubdomain} (${testTenantId})\n`)

  // Test 1: GET existing content
  console.log('🔍 Test 1: GET /api/admin/content')
  const getResponse = await fetch(
    `http://localhost:3000/api/admin/content?tenant_id=${testTenantId}`
  )

  if (!getResponse.ok) {
    console.error('❌ GET request failed:', getResponse.status, getResponse.statusText)
    const errorData = await getResponse.json()
    console.error('Error details:', errorData)
    process.exit(1)
  }

  const getData = await getResponse.json()
  console.log('✅ GET response:', JSON.stringify(getData, null, 2))
  console.log()

  // Test 2: PUT updated content
  console.log('📝 Test 2: PUT /api/admin/content')
  const testContent = {
    hero: {
      title: 'Welcome to Test Hotel',
      subtitle: 'Experience luxury and comfort',
      cta_text: 'Book Now',
      cta_link: '/chat'
    },
    about: {
      title: 'About Us',
      content: 'We are a family-owned hotel with 20 years of experience.'
    },
    services: {
      title: 'Our Services',
      items: [
        { name: 'Free WiFi', icon: 'wifi' },
        { name: 'Room Service', icon: 'room_service' },
        { name: 'Spa', icon: 'spa' }
      ]
    },
    gallery: {
      title: 'Gallery',
      images: [
        { url: '/images/room1.jpg', alt: 'Deluxe Room' },
        { url: '/images/pool.jpg', alt: 'Swimming Pool' }
      ]
    },
    contact: {
      title: 'Contact Us',
      email: 'info@testhotel.com',
      phone: '+1-555-0123',
      address: '123 Main St, City, Country'
    }
  }

  const putResponse = await fetch('http://localhost:3000/api/admin/content', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      tenant_id: testTenantId,
      content: testContent
    })
  })

  if (!putResponse.ok) {
    console.error('❌ PUT request failed:', putResponse.status, putResponse.statusText)
    const errorData = await putResponse.json()
    console.error('Error details:', errorData)
    process.exit(1)
  }

  const putData = await putResponse.json()
  console.log('✅ PUT response:', JSON.stringify(putData, null, 2))
  console.log()

  // Test 3: GET again to verify persistence
  console.log('🔍 Test 3: GET /api/admin/content (verify update)')
  const getResponse2 = await fetch(
    `http://localhost:3000/api/admin/content?tenant_id=${testTenantId}`
  )

  if (!getResponse2.ok) {
    console.error('❌ Second GET request failed:', getResponse2.status, getResponse2.statusText)
    process.exit(1)
  }

  const getData2 = await getResponse2.json()
  console.log('✅ GET response (after update):', JSON.stringify(getData2, null, 2))
  console.log()

  // Verify content matches
  const updatedContent = getData2.content
  if (
    updatedContent.hero.title === testContent.hero.title &&
    updatedContent.contact.email === testContent.contact.email
  ) {
    console.log('✅ Content persistence verified!')
  } else {
    console.error('❌ Content mismatch after update!')
    process.exit(1)
  }

  console.log('\n🎉 All tests passed!')
}

// Run tests
testContentAPI().catch((error) => {
  console.error('❌ Test script failed:', error)
  process.exit(1)
})
