#!/bin/bash
# Test de estabilidad PM2 (24h mínimo)
# Parte de: Project Stabilization 2025 - FASE 1

set -e

echo "🔍 Iniciando test de estabilidad PM2..."
echo "================================================"

# 1. Baseline inicial
echo ""
echo "📊 BASELINE INICIAL"
echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

echo "Status:"
pm2 info muva-chat | grep "status" || echo "  ⚠️  No se pudo obtener status"

echo ""
echo "Restarts:"
pm2 info muva-chat | grep "restarts" || echo "  ⚠️  No se pudo obtener restarts"

echo ""
echo "Uptime:"
pm2 info muva-chat | grep "uptime" || echo "  ⚠️  No se pudo obtener uptime"

echo ""
echo "Memory:"
pm2 info muva-chat | grep "memory" || echo "  ⚠️  No se pudo obtener memory"

# 2. Instrucciones de monitoreo
echo ""
echo "================================================"
echo "⏳ MONITOREO DE 24 HORAS"
echo "================================================"
echo ""
echo "Marca inicial:  $(date '+%Y-%m-%d %H:%M:%S')"
echo "Marca final:    $(date -v+24H '+%Y-%m-%d %H:%M:%S' 2>/dev/null || date -d '+24 hours' '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo 'Calcular manualmente')"
echo ""
echo "INSTRUCCIONES:"
echo "1. Ejecutar este script ahora para capturar baseline"
echo "2. Esperar 24 horas"
echo "3. Ejecutar nuevamente para comparar resultados"
echo "4. Ejecutar validación final (ver abajo)"
echo ""

# 3. Criterios de éxito
echo "================================================"
echo "✅ CRITERIOS DE ÉXITO (después de 24h)"
echo "================================================"
echo ""
echo "1. Restarts: 0 restarts adicionales"
echo "   - Verificar: pm2 info muva-chat | grep 'restarts'"
echo ""
echo "2. Memory: <400MB sostenido"
echo "   - Verificar: pm2 info muva-chat | grep 'memory'"
echo ""
echo "3. Uptime: ~24 horas continuas"
echo "   - Verificar: pm2 info muva-chat | grep 'uptime'"
echo ""
echo "4. Logs limpios (sin PGRST116)"
echo "   - Verificar: pm2 logs muva-chat --lines 500 --nostream | grep -i PGRST116"
echo "   - Esperado: Sin resultados"
echo ""

# 4. Comando de validación final
echo "================================================"
echo "🔧 VALIDACIÓN FINAL (ejecutar después de 24h)"
echo "================================================"
echo ""
echo "# Comando completo para copiar/pegar:"
echo "pm2 info muva-chat && \\"
echo "echo '---' && \\"
echo "pm2 logs muva-chat --lines 500 --nostream | grep -i PGRST116 && \\"
echo "echo 'PGRST116 encontrados ⚠️' || echo '✅ Sin errores PGRST116'"
echo ""
echo "================================================"
echo "Test de estabilidad iniciado correctamente ✅"
echo "================================================"
