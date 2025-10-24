/**
 * Script: Sync Accommodation Units from Public to Hotels Schema
 *
 * Purpose: Copy consolidated accommodation units from accommodation_units_public
 *          to hotels.accommodation_units for operational use (ICS feeds, admin).
 *
 * Architecture:
 *   accommodation_units_public → SOURCE OF TRUTH (AI chat, embeddings, semantic search)
 *   hotels.accommodation_units → OPERATIONAL COPY (ICS feeds, reservations, admin)
 *
 * Flow:
 *   1. Query accommodation_units_public (grouped by original_accommodation)
 *   2. UPSERT into hotels.accommodation_units
 *   3. Match by motopress_unit_id or name for updates
 *
 * Usage:
 *   npx tsx scripts/sync-public-to-hotels.ts [tenant_slug]
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ConsolidatedUnit {
  unit_id: string;
  tenant_id: string;
  name: string;
  unit_number: string;
  unit_type: string;
  description: string;
  short_description: string;
  metadata: any;
  images: any[];
  motopress_type_id?: number;
  motopress_unit_id?: number;
}

async function syncPublicToHotels(tenantSlug?: string) {
  console.log('🔄 Syncing accommodation_units_public → hotels.accommodation_units\n');

  try {
    // Get tenant(s)
    let tenantsQuery = supabase.from('tenant_registry').select('tenant_id, slug, nombre_comercial');

    if (tenantSlug) {
      tenantsQuery = tenantsQuery.eq('slug', tenantSlug);
    }

    const { data: tenants, error: tenantError } = await tenantsQuery;

    if (tenantError || !tenants || tenants.length === 0) {
      console.error('❌ No tenants found');
      if (tenantError) console.error('Error:', tenantError);
      return;
    }

    for (const tenant of tenants) {
      console.log(`\n🏨 Processing: ${tenant.nombre_comercial} (${tenant.slug})`);
      console.log('─'.repeat(60));

      // Get all accommodation units from public table
      const { data: publicUnits, error: publicError } = await supabase
        .from('accommodation_units_public')
        .select('*')
        .eq('tenant_id', tenant.tenant_id);

      if (publicError) {
        console.error(`❌ Error fetching public units: ${publicError.message}`);
        continue;
      }

      if (!publicUnits || publicUnits.length === 0) {
        console.log('⚠️  No units found in accommodation_units_public');
        continue;
      }

      console.log(`📥 Found ${publicUnits.length} chunks in accommodation_units_public`);

      // Group by original_accommodation to get unique units
      const groupedUnits = publicUnits.reduce((acc: any, chunk: any) => {
        const baseName = chunk.metadata?.original_accommodation || chunk.name;

        if (!acc[baseName]) {
          // First chunk for this unit - use as base
          acc[baseName] = {
            unit_id: chunk.unit_id,
            tenant_id: chunk.tenant_id,
            name: baseName,
            unit_number: chunk.metadata?.display_order?.toString() || chunk.unit_number || 'N/A',
            unit_type: chunk.metadata?.accommodation_mphb_type || chunk.unit_type || 'Standard',
            description: chunk.description || '',
            short_description: chunk.short_description || chunk.description?.substring(0, 150) || '',
            capacity: chunk.metadata?.capacity || { adults: 2, children: 0, total: 2 },
            bed_configuration: chunk.metadata?.bed_configuration || [{ type: 'Queen', quantity: 1 }],
            size_m2: chunk.metadata?.size_m2 || null,
            view_type: chunk.metadata?.view_type || null,
            images: chunk.photos || [],
            motopress_type_id: chunk.metadata?.motopress_room_type_id || null,
            motopress_unit_id: chunk.metadata?.motopress_unit_id || null,
            full_description: chunk.description || '',
            tourism_features: chunk.metadata?.tourism_features || '',
            booking_policies: chunk.metadata?.booking_policies || '',
            unique_features: chunk.metadata?.unique_features || [],
            accessibility_features: chunk.metadata?.accessibility_features || {},
            location_details: chunk.metadata?.location_details || {},
            status: chunk.is_active ? 'active' : 'inactive',
            is_featured: chunk.metadata?.is_featured || false,
            display_order: chunk.metadata?.display_order || 999,
            base_price_low_season: chunk.pricing?.base_price || null,
            base_price_high_season: chunk.pricing?.base_price || null,
            amenities_list: chunk.metadata?.unit_amenities || [],
            unit_amenities: Array.isArray(chunk.metadata?.unit_amenities)
              ? chunk.metadata.unit_amenities.join(', ')
              : chunk.metadata?.unit_amenities || '',
            accommodation_mphb_type: chunk.metadata?.accommodation_mphb_type || null,
            tags: chunk.metadata?.tags || [],
            subcategory: chunk.metadata?.subcategory || null,
          };
        }

        return acc;
      }, {});

      const consolidatedUnits = Object.values(groupedUnits) as ConsolidatedUnit[];
      console.log(`📦 Consolidated to ${consolidatedUnits.length} unique units`);

      // UPSERT into hotels.accommodation_units
      let created = 0;
      let updated = 0;
      let errors = 0;

      for (const unit of consolidatedUnits) {
        try {
          // Check if unit exists (match by motopress_unit_id or name)
          const { data: existing } = await supabase
            .schema('hotels')
            .from('accommodation_units')
            .select('id')
            .eq('tenant_id', tenant.tenant_id)
            .eq('name', unit.name)
            .maybeSingle();

          const payload = {
            tenant_id: tenant.tenant_id,
            name: unit.name,
            unit_number: unit.unit_number,
            unit_type: unit.unit_type,
            description: unit.description,
            short_description: unit.short_description,
            capacity: unit.capacity,
            bed_configuration: unit.bed_configuration,
            size_m2: unit.size_m2,
            view_type: unit.view_type,
            images: unit.images,
            motopress_type_id: unit.motopress_type_id,
            motopress_unit_id: unit.motopress_unit_id,
            full_description: unit.description,
            tourism_features: unit.tourism_features,
            booking_policies: unit.booking_policies,
            unique_features: unit.unique_features,
            accessibility_features: unit.accessibility_features,
            location_details: unit.location_details,
            status: unit.status,
            is_featured: unit.is_featured,
            display_order: unit.display_order,
            base_price_low_season: unit.base_price_low_season,
            base_price_high_season: unit.base_price_high_season,
            amenities_list: unit.amenities_list,
            unit_amenities: unit.unit_amenities,
            accommodation_mphb_type: unit.accommodation_mphb_type,
            tags: unit.tags,
            subcategory: unit.subcategory,
            updated_at: new Date().toISOString(),
          };

          if (existing) {
            // Update
            const { error } = await supabase
              .schema('hotels')
              .from('accommodation_units')
              .update(payload)
              .eq('id', existing.id);

            if (error) {
              console.error(`  ❌ Error updating ${unit.name}: ${error.message}`);
              errors++;
            } else {
              updated++;
            }
          } else {
            // Insert (specify schema)
            const { error } = await supabase
              .schema('hotels')
              .from('accommodation_units')
              .insert(payload);

            if (error) {
              console.error(`  ❌ Error creating ${unit.name}: ${error.message}`);
              errors++;
            } else {
              created++;
            }
          }
        } catch (err) {
          console.error(`  ❌ Unexpected error for ${unit.name}:`, err);
          errors++;
        }
      }

      console.log('\n📊 Results:');
      console.log(`  ✅ Created: ${created}`);
      console.log(`  🔄 Updated: ${updated}`);
      console.log(`  ❌ Errors:  ${errors}`);
    }

    console.log('\n✨ Sync completed!');
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run
const tenantSlug = process.argv[2];
syncPublicToHotels(tenantSlug);
