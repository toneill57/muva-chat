#!/bin/bash
# Cargar variables de entorno para Claude Code MCP servers

set -a  # Auto-export all variables
source .env.local
set +a

echo "✅ Variables de entorno cargadas de .env.local"
echo ""
echo "Variables disponibles para MCP servers:"
echo "  - HOSTINGER_API_TOKEN: ${HOSTINGER_API_TOKEN:0:10}...${HOSTINGER_API_TOKEN: -4}"
echo "  - SUPABASE_ACCESS_TOKEN: ${SUPABASE_ACCESS_TOKEN:0:10}...${SUPABASE_ACCESS_TOKEN: -4}"
echo ""
echo "Ahora puedes usar Claude Code y los MCP servers tendrán acceso a estas variables."
