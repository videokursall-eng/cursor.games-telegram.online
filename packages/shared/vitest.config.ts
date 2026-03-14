import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Shared package tests are pure-TS DTO/contract checks.
    // On some Windows/V8 setups, coverage + default worker pool occasionally
    // trigger native crashes (exit code 3221225477). We run them in a small,
    // single-worker pool without coverage to keep the run stable.
    pool: 'forks',
    maxWorkers: 1,
    minWorkers: 1,
    fileParallelism: false,
    coverage: {
      enabled: false,
    },
  },
});

