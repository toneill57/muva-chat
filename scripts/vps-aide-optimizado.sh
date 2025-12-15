#!/bin/bash
# AIDE Optimizado - Solo directorios críticos

echo "╔═══════════════════════════════════════╗"
echo "║   AIDE OPTIMIZADO (RÁPIDO)           ║"
echo "╚═══════════════════════════════════════╝"
echo ""

echo "Configurando AIDE para escanear SOLO directorios críticos..."
echo ""

# Crear configuración optimizada de AIDE
cat > /etc/aide/aide.conf.optimized << 'EOFAIDE'
# AIDE Configuration - Optimized for VPS Security
# Solo directorios críticos para detección de intrusiones

database=file:/var/lib/aide/aide.db
database_out=file:/var/lib/aide/aide.db.new
gzip_dbout=yes

# Reglas de detección
R = p+i+n+u+g+s+m+c+sha256

# Directorios críticos del sistema
/bin R
/sbin R
/usr/bin R
/usr/sbin R
/usr/local/bin R
/usr/local/sbin R
/lib R
/lib64 R

# Configuración del sistema
/etc R
!/etc/mtab
!/etc/.*~
!/etc/adjtime

# Archivos de inicio
/root R
!/root/.bash_history
!/root/.viminfo
!/root/.lesshst

# Systemd y servicios
/lib/systemd R
/etc/systemd R

# Cron jobs
/etc/cron.d R
/etc/cron.daily R
/etc/cron.hourly R
/etc/cron.monthly R
/etc/cron.weekly R
/var/spool/cron R

# SSH
/etc/ssh R
/root/.ssh R

# EXCLUSIONES (no escanear)
!/proc
!/sys
!/dev
!/run
!/tmp
!/var/tmp
!/var/log
!/var/cache
!/var/lib/aide
!/var/lib/postgresql
!/var/lib/redis
!/var/www
!/mnt
!/media
EOFAIDE

echo "✓ Configuración optimizada creada"
echo ""

echo "Iniciando AIDE (solo directorios críticos)..."
echo "Esto tomará 2-3 minutos..."
echo ""

# Inicializar con configuración optimizada
aideinit --config=/etc/aide/aide.conf.optimized

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ AIDE inicializado exitosamente"
    echo ""

    # Mover base de datos
    mv /var/lib/aide/aide.db.new /var/lib/aide/aide.db

    # Configurar verificación diaria
    cat > /etc/cron.daily/aide-check << 'EOFCRON'
#!/bin/bash
# Verificación diaria AIDE optimizada

REPORT="/tmp/aide-report-$(date +%Y%m%d).txt"

aide --check --config=/etc/aide/aide.conf.optimized > "$REPORT" 2>&1

if [ $? -ne 0 ]; then
    echo "⚠️ ALERTA: AIDE detectó cambios en el sistema" | mail -s "AIDE Alert - $(hostname)" tarek.oneill@gmail.com
    cat "$REPORT" | mail -s "AIDE Report - $(date +%Y-%m-%d)" tarek.oneill@gmail.com
fi
EOFCRON
    chmod +x /etc/cron.daily/aide-check

    echo "✓ Verificación diaria configurada"
    echo ""

    echo "╔═══════════════════════════════════════╗"
    echo "║   AIDE CONFIGURADO EXITOSAMENTE      ║"
    echo "╚═══════════════════════════════════════╝"
    echo ""

    echo "Detalles:"
    ls -lh /var/lib/aide/aide.db
    echo ""
    echo "Verificación diaria: /etc/cron.daily/aide-check"
    echo ""
    echo "Para verificar manualmente:"
    echo "  aide --check --config=/etc/aide/aide.conf.optimized"
else
    echo ""
    echo "❌ Error en inicialización de AIDE"
    echo ""
fi
