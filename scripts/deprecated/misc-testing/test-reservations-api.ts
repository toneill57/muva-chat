/**
 * Test reservations list API to verify accommodation names
 */

async function testAPI() {
  // This would need a real staff token, but let's just show what the endpoint should return
  console.log('Testing /api/reservations/list endpoint...\n')

  const response = await fetch('http://localhost:3000/api/reservations/list?status=active&future=true', {
    headers: {
      // Note: This is a test - in production you'd need a real JWT token
      'Authorization': 'Bearer test-token'
    }
  })

  if (!response.ok) {
    console.error(`❌ API returned ${response.status}`)
    const text = await response.text()
    console.error('Response:', text)
    return
  }

  const data = await response.json()

  if (!data.success) {
    console.error('❌ API call failed:', data.error)
    return
  }

  console.log(`✅ Found ${data.data.total} reservations\n`)
  console.log('First 5 reservations:')

  data.data.reservations.slice(0, 5).forEach((res: any, index: number) => {
    console.log(`\n${index + 1}. ${res.guest_name} (${res.check_in_date})`)
    console.log(`   Reservation: ${res.reservation_code}`)
    console.log(`   Accommodation: ${res.accommodation_unit?.name || '❌ NULL'}`)
    console.log(`   Unit ID: ${res.accommodation_unit?.id || 'null'}`)
  })
}

testAPI()
