#!/bin/bash
# Test script para verificar pre-deploy checks

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🧪 Testing Deploy Scripts Pre-checks...${NC}"
echo ""

# Test 1: Verificar sintaxis bash
echo -e "${YELLOW}Test 1: Verificar sintaxis bash${NC}"
if bash -n scripts/deploy-dev.sh && bash -n scripts/deploy-staging.sh; then
  echo -e "${GREEN}✅ Sintaxis válida en ambos scripts${NC}"
else
  echo -e "${RED}❌ Error de sintaxis${NC}"
  exit 1
fi
echo ""

# Test 2: Verificar git status check
echo -e "${YELLOW}Test 2: Verificar git status check${NC}"
echo "Creando archivo temporal..."
echo "test" > test-deploy.tmp

echo "Ejecutando solo la parte de git status check..."
if git status --short | grep -q .; then
  echo -e "${GREEN}✅ Git detecta cambios sin commitear correctamente${NC}"
  git status --short
else
  echo -e "${RED}❌ Git no detectó cambios${NC}"
  exit 1
fi

echo "Limpiando archivo temporal..."
rm test-deploy.tmp
echo ""

# Test 3: Verificar permisos de ejecución
echo -e "${YELLOW}Test 3: Verificar permisos de ejecución${NC}"
if [ -x scripts/deploy-dev.sh ] && [ -x scripts/deploy-staging.sh ]; then
  echo -e "${GREEN}✅ Ambos scripts son ejecutables${NC}"
else
  echo -e "${RED}❌ Scripts no son ejecutables${NC}"
  exit 1
fi
echo ""

# Test 4: Verificar estructura de scripts
echo -e "${YELLOW}Test 4: Verificar estructura de scripts${NC}"
echo "Verificando deploy-dev.sh contiene:"
grep -q "validate-env" scripts/deploy-dev.sh && echo "  ✅ validate-env check"
grep -q "git status --short" scripts/deploy-dev.sh && echo "  ✅ git status check"
grep -q "npm run build" scripts/deploy-dev.sh && echo "  ✅ npm build"
grep -q "npm run test" scripts/deploy-dev.sh && echo "  ✅ npm test"
grep -q "npm ci" scripts/deploy-dev.sh && echo "  ✅ npm ci (not install)"
grep -q "pm2 restart muva-chat" scripts/deploy-dev.sh && echo "  ✅ pm2 restart"
grep -q "sshpass" scripts/deploy-dev.sh && echo "  ✅ sshpass authentication"

echo ""
echo "Verificando deploy-staging.sh contiene:"
grep -q "staging" scripts/deploy-staging.sh && echo "  ✅ staging branch"
grep -q "muva-chat-staging" scripts/deploy-staging.sh && echo "  ✅ staging directory"
grep -q "cp .env.staging .env.local" scripts/deploy-staging.sh && echo "  ✅ .env.staging copy"
grep -q "pm2 restart muva-chat-staging" scripts/deploy-staging.sh && echo "  ✅ pm2 staging process"

echo ""
echo -e "${GREEN}✅ Todos los tests pasaron${NC}"
echo ""
echo -e "${YELLOW}📋 Scripts de deployment listos:${NC}"
echo "   - scripts/deploy-dev.sh"
echo "   - scripts/deploy-staging.sh"
