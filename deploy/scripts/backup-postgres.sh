#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="/var/www/app.games-telegram.online/shared/pg-backups"
mkdir -p "$BACKUP_DIR"

DB_NAME="${1:-durak}"
DB_USER="${2:-postgres}"

TIMESTAMP="$(date +%Y%m%d%H%M%S)"
FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"

PGPASSWORD="${PGPASSWORD:-}" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$FILE"

find "$BACKUP_DIR" -type f -name "${DB_NAME}_*.sql.gz" -mtime +7 -delete

