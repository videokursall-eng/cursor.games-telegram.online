#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="/var/www/app.games-telegram.online"
RELEASE_DIR="$APP_ROOT/releases/$(date +%Y%m%d%H%M%S)"

mkdir -p "$RELEASE_DIR"

rsync -a backend/ "$RELEASE_DIR/backend/"

cd "$RELEASE_DIR/backend"
npm ci
npm run build

ln -sfn "$RELEASE_DIR" "$APP_ROOT/current"

systemctl daemon-reload
systemctl restart durak-backend.service

