#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js'

;(async () => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )

  const { data, error } = await supabase
    .from('tenant_registry')
    .select('*')
    .eq('subdomain', 'simmerdown')
    .single()

  if (error) {
    console.error('Error:', error)
    process.exit(1)
  }

  console.log(JSON.stringify(data, null, 2))
})()
