import { ACHIEVEMENTS_REGISTRY } from 'shared';

/**
 * Backwards-compatible re-export for stats service.
 * Source of truth lives in packages/shared/src/achievements.ts.
 */
export const ACHIEVEMENTS = ACHIEVEMENTS_REGISTRY;

export type AchievementCode = (typeof ACHIEVEMENTS)[number]['code'];
