import { Test, TestingModule } from '@nestjs/testing';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { PrismaService } from '../prisma/prisma.service';
import { createMockPrismaService } from '../prisma/prisma.service.mock';
import { StructuredLoggerService } from '../logging/structured-logger.service';
import { RateLimitGuard } from '../rate-limit/rate-limit.guard';
import { RateLimitService } from '../rate-limit/rate-limit.service';
import { createHmac } from 'crypto';

function buildValidInitData(botToken: string) {
  const user = { id: 456, first_name: 'Spec' };
  const auth_date = Math.floor(Date.now() / 1000);
  const params = new URLSearchParams();
  params.set('user', JSON.stringify(user));
  params.set('auth_date', String(auth_date));
  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const hash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  params.set('hash', hash);
  return params.toString();
}

describe('AuthController', () => {
  let controller: AuthController;
  const botToken = 'test-bot-token-for-spec';

  beforeEach(async () => {
    process.env.TELEGRAM_BOT_TOKEN = botToken;
    process.env.RATE_LIMIT_STORAGE = 'memory';
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        UsersModule,
        JwtModule.register({ secret: 'jwt-secret', signOptions: { expiresIn: '1h' } }),
      ],
      controllers: [AuthController],
      providers: [
        AuthService,
        RateLimitGuard,
        RateLimitService,
        {
          provide: StructuredLoggerService,
          useValue: {
            info: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(createMockPrismaService())
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('returns ok and token for valid initData', async () => {
    const initData = buildValidInitData(botToken);
    const result = await controller.telegram({ initData });
    expect(result).toMatchObject({ ok: true });
    expect(result.accessToken).toBeDefined();
    expect(result.user).toMatchObject({ telegramId: 456 });
  });

  it('returns error for invalid initData', async () => {
    const result = await controller.telegram({ initData: 'invalid' });
    expect(result).toMatchObject({ ok: false, error: 'Invalid or expired initData' });
  });

  describe('e2e-bootstrap', () => {
    it('returns 403 when E2E_SECRET is not set', async () => {
      delete process.env.E2E_SECRET;
      await expect(controller.e2eBootstrap()).rejects.toThrow('E2E auth not enabled');
    });

    it('returns token and user when E2E_SECRET is set', async () => {
      process.env.E2E_SECRET = 'e2e-test-secret';
      const result = await controller.e2eBootstrap();
      expect(result).toMatchObject({ ok: true });
      expect(result.accessToken).toBeDefined();
      expect(result.user).toMatchObject({ telegramId: 1 });
    });
  });
});
