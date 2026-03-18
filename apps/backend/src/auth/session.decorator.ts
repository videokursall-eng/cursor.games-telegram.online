import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthSessionPayload } from 'shared';
import type { RequestWithSession } from './jwt-auth.guard';

export const Session = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthSessionPayload => {
  const request = ctx.switchToHttp().getRequest<RequestWithSession>();
  return request.session!;
});
