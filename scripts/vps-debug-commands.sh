#!/bin/bash
# Comandos para ejecutar EN EL VPS (ya estás conectado como root)

echo "================================================"
echo "🔍 VPS SSH Configuration Debugging"
echo "================================================"
echo ""
echo "Ejecuta estos comandos UNO POR UNO en el VPS:"
echo ""

echo "# 1. Ver claves públicas autorizadas"
echo "cat ~/.ssh/authorized_keys"
echo ""

echo "# 2. Ver estructura del directorio SSH"
echo "ls -la ~/.ssh/"
echo ""

echo "# 3. Verificar permisos (deben ser 700 y 600)"
echo "ls -la ~/.ssh/"
echo "# Debe mostrar:"
echo "# drwx------ (700) para el directorio .ssh"
echo "# -rw------- (600) para authorized_keys"
echo ""

echo "# 4. Verificar path de la aplicación"
echo "ls -la /var/www/ | grep -E '(muva|innpilot)'"
echo ""

echo "# 5. Si existe muva-chat, verificar que es un repo git"
echo "ls -la /var/www/muva-chat/.git"
echo ""

echo "# 6. Ver qué usuario ejecuta la app"
echo "pm2 status"
echo ""

echo "# 7. Ver la rama actual del repo"
echo "cd /var/www/muva-chat && git branch && git remote -v"
echo ""

echo "================================================"
echo "PARA SALIR del VPS y volver a tu máquina local:"
echo "exit"
echo "================================================"
