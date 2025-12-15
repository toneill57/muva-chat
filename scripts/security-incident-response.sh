#!/bin/bash
# MUVA Chat - Security Incident Response Script
# CVE-2025-55182 (React2Shell) Exploitation Response
# Generated: 2025-12-11

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

VPS_HOST="195.200.6.216"
VPS_USER="root"
VPS_PASS="Ololiuqui21+"

echo -e "${RED}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║   MUVA CHAT - SECURITY INCIDENT RESPONSE                 ║${NC}"
echo -e "${RED}║   CVE-2025-55182 (React2Shell) Remediation               ║${NC}"
echo -e "${RED}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# FASE 1: VERIFICACIÓN DE ACCESO
echo -e "${YELLOW}[FASE 1] Verificando acceso al VPS...${NC}"
if ! command -v sshpass &> /dev/null; then
    echo -e "${RED}ERROR: sshpass no instalado${NC}"
    echo "Instalar con: brew install sshpass (macOS) o apt install sshpass (Linux)"
    exit 1
fi

if ! sshpass -p "$VPS_PASS" ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no $VPS_USER@$VPS_HOST "echo 'CONNECTED'" &>/dev/null; then
    echo -e "${RED}ERROR: No se puede conectar al VPS${NC}"
    echo "El VPS podría estar detenido por el proveedor."
    echo ""
    echo "ACCIÓN REQUERIDA:"
    echo "1. Accede al panel de tu proveedor (Contabo, Hetzner, etc.)"
    echo "2. Inicia el VPS manualmente"
    echo "3. Ejecuta este script nuevamente"
    exit 1
fi

echo -e "${GREEN}✓ Conexión VPS establecida${NC}"
echo ""

# FASE 2: INVESTIGACIÓN FORENSE
echo -e "${YELLOW}[FASE 2] Ejecutando análisis forense...${NC}"

REPORT_FILE="/tmp/muva-security-report-$(date +%Y%m%d-%H%M%S).txt"
echo "Generando reporte en: $REPORT_FILE"

sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_HOST << 'ENDSSH' > "$REPORT_FILE" 2>&1

echo "=== MUVA CHAT SECURITY INCIDENT REPORT ==="
echo "Timestamp: $(date)"
echo "Hostname: $(hostname)"
echo ""

echo "=== 1. PROCESOS SOSPECHOSOS (Top 20 CPU) ==="
ps aux --sort=-%cpu | head -20
echo ""

echo "=== 2. CONEXIONES DE RED ACTIVAS ==="
netstat -tulpn 2>/dev/null | head -50
echo ""

echo "=== 3. CONEXIONES ESTABLECIDAS ==="
netstat -tnp 2>/dev/null | grep ESTABLISHED
echo ""

echo "=== 4. BÚSQUEDA DE CRIPTOMINEROS CONOCIDOS ==="
ps aux | grep -iE 'xmrig|minerd|cpuminer|cgminer|ethminer|kdevtmpfsi|kinsing|dbused|nicehash|stratum|c3pool' | grep -v grep
echo ""

echo "=== 5. ARCHIVOS EJECUTABLES EN /tmp ==="
find /tmp -type f -executable 2>/dev/null
echo ""

echo "=== 6. ARCHIVOS EJECUTABLES EN /var/tmp ==="
find /var/tmp -type f -executable 2>/dev/null
echo ""

echo "=== 7. ARCHIVOS EN /dev/shm ==="
ls -la /dev/shm/ 2>/dev/null
echo ""

echo "=== 8. SERVICIOS SYSTEMD SOSPECHOSOS ==="
systemctl list-units --type=service --state=running | grep -vE 'systemd|network|ssh|nginx|postgresql'
echo ""

echo "=== 9. ARCHIVOS SYSTEMD PERSONALIZADOS ==="
find /etc/systemd/system -type f -name "*.service" -exec sh -c 'echo "=== {} ===" && cat "{}"' \; 2>/dev/null
echo ""

echo "=== 10. CRONTABS ==="
echo "--- Root crontab ---"
crontab -l 2>/dev/null || echo "No crontab"
echo ""
echo "--- /etc/cron.d ---"
ls -la /etc/cron.d/ 2>/dev/null
echo ""

echo "=== 11. ARCHIVOS MODIFICADOS EN /etc (últimas 24h) ==="
find /etc -type f -mtime -1 2>/dev/null | head -30
echo ""

echo "=== 12. HISTORIAL DE COMANDOS ROOT ==="
tail -50 /root/.bash_history 2>/dev/null
echo ""

echo "=== 13. SSH AUTHORIZED KEYS ==="
cat /root/.ssh/authorized_keys 2>/dev/null || echo "No authorized_keys"
echo ""

echo "=== 14. ÚLTIMOS LOGINS ==="
last -20
echo ""

echo "=== 15. INTENTOS FALLIDOS SSH ==="
grep 'Failed password' /var/log/auth.log 2>/dev/null | tail -20
echo ""

echo "=== 16. VERIFICAR NEXT.JS VULNERABLE ==="
echo "Buscando instalaciones de Next.js..."
find /var/www /root -name "package.json" -type f 2>/dev/null | while read pkg; do
    if grep -q '"next"' "$pkg"; then
        echo "--- $pkg ---"
        grep -A2 '"next"' "$pkg"
    fi
done
echo ""

echo "=== 17. LOGS DE APLICACIÓN (últimas 100 líneas) ==="
if [ -f /var/www/muva-chat/logs/app.log ]; then
    tail -100 /var/www/muva-chat/logs/app.log
fi
echo ""

echo "=== FIN DEL REPORTE ==="

ENDSSH

echo -e "${GREEN}✓ Reporte generado: $REPORT_FILE${NC}"
echo ""

# FASE 3: DETECCIÓN DE MALWARE
echo -e "${YELLOW}[FASE 3] Detectando malware activo...${NC}"

MALWARE_FOUND=false

if grep -qE 'xmrig|minerd|cpuminer|kinsing|c3pool' "$REPORT_FILE"; then
    echo -e "${RED}⚠ CRIPTOMINEROS DETECTADOS${NC}"
    MALWARE_FOUND=true
fi

if grep -q 'Cobalt Strike\|Sliver\|Nezha\|Secret-Hunter' "$REPORT_FILE"; then
    echo -e "${RED}⚠ BACKDOORS DETECTADOS${NC}"
    MALWARE_FOUND=true
fi

# Verificar servicios sospechosos
if grep -E 'log\.service|update-service|miner\.service' "$REPORT_FILE" | grep -q 'active'; then
    echo -e "${RED}⚠ SERVICIOS MALICIOSOS ACTIVOS${NC}"
    MALWARE_FOUND=true
fi

if [ "$MALWARE_FOUND" = true ]; then
    echo -e "${RED}MALWARE CONFIRMADO - Se requiere limpieza${NC}"
else
    echo -e "${GREEN}No se detectó malware obvio (revisar reporte completo)${NC}"
fi
echo ""

# FASE 4: PLAN DE REMEDIACIÓN
echo -e "${YELLOW}[FASE 4] Plan de Remediación${NC}"
echo ""
echo "ACCIONES REQUERIDAS:"
echo ""
echo "1. LIMPIEZA INMEDIATA (ejecutar manualmente en VPS):"
echo "   - Detener servicios maliciosos"
echo "   - Eliminar ejecutables en /tmp, /var/tmp, /dev/shm"
echo "   - Limpiar crontabs comprometidos"
echo "   - Revisar/limpiar authorized_keys"
echo ""
echo "2. PARCHEAR CVE-2025-55182:"
echo "   cd /var/www/muva-chat"
echo "   pnpm install react@19.2.1 react-dom@19.2.1 next@15.5.7"
echo "   pnpm run build"
echo "   pm2 restart all"
echo ""
echo "3. HARDENING DEL SERVIDOR:"
echo "   - Cambiar contraseña root"
echo "   - Configurar fail2ban"
echo "   - Actualizar reglas UFW"
echo "   - Deshabilitar autenticación por contraseña SSH"
echo ""
echo "4. MONITOREO CONTINUO:"
echo "   - Instalar AIDE (Advanced Intrusion Detection Environment)"
echo "   - Configurar alertas de seguridad"
echo "   - Revisar logs diariamente"
echo ""

echo -e "${YELLOW}¿Deseas ejecutar la limpieza automática? (s/n)${NC}"
read -r RESPONSE

if [[ "$RESPONSE" =~ ^[Ss]$ ]]; then
    echo -e "${YELLOW}Ejecutando limpieza automática...${NC}"

    sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_HOST << 'ENDCLEAN'

    echo "=== LIMPIEZA DE MALWARE ==="

    # Detener procesos sospechosos
    echo "1. Deteniendo procesos maliciosos..."
    pkill -9 -f 'xmrig|minerd|cpuminer|kinsing|c3pool' 2>/dev/null || true

    # Eliminar servicios maliciosos
    echo "2. Eliminando servicios maliciosos..."
    systemctl stop log.service 2>/dev/null || true
    systemctl disable log.service 2>/dev/null || true
    rm -f /etc/systemd/system/log.service
    systemctl daemon-reload

    # Limpiar directorios temporales
    echo "3. Limpiando /tmp..."
    find /tmp -type f -executable -delete 2>/dev/null || true

    echo "4. Limpiando /var/tmp..."
    find /var/tmp -type f -executable -delete 2>/dev/null || true

    echo "5. Limpiando /dev/shm..."
    rm -rf /dev/shm/* 2>/dev/null || true

    # Backup y limpiar historial
    echo "6. Limpiando historial bash..."
    cp /root/.bash_history /root/.bash_history.backup.$(date +%Y%m%d)
    > /root/.bash_history

    echo "=== LIMPIEZA COMPLETADA ==="

ENDCLEAN

    echo -e "${GREEN}✓ Limpieza ejecutada${NC}"
else
    echo "Limpieza manual requerida - revisa el reporte: $REPORT_FILE"
fi

echo ""
echo -e "${GREEN}Incident Response completado.${NC}"
echo "Siguiente paso: Parchear CVE-2025-55182 en el codebase local"
