#!/bin/bash
# MUVA Chat - VPS Forensics One-liner
# Ejecutar DIRECTAMENTE en el VPS

cat > /tmp/forensics.sh << 'ENDSCRIPT'
#!/bin/bash

REPORT="/tmp/muva-security-$(date +%Y%m%d-%H%M%S).txt"

echo "=== MUVA CHAT SECURITY REPORT ===" > "$REPORT"
echo "Timestamp: $(date)" >> "$REPORT"
echo "Hostname: $(hostname)" >> "$REPORT"
echo "" >> "$REPORT"

echo "=== 1. PROCESOS SOSPECHOSOS (Top 20) ===" >> "$REPORT"
ps aux --sort=-%cpu | head -20 >> "$REPORT"
echo "" >> "$REPORT"

echo "=== 2. BÚSQUEDA CRIPTOMINEROS ===" >> "$REPORT"
ps aux | grep -iE 'xmrig|minerd|cpuminer|cgminer|ethminer|kdevtmpfsi|kinsing|dbused|nicehash|stratum|c3pool' | grep -v grep >> "$REPORT"
echo "" >> "$REPORT"

echo "=== 3. CONEXIONES ESTABLECIDAS ===" >> "$REPORT"
netstat -tnp 2>/dev/null | grep ESTABLISHED >> "$REPORT"
echo "" >> "$REPORT"

echo "=== 4. PUERTOS EN ESCUCHA ===" >> "$REPORT"
netstat -tulpn 2>/dev/null >> "$REPORT"
echo "" >> "$REPORT"

echo "=== 5. ARCHIVOS EJECUTABLES EN /tmp ===" >> "$REPORT"
find /tmp -type f -executable 2>/dev/null >> "$REPORT"
echo "" >> "$REPORT"

echo "=== 6. ARCHIVOS EJECUTABLES EN /var/tmp ===" >> "$REPORT"
find /var/tmp -type f -executable 2>/dev/null >> "$REPORT"
echo "" >> "$REPORT"

echo "=== 7. ARCHIVOS EN /dev/shm ===" >> "$REPORT"
ls -la /dev/shm/ 2>/dev/null >> "$REPORT"
echo "" >> "$REPORT"

echo "=== 8. SERVICIOS SYSTEMD ACTIVOS ===" >> "$REPORT"
systemctl list-units --type=service --state=running >> "$REPORT"
echo "" >> "$REPORT"

echo "=== 9. SERVICIOS PERSONALIZADOS ===" >> "$REPORT"
find /etc/systemd/system -type f -name "*.service" 2>/dev/null >> "$REPORT"
echo "" >> "$REPORT"

echo "=== 10. CRONTABS ROOT ===" >> "$REPORT"
crontab -l 2>/dev/null >> "$REPORT"
echo "" >> "$REPORT"

echo "=== 11. ARCHIVOS EN /etc/cron.d ===" >> "$REPORT"
ls -la /etc/cron.d/ 2>/dev/null >> "$REPORT"
echo "" >> "$REPORT"

echo "=== 12. HISTORIAL COMANDOS (últimos 50) ===" >> "$REPORT"
tail -50 /root/.bash_history 2>/dev/null >> "$REPORT"
echo "" >> "$REPORT"

echo "=== 13. SSH AUTHORIZED KEYS ===" >> "$REPORT"
cat /root/.ssh/authorized_keys 2>/dev/null >> "$REPORT"
echo "" >> "$REPORT"

echo "=== 14. ÚLTIMOS LOGINS ===" >> "$REPORT"
last -20 >> "$REPORT"
echo "" >> "$REPORT"

echo "=== 15. INTENTOS SSH FALLIDOS ===" >> "$REPORT"
grep 'Failed password' /var/log/auth.log 2>/dev/null | tail -20 >> "$REPORT"
echo "" >> "$REPORT"

echo "=== 16. VERSIÓN NEXT.JS ===" >> "$REPORT"
if [ -f /var/www/muva-chat/package.json ]; then
    grep -A2 '"next"\|"react"' /var/www/muva-chat/package.json >> "$REPORT"
fi
echo "" >> "$REPORT"

echo "=== FIN DEL REPORTE ===" >> "$REPORT"

echo "✓ Reporte generado: $REPORT"
cat "$REPORT"

ENDSCRIPT

chmod +x /tmp/forensics.sh
/tmp/forensics.sh
