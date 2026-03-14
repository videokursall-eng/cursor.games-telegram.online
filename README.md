# Durak Mini App

Production-ready Telegram Mini App: **Подкидной Дурак** и **Переводной Дурак**.

## Структура (монорепозиторий)

- `apps/frontend` — React + TypeScript + Vite, Telegram Mini App shell
- `apps/backend` — NestJS API + WebSocket
- `packages/shared` — общие типы, DTO, контракты событий
- `packages/game-core` — чистая игровая логика (без UI)
- `infra/` — nginx, pm2, deploy, health-check
- `scripts/` — CI, миграции, подготовка окружения

## Требования

- Node.js >= 18
- npm 10 (или совместимый)
- PostgreSQL (основная БД)
- Redis (для rate limit и кэша; backend может работать с in-memory fallback, но для production нужен Redis)

## Env variables (основные)

Смотрите также `.env.example` и `.env.test.example`. Ключевые переменные:

- **Бэкенд / общие**
  - `DATABASE_URL` — строка подключения к PostgreSQL (используется backend’ом и e2e/security тестами).
  - `JWT_SECRET` — секрет для подписи access‑token’ов.
  - `TELEGRAM_BOT_TOKEN` — токен Telegram‑бота для проверки `initData`.
  - `ADMIN_TELEGRAM_IDS` — список Telegram‑ID администраторов (через запятую). На их основе backend выставляет `isAdmin` и пускает в `/admin` API (плюс frontend UI).
- **Rate limit / Redis**
  - `RATE_LIMIT_STORAGE` — `memory` или `redis`. В production рекомендуется `redis`.
  - `REDIS_URL` — URL подключения Redis (например, `redis://localhost:6379`). При `RATE_LIMIT_STORAGE=redis` backend будет использовать Redis‑based лимитер.
- **E2E / тесты**
  - `E2E_SECRET` — секрет, которым frontend e2e flow подтверждает `/auth/e2e-bootstrap` и `/auth/e2e-token`.
  - Для HTTP/e2e и security‑сценариев с реальной БД:
    - `DATABASE_URL` должен указывать на test DB (например, `postgresql://durak:durak@localhost:5433/durak_test`).
- **Telegram Stars / платежи**
  - `TELEGRAM_STARS_API_TOKEN` — токен для обращения к верификатору Telegram Stars (если используется реальная интеграция).
  - `TELEGRAM_STARS_VERIFY_URL` — URL merchant‑сервиса, который проверяет пользовательский платеж (см. `PaymentService`).

## Быстрый старт

```bash
# Установка зависимостей
npm install

# Копирование конфигурации
cp .env.example .env
# Отредактируйте .env при необходимости

# Сборка пакетов (shared, game-core) и приложений
npm run build

# Запуск в режиме разработки (два терминала)
npm run dev:frontend   # Vite: http://localhost:5173
npm run dev:backend    # Nest: http://localhost:3000
```

## Команды

| Команда | Описание |
|--------|----------|
| `npm run dev` | Запуск всех приложений в dev |
| `npm run dev:frontend` | Только frontend |
| `npm run dev:backend` | Только backend |
| `npm run build` | Сборка всех workspace |
| `npm run test` | Тесты по всем пакетам |
| `npm run test:ci` | Полный CI: lint, typecheck, test, build |
| `npm run lint` | Линтинг |
| `npm run typecheck` | Проверка типов TypeScript |
| `npm run smoke` | Smoke-проверка API (backend должен быть запущен) |
| `npm run db:doctor` | Диагностика БД и миграций (schema, generate, migrate status). Не применяет миграции. |
| `npm run e2e` | Браузерный E2E (Playwright): сам поднимает backend и frontend на **свободных портах**, затем запускает тесты. Не требует ручного освобождения портов. Использует test DB `durak_test` на 5433. |
| `npm run e2e:http` | HTTP E2E: тесты API с ботом (реальный сервер, только HTTP, без браузера). Использует test DB `durak_test` на 5433. |
| `npm run e2e:prepare` | Подготовка test DB для e2e: Docker Postgres + Prisma generate/migrate/check c `durak_test` на 5433. |
| `npm run test:e2e:db` | Сокращённый alias: `npm run e2e:prepare && npm run e2e:http` (HTTP E2E поверх реальной Prisma/PostgreSQL). |

### E2E тесты

- **`npm run e2e`** — браузерный E2E (Playwright). Запуск через проектный launcher `scripts/run-playwright.cjs` (cross-platform, в т.ч. Windows с путями с пробелами). Скрипт `scripts/run-e2e-browser.js`:
  - находит два свободных порта (через `scripts/find-free-port.js`);
  - собирает backend и frontend (frontend с `VITE_API_URL` на выбранный backend-порт; **без** специальных e2e build-time флагов);
  - запускает Playwright через `node scripts/run-playwright.cjs test -c tests/e2e/playwright.config.ts`;
  - Playwright поднимает backend (с `E2E_SECRET`) и frontend на этих портах и запускает тесты.
  - Перед запуском убедитесь, что test DB готова: `npm run e2e:prepare` (используется URL `postgresql://durak:durak@localhost:5433/durak_test`).
  **E2E auth** работает в runtime: при открытии приложения с `?e2e=1` frontend вызывает `GET /auth/e2e-bootstrap`. Backend в e2e-режиме (когда задан `E2E_SECRET`) возвращает токен; обычный production build frontend при этом не требует пересборки. Без e2e-режима на backend запрос возвращает 403.

- **`npm run e2e:http`** — HTTP E2E без браузера: поднимается один backend, тесты дергают только API. Работает поверх test DB `durak_test` (порт 5433) и автоматически прокидывает `DATABASE_URL` через `cross-env`.

### База данных и Prisma

- Обязательные env-переменные для backend:
  - `DATABASE_URL` — строка подключения PostgreSQL (см. `.env.example` / `.env.test.example`).
  - `JWT_SECRET`, `TELEGRAM_BOT_TOKEN` и др. — как обычно.
- Проверка и миграции (низкоуровневые команды):
  - `npm run prisma:generate` — сгенерировать Prisma Client.
  - `npm run prisma:migrate` — применить миграции в dev (локальная БД). Перед запуском выполняет `db:check`.
  - `npm run prisma:migrate:deploy` — применить миграции в prod/CI.
  - `npm run prisma:check` — preflight-проверка: есть ли `DATABASE_URL`, доступна ли БД и в каком состоянии миграции.
  - `npm run db:doctor` — подробный отчёт о состоянии schema/migrations и БД:
    - без `DATABASE_URL` показывает, что schema/migrations валидны, но БД не сконфигурирована, и подсказывает, какие env/scripts использовать;
    - с `DATABASE_URL` запускает `prisma migrate status` и сообщает, готова ли БД или нужно применить миграции.
- Docker-based локальный flow:
  - `npm run db:up` — поднять две локальные БД (dev: `durak` на 5432, test: `durak_test` на 5433) через `docker-compose.db.yml`.
  - `npm run db:down` — остановить и удалить контейнеры/volume’ы.
  - `npm run db:reset` — полный пересоздание контейнеров/volume’ов (осторожно, удаляет данные).
  - `npm run db:prepare` — подготовить dev DB: `db:up` → Prisma generate → migrate → check с `postgresql://durak:durak@localhost:5432/durak`.
  - `npm run db:test:prepare` — подготовить test DB: `db:up` → Prisma generate → migrate → check с `postgresql://durak:durak@localhost:5433/durak_test`.
- Для старта backend в dev:
  1. `npm run db:prepare`
  2. (Опционально) `npm run prisma:check`
  3. `npm run dev:backend`

### Security / abuse e2e

- В `apps/backend/src/security.e2e.spec.ts` есть e2e‑сценарии на:
  - invite spam / join‑by‑link анти‑абьюз;
  - duplicate payment confirm (Stars) без двойного начисления;
  - отсутствие чувствительных полей в `/me/profile`.
- Эти тесты запускаются **только**, если задан `DATABASE_URL` (иначе `describe.skip`), и рассчитаны на реальную PostgreSQL с применёнными миграциями.

### Real DB e2e / integration

- `npm run test:e2e:db`:
  - подготавливает test DB через `npm run db:test:prepare` (Docker + Prisma migrate + check);
  - использует те же HTTP e2e-тесты (`apps/backend/src/backend.e2e.room-bot-flow.spec.ts`) поверх реальной Prisma/PostgreSQL;
  - backend стартует через `dist/main.js`, который делает preflight по `DATABASE_URL`;
  - сценарий:
    - создаёт комнату с ботом;
    - стартует матч;
    - даёт человеку и боту сделать ходы;
    - проверяет через Prisma, что в БД появились записи `PlayerMatchRecord`;
    - дергает `GET /me/profile` и убеждается, что профиль/статистика/достижения не пустые.
  - По умолчанию используется контейнер `postgres_test` из `docker-compose.db.yml` c URL `postgresql://durak:durak@localhost:5433/durak_test`.

## Завершение матча и статистика

Игровое ядро (`packages/game-core`) и backend поддерживают три типа завершения матча:

- `normal` — штатное завершение с определёнными местами игроков и возможным `loserId`.
- `draw` — валидное завершение без единственного победителя (ничья).
- `aborted` — прерванный или некорректно завершённый матч.

Backend возвращает в `GET /rooms/:id` поле `matchResult`:

```ts
matchResult: {
  winnerIds: string[];                 // победители (могут быть несколько, при draw/aborted могут быть пустыми)
  loserId?: string | null;             // проигравший, если применимо
  finishOrder: string[];               // порядок выхода/завершения игроков
  placements: { playerId: string; place: number }[]; // места игроков
  outcome: 'normal' | 'draw' | 'aborted';
  stats: {
    totalTurns: number;                // общее число ходов
    totalRounds: number;               // общее число раундов
    durationSeconds: number;           // длительность партии в секундах
    totalCardsTaken: number;           // всего взятых карт
    perPlayer: Array<{
      playerId: string;
      turnsMade: number;
      cardsTaken: number;
      defensesMade: number;
      attacksMade: number;
      transfersMade: number;
      throwInsMade: number;
      successfulDefenses: number;
      failedDefenses: number;
      successfulAttacks: number;
      finishedPlace?: number;
    }>;
  };
}
```

Финальный экран (`MatchResultModal`) интерпретирует эти данные так:

- при `outcome = 'normal'` показывает победителя(ей), проигравшего (по `loserId`), места (`placements`) и краткую статистику по игрокам;
- при `outcome = 'draw'` показывает статус ничьей и список участников с местами/статистикой без единственного победителя;
- при `outcome = 'aborted'` показывает, что матч прерван, список участников и доступную статистику без ложного победителя (даже при пустом `winnerIds`).

## Тайм-ауты хода и auto-actions

### Общий и персональные timeout override

- Базовый таймаут хода задаётся через конфигурацию backend:
  - `DURAK_TURN_TIMEOUT_MS` — общий дефолт (мс);
  - `DURAK_TURN_TIMEOUT_PODKIDNOY_MS` / `DURAK_TURN_TIMEOUT_PEREVODNOY_MS` — таймауты по режимам.
- `RoomState` хранит:
  - `turnTimeoutMs` — уже **разрешённый** таймаут текущего хода;
  - `overrideTurnTimeoutMs?: number` — override на уровне комнаты/матча;
  - `perPlayerTimeoutMs?: Record<string, number>` — override для конкретных игроков;
  - `turnStartedAt?: number`, `turnDeadlineAt?: number` — временные метки начала/дедлайна хода.
- Иерархия разрешения таймаута:
  1. Per-player override для активного игрока (defender в `defense`, attacker в других фазах);
  2. `overrideTurnTimeoutMs` комнаты;
  3. таймаут по режиму (`podkidnoy` / `perevodnoy`);
  4. общий дефолт.
- UI комнаты (`RoomPage`) позволяет владельцу:
  - задать общий таймаут комнаты (секунды → мс);
  - задать/сбросить персональные таймауты для каждого игрока/бота;
  - видеть текущий эффективный таймаут и актуальные override’ы.

### Логика throwInPass

- В `game-core` введена команда `throwInPass` и поле `GameState.throwInPassedPlayerIds[]`, фиксирующее игроков, которые завершили участие в текущей фазе подкидывания.
- Валидация:
  - `throwInPass` разрешён только в фазах `attack`/`defense`, когда на столе уже есть карты, и только для атакующих (не защитника).
  - После `throwInPass` любые попытки `throwIn` от этого игрока в текущем раунде отклоняются (`"Player has already passed throw-in this round"`).
- Это позволяет нескольким атакующим участвовать в подкидывании: одни могут пасовать, другие продолжать подкидывать до естественного завершения раунда.

### Поддерживаемые timeout auto-actions

Backend (`RoomsService.handleTurnTimeout`) по истечении дедлайна применяет следующие auto-actions:

- **Defense** (`phase = 'defense'`):
  - если защитник ещё не выбрал `take` (`pendingTake = false`) — auto-`take` для защитника;
  - если защитник уже выбрал `take` (`pendingTake = true`), но атакующий не завершает раунд — auto-`endTurn` для атакующего (завершение подкидывания).
- **Cleanup** (`phase = 'cleanup'`):
  - auto-`endTurn` для атакующего (автоматическое завершение раунда).
- **Start attack** (`phase = 'attack'`, `table.length === 0`):
  - auto-`endTurn` для атакующего (пас стартовой атаки, ход переходит к следующему игроку).
- **Throw-in pass** (`phase = 'attack'`, `table.length > 0` до начала защиты):
  - auto-`throwInPass` для текущего атакующего — он перестаёт подкидывать в этом раунде, но другие атакующие сохраняют свои возможности.

Все эти состояния отражаются в `RoomState` и прокидываются на frontend (через `turnTimeoutMs`, `turnDeadlineAt`, `lastAutoActionMessage` и адаптеры игрового стола).

## Non‑pay‑to‑win политика экономики

- Игровое ядро (`packages/game-core`) не зависит от слоя экономики/монетизации и не знает о кошельке, транзакциях, Stars и т.п.
- Покупки и награды могут изменять только:
  - мягкую валюту (soft);
  - косметику (аватары, рамки, столы, рубашки, бейджи и т.д.);
  - сезонный прогресс/season pass (уровень, XP, доступность декоративных наград).
- Покупки **не могут** влиять на:
  - колоду и порядок карт;
  - правила и ходы;
  - шансы победы, таймеры и доступные действия.
- Эти ограничения зафиксированы:
  - в backend через policy‑слой `assertNonPayToWinGrants` (`apps/backend/src/economy/non-pay-to-win.policy.ts`) и покрыты тестами (`non-pay-to-win.policy.spec.ts`, `payment.service.spec.ts`);
  - на уровне архитектуры через static‑analysis guard `npm run check:architecture` (конфиг `.dependency-cruiser.cjs`), который гарантирует, что `packages/game-core` может импортировать только свои собственные модули и не тянет никакие внешние слои (backend, economy, store, payments, shared DTO с монетизацией и т.д.).

## Авторизация (Этап 1)

- Frontend передаёт в backend сырую строку `initData` из Telegram Web App.
- Backend проверяет подпись (HMAC-SHA256), создаёт/обновляет пользователя и выдаёт JWT.
- Защищённые маршруты требуют заголовок `Authorization: Bearer <token>`.
- Эндпоинты: `POST /auth/telegram` (тело `{ initData }`), `GET /auth/me` (с токеном).

## Production deployment (VPS без Docker)

- **Технологии**
  - Nginx (reverse proxy + static);
  - Node.js (backend `apps/backend/dist/main.js`);
  - PostgreSQL (`DATABASE_URL`);
  - Redis (`REDIS_URL`, если `RATE_LIMIT_STORAGE=redis`);
  - PM2 (process manager для backend).

- **Env для production**
  - Скопируйте `.env.example` → `.env` и задайте реальные значения:
    - `NODE_ENV=production`
    - `DATABASE_URL=postgresql://...` (боевой PostgreSQL)
    - `REDIS_URL=redis://...` (боевой Redis)
    - `JWT_SECRET=<случайный_секрет>`
    - `TELEGRAM_BOT_TOKEN=<токен_бота>`
    - `ADMIN_TELEGRAM_IDS=123456789,987654321` (Telegram ID админов)
    - при использовании Stars:
      - `TELEGRAM_STARS_API_TOKEN=<stars-api-token>`
      - `TELEGRAM_STARS_VERIFY_URL=https://your-stars-verifier.example.com/verify`

- **Build**
  - На VPS (или в CI/CD):
    - `npm install`
    - `npm run build` — соберёт:
      - `apps/frontend/dist` (статический frontend);
      - `apps/backend/dist` (NestJS backend).

- **Backend start**
  - Обычный запуск:
    - `cd apps/backend && node dist/main.js`
  - Рекомендуемый запуск через PM2:
    - PM2‑конфиг: `infra/pm2/ecosystem.config.js`
    - Пример:
      - `pm2 start infra/pm2/ecosystem.config.js --only durak-backend`
      - `pm2 save`

- **Nginx**
  - Прод‑конфиг: `infra/nginx/durak.prod.conf`:
    - статика Mini App:
      - `root /var/www/durak/frontend/dist;`
      - `location / { try_files $uri $uri/ /index.html; }`
    - API:
      - `location /api/ { proxy_pass http://127.0.0.1:3000/; ... }`
    - WebSocket / Socket.IO:
      - `location /socket.io/ { proxy_pass http://127.0.0.1:3000; proxy_set_header Upgrade $http_upgrade; ... }`
    - Health:
      - `location /health { proxy_pass http://127.0.0.1:3000/health; }`

- **DB / Redis readiness**
  - Backend не стартует без `DATABASE_URL`: при ошибке печатает явную инструкцию в stdout.
  - `GET /ready`:
    - проверяет подключение к БД (`SELECT 1` через Prisma);
    - проверяет Redis через `RateLimitService.health()`:
      - `mode: 'memory' | 'redis'`;
      - `status: 'ok' | 'down'`.

- **Дополнительные скрипты**
  - `scripts/deploy-example.sh` — пример деплоя;
  - `scripts/backup-example.sh` — пример бэкапа;
  - `scripts/smoke.js` — smoke‑проверка API.
  - Подробно: `docs/deploy.md`.

## Лицензия

MIT
