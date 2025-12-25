/**
 * SIRE TXT Generator - Usage Examples
 *
 * This file demonstrates how to use the SIRE TXT generator
 * to create files for Migración Colombia portal upload.
 *
 * @see src/lib/sire/sire-txt-generator.ts
 */

import {
  generateSIRETXT,
  mapReservationToSIRE,
  SIREGuestData,
  TenantSIREInfo,
} from '../sire-txt-generator';

// ============================================================================
// EXAMPLE 1: Generate TXT from manual data
// ============================================================================

export function example1_ManualData() {
  // Define tenant info (hotel SCH code and city DIVIPOLA code)
  const tenantInfo: TenantSIREInfo = {
    hotel_sire_code: '12345',
    hotel_city_code: '88001', // San Andrés
  };

  // Create guest data manually
  const guests: SIREGuestData[] = [
    {
      codigo_hotel: tenantInfo.hotel_sire_code,
      codigo_ciudad: tenantInfo.hotel_city_code,
      tipo_documento: '3', // Pasaporte
      numero_identificacion: 'AB1234567',
      codigo_nacionalidad: '249', // Estados Unidos (SIRE code)
      primer_apellido: 'Smith',
      segundo_apellido: 'Johnson',
      nombres: 'John Michael',
      tipo_movimiento: 'E', // Entrada
      fecha_movimiento: '15/10/2025',
      lugar_procedencia: '249',
      lugar_destino: '88001',
      fecha_nacimiento: '25/03/1985',
    },
    {
      codigo_hotel: tenantInfo.hotel_sire_code,
      codigo_ciudad: tenantInfo.hotel_city_code,
      tipo_documento: '3',
      numero_identificacion: 'CD9876543',
      codigo_nacionalidad: '105', // Brasil
      primer_apellido: 'Silva',
      segundo_apellido: '', // Empty second surname is OK
      nombres: 'Maria Clara',
      tipo_movimiento: 'E',
      fecha_movimiento: '15/10/2025',
      lugar_procedencia: '105',
      lugar_destino: '88001',
      fecha_nacimiento: '10/07/1990',
    },
  ];

  // Generate TXT file
  const result = generateSIRETXT(guests, 'hotel-san-andres');

  console.log('Filename:', result.filename);
  console.log('Line count:', result.lineCount);
  console.log('Content preview:');
  console.log(result.content.split('\r\n').slice(0, 2).join('\n'));

  // Save to file (Node.js)
  // const fs = require('fs');
  // fs.writeFileSync(result.filename, result.content, 'utf8');

  return result;
}

// ============================================================================
// EXAMPLE 2: Generate TXT from database reservations
// ============================================================================

export async function example2_FromDatabase(supabase: any, tenantId: string) {
  // 1. Fetch tenant info (hotel codes)
  const { data: tenant } = await supabase
    .from('tenants')
    .select('sire_hotel_code, city_divipola_code')
    .eq('id', tenantId)
    .single();

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  const tenantInfo: TenantSIREInfo = {
    hotel_sire_code: tenant.sire_hotel_code,
    hotel_city_code: tenant.city_divipola_code,
  };

  // 2. Fetch reservations for a specific date range
  const { data: reservations, error } = await supabase
    .from('guest_reservations')
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('check_in_date', '2025-10-01')
    .lte('check_in_date', '2025-10-31')
    .order('check_in_date', { ascending: true });

  if (error) {
    throw new Error(`Database error: ${error.message}`);
  }

  // 3. Map reservations to SIRE format (check-ins only)
  const sireGuests: SIREGuestData[] = reservations
    .map((reservation: any) =>
      mapReservationToSIRE(reservation, tenantInfo, 'E')
    )
    .filter((guest: SIREGuestData | null) => guest !== null) as SIREGuestData[];

  console.log(`Mapped ${sireGuests.length} of ${reservations.length} reservations`);

  // 4. Generate TXT file
  const result = generateSIRETXT(sireGuests, tenantId);

  return result;
}

// ============================================================================
// EXAMPLE 3: Generate TXT for both check-ins and check-outs
// ============================================================================

export async function example3_CheckInAndCheckOut(
  supabase: any,
  tenantId: string,
  startDate: string,
  endDate: string
) {
  // Fetch tenant info
  const { data: tenant } = await supabase
    .from('tenants')
    .select('sire_hotel_code, city_divipola_code')
    .eq('id', tenantId)
    .single();

  const tenantInfo: TenantSIREInfo = {
    hotel_sire_code: tenant.sire_hotel_code,
    hotel_city_code: tenant.city_divipola_code,
  };

  // Fetch reservations
  const { data: reservations } = await supabase
    .from('guest_reservations')
    .select('*')
    .eq('tenant_id', tenantId)
    .or(
      `check_in_date.gte.${startDate},check_out_date.gte.${startDate}`
    )
    .or(
      `check_in_date.lte.${endDate},check_out_date.lte.${endDate}`
    );

  const allGuests: SIREGuestData[] = [];

  // Map check-ins
  for (const reservation of reservations) {
    if (
      reservation.check_in_date >= startDate &&
      reservation.check_in_date <= endDate
    ) {
      const guest = mapReservationToSIRE(reservation, tenantInfo, 'E');
      if (guest) allGuests.push(guest);
    }
  }

  // Map check-outs
  for (const reservation of reservations) {
    if (
      reservation.check_out_date >= startDate &&
      reservation.check_out_date <= endDate
    ) {
      const guest = mapReservationToSIRE(reservation, tenantInfo, 'S');
      if (guest) allGuests.push(guest);
    }
  }

  console.log(`Total movements (E+S): ${allGuests.length}`);

  // Generate TXT
  const result = generateSIRETXT(allGuests, tenantId);

  return result;
}

// ============================================================================
// EXAMPLE 4: Validate and handle errors
// ============================================================================

export async function example4_WithValidation(
  supabase: any,
  tenantId: string
) {
  try {
    // Fetch tenant info with validation
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('sire_hotel_code, city_divipola_code')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant) {
      throw new Error('Tenant not found or invalid');
    }

    // Validate tenant has SIRE codes configured
    if (!tenant.sire_hotel_code || !tenant.city_divipola_code) {
      throw new Error('Tenant missing SIRE hotel code or city code');
    }

    const tenantInfo: TenantSIREInfo = {
      hotel_sire_code: tenant.sire_hotel_code,
      hotel_city_code: tenant.city_divipola_code,
    };

    // Fetch reservations
    const { data: reservations, error: resError } = await supabase
      .from('guest_reservations')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('check_in_date', '2025-10-01')
      .lte('check_in_date', '2025-10-31');

    if (resError) {
      throw new Error(`Database error: ${resError.message}`);
    }

    if (reservations.length === 0) {
      console.warn('No reservations found for date range');
      return {
        content: '',
        lineCount: 0,
        filename: `SIRE_${tenantId}_empty.txt`,
      };
    }

    // Map with error tracking
    const validGuests: SIREGuestData[] = [];
    const invalidReservations: string[] = [];

    for (const reservation of reservations) {
      const guest = mapReservationToSIRE(reservation, tenantInfo, 'E');

      if (guest) {
        validGuests.push(guest);
      } else {
        invalidReservations.push(reservation.id);
      }
    }

    // Log validation results
    console.log(`Valid guests: ${validGuests.length}`);
    console.log(`Invalid reservations: ${invalidReservations.length}`);

    if (invalidReservations.length > 0) {
      console.warn('Invalid reservation IDs:', invalidReservations);
    }

    // Generate TXT
    const result = generateSIRETXT(validGuests, tenantId);

    return {
      ...result,
      validCount: validGuests.length,
      invalidCount: invalidReservations.length,
      invalidIds: invalidReservations,
    };
  } catch (error) {
    console.error('[SIRE TXT Generator] Error:', error);
    throw error;
  }
}

// ============================================================================
// EXAMPLE 5: Download as file (browser)
// ============================================================================

export function example5_DownloadInBrowser(guests: SIREGuestData[], tenantId: string) {
  // Generate TXT
  const result = generateSIRETXT(guests, tenantId);

  // Create blob
  const blob = new Blob([result.content], { type: 'text/plain;charset=utf-8' });

  // Create download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = result.filename;

  // Trigger download
  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  console.log(`Downloaded: ${result.filename}`);
}
