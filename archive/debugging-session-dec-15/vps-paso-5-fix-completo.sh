#!/bin/bash
# PASO 5: Fix completo - CVE + Seguridad

echo "╔═══════════════════════════════════════╗"
echo "║   FIX COMPLETO                       ║"
echo "╚═══════════════════════════════════════╝"
echo ""

# PARTE 1: Arreglar pnpm y parchear CVE
echo "═══ PARTE 1: PARCHEAR CVE-2025-55182 ═══"
echo ""

cd /var/www/muva-chat-tst

echo "1. Limpiando store de pnpm..."
rm -rf node_modules/.pnpm
rm -rf /tmp/.local/share/pnpm
echo "✓ Store limpiado"
echo ""

echo "2. Reinstalando con versiones parcheadas..."
pnpm install --force react@19.2.1 react-dom@19.2.1 next@15.5.7
echo ""

echo "3. Verificando versiones:"
grep -E '"next"|"react"' package.json
echo ""

echo "4. Reconstruyendo..."
pnpm run build
echo ""

echo "5. Reiniciando PM2..."
pm2 delete all 2>/dev/null || true
pm2 start npm --name "muva-chat" -- start
pm2 save
echo ""

echo "6. Estado PM2:"
pm2 status
echo ""

# PARTE 2: Hardening de seguridad
echo "═══ PARTE 2: HARDENING DE SEGURIDAD ═══"
echo ""

echo "7. Activando UFW Firewall..."
ufw --force enable
ufw status verbose
echo ""

echo "8. Deshabilitando SSH Password Authentication..."
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup.$(date +%Y%m%d)
sed -i 's/^PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
echo "PasswordAuthentication no" >> /etc/ssh/sshd_config
echo "✓ Password auth deshabilitado"
echo ""

echo "9. Reiniciando SSH (mantendrá tu conexión actual)..."
systemctl reload sshd
echo "✓ SSH reconfigurado"
echo ""

echo "10. Instalando AIDE..."
apt install -y aide aide-common
echo "✓ AIDE instalado (inicialización pendiente)"
echo ""

echo "╔═══════════════════════════════════════╗"
echo "║   FIX COMPLETADO                     ║"
echo "╚═══════════════════════════════════════╝"
echo ""

echo "VERIFICACIÓN FINAL:"
echo ""
echo "CVE-2025-55182:"
grep -E '"next"|"react"' /var/www/muva-chat-tst/package.json
echo ""
echo "SSH Password Auth:"
grep "^PasswordAuthentication" /etc/ssh/sshd_config
echo ""
echo "UFW Status:"
ufw status | head -5
echo ""
echo "PM2 Status:"
pm2 status
