/**
 * PM2 Ecosystem Configuration
 * Run with: pm2 start ecosystem.config.js
 */

module.exports = {
  apps: [
    {
      name: 'dnd-card-api',
      script: './server/api.js',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        API_PORT: 3001,
      },
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      watch: false,
    },
  ],
};

