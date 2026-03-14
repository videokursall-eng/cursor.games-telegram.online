#!/usr/bin/env bash
set -euo pipefail

# Example zero-downtime-ish deploy script for VPS.
# Assumes repo is in /var/www/durak and PM2 is used.

APP_DIR="/var/www/durak"

cd "$APP_DIR"

echo "Pulling latest code..."
git pull --ff-only

echo "Installing dependencies..."
npm install

echo "Running CI (lint + typecheck + tests + build)..."
npm run test:ci

echo "Reloading PM2 app..."
pm2 startOrReload infra/pm2/ecosystem.config.js --env production
pm2 save

echo "Running smoke tests against live backend..."
API_URL="http://127.0.0.1:3000" node scripts/smoke.js

echo "Deploy finished."

