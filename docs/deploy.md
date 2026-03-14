# Deploy (VPS without Docker)

Цель: запустить Telegram Mini App на одном VPS без Docker: Nginx + Node.js + PostgreSQL + Redis + PM2.

## 1. Подготовка сервера

- Ubuntu 22.04+ или аналогичный дистрибутив.
- Установлены: `node` (>=18), `npm` (10), `git`, `nginx`, `postgresql`, `redis-server`, `pm2` (`npm install -g pm2`).

```bash
sudo apt update
sudo apt install -y nginx postgresql redis-server git
npm install -g pm2
```

## 2. Развёртывание кода

```bash
cd /var/www
sudo mkdir -p durak
sudo chown $USER:$USER durak
cd durak

# Клонируем репозиторий (пример)
git clone <YOUR_REPO_URL> .

# Установка зависимостей и сборка
npm install
cp .env.example .env   # заполните TELEGRAM_BOT_TOKEN, JWT_SECRET и т.д.
npm run build          # собирает shared, game-core, frontend, backend
```

Frontend билд будет в `apps/frontend/dist`, backend — в `apps/backend/dist`.

## 3. PM2 (backend)

В проекте есть `infra/pm2/ecosystem.config.js`:

- приложение `durak-api`
- `cwd: ./apps/backend`
- команда `script: dist/main.js`

Запуск и автозагрузка:

```bash
cd /var/www/durak
pm2 start infra/pm2/ecosystem.config.js --env production
pm2 save
pm2 startup    # выполните команду, которую покажет pm2
```

Проверка:

```bash
curl http://localhost:3000/health   # должно вернуть {"status":"ok"}
```

## 4. Nginx

Готовый конфиг: `infra/nginx/durak.prod.conf`.

1. Скопируйте файл в `/etc/nginx/sites-available/durak`.
2. Подредактируйте:
   - `server_name your-domain.com;`
   - пути к SSL-сертификатам (Let's Encrypt).
   - `root /var/www/durak/apps/frontend/dist;` (если структура отличается, обновите путь).
3. Создайте симлинк и проверьте конфиг:

```bash
sudo ln -s /etc/nginx/sites-available/durak /etc/nginx/sites-enabled/durak
sudo nginx -t
sudo systemctl reload nginx
```

После этого Mini App будет доступен по `https://your-domain.com/`.

## 5. Smoke / health-check

- Health endpoint: `GET http://127.0.0.1:3000/health` → `{"status":"ok"}`.
- Smoke-скрипт: `npm run smoke` (backend должен быть запущен).

Для CI/проверок на сервере можно использовать:

```bash
npm run test:ci   # lint + typecheck + tests + build
npm run smoke     # базовый health-check backend
```

## 7. Миграции и сиды БД

Миграции и сиды реализованы через Prisma (`prisma/schema.prisma`, `prisma/seed.ts`).

- Применение миграций (локальная разработка, требует живой PostgreSQL и корректного `DATABASE_URL`):

```bash
npm run db:migrate
```

- Генерация клиента (не требует подключения к БД):

```bash
npm run db:generate
```

- Сид локальной БД (создаёт демо-пользователя, комнату и кошелёк):

```bash
npm run db:seed
```

## 6. Backup и rollback (минимум)

Примерный подход (подробнее см. `scripts/backup-example.sh`):

- Бэкап БД PostgreSQL: `pg_dump` в архив с датой.
- Бэкап `.env`, `infra/`, `pm2`-конфига и последнего билда (`apps/backend/dist`, `apps/frontend/dist`).
- Для rollback:
  - остановить PM2-приложение;
  - развернуть предыдущую версию кода/билда из архива;
  - поднять PM2 и проверить `/health` и `npm run smoke`.
