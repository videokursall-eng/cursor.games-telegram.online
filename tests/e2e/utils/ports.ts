/**
 * E2E port/URL helpers.
 * When browser e2e is run via `npm run e2e` (scripts/run-e2e-browser.js),
 * the launcher sets E2E_BACKEND_URL and E2E_FRONTEND_URL (and _PORT variants).
 * Playwright config reads these; specs can use getBackendUrl() for API calls.
 */

const defaultBackend = 'http://localhost:3001';
const defaultFrontend = 'http://localhost:5173';

export function getBackendUrl(): string {
  return process.env.E2E_BACKEND_URL || defaultBackend;
}

export function getFrontendUrl(): string {
  return process.env.E2E_FRONTEND_URL || defaultFrontend;
}

export function getBackendPort(): string {
  return process.env.E2E_BACKEND_PORT || '3001';
}

export function getFrontendPort(): string {
  return process.env.E2E_FRONTEND_PORT || '5173';
}
