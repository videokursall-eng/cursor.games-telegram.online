#!/usr/bin/env node
'use strict';
// Smoke test: ensure backend is running (npm run dev:backend or node apps/backend/dist/main.js)
const http = require('http');

const BASE = process.env.API_URL || 'http://localhost:3000';

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(path, BASE);
    const req = http.request(
      {
        method,
        hostname: u.hostname,
        port: u.port || 80,
        path: u.pathname,
        headers: body ? { 'Content-Type': 'application/json' } : {},
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null });
          } catch {
            resolve({ status: res.statusCode, body: data });
          }
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  console.log('Smoke: GET', BASE + '/health');
  const health = await request('GET', '/health');
  if (health.status !== 200 || health.body?.status !== 'ok') {
    console.error('Health check failed', health);
    process.exit(1);
  }
  console.log('  OK');

  // Дополнительные проверки (auth, rooms, realtime) будут добавлены на следующих этапах.
  console.log('\nSmoke checks passed (basic health).');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
