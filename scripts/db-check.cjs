#!/usr/bin/env node
'use strict';

/**
 * Simple DB preflight check for local/dev/CI.
 *
 * - Verifies DATABASE_URL is set.
 * - Runs `prisma migrate status` to check connectivity and migration status.
 *
 * Usage:
 *   npm run db:check
 *   npm run prisma:check
 */

const { spawnSync } = require('child_process');
const path = require('path');

function fail(message) {
  // eslint-disable-next-line no-console
  console.error(`\n[db-check] ${message}\n`);
  process.exit(1);
}

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  fail(
    [
      'DATABASE_URL is not set.',
      'Backend and Prisma need a PostgreSQL connection string to run.',
      '',
      'To get a local dev/test DB quickly:',
      '  1) Start Postgres via Docker:    npm run db:up',
      '  2) For dev DB:                   export DATABASE_URL=postgresql://durak:durak@localhost:5432/durak',
      '  3) For test DB (e2e):            export DATABASE_URL=postgresql://durak:durak@localhost:5433/durak_test',
      '',
      'Or use env templates:',
      '  - .env.example        (dev DB on 5432)',
      '  - .env.test.example   (test DB on 5433)',
      '',
      'Then prepare DB:',
      '  - Dev:   npm run db:prepare',
      '  - Test:  npm run db:test:prepare',
    ].join('\n'),
  );
}

// Run `prisma migrate status` from repo root.
const root = path.resolve(__dirname, '..');
const result = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['prisma', 'migrate', 'status', '--schema', path.join(root, 'prisma', 'schema.prisma')],
  {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  },
);

if (result.status !== 0) {
  fail(
    [
      'Prisma migrate status failed.',
      'Make sure your database is reachable and migrations are applied.',
      '',
      'Typical fixes:',
      '  - Check DATABASE_URL in .env / .env.test',
      '  - Ensure PostgreSQL is running (e.g., npm run db:up)',
      '  - Apply migrations: npm run prisma:migrate  (or npm run db:prepare)',
    ].join('\n'),
  );
}

// eslint-disable-next-line no-console
console.log('\n[db-check] Database reachable and Prisma migrations look OK.\n');

