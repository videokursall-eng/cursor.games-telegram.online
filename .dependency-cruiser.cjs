// Architecture guard for game-core: enforce strict boundaries (allowlist of dependencies).
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'game-core-only-self',
      severity: 'error',
      comment:
        'packages/game-core must only depend on its own modules (no imports from apps/backend, economy, store, payments, shared DTOs with monetization, etc).',
      from: {
        path: '^packages/game-core/src',
      },
      to: {
        pathNot: '^packages/game-core/src',
      },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    includeOnly: '^packages/game-core',
    tsConfig: {
      fileName: './tsconfig.json',
    },
    reporterOptions: {
      dot: {
        collapsePattern: 'node_modules/[^/]+',
      },
    },
  },
};


