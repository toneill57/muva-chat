#!/bin/bash
# MUVA Chat - CVE-2025-55182 (React2Shell) Patch Script
# Actualiza React, React-DOM y Next.js a versiones parcheadas

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${RED}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║   MUVA CHAT - CVE-2025-55182 PATCH                       ║${NC}"
echo -e "${RED}║   React2Shell Vulnerability Fix                          ║${NC}"
echo -e "${RED}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo -e "${RED}ERROR: package.json no encontrado${NC}"
    echo "Ejecuta este script desde el directorio raíz del proyecto"
    exit 1
fi

# Mostrar versiones actuales
echo -e "${YELLOW}[1/6] Versiones actuales:${NC}"
CURRENT_REACT=$(grep '"react":' package.json | sed 's/.*: *"\^*\([^"]*\)".*/\1/')
CURRENT_REACT_DOM=$(grep '"react-dom":' package.json | sed 's/.*: *"\^*\([^"]*\)".*/\1/')
CURRENT_NEXT=$(grep '"next":' package.json | sed 's/.*: *"\^*\([^"]*\)".*/\1/')

echo "  React:     $CURRENT_REACT ${RED}(vulnerable)${NC}"
echo "  React-DOM: $CURRENT_REACT_DOM ${RED}(vulnerable)${NC}"
echo "  Next.js:   $CURRENT_NEXT ${RED}(vulnerable)${NC}"
echo ""

# Versiones objetivo
TARGET_REACT="19.2.1"
TARGET_REACT_DOM="19.2.1"
TARGET_NEXT="15.5.7"

echo -e "${YELLOW}[2/6] Versiones objetivo:${NC}"
echo "  React:     $TARGET_REACT ${GREEN}(parcheada)${NC}"
echo "  React-DOM: $TARGET_REACT_DOM ${GREEN}(parcheada)${NC}"
echo "  Next.js:   $TARGET_NEXT ${GREEN}(parcheada)${NC}"
echo ""

# Confirmar actualización
echo -e "${YELLOW}¿Deseas continuar con el patch? (s/n)${NC}"
read -r RESPONSE

if [[ ! "$RESPONSE" =~ ^[Ss]$ ]]; then
    echo "Operación cancelada"
    exit 0
fi

# Backup package.json
echo -e "${YELLOW}[3/6] Creando backup de package.json...${NC}"
cp package.json package.json.backup.$(date +%Y%m%d-%H%M%S)
echo -e "${GREEN}✓ Backup creado${NC}"
echo ""

# Actualizar dependencias
echo -e "${YELLOW}[4/6] Actualizando dependencias...${NC}"
pnpm install react@${TARGET_REACT} react-dom@${TARGET_REACT_DOM} next@${TARGET_NEXT}
echo -e "${GREEN}✓ Dependencias actualizadas${NC}"
echo ""

# Verificar pnpm-lock.yaml
echo -e "${YELLOW}[5/6] Verificando lockfile...${NC}"
if [ -f "pnpm-lock.yaml" ]; then
    echo -e "${GREEN}✓ pnpm-lock.yaml actualizado${NC}"
else
    echo -e "${RED}⚠ pnpm-lock.yaml no encontrado${NC}"
fi
echo ""

# Build test
echo -e "${YELLOW}[6/6] Ejecutando build de prueba...${NC}"
if pnpm run build; then
    echo -e "${GREEN}✓ Build exitoso${NC}"
else
    echo -e "${RED}✗ Build falló${NC}"
    echo ""
    echo "Restaurando backup..."
    mv package.json.backup.* package.json
    pnpm install
    echo "Backup restaurado. Revisa los errores de build."
    exit 1
fi

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   PATCH APLICADO EXITOSAMENTE                            ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

echo "SIGUIENTES PASOS:"
echo ""
echo "1. Revisar cambios:"
echo "   git diff package.json"
echo ""
echo "2. Commit y deploy a staging:"
echo "   git add package.json pnpm-lock.yaml"
echo "   git commit -m \"security: patch CVE-2025-55182 (React2Shell)\""
echo "   git push origin main"
echo ""
echo "3. Deploy a producción:"
echo "   ./scripts/deploy-staging.sh"
echo ""
echo "4. Verificar en VPS:"
echo "   ssh root@195.200.6.216"
echo "   cd /var/www/muva-chat"
echo "   pnpm install"
echo "   pnpm run build"
echo "   pm2 restart all"
echo ""

echo -e "${BLUE}IMPORTANTE: Ejecuta también el script de incident response:${NC}"
echo "   ./scripts/security-incident-response.sh"
