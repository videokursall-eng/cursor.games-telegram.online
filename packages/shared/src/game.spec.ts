import { describe, it, expect } from 'vitest';
import {
  GAME_MODES,
  MIN_PLAYERS,
  MAX_PLAYERS,
  isGameMode,
  isPlayerCountInRange,
} from './index';

describe('isGameMode', () => {
  it('returns true for all supported modes', () => {
    for (const mode of GAME_MODES) {
      expect(isGameMode(mode)).toBe(true);
    }
  });

  it('returns false for unsupported values', () => {
    expect(isGameMode('')).toBe(false);
    expect(isGameMode('PODKIDNOY')).toBe(false);
    expect(isGameMode('other-mode')).toBe(false);
  });
});

describe('isPlayerCountInRange', () => {
  it('accepts boundary values', () => {
    expect(isPlayerCountInRange(MIN_PLAYERS)).toBe(true);
    expect(isPlayerCountInRange(MAX_PLAYERS)).toBe(true);
  });

  it('accepts counts strictly between min and max', () => {
    for (let count = MIN_PLAYERS + 1; count < MAX_PLAYERS; count += 1) {
      expect(isPlayerCountInRange(count)).toBe(true);
    }
  });

  it('rejects counts below and above allowed range', () => {
    expect(isPlayerCountInRange(MIN_PLAYERS - 1)).toBe(false);
    expect(isPlayerCountInRange(MAX_PLAYERS + 1)).toBe(false);
    expect(isPlayerCountInRange(0)).toBe(false);
  });
});


