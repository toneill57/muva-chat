#!/bin/bash
# COPIA ESTE ARCHIVO COMPLETO AL VPS
# En el VPS: nano forensics.sh
# Pega todo este contenido, guarda (Ctrl+O, Enter, Ctrl+X)
# Ejecuta: chmod +x forensics.sh && ./forensics.sh

REPORT="/tmp/muva-sec-$(date +%Y%m%d-%H%M%S).txt"

echo "╔═══════════════════════════════════════╗"
echo "║   MUVA CHAT - SECURITY FORENSICS     ║"
echo "╚═══════════════════════════════════════╝"
echo ""
echo "Generando reporte..."

{
echo "=== MUVA SECURITY REPORT ==="
echo "Fecha: $(date)"
echo ""

echo "=== PROCESOS (Top 20) ==="
ps aux --sort=-%cpu | head -20
echo ""

echo "=== CRIPTOMINEROS ==="
ps aux | grep -iE 'xmrig|minerd|cpuminer|kinsing|c3pool' | grep -v grep || echo "No detectados"
echo ""

echo "=== CONEXIONES ==="
netstat -tnp 2>/dev/null | grep ESTABLISHED || echo "Ninguna"
echo ""

echo "=== PUERTOS ==="
netstat -tulpn 2>/dev/null | head -20
echo ""

echo "=== /tmp EJECUTABLES ==="
find /tmp -type f -executable 2>/dev/null || echo "Ninguno"
echo ""

echo "=== /var/tmp EJECUTABLES ==="
find /var/tmp -type f -executable 2>/dev/null || echo "Ninguno"
echo ""

echo "=== /dev/shm ==="
ls -la /dev/shm/ 2>/dev/null || echo "Vacío"
echo ""

echo "=== SERVICIOS ==="
systemctl list-units --type=service --state=running | grep -vE 'systemd|network|ssh'
echo ""

echo "=== SERVICIOS CUSTOM ==="
ls -la /etc/systemd/system/*.service 2>/dev/null || echo "Ninguno"
echo ""

echo "=== CRONTABS ==="
crontab -l 2>/dev/null || echo "Sin crontab"
ls -la /etc/cron.d/ 2>/dev/null
echo ""

echo "=== HISTORIAL ==="
tail -50 /root/.bash_history 2>/dev/null
echo ""

echo "=== SSH KEYS ==="
cat /root/.ssh/authorized_keys 2>/dev/null || echo "Ninguno"
echo ""

echo "=== VERSIONS ==="
if [ -f /var/www/muva-chat/package.json ]; then
    grep -E '"next"|"react"' /var/www/muva-chat/package.json
fi
echo ""

echo "=== FIN ==="
} > "$REPORT" 2>&1

cat "$REPORT"

echo ""
echo "¿EJECUTAR LIMPIEZA? (s/n)"
read -r RESP

if [[ "$RESP" =~ ^[Ss]$ ]]; then
    echo "=== LIMPIANDO ==="

    pkill -9 -f 'xmrig|minerd|cpuminer|kinsing|c3pool' 2>/dev/null || true

    systemctl stop log.service update-service miner.service 2>/dev/null || true
    systemctl disable log.service update-service miner.service 2>/dev/null || true
    rm -f /etc/systemd/system/log.service /etc/systemd/system/update-service /etc/systemd/system/miner.service
    systemctl daemon-reload

    find /tmp -type f -executable -delete 2>/dev/null || true
    find /var/tmp -type f -executable -delete 2>/dev/null || true
    rm -rf /dev/shm/* 2>/dev/null || true

    cp /root/.bash_history /root/.bash_history.bak
    > /root/.bash_history

    echo "✓ LIMPIEZA COMPLETA"
fi

echo ""
echo "Reporte: $REPORT"
