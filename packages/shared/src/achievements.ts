export interface AchievementMeta {
  code: string;
  name: string;
  description: string;
  icon: string;
  targetValue: number;
}

export const ACHIEVEMENTS_REGISTRY: AchievementMeta[] = [
  {
    code: 'first_match',
    name: 'Первая партия',
    description: 'Сыграйте свой первый матч.',
    icon: '🎲',
    targetValue: 1,
  },
  {
    code: 'first_win',
    name: 'Первая победа',
    description: 'Выиграйте хотя бы один матч.',
    icon: '🏆',
    targetValue: 1,
  },
  {
    code: 'win_streak_3',
    name: '3 победы подряд',
    description: 'Соберите серию из трёх побед подряд.',
    icon: '🔥',
    targetValue: 3,
  },
  {
    code: 'matches_10',
    name: '10 матчей',
    description: 'Сыграйте 10 матчей в любых режимах.',
    icon: '📈',
    targetValue: 10,
  },
  {
    code: 'win_perevodnoy',
    name: 'Победа в переводного',
    description: 'Победите в режиме переводного дурака.',
    icon: '🔁',
    targetValue: 1,
  },
];

export type AchievementCode = (typeof ACHIEVEMENTS_REGISTRY)[number]['code'];

export function resolveAchievementMeta(code: string): AchievementMeta | undefined {
  return ACHIEVEMENTS_REGISTRY.find((a) => a.code === code);
}

