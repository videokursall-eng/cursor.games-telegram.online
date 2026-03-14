#!/usr/bin/env node
'use strict';

/**
 * DB doctor / status script.
 *
 * - Checks whether DATABASE_URL is set.
 * - Validates Prisma schema.
 * - Attempts basic migrate status when DATABASE_URL is present.
 * - Prints clear diagnostic messages when DB is not configured / unreachable.
 *
 * This script is intentionally read-only: it does not apply migrations.
 */

const { spawnSync } = require('child_process');
const path = require('path');

function run(cmd, args, opts) {
  const result = spawnSync(cmd, args, {
    cwd: opts.cwd,
    stdio: 'inherit',
    env: opts.env ?? process.env,
  });
  return result.status ?? 0;
}

function section(title) {
  // eslint-disable-next-line no-console
  console.log(`\n=== ${title} ===\n`);
}

const root = path.resolve(__dirname, '..');

section('Prisma schema validation');
const validateStatus = run(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['prisma', 'validate'], { cwd: root });
if (validateStatus !== 0) {
  // eslint-disable-next-line no-console
  console.error('\n[db:doctor] Prisma schema is not valid. Fix schema.prisma before running DB migrations.\n');
  process.exit(1);
}

section('Prisma client generate (dry-run)');
const generateStatus = run(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['prisma', 'generate', '--print'], {
  cwd: root,
});
if (generateStatus !== 0) {
  // eslint-disable-next-line no-console
  console.error('\n[db:doctor] Prisma client generation failed. See output above.\n');
  process.exit(1);
}

section('Database connectivity & migration status');
const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  // eslint-disable-next-line no-console
  console.log(
    [
      '[db:doctor] DATABASE_URL is not set.',
      'Schema and migrations look valid, but no database is configured in this environment.',
      '',
      'To configure a local dev DB quickly:',
      '  1) Copy env template:   cp .env.example .env',
      '  2) Start Postgres:      npm run db:up',
      '  3) Prepare dev DB:      npm run db:prepare',
      '',
      'For test/e2e DB:',
      '  1) Copy env template:   cp .env.test.example .env.test',
      '  2) Start Postgres:      npm run db:up',
      '  3) Prepare test DB:     npm run db:test:prepare',
      '',
      'You can still run `npm run prisma:generate` and tests that use mocks without a real DB.',
    ].join('\n'),
  );
  process.exit(0);
}

const statusCode = run(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['prisma', 'migrate', 'status'], {
  cwd: root,
});

if (statusCode !== 0) {
  // eslint-disable-next-line no-console
  console.error(
    [
      '',
      '[db:doctor] Prisma migrate status failed.',
      'Most common reasons:',
      '  - Database is not reachable (P1001).',
      '  - Migrations have not been applied yet.',
      '',
      'Try:',
      '  - Ensure Postgres is running (e.g. npm run db:up)',
      '  - Apply migrations:      npm run prisma:migrate',
      '  - Or for dev DB:        npm run db:prepare',
      '',
    ].join('\n'),
  );
  process.exit(1);
}

// eslint-disable-next-line no-console
console.log('\n[db:doctor] DB is reachable and Prisma migrations look consistent.\n');

