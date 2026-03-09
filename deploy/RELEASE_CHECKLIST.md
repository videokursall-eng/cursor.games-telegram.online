# Release checklist (Durak Telegram Mini App)

## Before deploy

- [ ] Проверить, что main/master зелёный (CI passed)
- [ ] Прогнать локально:
  - [ ] `cd backend && npm test`
  - [ ] `cd frontend && npm test -- --run`
- [ ] Выполнить миграции БД на staging:
  - [ ] `npm run build` в `backend`
  - [ ] `NODE_ENV=production node dist/infrastructure/db/migrate.js`
- [ ] Прогнать smoke-тесты на staging (см. `deploy/SMOKE_TESTS.md`)

## Deploy backend

- [ ] Скопировать новый release на VPS в `/var/www/app.games-telegram.online/releases/<tag>`
- [ ] Обновить symlink `current` на новый release
- [ ] `sudo systemctl restart durak-backend.service`
- [ ] Проверить `sudo systemctl status durak-backend.service`

## Deploy frontend

- [ ] Сборка фронтенда через `durak-frontend-build.service`
- [ ] Проверить, что статика обновилась в `/var/www/app.games-telegram.online/current/frontend/dist`

## Post-deploy

- [ ] Проверить `/healthz` и `/api/health`
- [ ] Прогнать smoke-тесты
- [ ] Проверить логи:
  - [ ] `/var/www/app.games-telegram.online/shared/logs/backend.log`
  - [ ] `/var/www/app.games-telegram.online/shared/logs/frontend-access.log`

