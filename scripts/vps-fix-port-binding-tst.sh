#!/bin/bash
# Fix port binding - STAGING ONLY
# Bind to localhost only

echo "╔═══════════════════════════════════════╗"
echo "║   FIX PORT BINDING - STAGING ONLY    ║"
echo "╚═══════════════════════════════════════╝"
echo ""

# Backup current config
echo "1. Creando backup..."
cp /var/www/muva-chat-tst/ecosystem.config.js /var/www/muva-chat-tst/ecosystem.config.js.backup-$(date +%Y%m%d-%H%M%S)
echo "✓ Backup creado"
echo ""

# Update staging config
echo "2. Actualizando staging config..."
cat > /var/www/muva-chat-tst/ecosystem.config.js << 'EOFCONFIG'
/**
 * PM2 Ecosystem Configuration for MUVA Chat - STAGING
 *
 * SECURITY: Bind to localhost only (not exposed publicly)
 */

module.exports = {
  apps: [
    {
      name: 'muva-chat-tst',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/muva-chat-tst',
      instances: 1,
      exec_mode: 'cluster',

      // Memory Management
      max_memory_restart: '400M',
      node_args: '--max-old-space-size=350',

      // Restart Management
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,

      // Logging
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Environment
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        HOSTNAME: '127.0.0.1'  // SECURITY: Bind to localhost only
      }
    }
  ]
};
EOFCONFIG
echo "✓ Staging config actualizado"
echo ""

# Restart only staging app
echo "3. Reiniciando solo staging app..."
pm2 delete muva-chat-tst 2>/dev/null || true
pm2 start /var/www/muva-chat-tst/ecosystem.config.js
pm2 save
echo "✓ Staging app reiniciada"
echo ""

# Wait for app to start
echo "4. Esperando que la app inicie..."
sleep 5
echo ""

# Verify port binding
echo "5. Verificando port binding..."
echo ""
netstat -tlnp | grep ':3001'
echo ""

# Check if bound to localhost
if netstat -tlnp | grep ':3001' | grep -q '127.0.0.1'; then
    echo "✅ Puerto 3001 (staging) vinculado a localhost (SEGURO)"
else
    echo "❌ Puerto 3001 AÚN expuesto públicamente"
fi

echo ""
echo "╔═══════════════════════════════════════╗"
echo "║   STAGING PORT BINDING ACTUALIZADO   ║"
echo "╚═══════════════════════════════════════╝"
echo ""

pm2 list
