/**
 * Setup Airbnb ICS Feeds for Simmer Down
 *
 * Configures:
 * - Zimmer Heist (parent apartment) - 4 bedrooms
 * - Kaya (child room) - 1 bedroom in Zimmer Heist
 * - Parent-child relationship with auto-blocking
 *
 * Usage: npx tsx scripts/setup-airbnb-feeds-simmerdown.ts
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// ============================================================================
// Configuration
// ============================================================================

const SIMMERDOWN_SUBDOMAIN = 'simmerdown';

const ZIMMER_HEIST = {
  name: 'Zimmer Heist',
  airbnbId: '42003863',
  feedUrl: 'https://www.airbnb.com.co/calendar/ical/42003863.ics?s=441e74fad79f9492aeee627fab3ab265',
  unitType: 'apartment',
  capacity: { total: 8, adults: 8, children: 8 }, // 4 bedrooms
  description: 'Apartamento completo con 4 habitaciones en Simmer Down House',
};

const KAYA = {
  name: 'Kaya',
  airbnbId: '802218490211831437',
  feedUrl: 'https://www.airbnb.com.co/calendar/ical/802218490211831437.ics?s=e8eda23ced8e6ab5ec155f784abdef2a',
  unitType: 'room',
  capacity: { total: 2, adults: 2, children: 2 },
  description: 'Habitación privada Kaya dentro de Zimmer Heist',
};

// ============================================================================
// Supabase Client
// ============================================================================

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================================
// Helper Functions
// ============================================================================

async function findHotel(subdomain: string) {
  const { data, error } = await supabase
    .from('hotels')
    .select('id, name')
    .eq('slug', subdomain)
    .single();

  if (error || !data) {
    // Try alternative column names
    const { data: altData, error: altError } = await supabase
      .from('hotels')
      .select('id, name')
      .ilike('name', `%${subdomain}%`)
      .limit(1)
      .single();

    if (altError || !altData) {
      throw new Error(`Hotel not found for subdomain: ${subdomain}`);
    }

    return altData;
  }

  return data;
}

async function createOrUpdateAccommodation(hotelId: string, config: typeof ZIMMER_HEIST | typeof KAYA) {
  // Check if exists
  const { data: existing } = await supabase
    .from('accommodation_units')
    .select('id')
    .eq('hotel_id', hotelId)
    .eq('name', config.name)
    .single();

  if (existing) {
    console.log(`✓ Accommodation "${config.name}" already exists: ${existing.id}`);
    return existing.id;
  }

  // Create new
  const { data, error } = await supabase
    .from('accommodation_units')
    .insert({
      hotel_id: hotelId,
      name: config.name,
      unit_type: config.unitType,
      description: config.description,
      capacity: config.capacity,
      short_description: config.description,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create accommodation: ${error.message}`);
  }

  console.log(`✓ Created accommodation "${config.name}": ${data.id}`);
  return data.id;
}

async function createFeedConfiguration(
  hotelId: string,
  accommodationId: string,
  config: typeof ZIMMER_HEIST | typeof KAYA
) {
  // Check if exists
  const { data: existing } = await supabase
    .from('ics_feed_configurations')
    .select('id')
    .eq('tenant_id', hotelId)
    .eq('accommodation_unit_id', accommodationId)
    .eq('source_platform', 'airbnb')
    .single();

  if (existing) {
    console.log(`✓ Feed configuration already exists for "${config.name}"`);
    return existing;
  }

  // Create feed configuration
  const { data, error } = await supabase
    .from('ics_feed_configurations')
    .insert({
      tenant_id: hotelId,
      accommodation_unit_id: accommodationId,
      feed_name: `Airbnb - ${config.name}`,
      source_platform: 'airbnb',
      feed_type: 'import', // Import from Airbnb
      feed_url: config.feedUrl,
      sync_interval_minutes: 60, // Sync every hour
      sync_priority: 5,
      is_active: true,
      auth_type: 'none',
      last_sync_at: null,
      last_etag: null,
      consecutive_failures: 0,
      total_syncs: 0,
      successful_syncs: 0,
      failed_syncs: 0,
      events_imported_total: 0,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create feed configuration: ${error.message}`);
  }

  console.log(`✓ Created feed configuration for "${config.name}"`);

  return data;
}

async function createParentChildRelationship(parentId: string, childId: string, hotelId: string) {
  // Check if exists
  const { data: existing } = await supabase
    .from('property_relationships')
    .select('id')
    .eq('parent_unit_id', parentId)
    .eq('child_unit_id', childId)
    .single();

  if (existing) {
    console.log(`✓ Parent-child relationship already exists`);
    return existing.id;
  }

  // Create relationship
  const { data, error } = await supabase
    .from('property_relationships')
    .insert({
      tenant_id: hotelId,
      parent_unit_id: parentId,
      child_unit_id: childId,
      relationship_type: 'room_in_apartment',
      block_child_on_parent: true, // When parent is booked, block child
      block_parent_on_all_children: false, // Don't block parent when just one room is booked
      blocking_priority: 5,
      is_active: true,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create relationship: ${error.message}`);
  }

  console.log(`✓ Created parent-child relationship`);
  console.log(`  Parent: Zimmer Heist`);
  console.log(`  Child: Kaya`);
  console.log(`  Rule: Block Kaya when Zimmer Heist is fully booked`);

  return data.id;
}

// ============================================================================
// Main Setup Function
// ============================================================================

async function setup() {
  console.log('🚀 Setting up Airbnb ICS Feeds for Simmer Down\n');

  try {
    // 1. Find hotel
    console.log('1️⃣  Finding hotel...');
    const hotel = await findHotel(SIMMERDOWN_SUBDOMAIN);
    console.log(`✓ Found hotel: ${hotel.name} (${hotel.id})\n`);

    // 2. Create or get accommodations
    console.log('2️⃣  Setting up accommodations...');
    const zimmerHeistId = await createOrUpdateAccommodation(hotel.id, ZIMMER_HEIST);
    const kayaId = await createOrUpdateAccommodation(hotel.id, KAYA);
    console.log();

    // 3. Create feed configurations
    console.log('3️⃣  Setting up ICS feed configurations...');
    const zimmerHeistFeed = await createFeedConfiguration(hotel.id, zimmerHeistId, ZIMMER_HEIST);
    const kayaFeed = await createFeedConfiguration(hotel.id, kayaId, KAYA);
    console.log();

    // 4. Create parent-child relationship
    console.log('4️⃣  Setting up parent-child relationship...');
    await createParentChildRelationship(zimmerHeistId, kayaId, hotel.id);
    console.log();

    // 5. Display summary
    console.log('✅ Setup completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`  Hotel: ${hotel.name}`);
    console.log(`  Parent Unit: Zimmer Heist (${zimmerHeistId})`);
    console.log(`  Child Unit: Kaya (${kayaId})`);
    console.log(`  Feed Configurations: 2`);
    console.log(`  Parent-Child Relationship: Active\n`);

    console.log('📋 Configuration IDs:');
    console.log(`  Zimmer Heist Feed: ${zimmerHeistFeed.id}`);
    console.log(`  Kaya Feed: ${kayaFeed.id}\n`);

    console.log('🔄 Next Steps:');
    console.log('  1. Run first sync: POST /api/calendar/sync?tenant_id=' + hotel.id);
    console.log('  2. Check calendar_events table for synced events');
    console.log('  3. Verify parent-child blocking is working');
    console.log('  4. Set up cron job for automatic hourly sync\n');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

// Run setup
setup();
