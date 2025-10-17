#!/bin/bash

#
# Log Rotation Script for MUVA Chat
#
# This script automatically manages log files:
# - Deletes logs older than 7 days
# - Compresses logs older than 2 days
# - Keeps recent logs uncompressed for debugging
#
# Usage:
#   chmod +x scripts/rotate-logs.sh
#   ./scripts/rotate-logs.sh
#
# Cron (daily at 2am):
#   0 2 * * * /path/to/muva-chat/scripts/rotate-logs.sh
#

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOGS_DIR="$PROJECT_ROOT/logs"

echo "🔄 Rotación de logs - $(date '+%Y-%m-%d %H:%M:%S')"
echo "📁 Directorio: $LOGS_DIR"

# Verificar que existe el directorio de logs
if [ ! -d "$LOGS_DIR" ]; then
    echo "⚠️  Directorio de logs no existe: $LOGS_DIR"
    exit 0
fi

# Contadores
deleted_count=0
compressed_count=0

# Eliminar logs > 7 días
echo "🗑️  Eliminando logs > 7 días..."
while IFS= read -r -d '' file; do
    echo "   ❌ $(basename "$file")"
    rm "$file"
    ((deleted_count++))
done < <(find "$LOGS_DIR" -name "*.log" -mtime +7 -print0 2>/dev/null || true)

# Eliminar archivos .gz > 30 días
while IFS= read -r -d '' file; do
    echo "   ❌ $(basename "$file")"
    rm "$file"
    ((deleted_count++))
done < <(find "$LOGS_DIR" -name "*.gz" -mtime +30 -print0 2>/dev/null || true)

# Comprimir logs > 2 días (excepto los ya comprimidos)
echo "🗜️  Comprimiendo logs > 2 días..."
while IFS= read -r -d '' file; do
    gzip "$file"
    echo "   ✅ $(basename "$file") → $(basename "$file").gz"
    ((compressed_count++))
done < <(find "$LOGS_DIR" -name "*.log" -mtime +2 -print0 2>/dev/null || true)

echo ""
echo "✅ Rotación completada:"
echo "   📦 Archivos comprimidos: $compressed_count"
echo "   🗑️  Archivos eliminados: $deleted_count"

# Mostrar resumen de logs actuales
total_logs=$(find "$LOGS_DIR" -name "*.log" -o -name "*.gz" | wc -l | tr -d ' ')
total_size=$(du -sh "$LOGS_DIR" 2>/dev/null | cut -f1)
echo "   📊 Logs actuales: $total_logs archivos ($total_size)"
