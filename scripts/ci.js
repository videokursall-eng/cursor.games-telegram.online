#!/usr/bin/env node
'use strict';
const { execSync } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');
process.chdir(root);

const steps = [
  { name: 'lint', cmd: 'npm run lint' },
  { name: 'typecheck', cmd: 'npm run typecheck' },
  { name: 'test', cmd: 'npm run test' },
  { name: 'build', cmd: 'npm run build' },
];

for (const step of steps) {
  console.log(`\n--- CI: ${step.name} ---\n`);
  try {
    execSync(step.cmd, { stdio: 'inherit' });
  } catch (e) {
    const code = e.status ?? e.error?.status ?? 1;
    console.error(`CI failed at step: ${step.name}`);
    process.exit(typeof code === 'number' ? code : 1);
  }
}

console.log('\n--- CI: all steps passed ---\n');
