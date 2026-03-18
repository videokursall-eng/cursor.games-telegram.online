import { spawn, type ChildProcess } from 'child_process';

const DEFAULT_PORT = 3001;
const E2E_SECRET = 'e2e-test-secret';

let serverProcess: ChildProcess | null = null;

function waitForPort(port: number, timeoutMs: number): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const http = require('http');
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryConnect = () => {
      const req = http.request(
        {
          host: 'localhost',
          port,
          path: '/',
          method: 'GET',
          timeout: 500,
        },
        () => resolve(),
      );
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Port ${port} did not become ready in time`));
          return;
        }
        setTimeout(tryConnect, 100);
      });
      req.end();
    };
    tryConnect();
  });
}

/**
 * Start the backend server for e2e tests. Uses the built dist/main.js.
 * Set E2E_SECRET so POST /auth/e2e-token works.
 */
export async function startTestServer(port: number = DEFAULT_PORT): Promise<{ port: number; baseUrl: string }> {
  if (serverProcess) {
    return { port, baseUrl: `http://localhost:${port}` };
  }
  if (!process.env.DATABASE_URL) {
    // eslint-disable-next-line no-console
    console.error(
      [
        '',
        '[e2e] DATABASE_URL is not set.',
        'HTTP e2e tests require a real PostgreSQL database.',
        '',
        'Set DATABASE_URL (or use a dedicated test database) before running:',
        '  npm run test:e2e:db    # real DB e2e',
        'or:',
        '  DATABASE_URL=postgresql://user:pass@localhost:5432/durak npm run e2e:http',
        '',
      ].join('\n'),
    );
    throw new Error('Missing DATABASE_URL for e2e server');
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pathMod = require('path');
  const distMain = pathMod.join(process.cwd(), 'dist', 'main.js');
  serverProcess = spawn('node', [distMain], {
    env: {
      ...process.env,
      PORT: String(port),
      E2E_SECRET: E2E_SECRET,
      DURAK_BOT_ACTION_DELAY_MS: '50',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    cwd: process.cwd(),
  });
  serverProcess.stdout?.on('data', (d: Buffer) => process.stdout.write(d));
  serverProcess.stderr?.on('data', (d: Buffer) => process.stderr.write(d));
  await waitForPort(port, 15_000);
  return { port, baseUrl: `http://localhost:${port}` };
}

export function stopTestServer(): void {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    serverProcess = null;
  }
}

export function getE2ESecret(): string {
  return E2E_SECRET;
}
