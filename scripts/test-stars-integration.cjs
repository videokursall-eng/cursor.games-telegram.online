#!/usr/bin/env node

const path = require('node:path');

// Minimal integration runner for Telegram Stars verification provider.
// - If required env vars are missing, prints a clear message and exits 0.
// - If env vars are present, instantiates the real provider and runs a single verification call.

const requiredEnv = ['TELEGRAM_STARS_API_TOKEN', 'TELEGRAM_STARS_VERIFY_URL', 'TELEGRAM_STARS_TEST_CHARGE_ID'];

const missing = requiredEnv.filter((k) => !process.env[k]);

if (missing.length > 0) {
  // Do not fail CI when env is not configured; just report status.
  // eslint-disable-next-line no-console
  console.log(
    '[stars-integration] Skipping real Telegram Stars verification. Missing env:',
    missing.join(', '),
  );
  process.exit(0);
}

// Dynamically require backend Payment provider.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { TelegramStarsApiVerificationService } = require(path.join(
  __dirname,
  '..',
  'apps',
  'backend',
  'dist',
  'economy',
  'payment.service',
));

// eslint-disable-next-line @typescript-eslint/no-var-requires,@typescript-eslint/no-explicit-any
const axios = require('axios');

async function main() {
  const service = new TelegramStarsApiVerificationService(axios);

  const intent = {
    id: 'pi_integration_smoke',
    userId: 'integration-user',
    status: 'pending',
    currency: 'stars',
    amount: 1,
    grants: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const payload = {
    telegramPaymentChargeId: process.env.TELEGRAM_STARS_TEST_CHARGE_ID,
  };

  // eslint-disable-next-line no-console
  console.log('[stars-integration] Running real verification via', process.env.TELEGRAM_STARS_VERIFY_URL);
  const ok = await service.verifyTelegramStarsPayment(intent, payload);

  if (!ok) {
    // eslint-disable-next-line no-console
    console.error('[stars-integration] Verification FAILED. Check Stars verifier endpoint or test charge id.');
    process.exit(1);
  }

  // eslint-disable-next-line no-console
  console.log('[stars-integration] Verification OK.');
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[stars-integration] Unexpected error:', err && err.message ? err.message : err);
  process.exit(1);
});

