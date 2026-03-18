const ACHIEVEMENTS_REGISTRY = [
  {
    code: 'first_win',
    name: 'Первая победа',
    description: 'Выиграйте первый матч.',
    icon: '🏆',
  },
  {
    code: 'win_streak_3',
    name: 'Серия x3',
    description: 'Выиграйте 3 матча подряд.',
    icon: '🔥',
  },
  {
    code: 'veteran_10',
    name: 'Ветеран',
    description: 'Сыграйте 10 матчей.',
    icon: '🎖️',
  },
];

function emptyWallet(userId, currency = 'soft') {
  return {
    userId,
    currency,
    balance: 0,
    updatedAt: new Date(0).toISOString(),
  };
}

function emptyAggregatedStats() {
  return {
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    winRate: 0,
    currentWinStreak: 0,
    bestWinStreak: 0,
    averageMatchDurationMs: 0,
    totalMatchDurationMs: 0,
    favoriteMode: null,
    perModeTotals: {
      podkidnoy: { matchesPlayed: 0, wins: 0, losses: 0, draws: 0 },
      perevodnoy: { matchesPlayed: 0, wins: 0, losses: 0, draws: 0 },
    },
  };
}

function resolveAchievementMeta(code) {
  return ACHIEVEMENTS_REGISTRY.find((item) => item.code === code) || null;
}

module.exports = {
  ACHIEVEMENTS_REGISTRY,
  emptyWallet,
  emptyAggregatedStats,
  resolveAchievementMeta,
};
