import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

function ensureDatabaseConfig(): void {
  const url = process.env.DATABASE_URL;
  if (!url) {
    // Явная и понятная диагностика вместо падения глубоко в Prisma.$connect().
    // Не разрешаем запуск без БД, просто объясняем, что нужно сделать.
    // eslint-disable-next-line no-console
    console.error(
      [
        '',
        'DATABASE_URL is not set. Backend cannot start without a PostgreSQL database.',
        '',
        'To fix this:',
        '  1) Set DATABASE_URL in your .env (see .env.example).',
        '  2) Run migrations:  npm run prisma:migrate',
        '  3) (Optional) Verify DB: npm run prisma:check',
        '',
        'If you use a dedicated test database, point DATABASE_URL to it before running tests or e2e.',
        '',
      ].join('\n'),
    );
    process.exit(1);
  }
}

async function bootstrap() {
  ensureDatabaseConfig();

  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? true,
    credentials: true,
  });
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  return port;
}

bootstrap().then((port) => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on http://localhost:${port}`);
});
