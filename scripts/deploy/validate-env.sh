#!/bin/bash
# Validar que .env.local tiene todas las variables requeridas

set -e

ENV_FILE=".env.local"
REQUIRED_VARS=(
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "SUPABASE_SERVICE_ROLE_KEY"
  "ANTHROPIC_API_KEY"
  "OPENAI_API_KEY"
  "SMTP_HOST"
  "SMTP_USER"
  "SMTP_PASSWORD"
  "STRIPE_SECRET_KEY"
  "STRIPE_WEBHOOK_SECRET"
)

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔍 Validando $ENV_FILE..."

# Verificar que el archivo existe
if [ ! -f "$ENV_FILE" ]; then
  echo -e "${RED}❌ Archivo $ENV_FILE no encontrado${NC}"
  exit 1
fi

MISSING=0

for var in "${REQUIRED_VARS[@]}"; do
  if ! grep -q "^${var}=" "$ENV_FILE" 2>/dev/null; then
    echo -e "${RED}❌ Falta: $var${NC}"
    MISSING=$((MISSING + 1))
  else
    # Verificar que no esté vacía
    VALUE=$(grep "^${var}=" "$ENV_FILE" | cut -d '=' -f2-)
    if [ -z "$VALUE" ]; then
      echo -e "${YELLOW}⚠️  Vacía: $var${NC}"
      MISSING=$((MISSING + 1))
    else
      echo -e "${GREEN}✅ OK: $var${NC}"
    fi
  fi
done

if [ $MISSING -gt 0 ]; then
  echo -e "\n${RED}❌ Faltan $MISSING variables requeridas${NC}"
  exit 1
else
  echo -e "\n${GREEN}✅ Todas las variables requeridas presentes${NC}"

  # Detectar ambiente
  PROJECT_ID=$(grep "NEXT_PUBLIC_SUPABASE_URL" "$ENV_FILE" | cut -d '=' -f2 | cut -d '/' -f3 | cut -d '.' -f1)

  if [ "$PROJECT_ID" = "bddcvjoeoiekzfetvxoe" ]; then
    echo -e "${YELLOW}📍 Ambiente: STAGING${NC}"
  elif [ "$PROJECT_ID" = "kprqghwdnaykxhostivv" ]; then
    echo -e "${GREEN}📍 Ambiente: PRODUCTION${NC}"
  elif [ "$PROJECT_ID" = "iyeueszchbvlutlcmvcb" ]; then
    echo -e "${GREEN}📍 Ambiente: DEV${NC}"
  else
    echo -e "${RED}⚠️  Ambiente: UNKNOWN (${PROJECT_ID})${NC}"
  fi
fi
