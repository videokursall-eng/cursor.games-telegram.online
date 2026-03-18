import { INestApplication, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AuthController } from '../auth/auth.controller';
import { AuthService } from '../auth/auth.service';
import { UsersModule } from '../users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { RateLimitModule } from './rate-limit.module';
import { LoggingModule } from '../logging/logging.module';
import { PrismaService } from '../prisma/prisma.service';
import { createMockPrismaService } from '../prisma/prisma.service.mock';

@Module({
  imports: [UsersModule, RateLimitModule, LoggingModule, JwtModule.register({ secret: 'test-secret', signOptions: { expiresIn: '1h' } })],
  controllers: [AuthController],
  providers: [AuthService],
})
class RateLimitTestModule {}

describe('RateLimitGuard e2e for auth/telegram', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'dummy-bot-token';
    const moduleBuilder = Test.createTestingModule({
      imports: [RateLimitTestModule],
    });
    const moduleRef = await moduleBuilder
      .overrideProvider(PrismaService)
      .useValue(createMockPrismaService())
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    delete process.env.TELEGRAM_BOT_TOKEN;
  });

  it('allows requests under limit and then rejects when limit exceeded', async () => {
    const server = app.getHttpServer();

    // Under limit
    await request(server).post('/auth/telegram').send({ initData: 'invalid' }).expect(201);
    await request(server).post('/auth/telegram').send({ initData: 'invalid' }).expect(201);
    // Our configured limit is 10/min per IP; we simulate hitting the same endpoint multiple times quickly.
    for (let i = 0; i < 8; i++) {
      await request(server).post('/auth/telegram').send({ initData: 'invalid' });
    }
    // Next burst should be rejected with a rate limit error
    const res = await request(server).post('/auth/telegram').send({ initData: 'invalid' });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

