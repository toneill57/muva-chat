#!/usr/bin/env tsx
/**
 * Insert Tu Casa en el Mar tenant into tenant_registry
 * Following Simmerdown structure
 */

import { createClient } from '@supabase/supabase-js'

;(async () => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )

  // Check if tenant already exists
  const { data: existing } = await supabase
    .from('tenant_registry')
    .select('tenant_id')
    .eq('subdomain', 'tucasamar')
    .maybeSingle()

  if (existing) {
    console.log('❌ Tenant "tucasamar" already exists with ID:', existing.tenant_id)
    console.log('   Use update script if you need to modify the existing tenant')
    process.exit(1)
  }

  // Insert new tenant
  const tenantData = {
    nit: '[PENDING_NIT]', // To be filled manually
    razon_social: 'Tu Casa en el Mar S.A.S.', // Assumed structure
    nombre_comercial: 'Tu Casa en el Mar',
    business_name: 'Tu Casa en el Mar',
    subdomain: 'tucasamar',
    slug: 'tucasamar',
    schema_name: 'tenant_tucasamar',
    tenant_type: 'hotel',
    is_active: true,
    subscription_tier: 'basic', // Can upgrade to premium later

    // Contact information
    address: 'Centro, San Andrés, Colombia (2 cuadras de Sprat Bight)',
    phone: '+57300000000', // Placeholder - update with actual phone
    email: 'info@tucasaenelmar.com', // Placeholder - update with actual email

    // Branding
    logo_url: 'https://tucasaenelmar.com/wp-content/uploads/2021/10/logo-placeholder.png', // Update with actual logo
    primary_color: '#2563EB', // Blue color - update if needed

    // Features
    features: {
      muva_access: true,
      guest_chat_enabled: true,
      staff_chat_enabled: false, // Can enable later
      premium_chat: false, // Basic tier
      sire_city_code: '88001', // San Andrés
      sire_hotel_code: '[PENDING_SIRE]' // To be filled when registered with SIRE
    },

    // Social media
    social_media_links: {
      facebook: '[PENDING_FACEBOOK]',
      instagram: '[PENDING_INSTAGRAM]',
      twitter: '',
      linkedin: '',
      tiktok: ''
    },

    // SEO
    seo_meta_description: 'Tu Casa en el Mar - Alojamiento cómodo en el centro de San Andrés, a 2 cuadras de la playa Sprat Bight. Habitaciones y apartamentos con cocina equipada.',
    seo_keywords: [
      'hotel san andres',
      'alojamiento san andres',
      'sprat bight',
      'apartamento san andres',
      'habitacion san andres',
      'centro san andres'
    ],

    // Landing page content (minimal structure)
    landing_page_content: {
      hero: {
        title: 'Tu Casa en el Mar',
        subtitle: 'Alojamiento cómodo en el corazón de San Andrés',
        cta_text: 'Reservar Ahora',
        cta_link: '/chat'
      },
      about: {
        title: 'Sobre Nosotros',
        content: 'Ubicados en el centro de San Andrés, a solo 2 cuadras de la playa Sprat Bight.'
      },
      services: {
        title: 'Nuestras Habitaciones',
        items: []
      },
      gallery: {
        title: 'Galería',
        images: []
      },
      contact: {
        title: 'Contáctanos',
        phone: '+57300000000',
        email: 'info@tucasaenelmar.com',
        address: 'Centro, San Andrés, Colombia'
      }
    }
  }

  const { data, error } = await supabase
    .from('tenant_registry')
    .insert(tenantData)
    .select()
    .single()

  if (error) {
    console.error('❌ Error inserting tenant:', error)
    process.exit(1)
  }

  console.log('✅ Tenant "tucasamar" inserted successfully!')
  console.log('\nTenant Details:')
  console.log('- Tenant ID:', data.tenant_id)
  console.log('- Subdomain: tucasamar')
  console.log('- Business Name: Tu Casa en el Mar')
  console.log('- Subscription: basic')
  console.log('- Status: active')
  console.log('\n⚠️  PENDING MANUAL DATA:')
  console.log('- NIT: Update in database')
  console.log('- Phone: Update in database')
  console.log('- Email: Update in database')
  console.log('- SIRE Hotel Code: Register with SIRE system')
  console.log('- Social Media: Add Facebook/Instagram URLs')
  console.log('- Logo URL: Upload actual logo and update')
  console.log('\n📝 Next Steps:')
  console.log('1. Update [PENDING_DB_INSERT] markers in accommodation markdown files')
  console.log('2. Replace [PENDING_DB_INSERT] with tenant_id:', data.tenant_id)
  console.log('3. Complete manual scraping using SCRAPING_PROMPT.md')
  console.log('4. Test subdomain: https://tucasamar.muva.chat')
})()
