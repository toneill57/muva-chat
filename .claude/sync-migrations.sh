#!/bin/bash
# Sincroniza /migrations/ → /supabase/migrations/
# Se ejecuta automáticamente en pre-commit

set -e

echo "🔄 Sincronizando migraciones..."

# Eliminar supabase/migrations/ si es symlink
if [ -L "supabase/migrations" ]; then
  rm supabase/migrations
  mkdir -p supabase/migrations
fi

# Crear directorio si no existe
mkdir -p supabase/migrations

# Copiar todos los archivos .sql y subdirectorios
rsync -av --delete \
  --include='*.sql' \
  --include='*/' \
  --exclude='*' \
  migrations/ supabase/migrations/

echo "✅ Sincronización completa"
