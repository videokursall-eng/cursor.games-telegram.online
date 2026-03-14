import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthSessionPayload } from 'shared';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request & { user?: AuthSessionPayload }>();
    const user = req.user;

    const raw = process.env.ADMIN_TELEGRAM_IDS;
    if (!user || !raw) {
      throw new ForbiddenException('Admin access denied');
    }

    const allowed = raw
      .split(',')
      .map((v) => v.trim())
      .filter((v) => v.length > 0);

    if (allowed.includes(String(user.telegramId))) {
      return true;
    }

    throw new ForbiddenException('Admin access denied');
  }
}

