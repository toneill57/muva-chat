#!/bin/bash
# Script para configurar alias claude-muva permanentemente

SHELL_CONFIG=""

# Detectar qué shell usa el usuario
if [ -n "$ZSH_VERSION" ]; then
    SHELL_CONFIG="$HOME/.zshrc"
    echo "Detectado: zsh"
elif [ -n "$BASH_VERSION" ]; then
    SHELL_CONFIG="$HOME/.bashrc"
    echo "Detectado: bash"
else
    echo "Shell no detectado, usando ~/.zshrc por defecto"
    SHELL_CONFIG="$HOME/.zshrc"
fi

echo ""
echo "Agregando alias a: $SHELL_CONFIG"
echo ""

# Verificar si ya existe el alias
if grep -q "alias claude-muva=" "$SHELL_CONFIG" 2>/dev/null; then
    echo "⚠️  El alias 'claude-muva' ya existe en $SHELL_CONFIG"
    echo ""
    echo "Contenido actual:"
    grep "claude-muva" "$SHELL_CONFIG"
    echo ""
    read -p "¿Deseas reemplazarlo? (s/n): " REPLACE

    if [[ "$REPLACE" =~ ^[Ss]$ ]]; then
        # Remover línea existente
        sed -i.backup '/alias claude-muva=/d' "$SHELL_CONFIG"
        echo "✓ Alias anterior removido (backup en $SHELL_CONFIG.backup)"
    else
        echo "Operación cancelada"
        exit 0
    fi
fi

# Agregar el alias
echo "" >> "$SHELL_CONFIG"
echo "# Claude Code - Cargar variables de entorno para MUVA Chat" >> "$SHELL_CONFIG"
echo "alias claude-muva='cd /Users/oneill/Sites/apps/muva-chat && source scripts/load-env-for-claude.sh && cd -'" >> "$SHELL_CONFIG"

echo "✓ Alias agregado a $SHELL_CONFIG"
echo ""

# Recargar configuración
echo "Recargando configuración..."
source "$SHELL_CONFIG"

echo "✓ Configuración recargada"
echo ""
echo "════════════════════════════════════════"
echo "✅ ALIAS CONFIGURADO EXITOSAMENTE"
echo "════════════════════════════════════════"
echo ""
echo "Uso:"
echo "  1. Ejecuta 'claude-muva' antes de usar Claude Code"
echo "  2. Esto cargará las variables de .env.local"
echo "  3. Los MCP servers tendrán acceso a tus tokens"
echo ""
echo "Ejemplo:"
echo "  $ claude-muva"
echo "  ✅ Variables de entorno cargadas"
echo "  $ # Ahora usa Claude Code normalmente"
echo ""
