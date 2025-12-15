#!/bin/bash
# AIDE Fix - Inicialización correcta

echo "╔═══════════════════════════════════════╗"
echo "║   AIDE FIX - INICIALIZACIÓN CORRECTA ║"
echo "╚═══════════════════════════════════════╝"
echo ""

# Limpiar intento anterior
rm -f /var/lib/aide/aide.db /var/lib/aide/aide.db.new 2>/dev/null

# Reemplazar configuración por defecto con la optimizada
echo "1. Instalando configuración optimizada..."
cp /etc/aide/aide.conf.optimized /etc/aide/aide.conf
echo "✓ Configuración instalada"
echo ""

# Inicializar AIDE directamente (sin aideinit)
echo "2. Inicializando AIDE (2-3 minutos)..."
aide --init

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ Inicialización exitosa"
    echo ""

    # Mover base de datos
    echo "3. Activando base de datos..."
    mv /var/lib/aide/aide.db.new /var/lib/aide/aide.db
    echo "✓ Base de datos activada"
    echo ""

    # Verificar tamaño
    echo "4. Verificación:"
    ls -lh /var/lib/aide/aide.db
    SIZE=$(stat -c%s /var/lib/aide/aide.db 2>/dev/null || echo 0)

    if [ "$SIZE" -gt 100000 ]; then
        echo "✓ Base de datos válida ($(du -h /var/lib/aide/aide.db | cut -f1))"
        echo ""

        # Actualizar cron para usar configuración correcta
        sed -i 's|--config=/etc/aide/aide.conf.optimized|--config=/etc/aide/aide.conf|g' /etc/cron.daily/aide-check

        echo "╔═══════════════════════════════════════╗"
        echo "║   AIDE CONFIGURADO EXITOSAMENTE      ║"
        echo "╚═══════════════════════════════════════╝"
        echo ""
        echo "Test rápido:"
        aide --check | head -20
    else
        echo "❌ Error: Base de datos vacía o corrupta"
        echo "Tamaño: $SIZE bytes"
    fi
else
    echo ""
    echo "❌ Error en inicialización"
    echo ""
fi
