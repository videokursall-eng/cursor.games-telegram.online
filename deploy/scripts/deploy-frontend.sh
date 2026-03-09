#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="/var/www/app.games-telegram.online"
RELEASE_DIR="$APP_ROOT/releases/$(date +%Y%m%d%H%M%S)"

mkdir -p "$RELEASE_DIR"

rsync -a frontend/ "$RELEASE_DIR/frontend/"

cd "$RELEASE_DIR/frontend"
npm ci
npm run build

ln -sfn "$RELEASE_DIR/frontend/dist" "$APP_ROOT/current/frontend"

systemctl reload nginx

