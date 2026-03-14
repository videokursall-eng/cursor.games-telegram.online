#!/usr/bin/env bash
set -euo pipefail

# Example backup script for VPS (no Docker).
# Adjust paths/usernames before use.

BACKUP_ROOT="/var/backups/durak"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
TARGET="$BACKUP_ROOT/$TIMESTAMP"

mkdir -p "$TARGET"

echo "Backing up PostgreSQL..."
pg_dump "$DATABASE_URL" > "$TARGET/postgres.sql"

echo "Backing up Redis (RDB snapshot, if enabled)..."
if [ -f /var/lib/redis/dump.rdb ]; then
  cp /var/lib/redis/dump.rdb "$TARGET/redis-dump.rdb"
fi

echo "Backing up app config and build..."
cp /var/www/durak/.env "$TARGET/.env"
tar czf "$TARGET/frontend-dist.tar.gz" -C /var/www/durak/apps/frontend dist
tar czf "$TARGET/backend-dist.tar.gz" -C /var/www/durak/apps/backend dist

echo "Backup stored in $TARGET"

