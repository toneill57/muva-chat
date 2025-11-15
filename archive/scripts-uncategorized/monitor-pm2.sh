#!/bin/bash
# Monitor PM2 health y alertar si hay problemas
# Parte de: Project Stabilization 2025 - FASE 1
# Uso: Ejecutar manualmente o vía cron cada hora

set -e

# Configuración de thresholds
THRESHOLD_RESTARTS=5
THRESHOLD_MEMORY=450  # MB

# Colores para output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo "================================================"
echo "🖥️  PM2 Health Monitor - $(date '+%Y-%m-%d %H:%M:%S')"
echo "================================================"

# Verificar que jq está instalado
if ! command -v jq &> /dev/null; then
    echo -e "${RED}⚠️  ERROR: jq no está instalado${NC}"
    echo "Instalar con: apt-get install jq (Ubuntu) o brew install jq (macOS)"
    exit 1
fi

# Verificar que PM2 está corriendo
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}⚠️  ERROR: pm2 no está instalado${NC}"
    exit 1
fi

# Check si muva-chat existe
if ! pm2 describe muva-chat &> /dev/null; then
    echo -e "${RED}⚠️  ERROR: Aplicación 'muva-chat' no encontrada en PM2${NC}"
    exit 1
fi

echo ""
echo "📊 Métricas Actuales:"
echo "-------------------"

# Obtener datos de PM2
PM2_DATA=$(pm2 jlist 2>/dev/null | jq '.[] | select(.name=="muva-chat")')

if [ -z "$PM2_DATA" ]; then
    echo -e "${RED}⚠️  ERROR: No se pudieron obtener datos de PM2${NC}"
    exit 1
fi

# Extraer métricas
status=$(echo "$PM2_DATA" | jq -r '.pm2_env.status')
restarts=$(echo "$PM2_DATA" | jq -r '.pm2_env.restart_time')
memory_bytes=$(echo "$PM2_DATA" | jq -r '.monit.memory')
memory_mb=$(echo "scale=2; $memory_bytes / 1024 / 1024" | bc)
cpu=$(echo "$PM2_DATA" | jq -r '.monit.cpu')
uptime_seconds=$(echo "$PM2_DATA" | jq -r '.pm2_env.pm_uptime')
uptime_hours=$(echo "scale=1; ($uptime_seconds / 1000) / 3600" | bc 2>/dev/null || echo "0")

echo "Status: $status"
echo "Restarts: $restarts"
echo "Memory: ${memory_mb}MB"
echo "CPU: ${cpu}%"
echo "Uptime: ${uptime_hours}h"

# Flags de alerta
ALERT_FLAG=0

echo ""
echo "🔍 Verificaciones:"
echo "-------------------"

# Check 1: Restarts
if [ "$restarts" -gt "$THRESHOLD_RESTARTS" ]; then
    echo -e "${RED}⚠️  ALERTA: $restarts restarts detectados (threshold: $THRESHOLD_RESTARTS)${NC}"
    ALERT_FLAG=1

    # Mostrar últimas líneas de error logs
    echo ""
    echo "Últimos errores en logs:"
    pm2 logs muva-chat --lines 50 --nostream --err 2>/dev/null | tail -n 10
else
    echo -e "${GREEN}✅ Restarts OK${NC} ($restarts < $THRESHOLD_RESTARTS)"
fi

# Check 2: Memory
memory_mb_int=$(echo "$memory_mb" | cut -d'.' -f1)
if [ "$memory_mb_int" -gt "$THRESHOLD_MEMORY" ]; then
    echo -e "${YELLOW}⚠️  WARNING: Memoria en ${memory_mb}MB (threshold: ${THRESHOLD_MEMORY}MB)${NC}"
    ALERT_FLAG=1
else
    echo -e "${GREEN}✅ Memory OK${NC} (${memory_mb}MB < ${THRESHOLD_MEMORY}MB)"
fi

# Check 3: Status
if [ "$status" != "online" ]; then
    echo -e "${RED}⚠️  ALERTA: Status=$status (esperado: online)${NC}"
    ALERT_FLAG=1
else
    echo -e "${GREEN}✅ Status OK${NC} ($status)"
fi

# Check 4: PGRST116 errors (últimas 100 líneas)
echo ""
echo "Verificando errores PGRST116..."
PGRST116_COUNT=$(pm2 logs muva-chat --lines 100 --nostream 2>/dev/null | grep -i PGRST116 | wc -l | xargs)

if [ "$PGRST116_COUNT" -gt 0 ]; then
    echo -e "${RED}⚠️  ALERTA: $PGRST116_COUNT errores PGRST116 en últimas 100 líneas${NC}"
    ALERT_FLAG=1

    # Mostrar primeras ocurrencias
    echo ""
    echo "Primeras ocurrencias:"
    pm2 logs muva-chat --lines 100 --nostream 2>/dev/null | grep -i PGRST116 | head -n 3
else
    echo -e "${GREEN}✅ Sin errores PGRST116${NC}"
fi

# Resumen final
echo ""
echo "================================================"
if [ $ALERT_FLAG -eq 0 ]; then
    echo -e "${GREEN}✅ PM2 Health Check: TODO OK${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  PM2 Health Check: ALERTAS DETECTADAS${NC}"
    echo ""
    echo "Acciones recomendadas:"
    echo "1. Revisar logs completos: pm2 logs muva-chat --lines 500"
    echo "2. Verificar configuración: pm2 describe muva-chat"
    echo "3. Si problemas persisten: pm2 restart muva-chat"
    exit 1
fi
