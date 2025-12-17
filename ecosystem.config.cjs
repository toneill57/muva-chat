/**
 * PM2 Ecosystem Configuration for MUVA Chat
 *
 * Optimized configuration based on Project Stabilization FASE 1 diagnostic.
 *
 * Key improvements:
 * - Memory restart limits (prevents OOM crashes)
 * - Restart throttling (prevents restart loops)
 * - Structured logging (better debugging)
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
      script: './node_modules/.bin/next',
      args: 'start --port 3000',
      cwd: '/var/www/muva-chat-prd',
      instances: 1,
      exec_mode: 'cluster',

      // Memory Management
      // Production heap usage: 455.91 MB (95.15% of 479.11 MB)
      // Setting 500M limit to trigger graceful restart before OOM
      max_memory_restart: '500M',
      node_args: '--max-old-space-size=450',

      // Restart Management
      // Prevents infinite restart loops by throttling restarts
      autorestart: true,
      max_restarts: 10,        // Maximum 10 restarts within min_uptime window
      min_uptime: '10s',       // Process must stay alive 10s to count as "up"
      restart_delay: 4000,     // Wait 4s between restarts for stability

      // Logging
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      log_type: 'json',

      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,

      // Environment
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },

    // =========================================================================
    // Test Instance (staging.muva.chat)
    // =========================================================================
    {
      name: 'muva-chat-tst',
      script: './node_modules/.bin/next',
      args: 'start --port 3001',
      cwd: '/var/www/muva-chat-tst',
      instances: 1,
      exec_mode: 'cluster',

      // Memory Management
      // Updated: Heap usage observed at 93% (14.58MB/15.60MB) - increasing limit
      // Actual memory usage: ~65MB RAM, but heap needs room for spikes
      max_memory_restart: '450M',
      node_args: '--max-old-space-size=400',

      // Restart Management
      // Same throttling as production
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,

      // Logging
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      log_type: 'json',

      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,

      // Environment
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    }
  ]
};
