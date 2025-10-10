import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

/**
 * API Route: SIRE Catalog Lookups
 *
 * GET /api/sire/lookup?type=document_type&code=3
 * GET /api/sire/lookup?type=country&code=249 (SIRE code, NOT ISO 3166-1)
 * GET /api/sire/lookup?type=city&code=11001
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const code = searchParams.get('code');

    if (!type || !code) {
      return NextResponse.json(
        { error: 'Missing type or code parameter' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Lookup based on type
    let data = null;
    let error = null;

    switch (type) {
      case 'document_type':
        const docResult = await supabase
          .from('sire_document_types')
          .select('code, name')
          .eq('code', code)
          .single();
        data = docResult.data;
        error = docResult.error;
        break;

      case 'country':
        const countryResult = await supabase
          .from('sire_countries')
          .select('sire_code, name_es, iso_code')
          .eq('sire_code', code)
          .single();
        data = countryResult.data;
        error = countryResult.error;
        break;

      case 'city':
        const cityResult = await supabase
          .from('sire_cities')
          .select('code, name, department')
          .eq('code', code)
          .single();
        data = cityResult.data;
        error = cityResult.error;
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid type parameter' },
          { status: 400 }
        );
    }

    if (error) {
      console.error(`[SIRE Lookup] Error fetching ${type} ${code}:`, error);
      return NextResponse.json(
        { error: 'Lookup failed', code },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Not found', code },
        { status: 404 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('[SIRE Lookup] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
