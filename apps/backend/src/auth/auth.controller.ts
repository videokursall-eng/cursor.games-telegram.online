import { Body, Controller, ForbiddenException, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Session } from './session.decorator';
import type { AuthSessionPayload } from 'shared';
import { UsersService } from '../users/users.service';
import { StructuredLoggerService } from '../logging/structured-logger.service';
import { RateLimit } from '../rate-limit/rate-limit.decorator';
import { RateLimitGuard } from '../rate-limit/rate-limit.guard';

export class TelegramAuthDto {
  initData!: string;
}

export class E2ETokenDto {
  secret!: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly logger: StructuredLoggerService,
  ) {}

  @Post('telegram')
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 10, windowMs: 60_000, keyType: 'ip' })
  async telegram(@Body() body: TelegramAuthDto) {
    // Временная диагностика: логируем длину initData, чтобы убедиться, что фронт что‑то присылает.
    // eslint-disable-next-line no-console
    console.log('[AuthController] INIT DATA RECEIVED length:', body.initData ? body.initData.length : 0);
    const result = await this.authService.loginWithTelegram(body.initData ?? '');
    if (!result) {
      this.logger.warn('telegram_auth_failed', {
        service: 'AuthController',
        reason: 'invalid_init_data',
      });
      return { ok: false, error: 'Invalid or expired initData' };
    }
    this.logger.info('telegram_auth_success', {
      service: 'AuthController',
      userId: result.user.id,
      telegramId: result.user.telegramId,
    });
    return { ok: true, accessToken: result.accessToken, user: result.user };
  }

  @Post('e2e-token')
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 20, windowMs: 60_000, keyType: 'ip' })
  async e2eToken(@Body() body: E2ETokenDto) {
    const secret = process.env.E2E_SECRET;
    if (!secret || body.secret !== secret) {
      return { ok: false, error: 'Forbidden' };
    }
    const user = await this.usersService.getOrCreateE2EUser(1);
    const token = this.authService.signPayload({
      userId: user.id,
      telegramId: user.telegramId,
    });
    this.logger.info('e2e_token_issued', {
      service: 'AuthController',
      userId: user.id,
    });
    return {
      ok: true,
      accessToken: token,
      user: { id: user.id, telegramId: user.telegramId },
    };
  }

  /**
   * Runtime e2e auth bootstrap: returns token when backend is in e2e mode (E2E_SECRET set).
   * No secret in request — server decides by env. Used by frontend with ?e2e=1 on any build.
   */
  @Get('e2e-bootstrap')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 20, windowMs: 60_000, keyType: 'ip' })
  async e2eBootstrap() {
    if (!process.env.E2E_SECRET) {
      throw new ForbiddenException('E2E auth not enabled');
    }
    const user = await this.usersService.getOrCreateE2EUser(1);
    const token = this.authService.signPayload({
      userId: user.id,
      telegramId: user.telegramId,
    });
    this.logger.info('e2e_bootstrap_issued', {
      service: 'AuthController',
      userId: user.id,
    });
    return {
      ok: true,
      accessToken: token,
      user: { id: user.id, telegramId: user.telegramId },
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Session() session: AuthSessionPayload) {
    return { userId: session.userId, telegramId: session.telegramId };
  }
}
