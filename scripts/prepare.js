#!/usr/bin/env node
'use strict';
const { execSync } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');
process.chdir(root);

try {
  execSync('npm run build:shared', { stdio: 'inherit' });
  execSync('npm run build:game-core', { stdio: 'inherit' });
} catch (e) {
  process.exit(e.status || 1);
}
