#!/bin/bash
# Deploy FASE 1 changes y validación inicial
# Parte de: Project Stabilization 2025 - FASE 1

set -e

# Configuration
VPS_HOST="muva@195.200.6.216"
VPS_DIR="/var/www/muva-chat"
VALIDATION_INTERVAL=900  # 15 minutos en segundos
VALIDATION_COUNT=8       # 8 checks = 2 horas

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "================================================"
echo "🚀 FASE 1 Deployment & Validation"
echo "================================================"
echo ""

# Función para ejecutar comandos en VPS
run_remote() {
    ssh "$VPS_HOST" "$1"
}

# Función para capturar métricas PM2
capture_metrics() {
    local timestamp=$1
    echo ""
    echo -e "${BLUE}📊 Capturando métricas ($timestamp)${NC}"
    echo "-------------------"

    # Status
    echo -n "Status: "
    run_remote "pm2 info muva-chat | grep -E 'status.*:' | awk '{print \$NF}'"

    # Restarts
    echo -n "Restarts: "
    run_remote "pm2 info muva-chat | grep -E 'restarts.*:' | awk '{print \$NF}'"

    # Memory
    echo -n "Memory: "
    run_remote "pm2 info muva-chat | grep -E 'memory.*:' | awk '{print \$NF}'"

    # Uptime
    echo -n "Uptime: "
    run_remote "pm2 info muva-chat | grep -E 'uptime.*:' | awk '{print \$NF}'"

    # PGRST116 errors en últimos 200 logs
    echo -n "PGRST116 errors: "
    local pgrst_count=$(run_remote "pm2 logs muva-chat --lines 200 --nostream 2>/dev/null | grep -i PGRST116 | wc -l | xargs")
    echo "$pgrst_count"

    if [ "$pgrst_count" -gt 0 ]; then
        echo -e "${RED}⚠️  PGRST116 errors encontrados!${NC}"
        echo "Primeras ocurrencias:"
        run_remote "pm2 logs muva-chat --lines 200 --nostream 2>/dev/null | grep -i PGRST116 | head -n 3"
    fi

    echo ""
}

# Paso 1: Verificar conectividad
echo -e "${YELLOW}1️⃣  Verificando conectividad VPS...${NC}"
if ssh -o ConnectTimeout=10 "$VPS_HOST" "echo 'Conectado'" &>/dev/null; then
    echo -e "${GREEN}✅ Conectividad OK${NC}"
else
    echo -e "${RED}❌ No se pudo conectar al VPS${NC}"
    echo "Verifica:"
    echo "  - Contraseña configurada"
    echo "  - Red accesible"
    echo "  - SSH key configurada"
    exit 1
fi
echo ""

# Paso 2: Pre-deployment baseline
echo -e "${YELLOW}2️⃣  Capturando baseline PRE-deployment...${NC}"
capture_metrics "PRE-DEPLOYMENT"

# Guardar baseline en variable para comparar después
PRE_RESTARTS=$(run_remote "pm2 info muva-chat | grep -E 'restarts.*:' | awk '{print \$NF}'")
PRE_COMMIT=$(run_remote "cd $VPS_DIR && git rev-parse --short HEAD")

echo "Baseline capturado:"
echo "  - Commit: $PRE_COMMIT"
echo "  - Restarts: $PRE_RESTARTS"
echo ""

# Paso 3: Deployment
echo -e "${YELLOW}3️⃣  Ejecutando deployment...${NC}"
echo ""

# Backup .env.local
echo "Backup .env.local..."
run_remote "cd $VPS_DIR && cp .env.local .env.local.backup.\$(date +%Y%m%d_%H%M%S) 2>/dev/null || echo 'No .env.local to backup'"

# Pull cambios
echo "Git pull origin dev..."
run_remote "cd $VPS_DIR && git pull origin dev" || {
    echo -e "${RED}❌ Git pull failed${NC}"
    exit 1
}

# Verificar commit después de pull
POST_COMMIT=$(run_remote "cd $VPS_DIR && git rev-parse --short HEAD")
echo "Commit después de pull: $POST_COMMIT"

if [ "$PRE_COMMIT" == "$POST_COMMIT" ]; then
    echo -e "${YELLOW}⚠️  WARNING: No hay cambios nuevos (mismo commit)${NC}"
    echo "¿Continuar de todas formas? (y/n)"
    read -r response
    if [ "$response" != "y" ]; then
        echo "Deployment cancelado"
        exit 0
    fi
fi
echo ""

# Install dependencies
echo "Installing dependencies..."
run_remote "cd $VPS_DIR && npm install --legacy-peer-deps" || {
    echo -e "${RED}❌ npm install failed${NC}"
    exit 1
}
echo ""

# Build
echo "Building application..."
run_remote "cd $VPS_DIR && npm run build" || {
    echo -e "${RED}❌ npm run build failed${NC}"
    exit 1
}
echo ""

# Restart PM2 con nueva configuración
echo "Restarting PM2..."
run_remote "cd $VPS_DIR && pm2 delete all && pm2 start ecosystem.config.js && pm2 save" || {
    echo -e "${RED}❌ PM2 restart failed${NC}"
    exit 1
}

echo -e "${GREEN}✅ Deployment completado${NC}"
echo ""

# Paso 4: Post-deployment immediate check
echo -e "${YELLOW}4️⃣  Validación POST-deployment (inmediata)...${NC}"
sleep 10  # Esperar 10s para que la app levante

capture_metrics "POST-DEPLOYMENT (10s)"

# Verificar que levantó correctamente
STATUS=$(run_remote "pm2 info muva-chat | grep -E 'status.*:' | awk '{print \$NF}'")
if [ "$STATUS" != "online" ]; then
    echo -e "${RED}❌ CRITICAL: Aplicación NO está online (status: $STATUS)${NC}"
    echo "Logs de error:"
    run_remote "pm2 logs muva-chat --lines 50 --err"
    exit 1
fi

echo -e "${GREEN}✅ Aplicación online${NC}"
echo ""

# Paso 5: Monitoreo continuo (1-2h)
echo -e "${YELLOW}5️⃣  Iniciando monitoreo continuo (2h)...${NC}"
echo "Se ejecutarán $VALIDATION_COUNT checks cada 15 minutos"
echo ""

for i in $(seq 1 $VALIDATION_COUNT); do
    echo "================================================"
    echo -e "${BLUE}Check $i/$VALIDATION_COUNT - $(date '+%Y-%m-%d %H:%M:%S')${NC}"
    echo "================================================"

    capture_metrics "T+$((i*15))min"

    # Verificar errores críticos
    CURRENT_RESTARTS=$(run_remote "pm2 info muva-chat | grep -E 'restarts.*:' | awk '{print \$NF}'")
    RESTART_DIFF=$((CURRENT_RESTARTS - PRE_RESTARTS))

    if [ "$RESTART_DIFF" -gt 0 ]; then
        echo -e "${RED}❌ ALERTA: $RESTART_DIFF restarts desde deployment${NC}"
        echo "Logs de error:"
        run_remote "pm2 logs muva-chat --lines 50 --err"

        echo ""
        echo "¿Continuar monitoreo? (y/n)"
        read -r response
        if [ "$response" != "y" ]; then
            echo "Monitoreo cancelado"
            exit 1
        fi
    else
        echo -e "${GREEN}✅ Sin restarts adicionales${NC}"
    fi

    if [ $i -lt $VALIDATION_COUNT ]; then
        echo ""
        echo "Próximo check en 15 minutos..."
        echo "Presiona Ctrl+C para cancelar"
        sleep $VALIDATION_INTERVAL
    fi
done

# Paso 6: Resumen final
echo ""
echo "================================================"
echo -e "${GREEN}✅ VALIDACIÓN COMPLETADA (2h monitoreo)${NC}"
echo "================================================"
echo ""

echo "Resumen:"
echo "  - Commit deployed: $POST_COMMIT"
echo "  - Restarts: $PRE_RESTARTS → $CURRENT_RESTARTS (diff: $RESTART_DIFF)"
echo "  - Duración monitoreo: 2 horas"
echo ""

if [ "$RESTART_DIFF" -eq 0 ]; then
    echo -e "${GREEN}✅ ÉXITO: 0 restarts en 2 horas${NC}"
else
    echo -e "${YELLOW}⚠️  WARNING: $RESTART_DIFF restarts detectados${NC}"
fi

echo ""
echo "Próximos pasos:"
echo "1. Revisar documentación generada en:"
echo "   project-stabilization/docs/fase-1/STABILITY_TEST_RESULTS.md"
echo "2. Ejecutar test de estabilidad 24h:"
echo "   ssh $VPS_HOST 'cd $VPS_DIR && ./scripts/test-pm2-stability.sh'"
echo "3. Configurar cron para monitoring:"
echo "   0 * * * * cd $VPS_DIR && ./scripts/monitor-pm2.sh >> /var/log/pm2-monitor.log"
echo ""
