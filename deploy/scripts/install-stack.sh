#!/usr/bin/env bash
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y \
  curl ca-certificates gnupg lsb-release \
  nginx \
  postgresql postgresql-contrib \
  redis-server \
  logrotate \
  brotli

curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
apt-get install -y nodejs

npm install -g pnpm

systemctl enable nginx
systemctl enable redis-server
systemctl enable postgresql

