import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyCatalogs() {
  console.log('🔍 Verificando catálogos SIRE...\n');

  // Count document types
  const { data: docTypes, error: docError } = await supabase
    .from('sire_document_types')
    .select('*');

  const docCount = docTypes?.length || 0;
  console.log(`📄 Document Types: ${docCount} registros`);
  if (docTypes && docTypes.length > 0) {
    docTypes.forEach(dt => console.log(`   - ${dt.code}: ${dt.name}`));
  }
  console.log('');

  // Count countries
  const { data: countries, error: countryError } = await supabase
    .from('sire_countries')
    .select('iso_code, name')
    .limit(10);

  const { count: countryCount } = await supabase
    .from('sire_countries')
    .select('*', { count: 'exact', head: true });

  console.log(`🌍 Countries: ${countryCount || 0} registros`);
  if (countries && countries.length > 0) {
    console.log('   Sample (primeros 10):');
    countries.forEach(c => console.log(`   - ${c.iso_code}: ${c.name}`));
  }
  console.log('');

  // Count cities
  const { data: cities, error: cityError } = await supabase
    .from('sire_cities')
    .select('code, name, department')
    .ilike('code', '11%')
    .limit(10);

  const { count: cityCount } = await supabase
    .from('sire_cities')
    .select('*', { count: 'exact', head: true });

  console.log(`🏙️  Cities: ${cityCount || 0} registros`);
  if (cities && cities.length > 0) {
    console.log('   Sample (Bogotá/Cundinamarca):');
    cities.forEach(c => console.log(`   - ${c.code}: ${c.name}, ${c.department}`));
  }
  console.log('');

  // Summary
  console.log('📊 RESUMEN:');
  console.log(`   ✅ Document Types: ${docCount}`);
  console.log(`   ✅ Countries: ${countryCount || 0}`);
  console.log(`   ✅ Cities: ${cityCount || 0}`);
  console.log('');

  if (docCount < 4) {
    console.log('⚠️  WARNING: Expected at least 4 document types!');
  }
  if ((countryCount || 0) < 100) {
    console.log('⚠️  WARNING: Expected at least 100 countries!');
  }
  if ((cityCount || 0) < 100) {
    console.log('⚠️  WARNING: Expected at least 100 cities!');
  }
}

verifyCatalogs();
