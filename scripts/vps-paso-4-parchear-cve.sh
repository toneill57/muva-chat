#!/bin/bash
# PASO 4: Parchear CVE-2025-55182 en el VPS

echo "╔═══════════════════════════════════════╗"
echo "║   PARCHEANDO CVE-2025-55182          ║"
echo "╚═══════════════════════════════════════╝"
echo ""

cd /var/www/muva-chat-tst

echo "1. Versiones actuales:"
grep -E '"next"|"react"' package.json
echo ""

echo "2. Instalando versiones parcheadas..."
pnpm install react@19.2.1 react-dom@19.2.1 next@15.5.7
echo ""

echo "3. Verificando instalación:"
grep -E '"next"|"react"' package.json
echo ""

echo "4. Ejecutando build..."
pnpm run build
echo ""

echo "5. Reiniciando aplicación..."
pm2 restart all
echo ""

echo "6. Verificando estado PM2:"
pm2 status
echo ""

echo "╔═══════════════════════════════════════╗"
echo "║   CVE-2025-55182 PARCHEADO           ║"
echo "╚═══════════════════════════════════════╝"
echo ""
echo "Versiones finales:"
grep -E '"next"|"react"' package.json
