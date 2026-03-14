/**
 * Shared helpers for timer-based tests. Use these instead of runOnlyPendingTimers()
 * so only the intended timer fires (e.g. bot delay), not long turn timeouts.
 */

const DEFAULT_BOT_DELAY_MS = 10;
const DEFAULT_TURN_TIMEOUT_MS = 30_000;
const MARGIN_MS = 5;

type JestAdvance = { advanceTimersByTime: (ms: number) => void };

/**
 * Bot action delay used in tests (from env DURAK_BOT_ACTION_DELAY_MS or default).
 * Call after setting process.env.DURAK_BOT_ACTION_DELAY_MS in beforeEach.
 */
export function getBotDelayMs(): number {
  const fromEnv = process.env.DURAK_BOT_ACTION_DELAY_MS;
  const parsed = fromEnv ? Number.parseInt(fromEnv, 10) : NaN;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_BOT_DELAY_MS;
}

/**
 * Advance fake timers by just enough to trigger the bot action timer,
 * without triggering the (much longer) turn timeout. Use in bot lifecycle tests.
 */
export function advanceBotDelay(jestInstance: JestAdvance): void {
  const delay = getBotDelayMs();
  jestInstance.advanceTimersByTime(delay + MARGIN_MS);
}

/**
 * Advance fake timers by the default turn timeout duration so that
 * handleTurnTimeout runs (e.g. auto take / endTurn / throwInPass).
 * Use in rooms.service timeout tests; avoids running bot timers when
 * both are pending.
 */
export function advanceTurnTimeout(jestInstance: JestAdvance, ms: number = DEFAULT_TURN_TIMEOUT_MS): void {
  jestInstance.advanceTimersByTime(ms + MARGIN_MS);
}
