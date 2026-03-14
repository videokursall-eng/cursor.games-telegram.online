#!/usr/bin/env node

const { ESLint } = require('eslint');

async function main() {
  const args = process.argv.slice(2);
  const fix = args.includes('--fix');

  const eslint = new ESLint({ fix });
  const results = await eslint.lintFiles(['src/**/*.ts']);

  if (fix) {
    await ESLint.outputFixes(results);
  }

  const formatter = await eslint.loadFormatter('stylish');
  const resultText = formatter.format(results);
  if (resultText) {
    // eslint-disable-next-line no-console
    console.log(resultText);
  }

  const hasErrors = results.some(
    (r) => r.errorCount > 0 || r.fatalErrorCount > 0,
  );
  process.exitCode = hasErrors ? 1 : 0;
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});

