#!/usr/bin/env tsx
/**
 * Verify all tenants have landing_page_content with complete structure
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

async function verifyAllTenants() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const { data, error } = await supabase
    .from('tenant_registry')
    .select('tenant_id, subdomain, landing_page_content')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }

  console.log('✅ Total tenants:', data.length)
  console.log('')

  let allHaveContent = true
  data.forEach((tenant) => {
    const content = tenant.landing_page_content as any
    const hasContent =
      content &&
      content.hero &&
      content.about &&
      content.services &&
      content.gallery &&
      content.contact

    const status = hasContent ? '✅' : '❌'
    console.log(`${status} ${tenant.subdomain} (${tenant.tenant_id})`)

    if (!hasContent) {
      allHaveContent = false
      console.log('   Missing sections:', {
        hero: !!content?.hero,
        about: !!content?.about,
        services: !!content?.services,
        gallery: !!content?.gallery,
        contact: !!content?.contact
      })
    }
  })

  console.log('')
  if (allHaveContent) {
    console.log('🎉 All tenants have landing_page_content with complete structure!')
  } else {
    console.log('⚠️  Some tenants missing complete content structure')
  }
}

verifyAllTenants().catch((error) => {
  console.error('❌ Verification failed:', error)
  process.exit(1)
})
