module.exports = {
  apps: [{
    name: 'muva-chat',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/innpilot',
    instances: 2,
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/pm2/muva-chat-error.log',
    out_file: '/var/log/pm2/muva-chat-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    time: true
  }]
}
