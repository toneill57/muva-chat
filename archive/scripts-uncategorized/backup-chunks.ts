import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'

async function backupChunks() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: chunks, error } = await supabase
    .from('accommodation_units_manual_chunks')
    .select('*')

  if (error) {
    console.error('❌ Error fetching chunks:', error)
    process.exit(1)
  }

  const backupFileName = 'backups/chunks_backup_' + new Date().toISOString().split('T')[0] + '.json'

  fs.writeFileSync(
    backupFileName,
    JSON.stringify(chunks, null, 2)
  )

  console.log('✅ Backup completed:', chunks?.length || 0, 'chunks')
  console.log('File created:', backupFileName)

  // Get file size
  const stats = fs.statSync(backupFileName)
  console.log('File size:', (stats.size / 1024 / 1024).toFixed(1), 'MB')
}

backupChunks().catch(console.error)
