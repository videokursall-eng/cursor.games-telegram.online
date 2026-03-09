# Запуск проекта на чистом VPS (Durak Telegram Mini App)

## 1. Подготовка сервера

```bash
sudo bash /var/www/bootstrap/create-deploy-user.sh
sudo -iu deploy
git clone <repo_url> app.games-telegram.online
cd app.games-telegram.online
```

## 2. Установка зависимостей

```bash
cd deploy/scripts
sudo ./install-stack.sh
```

## 3. Настройка БД и окружения

- Создать БД `durak` и пользователя:

```bash
sudo -u postgres createdb durak
sudo -u postgres psql -c "CREATE USER durak WITH PASSWORD 'strong_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE durak TO durak;"
```

- Заполнить `backend.env` и `bot.env` в `/var/www/app.games-telegram.online/shared/config`:

```bash
JWT_SECRET=change_me
POSTGRES_URL=postgres://durak:strong_password@127.0.0.1:5432/durak
REDIS_URL=redis://127.0.0.1:6379/0
NODE_ENV=production
```

## 4. Первый билд и миграции

```bash
cd /var/www/app.games-telegram.online/current/backend
npm install
npm run build
NODE_ENV=production node dist/infrastructure/db/migrate.js
psql "$POSTGRES_URL" -f src/infrastructure/db/seeds/seed_dev_data.sql
```

## 5. Настройка systemd и Nginx

```bash
sudo cp deploy/systemd/durak-backend.service /etc/systemd/system/
sudo cp deploy/systemd/durak-frontend-build.service /etc/systemd/system/
sudo cp deploy/systemd/durak-bot.service /etc/systemd/system/

sudo systemctl daemon-reload
sudo systemctl enable durak-backend.service durak-frontend-build.service durak-bot.service
sudo systemctl start durak-backend.service durak-frontend-build.service durak-bot.service

sudo cp deploy/nginx/app.games-telegram.online.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/app.games-telegram.online.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## 6. Backup / restore / DR

- Ручной backup:

```bash
sudo -u postgres PGPASSWORD='<password>' \
  /var/www/app.games-telegram.online/current/deploy/scripts/backup-postgres.sh durak durak
```

- Restore:

```bash
sudo -u postgres PGPASSWORD='<password>' \
  /var/www/app.games-telegram.online/current/deploy/scripts/restore-postgres.sh durak durak /path/to/backup.sql.gz
```

- Disaster recovery (кратко):
  - Поднять новый VPS
  - Установить стек через `install-stack.sh`
  - Восстановить БД из последнего backup
  - Развернуть последний release и обновить `current`
  - Переключить DNS / Cloudflare на новый IP

