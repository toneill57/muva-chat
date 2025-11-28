import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkMigrations() {
  const { data, error } = await supabase
    .from('schema_migrations')
    .select('*')
    .ilike('name', '202511%')
    .order('executed_at', { ascending: false })

  if (error) {
    console.error('Error checking migrations:', error)
    return
  }

  console.log('\n✅ Migraciones de Nov 2025 aplicadas en DB dev:\n')
  if (data && data.length > 0) {
    data.forEach(m => {
      const date = m.executed_at ? new Date(m.executed_at).toLocaleString() : 'N/A'
      console.log(`  ${m.name} - ${date}`)
    })
    console.log(`\nTotal: ${data.length} migraciones`)
  } else {
    console.log('  Ninguna migración de Nov 2025 encontrada')
  }
}

checkMigrations().catch(console.error)
