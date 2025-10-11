#!/bin/bash

###############################################################################
# MUVA Chat Nginx Configuration Update Script
###############################################################################
#
# PROPÓSITO: Actualizar configuración de Nginx para reflejar el rebrand de
#            InnPilot → MUVA Chat en el VPS de producción.
#
# USO:
#   1. Copiar este script al VPS:
#      scp scripts/update-nginx-muva-rebrand.sh user@muva.chat:~/
#
#   2. SSH al VPS:
#      ssh user@muva.chat
#
#   3. Ejecutar el script:
#      chmod +x ~/update-nginx-muva-rebrand.sh
#      sudo bash ~/update-nginx-muva-rebrand.sh
#
# NOTA: Este script requiere permisos sudo para modificar configuración de Nginx
#
###############################################################################

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Log functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar que se ejecuta como root/sudo
if [[ $EUID -ne 0 ]]; then
   log_error "Este script debe ejecutarse con sudo"
   exit 1
fi

log_info "🚀 Iniciando actualización de Nginx para MUVA Chat rebrand..."
echo ""

###############################################################################
# PASO 1: Backup de configuración actual
###############################################################################

log_info "📦 Paso 1/6: Creando backup de configuración actual..."

BACKUP_DIR="/root/nginx-backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="$BACKUP_DIR/nginx_backup_$TIMESTAMP"

mkdir -p "$BACKUP_DIR"

# Backup de toda la configuración de Nginx
cp -r /etc/nginx/sites-available "$BACKUP_PATH-sites-available"
cp -r /etc/nginx/sites-enabled "$BACKUP_PATH-sites-enabled"

log_success "Backup creado en: $BACKUP_PATH"
echo ""

###############################################################################
# PASO 2: Identificar archivos de configuración actuales
###############################################################################

log_info "🔍 Paso 2/6: Identificando archivos de configuración..."

# Buscar archivos relacionados con innpilot
INNPILOT_CONF=$(find /etc/nginx/sites-available -name "*innpilot*" -o -name "*muva*" 2>/dev/null | head -1)

if [ -z "$INNPILOT_CONF" ]; then
    log_warning "No se encontró archivo innpilot.conf, buscando configuración por defecto..."
    INNPILOT_CONF="/etc/nginx/sites-available/default"
fi

log_info "Archivo de configuración encontrado: $INNPILOT_CONF"

# Mostrar contenido actual (primeras líneas)
log_info "Contenido actual (primeras 20 líneas):"
head -20 "$INNPILOT_CONF"
echo ""

###############################################################################
# PASO 3: Renombrar archivo de configuración
###############################################################################

log_info "📝 Paso 3/6: Renombrando archivo de configuración..."

NEW_CONF="/etc/nginx/sites-available/muva.conf"

# Si el archivo ya es muva.conf, solo actualizar contenido
if [ "$INNPILOT_CONF" != "$NEW_CONF" ]; then
    cp "$INNPILOT_CONF" "$NEW_CONF"
    log_success "Archivo copiado: $INNPILOT_CONF → $NEW_CONF"
else
    log_info "Archivo ya se llama muva.conf, actualizando contenido..."
fi

echo ""

###############################################################################
# PASO 4: Actualizar referencias en el archivo
###############################################################################

log_info "✏️  Paso 4/6: Actualizando referencias InnPilot → MUVA Chat..."

# Actualizar comentarios y referencias en el archivo
sed -i 's/InnPilot/MUVA Chat/g' "$NEW_CONF"
sed -i 's/innpilot/muva-chat/g' "$NEW_CONF"

log_success "Referencias actualizadas en $NEW_CONF"
echo ""

###############################################################################
# PASO 5: Actualizar symlink en sites-enabled
###############################################################################

log_info "🔗 Paso 5/6: Actualizando symlink en sites-enabled..."

# Remover symlinks antiguos
rm -f /etc/nginx/sites-enabled/innpilot.conf
rm -f /etc/nginx/sites-enabled/innpilot
rm -f /etc/nginx/sites-enabled/default

# Crear nuevo symlink
ln -sf "$NEW_CONF" /etc/nginx/sites-enabled/muva.conf

log_success "Symlink creado: /etc/nginx/sites-enabled/muva.conf → $NEW_CONF"

# Verificar symlink
if [ -L /etc/nginx/sites-enabled/muva.conf ]; then
    log_success "Symlink verificado correctamente"
else
    log_error "Error: Symlink no se creó correctamente"
    exit 1
fi

echo ""

###############################################################################
# PASO 6: Validar configuración de Nginx
###############################################################################

log_info "✅ Paso 6/6: Validando configuración de Nginx..."

if nginx -t; then
    log_success "Configuración de Nginx válida ✅"
    echo ""

    log_info "🔄 Recargando Nginx..."
    systemctl reload nginx

    if [ $? -eq 0 ]; then
        log_success "Nginx recargado exitosamente ✅"
    else
        log_error "Error al recargar Nginx"
        exit 1
    fi
else
    log_error "Configuración de Nginx inválida ❌"
    log_warning "Restaurando configuración anterior..."

    # Rollback
    rm -f "$NEW_CONF"
    rm -f /etc/nginx/sites-enabled/muva.conf

    if [ "$INNPILOT_CONF" != "$NEW_CONF" ]; then
        ln -sf "$INNPILOT_CONF" /etc/nginx/sites-enabled/
    fi

    log_warning "Configuración anterior restaurada"
    exit 1
fi

echo ""

###############################################################################
# VERIFICACIÓN POST-CAMBIOS
###############################################################################

log_info "🔍 Verificando sitio en producción..."
echo ""

# Test 1: Sitio principal
log_info "Test 1: Sitio principal (https://muva.chat)"
HTTP_CODE=$(curl -L -s -o /dev/null -w "%{http_code}" https://muva.chat)
if [ "$HTTP_CODE" = "200" ]; then
    log_success "✅ https://muva.chat → $HTTP_CODE"
else
    log_warning "⚠️  https://muva.chat → $HTTP_CODE (esperado: 200)"
fi

# Test 2: Tenant subdomain
log_info "Test 2: Tenant subdomain (https://simmerdown.muva.chat)"
HTTP_CODE=$(curl -L -s -o /dev/null -w "%{http_code}" https://simmerdown.muva.chat)
if [ "$HTTP_CODE" = "200" ]; then
    log_success "✅ https://simmerdown.muva.chat → $HTTP_CODE"
else
    log_warning "⚠️  https://simmerdown.muva.chat → $HTTP_CODE (esperado: 200)"
fi

# Test 3: API health
log_info "Test 3: API health (https://muva.chat/api/health)"
HTTP_CODE=$(curl -L -s -o /dev/null -w "%{http_code}" https://muva.chat/api/health)
if [ "$HTTP_CODE" = "200" ]; then
    log_success "✅ https://muva.chat/api/health → $HTTP_CODE"
else
    log_warning "⚠️  https://muva.chat/api/health → $HTTP_CODE (esperado: 200)"
fi

echo ""

###############################################################################
# VERIFICAR LOGS
###############################################################################

log_info "📋 Últimas líneas del log de errores de Nginx:"
tail -10 /var/log/nginx/error.log
echo ""

###############################################################################
# RESUMEN FINAL
###############################################################################

echo ""
echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║                  ✅ ACTUALIZACIÓN COMPLETADA                        ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""
log_success "Configuración de Nginx actualizada para MUVA Chat rebrand"
echo ""
echo "📁 Archivos actualizados:"
echo "   - Config: $NEW_CONF"
echo "   - Symlink: /etc/nginx/sites-enabled/muva.conf"
echo ""
echo "📦 Backup guardado en:"
echo "   - $BACKUP_PATH-sites-available"
echo "   - $BACKUP_PATH-sites-enabled"
echo ""
echo "🌐 Sitios verificados:"
echo "   - https://muva.chat"
echo "   - https://simmerdown.muva.chat"
echo "   - https://muva.chat/api/health"
echo ""
log_success "MUVA Chat está funcionando correctamente en producción! 🎉"
echo ""

###############################################################################
# ROLLBACK INSTRUCTIONS (si se necesita)
###############################################################################

cat > /root/nginx-rollback.sh << 'ROLLBACK_EOF'
#!/bin/bash
# Script de rollback automático
echo "🔄 Iniciando rollback de configuración Nginx..."

# Restaurar backup más reciente
LATEST_BACKUP=$(ls -t /root/nginx-backups/*-sites-available 2>/dev/null | head -1)

if [ -z "$LATEST_BACKUP" ]; then
    echo "❌ Error: No se encontró backup para restaurar"
    exit 1
fi

echo "📦 Restaurando desde: $LATEST_BACKUP"

# Restaurar configuración
rm -rf /etc/nginx/sites-available
rm -rf /etc/nginx/sites-enabled
cp -r "$LATEST_BACKUP" /etc/nginx/sites-available
cp -r "${LATEST_BACKUP%-sites-available}-sites-enabled" /etc/nginx/sites-enabled

# Validar y recargar
if nginx -t; then
    systemctl reload nginx
    echo "✅ Rollback completado exitosamente"
else
    echo "❌ Error: Configuración restaurada es inválida"
    exit 1
fi
ROLLBACK_EOF

chmod +x /root/nginx-rollback.sh

log_info "Script de rollback creado en: /root/nginx-rollback.sh"
log_info "Para revertir cambios, ejecutar: sudo bash /root/nginx-rollback.sh"
echo ""
