#!/bin/bash
# Toggle entre .env.staging y .env.local (production)

set -e

CURRENT_ENV=".env.local"
STAGING_ENV=".env.staging"
BACKUP_DIR=".env.backups"

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Crear backup dir si no existe
mkdir -p "$BACKUP_DIR"

# Función: detectar ambiente actual
detect_current_env() {
  if [ -f "$CURRENT_ENV" ]; then
    PROJECT_ID=$(grep "NEXT_PUBLIC_SUPABASE_URL" "$CURRENT_ENV" | cut -d '=' -f2 | cut -d '/' -f3 | cut -d '.' -f1)

    if [ "$PROJECT_ID" = "bddcvjoeoiekzfetvxoe" ]; then
      echo "staging"
    elif [ "$PROJECT_ID" = "kprqghwdnaykxhostivv" ]; then
      echo "production"
    elif [ "$PROJECT_ID" = "iyeueszchbvlutlcmvcb" ]; then
      echo "dev"
    else
      echo "unknown"
    fi
  else
    echo "none"
  fi
}

# Función: toggle
toggle_env() {
  CURRENT=$(detect_current_env)

  echo -e "${YELLOW}📍 Ambiente actual: $CURRENT${NC}"

  if [ "$CURRENT" = "production" ]; then
    echo -e "${GREEN}🔄 Cambiando a STAGING...${NC}"

    # Backup
    cp "$CURRENT_ENV" "$BACKUP_DIR/.env.local.backup.$(date +%Y%m%d_%H%M%S)"

    # Toggle
    cp "$STAGING_ENV" "$CURRENT_ENV"

    echo -e "${GREEN}✅ Ambiente cambiado a STAGING${NC}"
    echo "   Project: bddcvjoeoiekzfetvxoe"

  elif [ "$CURRENT" = "staging" ]; then
    echo -e "${GREEN}🔄 Cambiando a PRODUCTION...${NC}"

    # Buscar último backup de production
    LAST_BACKUP=$(ls -t "$BACKUP_DIR"/.env.local.backup.* 2>/dev/null | head -1)

    if [ -n "$LAST_BACKUP" ]; then
      echo "   Restaurando desde backup: $LAST_BACKUP"
      cp "$LAST_BACKUP" "$CURRENT_ENV"
    else
      echo -e "${RED}❌ No se encontró backup de .env.local${NC}"
      echo "   Copia manualmente desde .env.production"
      exit 1
    fi

    echo -e "${GREEN}✅ Ambiente cambiado a PRODUCTION${NC}"
    echo "   Project: kprqghwdnaykxhostivv"
  else
    echo -e "${RED}❌ Ambiente desconocido: $CURRENT${NC}"
    exit 1
  fi

  # Validar
  ./scripts/validate-env.sh
}

# Ejecutar toggle
toggle_env
