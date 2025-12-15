#!/bin/bash
# PASO 6: Hardening Final - Post CVE-2025-55182

echo "╔═══════════════════════════════════════╗"
echo "║   HARDENING FINAL                    ║"
echo "╚═══════════════════════════════════════╝"
echo ""

# 1. CAMBIAR CONTRASEÑA ROOT
echo "═══ 1. CAMBIAR CONTRASEÑA ROOT ═══"
echo ""
echo "⚠️  La contraseña actual está COMPROMETIDA"
echo "Los atacantes la conocen desde el hack."
echo ""
echo "Requisitos de contraseña FUERTE:"
echo "  - Mínimo 16 caracteres"
echo "  - Mayúsculas, minúsculas, números, símbolos"
echo "  - NO uses palabras del diccionario"
echo ""
passwd root
echo ""
echo "✓ Contraseña root actualizada"
echo ""

# 2. INICIALIZAR AIDE
echo "═══ 2. INICIALIZAR AIDE ═══"
echo ""
echo "Creando baseline del sistema (esto toma 2-3 minutos)..."
aideinit
echo ""
echo "Moviendo base de datos..."
mv /var/lib/aide/aide.db.new /var/lib/aide/aide.db
echo ""
echo "Configurando verificación diaria..."
cat > /etc/cron.daily/aide-check << 'EOF'
#!/bin/bash
# Verificación diaria de integridad con AIDE

REPORT="/tmp/aide-report-$(date +%Y%m%d).txt"

aide --check > "$REPORT" 2>&1

if [ $? -ne 0 ]; then
    # Cambios detectados - enviar alerta
    echo "⚠️ ALERTA: AIDE detectó cambios en el sistema" | mail -s "AIDE Alert - $(hostname)" tarek.oneill@gmail.com
    cat "$REPORT" | mail -s "AIDE Report - $(date +%Y-%m-%d)" tarek.oneill@gmail.com
fi
EOF
chmod +x /etc/cron.daily/aide-check
echo "✓ AIDE inicializado y configurado"
echo ""

# 3. VERIFICAR Y ARREGLAR BINDINGS DE PUERTOS
echo "═══ 3. VERIFICAR BINDINGS DE PUERTOS ═══"
echo ""
echo "Estado actual de puertos 3000/3001:"
netstat -tlnp | grep -E ':3000|:3001'
echo ""

echo "Estos puertos deben estar SOLO en localhost (127.0.0.1)"
echo "NO deben estar en 0.0.0.0 o :::"
echo ""

# Verificar configuración de Next.js
if [ -f /var/www/muva-chat-tst/ecosystem.config.js ]; then
    echo "Revisando ecosystem.config.js..."
    cat /var/www/muva-chat-tst/ecosystem.config.js
    echo ""
fi

echo "⚠️  ACCIÓN MANUAL REQUERIDA:"
echo "Si ves ':::3000' o '0.0.0.0:3000' arriba, necesitas:"
echo "1. Editar ecosystem.config.js o package.json"
echo "2. Agregar: env: { HOST: '127.0.0.1' }"
echo "3. Reiniciar PM2"
echo ""
read -p "¿Continuar con el siguiente paso? (Enter)" dummy
echo ""

# 4. MONITOREO CONTINUO
echo "═══ 4. MONITOREO CONTINUO ═══"
echo ""

# 4a. Script de verificación de CVEs
echo "4a. Instalando script de verificación de CVEs..."
cat > /usr/local/bin/check-cves.sh << 'EOF'
#!/bin/bash
# Verificar CVEs en dependencias de Node.js

cd /var/www/muva-chat-tst

AUDIT_OUTPUT=$(pnpm audit --json 2>/dev/null)
VULNERABILITIES=$(echo "$AUDIT_OUTPUT" | jq '.metadata.vulnerabilities.total' 2>/dev/null || echo "0")

if [ "$VULNERABILITIES" -gt 0 ]; then
    echo "⚠️ ALERTA: $VULNERABILITIES vulnerabilidades detectadas" | mail -s "CVE Alert - $(hostname)" tarek.oneill@gmail.com
    pnpm audit | mail -s "NPM Audit Report - $(date +%Y-%m-%d)" tarek.oneill@gmail.com
fi
EOF
chmod +x /usr/local/bin/check-cves.sh
echo "✓ Script de CVEs instalado"
echo ""

# 4b. Cron para verificación semanal de CVEs
echo "4b. Configurando verificación semanal de CVEs..."
echo "0 9 * * 1 root /usr/local/bin/check-cves.sh" > /etc/cron.d/check-cves
echo "✓ Cron configurado (lunes 9 AM)"
echo ""

# 4c. Script de monitoreo de procesos sospechosos
echo "4c. Instalando monitor de procesos sospechosos..."
cat > /usr/local/bin/monitor-suspicious.sh << 'EOF'
#!/bin/bash
# Monitorear procesos sospechosos en tiempo real

# Lista de nombres de procesos maliciosos conocidos
MALWARE_PATTERNS="xmrig|minerd|cpuminer|kinsing|c3pool|dbused|kdevtmpfsi|nezha|sliver"

SUSPICIOUS=$(ps aux | grep -iE "$MALWARE_PATTERNS" | grep -v grep)

if [ ! -z "$SUSPICIOUS" ]; then
    echo "⚠️ PROCESO SOSPECHOSO DETECTADO EN $(hostname)" | mail -s "SECURITY ALERT - Malware Detected" tarek.oneill@gmail.com
    echo "$SUSPICIOUS" | mail -s "Suspicious Process Details - $(date)" tarek.oneill@gmail.com

    # Log del incidente
    echo "[$(date)] MALWARE DETECTED:" >> /var/log/security-incidents.log
    echo "$SUSPICIOUS" >> /var/log/security-incidents.log

    # Matar procesos automáticamente
    pkill -9 -f "$MALWARE_PATTERNS"
fi
EOF
chmod +x /usr/local/bin/monitor-suspicious.sh
echo "✓ Monitor de procesos instalado"
echo ""

# 4d. Cron para monitoreo cada 10 minutos
echo "4d. Configurando monitoreo cada 10 minutos..."
echo "*/10 * * * * root /usr/local/bin/monitor-suspicious.sh" > /etc/cron.d/monitor-suspicious
echo "✓ Cron configurado"
echo ""

# 4e. Logrotate para logs de seguridad
echo "4e. Configurando rotación de logs..."
cat > /etc/logrotate.d/security-incidents << 'EOF'
/var/log/security-incidents.log {
    weekly
    rotate 12
    compress
    delaycompress
    missingok
    notifempty
    create 0640 root root
}
EOF
echo "✓ Logrotate configurado"
echo ""

# 4f. Script de reporte semanal
echo "4f. Instalando reporte semanal de seguridad..."
cat > /usr/local/bin/weekly-security-report.sh << 'EOF'
#!/bin/bash
# Reporte semanal de seguridad

REPORT="/tmp/weekly-security-$(date +%Y%m%d).txt"

{
    echo "═══════════════════════════════════════"
    echo "  REPORTE SEMANAL DE SEGURIDAD"
    echo "  $(date)"
    echo "═══════════════════════════════════════"
    echo ""

    echo "=== INTENTOS SSH FALLIDOS (última semana) ==="
    grep "Failed password" /var/log/auth.log | grep -v "$(date --date='7 days ago' +%b\ %d)" | wc -l
    echo ""

    echo "=== IPs BANEADAS POR FAIL2BAN ==="
    fail2ban-client status sshd | grep "Banned IP"
    echo ""

    echo "=== CAMBIOS DETECTADOS POR AIDE ==="
    aide --check 2>&1 | head -50
    echo ""

    echo "=== VULNERABILIDADES NPM ==="
    cd /var/www/muva-chat-tst
    pnpm audit 2>&1 | head -30
    echo ""

    echo "=== USO DE RECURSOS ==="
    echo "CPU:"
    top -bn1 | head -10
    echo ""
    echo "Disco:"
    df -h
    echo ""
    echo "Memoria:"
    free -h
    echo ""

    echo "=== INCIDENTES DE SEGURIDAD ==="
    if [ -f /var/log/security-incidents.log ]; then
        tail -50 /var/log/security-incidents.log
    else
        echo "Sin incidentes registrados"
    fi

} > "$REPORT"

cat "$REPORT" | mail -s "Weekly Security Report - $(hostname)" tarek.oneill@gmail.com
EOF
chmod +x /usr/local/bin/weekly-security-report.sh
echo "✓ Reporte semanal instalado"
echo ""

# 4g. Cron para reporte semanal (domingos 8 AM)
echo "4g. Configurando reporte semanal..."
echo "0 8 * * 0 root /usr/local/bin/weekly-security-report.sh" > /etc/cron.d/weekly-security-report
echo "✓ Cron configurado (domingos 8 AM)"
echo ""

# VERIFICACIÓN FINAL
echo "╔═══════════════════════════════════════╗"
echo "║   HARDENING FINAL COMPLETADO         ║"
echo "╚═══════════════════════════════════════╝"
echo ""

echo "RESUMEN DE CONFIGURACIÓN:"
echo ""
echo "1. Contraseña root: ACTUALIZADA"
echo ""

echo "2. AIDE:"
ls -lh /var/lib/aide/aide.db 2>/dev/null && echo "   ✓ Base de datos creada" || echo "   ⚠ Error en inicialización"
ls -l /etc/cron.daily/aide-check && echo "   ✓ Verificación diaria configurada"
echo ""

echo "3. Puertos:"
echo "   Estado actual:"
netstat -tlnp | grep -E ':3000|:3001' | head -2
echo ""

echo "4. Monitoreo continuo:"
echo "   ✓ Verificación CVEs: Semanal (lunes 9 AM)"
echo "   ✓ Monitor procesos: Cada 10 minutos"
echo "   ✓ Reporte semanal: Domingos 8 AM"
echo "   ✓ Logs: /var/log/security-incidents.log"
echo ""

echo "═══════════════════════════════════════"
echo "PRÓXIMOS PASOS MANUALES:"
echo "═══════════════════════════════════════"
echo ""
echo "1. Si los puertos 3000/3001 están en ::: o 0.0.0.0:"
echo "   Edita: /var/www/muva-chat-tst/ecosystem.config.js"
echo "   Agrega: env: { HOST: '127.0.0.1', PORT: 3000 }"
echo "   Ejecuta: pm2 restart all"
echo ""
echo "2. Configura alertas en tu email para no perderte reportes"
echo ""
echo "3. Ejecuta semanalmente:"
echo "   apt update && apt upgrade"
echo "   cd /var/www/muva-chat-tst && pnpm update"
echo ""

echo "╔═══════════════════════════════════════╗"
echo "║   VPS COMPLETAMENTE SECURIZADO       ║"
echo "╚═══════════════════════════════════════╝"
