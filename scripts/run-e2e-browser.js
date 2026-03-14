#!/usr/bin/env node
'use strict';

const { spawn } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');
process.chdir(root);

const { findFreePorts } = require('./find-free-port.js');

async function main() {
  const [backendPort, frontendPort] = await findFreePorts(2);
  const backendUrl = `http://127.0.0.1:${backendPort}`;
  const frontendUrl = `http://127.0.0.1:${frontendPort}`;

  const env = {
    ...process.env,
    E2E_BACKEND_PORT: String(backendPort),
    E2E_FRONTEND_PORT: String(frontendPort),
    E2E_BACKEND_URL: backendUrl,
    E2E_FRONTEND_URL: frontendUrl,
  };

  console.log('E2E ports: backend=%s frontend=%s', backendPort, frontendPort);

  function run(cmd, args, opts = {}) {
    return new Promise((resolve, reject) => {
      const useShell = opts.shell !== false && process.platform === 'win32';
      const p = spawn(cmd, args, {
        stdio: 'inherit',
        shell: useShell,
        env: opts.env || env,
        cwd: opts.cwd || root,
      });
      p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`Exit ${code}`))));
    });
  }

  console.log('\n--- E2E: build backend ---\n');
  await run('npm', ['run', 'build:backend']);

  console.log('\n--- E2E: build frontend (VITE_API_URL=%s) ---\n', backendUrl);
  await run('npm', ['run', 'build:frontend'], {
    env: { ...env, VITE_API_URL: backendUrl },
  });

  console.log('\n--- E2E: run Playwright ---\n');
  await run('node', [path.join(root, 'scripts', 'run-playwright.cjs'), 'test', '-c', 'tests/e2e/playwright.config.ts'], {
    env,
    shell: false,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
