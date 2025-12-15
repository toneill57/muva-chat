#!/bin/bash
# Fix port binding - Bind to localhost only

echo "╔═══════════════════════════════════════╗"
echo "║   FIX PORT BINDING (LOCALHOST ONLY)  ║"
echo "╚═══════════════════════════════════════╝"
echo ""

# Backup current configs
echo "1. Creando backups..."
cp /var/www/muva-chat-prd/ecosystem.config.js /var/www/muva-chat-prd/ecosystem.config.js.backup
cp /var/www/muva-chat-tst/ecosystem.config.js /var/www/muva-chat-tst/ecosystem.config.js.backup
echo "✓ Backups creados"
echo ""

# Update staging config
echo "2. Actualizando staging config..."
cat > /var/www/muva-chat-tst/ecosystem.config.js << 'EOFCONFIG'
/**
 * PM2 Ecosystem Configuration for MUVA Chat
 *
 * Optimized configuration based on Project Stabilization FASE 1 diagnostic.
 *
 * Key improvements:
 * - Memory restart limits (prevents OOM crashes)
 * - Restart throttling (prevents restart loops)
 * - Structured logging (better debugging)
 * - SECURITY: Bind to localhost only (not exposed publicly)
 *
 * @see project-stabilization/docs/fase-1/PM2_DIAGNOSTIC_REPORT.md
 * @see project-stabilization/docs/fase-1/PM2_CONFIG_OPTIMIZATION.md
 */

module.exports = {
  apps: [
    // =========================================================================
    // Production Instance (muva.chat)
    // =========================================================================
    {
      name: 'muva-chat-prd',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/muva-chat-prd',
      instances: 1,
      exec_mode: 'cluster',

      // Memory Management
      max_memory_restart: '500M',
      node_args: '--max-old-space-size=450',

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
        PORT: 3000,
        HOSTNAME: '127.0.0.1'  // SECURITY: Bind to localhost only
      }
    },

    // =========================================================================
    // Test Instance (staging.muva.chat)
    // =========================================================================
    {
      name: 'muva-chat-tst',
      script: 'npm',
      args: 'start -- --port 3001',
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

# Copy to production (same config)
echo "3. Actualizando production config..."
cp /var/www/muva-chat-tst/ecosystem.config.js /var/www/muva-chat-prd/ecosystem.config.js
echo "✓ Production config actualizado"
echo ""

# Restart PM2 with new config
echo "4. Reiniciando PM2 con nueva configuración..."
pm2 stop all
pm2 delete all
pm2 start /var/www/muva-chat-prd/ecosystem.config.js
pm2 save
echo "✓ PM2 reiniciado"
echo ""

# Wait for apps to start
echo "5. Esperando que las apps inicien..."
sleep 5
echo ""

# Verify port binding
echo "6. Verificando port binding..."
echo ""
netstat -tlnp | grep ':3000\|:3001'
echo ""

# Check if bound to localhost
if netstat -tlnp | grep ':3000' | grep -q '127.0.0.1'; then
    echo "✅ Puerto 3000 vinculado a localhost (SEGURO)"
else
    echo "❌ Puerto 3000 AÚN expuesto públicamente"
fi

if netstat -tlnp | grep ':3001' | grep -q '127.0.0.1'; then
    echo "✅ Puerto 3001 vinculado a localhost (SEGURO)"
else
    echo "❌ Puerto 3001 AÚN expuesto públicamente"
fi

echo ""
echo "╔═══════════════════════════════════════╗"
echo "║   PORT BINDING ACTUALIZADO           ║"
echo "╚═══════════════════════════════════════╝"
echo ""

pm2 status
