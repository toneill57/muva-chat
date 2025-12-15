#!/bin/bash
# Verificar estado actual de seguridad del VPS

echo "╔═══════════════════════════════════════╗"
echo "║   VERIFICACIÓN DE SEGURIDAD          ║"
echo "╚═══════════════════════════════════════╝"
echo ""

# 1. SSH Password Authentication
echo "1. SSH Password Authentication:"
grep -E "^PasswordAuthentication" /etc/ssh/sshd_config || echo "No configurado explícitamente (default: yes)"
echo ""

# 2. UFW Firewall
echo "2. UFW Firewall:"
ufw status verbose 2>/dev/null || echo "UFW no instalado o inactivo"
echo ""

# 3. Fail2ban
echo "3. Fail2ban:"
if systemctl is-active --quiet fail2ban; then
    echo "Estado: ACTIVO"
    fail2ban-client status sshd 2>/dev/null || echo "Jail SSH no configurado"
else
    echo "Estado: INACTIVO o no instalado"
fi
echo ""

# 4. Puertos abiertos
echo "4. Puertos abiertos externamente:"
netstat -tulpn | grep LISTEN | grep -v "127.0.0.1" | grep -v "::1"
echo ""

# 5. AIDE (Intrusion Detection)
echo "5. AIDE (Intrusion Detection):"
if command -v aide &> /dev/null; then
    echo "AIDE: INSTALADO"
    ls -lh /var/lib/aide/aide.db* 2>/dev/null || echo "Base de datos no inicializada"
else
    echo "AIDE: NO INSTALADO"
fi
echo ""

# 6. Unattended Upgrades
echo "6. Actualizaciones automáticas:"
if systemctl is-active --quiet unattended-upgrades; then
    echo "Estado: ACTIVO"
else
    echo "Estado: INACTIVO"
fi
echo ""

# 7. SSH Keys autorizadas
echo "7. SSH Keys autorizadas:"
wc -l /root/.ssh/authorized_keys 2>/dev/null || echo "Sin authorized_keys"
echo ""

# 8. Auditd
echo "8. Auditd (auditoría del sistema):"
if systemctl is-active --quiet auditd; then
    echo "Estado: ACTIVO"
    auditctl -l | wc -l
    echo "reglas configuradas"
else
    echo "Estado: INACTIVO"
fi
echo ""

echo "╔═══════════════════════════════════════╗"
echo "║   VERIFICACIÓN COMPLETADA            ║"
echo "╚═══════════════════════════════════════╝"
