#!/bin/bash
# MUVA Chat - VPS Security Forensics
# CVE-2025-55182 Investigation & Cleanup

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

REPORT="/tmp/muva-security-$(date +%Y%m%d-%H%M%S).txt"

echo -e "${YELLOW}╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║   MUVA CHAT - SECURITY FORENSICS                ║${NC}"
echo -e "${YELLOW}║   CVE-2025-55182 Investigation                   ║${NC}"
echo -e "${YELLOW}╚═══════════════════════════════════════════════════╝${NC}"
echo ""

# Generar reporte
echo "Generando reporte completo..."

{
    echo "=== MUVA CHAT SECURITY REPORT ==="
    echo "Timestamp: $(date)"
    echo "Hostname: $(hostname)"
    echo "Uptime: $(uptime)"
    echo ""

    echo "=== 1. PROCESOS SOSPECHOSOS (Top 20 CPU) ==="
    ps aux --sort=-%cpu | head -20
    echo ""

    echo "=== 2. BÚSQUEDA CRIPTOMINEROS ==="
    ps aux | grep -iE 'xmrig|minerd|cpuminer|cgminer|ethminer|kdevtmpfsi|kinsing|dbused|nicehash|stratum|c3pool' | grep -v grep || echo "No se encontraron procesos obvios"
    echo ""

    echo "=== 3. CONEXIONES ESTABLECIDAS ==="
    netstat -tnp 2>/dev/null | grep ESTABLISHED || echo "Sin conexiones establecidas"
    echo ""

    echo "=== 4. PUERTOS EN ESCUCHA ==="
    netstat -tulpn 2>/dev/null | head -30
    echo ""

    echo "=== 5. CONEXIONES A MINING POOLS (puertos típicos) ==="
    netstat -tnp 2>/dev/null | grep -E ':3333|:4444|:5555|:7777|:8888|:14444|:45700' || echo "No se detectaron conexiones a pools conocidos"
    echo ""

    echo "=== 6. ARCHIVOS EJECUTABLES EN /tmp ==="
    find /tmp -type f -executable 2>/dev/null || echo "Ninguno"
    echo ""

    echo "=== 7. ARCHIVOS EJECUTABLES EN /var/tmp ==="
    find /var/tmp -type f -executable 2>/dev/null || echo "Ninguno"
    echo ""

    echo "=== 8. ARCHIVOS EN /dev/shm ==="
    ls -la /dev/shm/ 2>/dev/null || echo "Directorio vacío"
    echo ""

    echo "=== 9. SERVICIOS SYSTEMD ACTIVOS ==="
    systemctl list-units --type=service --state=running
    echo ""

    echo "=== 10. SERVICIOS SYSTEMD PERSONALIZADOS ==="
    ls -la /etc/systemd/system/*.service 2>/dev/null || echo "Ninguno"
    echo ""

    echo "=== 11. CONTENIDO SERVICIOS SOSPECHOSOS ==="
    for service in log.service update-service miner.service c3pool.service; do
        if [ -f "/etc/systemd/system/$service" ]; then
            echo "--- /etc/systemd/system/$service ---"
            cat "/etc/systemd/system/$service"
            echo ""
        fi
    done
    echo ""

    echo "=== 12. CRONTABS ROOT ==="
    crontab -l 2>/dev/null || echo "Sin crontab"
    echo ""

    echo "=== 13. ARCHIVOS EN /etc/cron.d ==="
    ls -la /etc/cron.d/ 2>/dev/null
    echo ""

    echo "=== 14. HISTORIAL COMANDOS (últimos 100) ==="
    tail -100 /root/.bash_history 2>/dev/null
    echo ""

    echo "=== 15. SSH AUTHORIZED KEYS ==="
    cat /root/.ssh/authorized_keys 2>/dev/null || echo "Sin authorized_keys"
    echo ""

    echo "=== 16. ÚLTIMOS LOGINS ==="
    last -20
    echo ""

    echo "=== 17. INTENTOS SSH FALLIDOS (últimos 30) ==="
    grep 'Failed password' /var/log/auth.log 2>/dev/null | tail -30 || echo "Sin intentos fallidos recientes"
    echo ""

    echo "=== 18. LOGINS SSH EXITOSOS (últimos 20) ==="
    grep 'Accepted' /var/log/auth.log 2>/dev/null | tail -20 || echo "Sin registros"
    echo ""

    echo "=== 19. ARCHIVOS MODIFICADOS EN /etc (últimas 24h) ==="
    find /etc -type f -mtime -1 2>/dev/null | head -30
    echo ""

    echo "=== 20. NEXT.JS Y REACT VERSIONS ==="
    if [ -f /var/www/muva-chat/package.json ]; then
        echo "--- /var/www/muva-chat/package.json ---"
        grep -E '"next"|"react"' /var/www/muva-chat/package.json
    else
        echo "package.json no encontrado en /var/www/muva-chat"
    fi
    echo ""

    echo "=== 21. LOGS PM2 (últimas 50 líneas) ==="
    if command -v pm2 &> /dev/null; then
        pm2 logs --lines 50 --nostream 2>/dev/null || echo "No hay logs PM2"
    fi
    echo ""

    echo "=== 22. DISK USAGE (directorios grandes) ==="
    du -sh /tmp /var/tmp /dev/shm /root /var/www 2>/dev/null
    echo ""

    echo "=== FIN DEL REPORTE ==="

} > "$REPORT" 2>&1

echo -e "${GREEN}✓ Reporte generado: $REPORT${NC}"
echo ""

# Mostrar resumen
echo -e "${YELLOW}=== RESUMEN DE AMENAZAS ===${NC}"

THREATS_FOUND=false

# Verificar criptomineros
if grep -qiE 'xmrig|minerd|cpuminer|kinsing|c3pool' "$REPORT"; then
    echo -e "${RED}⚠ CRIPTOMINEROS DETECTADOS${NC}"
    THREATS_FOUND=true
fi

# Verificar servicios sospechosos
if grep -E 'log\.service|update-service|miner\.service' "$REPORT" | grep -q 'loaded'; then
    echo -e "${RED}⚠ SERVICIOS MALICIOSOS DETECTADOS${NC}"
    THREATS_FOUND=true
fi

# Verificar ejecutables en tmp
if find /tmp -type f -executable 2>/dev/null | grep -q .; then
    echo -e "${RED}⚠ EJECUTABLES EN /tmp${NC}"
    THREATS_FOUND=true
fi

# Verificar conexiones a pools
if netstat -tnp 2>/dev/null | grep -qE ':3333|:4444|:5555|:7777|:8888'; then
    echo -e "${RED}⚠ CONEXIONES A MINING POOLS${NC}"
    THREATS_FOUND=true
fi

if [ "$THREATS_FOUND" = false ]; then
    echo -e "${GREEN}✓ No se detectaron amenazas obvias${NC}"
fi

echo ""
echo -e "${YELLOW}¿Deseas ejecutar la LIMPIEZA AUTOMÁTICA? (s/n)${NC}"
read -r RESPONSE

if [[ "$RESPONSE" =~ ^[Ss]$ ]]; then
    echo ""
    echo -e "${YELLOW}=== EJECUTANDO LIMPIEZA ===${NC}"

    # 1. Detener procesos maliciosos
    echo "1. Deteniendo procesos sospechosos..."
    pkill -9 -f 'xmrig|minerd|cpuminer|kinsing|c3pool|dbused|kdevtmpfsi' 2>/dev/null || true
    echo -e "${GREEN}✓ Procesos detenidos${NC}"

    # 2. Eliminar servicios maliciosos
    echo "2. Eliminando servicios maliciosos..."
    for service in log.service update-service miner.service c3pool.service; do
        systemctl stop "$service" 2>/dev/null || true
        systemctl disable "$service" 2>/dev/null || true
        rm -f "/etc/systemd/system/$service"
    done
    systemctl daemon-reload
    echo -e "${GREEN}✓ Servicios eliminados${NC}"

    # 3. Limpiar /tmp
    echo "3. Limpiando /tmp..."
    find /tmp -type f -executable -delete 2>/dev/null || true
    echo -e "${GREEN}✓ /tmp limpiado${NC}"

    # 4. Limpiar /var/tmp
    echo "4. Limpiando /var/tmp..."
    find /var/tmp -type f -executable -delete 2>/dev/null || true
    echo -e "${GREEN}✓ /var/tmp limpiado${NC}"

    # 5. Limpiar /dev/shm
    echo "5. Limpiando /dev/shm..."
    rm -rf /dev/shm/* 2>/dev/null || true
    echo -e "${GREEN}✓ /dev/shm limpiado${NC}"

    # 6. Backup y limpiar historial
    echo "6. Limpiando historial bash..."
    cp /root/.bash_history "/root/.bash_history.backup.$(date +%Y%m%d-%H%M%S)"
    > /root/.bash_history
    echo -e "${GREEN}✓ Historial limpiado (backup creado)${NC}"

    echo ""
    echo -e "${GREEN}✓ LIMPIEZA COMPLETADA${NC}"
else
    echo "Limpieza cancelada - revisa el reporte manualmente"
fi

echo ""
echo -e "${YELLOW}=== SIGUIENTE PASO: PARCHEAR CVE-2025-55182 ===${NC}"
echo ""
echo "Ejecuta en el VPS:"
echo "  cd /var/www/muva-chat"
echo "  pnpm install react@19.2.1 react-dom@19.2.1 next@15.5.7"
echo "  pnpm run build"
echo "  pm2 restart all"
echo ""
echo "Reporte completo disponible en: $REPORT"
