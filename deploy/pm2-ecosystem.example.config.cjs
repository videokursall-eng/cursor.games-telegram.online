/**
 * PM2 ecosystem example. Copy to backend/ecosystem.config.cjs and set env.
 * Run: pm2 start ecosystem.config.cjs
 */
module.exports = {
  apps: [
    {
      name: "app-backend",
      cwd: "/var/www/app.games-telegram.online/backend",
      script: "dist/server.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
      },
      env_file: "/var/www/app.games-telegram.online/backend/.env",
      error_file: "/var/log/pm2/app-backend-error.log",
      out_file: "/var/log/pm2/app-backend-out.log",
    },
  ],
};
