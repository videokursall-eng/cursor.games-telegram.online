#!/usr/bin/env node

const { spawnSync } = require('node:child_process');

function run(script) {
  const npmExecPath = process.env.npm_execpath;
  const cmd = npmExecPath ? process.execPath : process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const args = npmExecPath ? [npmExecPath, 'run', script] : ['run', script];

  // eslint-disable-next-line no-console
  console.log(`[build-all] Running "${script}" ...`);
  const res = spawnSync(cmd, args, { stdio: 'inherit' });

  if (res.error) {
    // eslint-disable-next-line no-console
    console.error(`[build-all] Failed to spawn "${script}":`, res.error.message);
    process.exit(1);
  }
  if (res.status !== 0) {
    // eslint-disable-next-line no-console
    console.error(`[build-all] Script "${script}" exited with code`, res.status);
    process.exit(res.status ?? 1);
  }
}

// Generate Prisma client so backend sees correct delegates (user, storeOffer, etc.)
run('db:generate');
run('build:shared');
run('build:game-core');
run('build:frontend');
run('build:backend');

