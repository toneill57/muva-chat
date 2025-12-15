#!/bin/bash
# PASO 1: Investigar servicios y archivos sospechosos

echo "=== ALIVE.SERVICE ==="
cat /etc/systemd/system/alive.service
echo ""
echo "=== LIVED.SERVICE ==="
cat /etc/systemd/system/lived.service
echo ""

echo "=== SYSHELPER ==="
cat /etc/cron.d/syshelper
echo ""
echo "=== SYSTEMHELPER ==="
cat /etc/cron.d/systemhelper
echo ""
echo "=== SECURITY-ALERTS ==="
cat /etc/cron.d/security-alerts
echo ""

echo "=== MONARX BINARY ==="
ls -la /usr/bin/monarx-agent
file /usr/bin/monarx-agent
echo ""

echo "=== BUSCANDO NEXT.JS ==="
find /var/www /root /opt /home -name "package.json" -type f 2>/dev/null | head -10
