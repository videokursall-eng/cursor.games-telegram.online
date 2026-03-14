import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { RequestContextService } from './request-context.service';

function generateRequestId(): string {
  return Math.random().toString(36).slice(2, 10);
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  constructor(private readonly requestContext: RequestContextService) {}

  use(req: Request & { requestId?: string; correlationId?: string }, res: Response, next: NextFunction): void {
    const headerRequestId = (req.headers['x-request-id'] as string | undefined) ?? undefined;
    const headerCorrelationId = (req.headers['x-correlation-id'] as string | undefined) ?? undefined;

    const requestId = headerRequestId && headerRequestId.length > 0 ? headerRequestId : generateRequestId();
    const correlationId = headerCorrelationId && headerCorrelationId.length > 0 ? headerCorrelationId : requestId;

    req.requestId = requestId;
    req.correlationId = correlationId;

    res.setHeader('X-Request-Id', requestId);
    res.setHeader('X-Correlation-Id', correlationId);

    this.requestContext.run({ requestId, correlationId }, () => {
      next();
    });
  }
}

