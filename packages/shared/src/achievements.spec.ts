import { describe, it, expect } from 'vitest';
import { ACHIEVEMENTS_REGISTRY, resolveAchievementMeta } from './achievements';

describe('ACHIEVEMENTS_REGISTRY', () => {
  it('contains known achievement codes with metadata', () => {
    const codes = ACHIEVEMENTS_REGISTRY.map((a) => a.code);
    expect(codes).toContain('first_match');
    expect(codes).toContain('first_win');
    expect(codes).toContain('win_streak_3');
    expect(codes).toContain('matches_10');
    expect(codes).toContain('win_perevodnoy');

    const firstMatch = resolveAchievementMeta('first_match');
    expect(firstMatch).toBeDefined();
    expect(firstMatch!.name).toBeTypeOf('string');
    expect(firstMatch!.description).toBeTypeOf('string');
    expect(firstMatch!.icon).toBeTypeOf('string');
    expect(firstMatch!.targetValue).toBeGreaterThan(0);
  });

  it('resolveAchievementMeta returns undefined for unknown code', () => {
    expect(resolveAchievementMeta('unknown_code')).toBeUndefined();
  });
});

