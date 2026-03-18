module.exports = {
  apps: [
    {
      name: 'durak-api',
      cwd: './apps/backend',
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      max_restarts: 10,
      restart_delay: 5000,
      env: {
        NODE_ENV: 'production',
      },
      // Logs will be written to ~/.pm2/logs by default
    },
  ],
};

