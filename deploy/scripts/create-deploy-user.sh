#!/usr/bin/env bash
set -euo pipefail

USERNAME="deploy"

if ! id "$USERNAME" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "$USERNAME"
fi

mkdir -p /var/www/app.games-telegram.online
chown -R "$USERNAME":"$USERNAME" /var/www/app.games-telegram.online

