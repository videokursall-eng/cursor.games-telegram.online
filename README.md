# Durak Telegram Mini App

Архив подготовлен для развёртывания без `node_modules`.

Что добавлено в эту версию архива:
- корневой `package.json` с npm workspaces;
- пакет `packages/shared`, который закрывает зависимости `shared` для frontend/backend;
- `.env.example` для быстрого старта на VPS;
- исходники и готовые `dist`-сборки сохранены.

## Быстрый старт

```bash
npm install
cp .env.example .env
npm run build
```

Для production-развёртывания используйте инструкции из `docs/deploy.md`.
