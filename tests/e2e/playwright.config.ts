import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const root = path.resolve(__dirname, '..', '..');

const backendPort = process.env.E2E_BACKEND_PORT || '3001';
const frontendPort = process.env.E2E_FRONTEND_PORT || '5173';
const backendUrl = process.env.E2E_BACKEND_URL || `http://localhost:${backendPort}`;
const frontendUrl = process.env.E2E_FRONTEND_URL || `http://localhost:${frontendPort}`;

export default defineConfig({
  testDir: __dirname,
  testMatch: /.*\.spec\.ts/,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: frontendUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'node dist/main.js',
      cwd: path.join(root, 'apps', 'backend'),
      url: `${backendUrl.replace(/\/$/, '')}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      env: {
        PORT: backendPort,
        E2E_SECRET: 'e2e-test-secret',
        DURAK_BOT_ACTION_DELAY_MS: '100',
      },
    },
    {
      command: `npx vite preview --port ${frontendPort}`,
      cwd: path.join(root, 'apps', 'frontend'),
      url: frontendUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 15_000,
    },
  ],
});
