import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import type { AuthSessionPayload } from 'shared';

export type RequestWithSession = Request & { session?: AuthSessionPayload };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

    if (!token) {
      throw new UnauthorizedException('Missing or invalid authorization');
    }

    const session = this.authService.verifyToken(token);
    if (!session) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    (request as RequestWithSession).session = session;
    return true;
  }
}
