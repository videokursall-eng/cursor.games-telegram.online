#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="/var/www/app.games-telegram.online/shared/pg-backups"

DB_NAME="${1:-durak}"
DB_USER="${2:-postgres}"
BACKUP_FILE="${3:-}"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <db_name> <db_user> <backup_file.sql.gz>"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Backup file not found: $BACKUP_FILE"
  exit 1
fi

gunzip -c "$BACKUP_FILE" | PGPASSWORD="${PGPASSWORD:-}" psql -U "$DB_USER" "$DB_NAME"

