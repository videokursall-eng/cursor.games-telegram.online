import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AuthSessionPayload } from 'shared';
import { InitDataValidator, type ValidatedInitData } from './init-data.validator';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  private readonly validator: InitDataValidator;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {
    const token = process.env.TELEGRAM_BOT_TOKEN || '';
    this.validator = new InitDataValidator(token);
  }

  validateInitData(initDataRaw: string): ValidatedInitData | null {
    return this.validator.validate(initDataRaw);
  }

  async loginWithTelegram(initDataRaw: string): Promise<{ accessToken: string; user: { id: string; telegramId: number } } | null> {
    const validated = this.validateInitData(initDataRaw);
    if (!validated?.user) return null;

    const user = await this.usersService.createOrUpdateFromTelegram(validated.user);
    const payload: AuthSessionPayload = {
      userId: user.id,
      telegramId: user.telegramId,
    };
    const accessToken = this.jwtService.sign(payload);
    return {
      accessToken,
      user: { id: user.id, telegramId: user.telegramId },
    };
  }

  verifyToken(token: string): AuthSessionPayload | null {
    try {
      return this.jwtService.verify<AuthSessionPayload>(token);
    } catch {
      return null;
    }
  }

  /** E2E only: sign a payload to get a JWT (no Telegram validation). */
  signPayload(payload: AuthSessionPayload): string {
    return this.jwtService.sign(payload);
  }
}
