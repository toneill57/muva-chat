#!/bin/bash
# Script para cambiar a Node 20 automáticamente

echo "🔧 Cambiando a Node 20 LTS..."
echo ""

# Cargar nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

# Instalar y usar Node 20
nvm install 20
nvm use 20
nvm alias default 20

echo ""
echo "✅ Node version cambiada:"
node --version

echo ""
echo "🧹 Limpiando node_modules..."
rm -rf node_modules

echo ""
echo "📦 Reinstalando dependencias con Node 20..."
pnpm install

echo ""
echo "✅ LISTO - Todo configurado con Node 20"
echo ""
echo "Para verificar que funcionó:"
echo "  node --version  # Debe mostrar v20.x.x"
