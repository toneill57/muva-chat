#!/bin/bash
# Deploy a ambiente DEV (VPS instance muva-chat)

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}🚀 Iniciando deploy a DEV...${NC}"

# 1. Pre-deploy checks
echo -e "${YELLOW}📋 Pre-deploy checks...${NC}"
echo "   - Validando ambiente..."
pnpm run validate-env

echo "   - Verificando git status..."
if git status --short | grep -q .; then
  echo -e "${RED}⚠️  ERROR: Hay cambios sin commitear${NC}"
  echo ""
  echo "Archivos modificados:"
  git status --short
  echo ""
  echo "Por favor commitea o descarta los cambios antes de deployear."
  exit 1
fi
echo -e "${GREEN}   ✅ No hay cambios sin commitear${NC}"

# 2. Tests locales
echo -e "${YELLOW}🧪 Ejecutando tests locales...${NC}"
echo "   - Building localmente..."
pnpm run build

echo "   - Running tests..."
pnpm run test

echo -e "${GREEN}   ✅ Tests locales pasaron${NC}"

# 3. Deploy a VPS
echo -e "${YELLOW}📦 Deploying a VPS (195.200.6.216)...${NC}"
sshpass -p 'rabbitHole0+' ssh -o StrictHostKeyChecking=no root@195.200.6.216 << 'ENDSSH'
  set -e

  cd /var/www/muva-chat

  echo "   - Creando backup de .env.local..."
  cp .env.local .env.local.backup.$(date +%Y%m%d_%H%M%S)

  echo "   - Fetching cambios de git..."
  git fetch origin

  echo "   - Checkout a branch dev..."
  git checkout dev

  echo "   - Pulling latest changes..."
  git pull origin dev

  echo "   - Installing dependencies (pnpm install --frozen-lockfile)..."
  pnpm install --frozen-lockfile

  echo "   - Building application..."
  pnpm run build

  echo "   - Restarting PM2 process..."
  pm2 restart muva-chat

  echo "   - Saving PM2 configuration..."
  pm2 save

  echo "   - Health check (waiting 5s)..."
  sleep 5
  pm2 info muva-chat | grep "status"
ENDSSH

echo ""
echo -e "${GREEN}✅ Deploy a DEV completado exitosamente${NC}"
echo ""
echo -e "${YELLOW}🔍 Para verificar logs ejecuta:${NC}"
echo "   sshpass -p 'rabbitHole0+' ssh root@195.200.6.216 'pm2 logs muva-chat --lines 50'"
echo ""
echo -e "${YELLOW}🌐 URL: https://muva-chat.com${NC}"
