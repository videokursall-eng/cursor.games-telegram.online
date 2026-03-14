#!/usr/bin/env node
'use strict';

/**
 * Cross-platform Playwright test launcher.
 * Runs @playwright/test CLI via Node so paths with spaces (e.g. "Program Files") work on Windows.
 * Usage: node scripts/run-playwright.cjs [playwright args...]
 * Example: node scripts/run-playwright.cjs test -c tests/e2e/playwright.config.ts
 */

const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const cliPath = path.join(root, 'node_modules', '@playwright', 'test', 'cli.js');

const result = spawnSync(process.execPath, [cliPath, ...process.argv.slice(2)], {
  stdio: 'inherit',
  cwd: root,
  env: process.env,
  windowsHide: true,
});

process.exit(result.status ?? 1);
