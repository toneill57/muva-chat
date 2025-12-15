#!/bin/bash
# AIDE Fix V2 - Con rutas correctas de Debian

echo "╔═══════════════════════════════════════╗"
echo "║   AIDE FIX V2                        ║"
echo "╚═══════════════════════════════════════╝"
echo ""

# Verificar ubicación de configuración
echo "1. Verificando archivos de configuración..."
ls -lh /etc/aide/aide.conf* 2>/dev/null || echo "Sin archivos en /etc/aide/"
ls -lh /etc/aide.conf 2>/dev/null || echo "Sin /etc/aide.conf"
echo ""

# Ubicar configuración correcta
if [ -f /etc/aide/aide.conf ]; then
    CONFIG_FILE="/etc/aide/aide.conf"
elif [ -f /etc/aide.conf ]; then
    CONFIG_FILE="/etc/aide.conf"
else
    echo "❌ No se encontró archivo de configuración AIDE"
    exit 1
fi

echo "✓ Configuración encontrada: $CONFIG_FILE"
echo ""

# Backup configuración original
cp "$CONFIG_FILE" "$CONFIG_FILE.backup.$(date +%Y%m%d)"
echo "✓ Backup creado"
echo ""

# Crear configuración optimizada
echo "2. Creando configuración optimizada..."
cat > "$CONFIG_FILE" << 'EOFAIDE'
# AIDE Configuration - Optimized for VPS Security

database=file:/var/lib/aide/aide.db
database_out=file:/var/lib/aide/aide.db.new
gzip_dbout=yes

# Reglas
R = p+i+n+u+g+s+m+c+sha256

# Directorios críticos
/bin R
/sbin R
/usr/bin R
/usr/sbin R
/usr/local/bin R
/lib R
/etc R
!/etc/mtab
!/etc/.*~
!/etc/adjtime
/root R
!/root/.bash_history
!/root/.viminfo
/lib/systemd R
/etc/systemd R
/etc/cron.d R
/etc/cron.daily R
/etc/ssh R
/root/.ssh R

# Exclusiones
!/proc
!/sys
!/dev
!/run
!/tmp
!/var/tmp
!/var/log
!/var/lib/aide
!/var/lib/postgresql
!/var/www
EOFAIDE

echo "✓ Configuración optimizada instalada en $CONFIG_FILE"
echo ""

# Limpiar base de datos anterior
rm -f /var/lib/aide/aide.db /var/lib/aide/aide.db.new 2>/dev/null

# Inicializar AIDE con el comando correcto
echo "3. Inicializando AIDE (2-3 minutos)..."
aide -c "$CONFIG_FILE" --init

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ Inicialización exitosa"
    echo ""

    # Verificar que se creó el archivo
    if [ -f /var/lib/aide/aide.db.new ]; then
        SIZE=$(stat -c%s /var/lib/aide/aide.db.new)
        echo "Base de datos generada: $SIZE bytes"

        if [ "$SIZE" -gt 100000 ]; then
            # Mover base de datos
            mv /var/lib/aide/aide.db.new /var/lib/aide/aide.db
            echo "✓ Base de datos activada"
            echo ""

            # Configurar cron
            cat > /etc/cron.daily/aide-check << 'EOFCRON'
#!/bin/bash
REPORT="/tmp/aide-report-$(date +%Y%m%d).txt"
aide --check > "$REPORT" 2>&1
if [ $? -ne 0 ]; then
    echo "⚠️ ALERTA: AIDE detectó cambios" | mail -s "AIDE Alert - $(hostname)" tarek.oneill@gmail.com
    cat "$REPORT" | mail -s "AIDE Report - $(date)" tarek.oneill@gmail.com
fi
EOFCRON
            chmod +x /etc/cron.daily/aide-check

            echo "╔═══════════════════════════════════════╗"
            echo "║   AIDE CONFIGURADO EXITOSAMENTE      ║"
            echo "╚═══════════════════════════════════════╝"
            echo ""
            ls -lh /var/lib/aide/aide.db
            echo ""
            echo "Test rápido (primeras 15 líneas):"
            aide --check | head -15
        else
            echo "❌ Base de datos muy pequeña: $SIZE bytes"
        fi
    else
        echo "❌ No se generó /var/lib/aide/aide.db.new"
    fi
else
    echo ""
    echo "❌ Error en inicialización"
fi
