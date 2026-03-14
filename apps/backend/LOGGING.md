## Logging in backend

The backend uses a small structured logging wrapper around `console.log` to produce JSON logs that are easy to collect and search in external tooling.

### StructuredLoggerService

`StructuredLoggerService` lives in `src/logging/structured-logger.service.ts` and exposes four methods:

- `debug(message, meta?)`
- `info(message, meta?)`
- `warn(message, meta?)`
- `error(message, meta?)`

Each call produces a single JSON line with at least:

- `timestamp` — ISO string
- `level` — one of `debug | info | warn | error`
- `message` — short event name

And optional fields when provided in `meta`:

- `service` — module or class name (e.g. `AuthController`, `PaymentService`)
- `requestId` / `correlationId`
- `userId`
- `roomId`
- `matchId`
- any additional safe fields you pass

Sensitive keys such as `password`, `token`, `secret`, `rawPayload`, `initData`, `authorization`, `cookie` are **skipped** automatically. Arbitrary objects under keys like `headers`, `payload`, `body`, `data`, `meta` and `context` are logged as `[redacted_object]`, and other complex values are reduced to `[object]` with long strings truncated, so external provider payloads and raw auth data cannot accidentally leak into logs.

### Where logging is wired

The `LoggingModule` (`src/logging/logging.module.ts`) provides and exports `StructuredLoggerService`. It is imported into modules that need logging:

- `AuthModule` — auth controller logs Telegram/e2e bootstrap events
- `RoomsModule` (via `LoggingModule` and services) — logs room/match lifecycle and game actions (including auto-actions on timeouts)
- `RealtimeModule` — websocket gateway logs connections/disconnects; `RealtimeService` logs join/leave, duplicate commands, out-of-order messages and reconnect mismatches
- `EconomyModule` — payment service logs purchase intents and completions
- `AdminModule` — admin audit service logs admin actions

Most high‑level admin actions are logged via `AdminAuditService.log`, which also writes into the `AdminActionLog` Prisma model for long‑term storage.

### Usage

Inject `StructuredLoggerService` into your controller/service and call it with a short message and structured metadata:

```ts
this.logger.info('room_created', {
  service: 'RoomsService',
  userId: ownerId,
  roomId: room.id,
  mode: params.mode,
});
```

Avoid putting secrets or raw provider payloads into the metadata; log only identifiers and high‑level fields that are safe to export. The logger already ignores some obvious keys, but you should still keep metadata minimal and non‑sensitive.

### Conflict and reconnect cases

The realtime/game layer distinguishes several conflict cases and logs them as separate structured events:

- `duplicate_command` — client re-sent a command with an already processed `clientCommandId` (idempotent replay)
- `out_of_order_message` — command carries `clientSeq` that is **behind** current `serverSeq` for the room
- `reconnect_mismatch` — command carries `clientSeq` that is **ahead of** current `serverSeq` (client is out of sync after reconnect)
- `turn_timeout_stale_ignored` — internal timer fired for an outdated deadline and was safely ignored

In all of these cases the server does **not** mutate game state and typically returns the latest snapshot so the client can resync. Logs always include at least `roomId`, and, where applicable, `userId`, `requestId` (usually `clientCommandId`) and `serverSeq`/`clientSeq` for later analysis.

On the frontend, `clientSeq` is generated per-room in `useGameActions` and attached to every `/rooms/:id/action` payload so that the backend can distinguish out-of-order messages from reconnect mismatches based on real client-side sequencing.


