import type { Request, Response, NextFunction } from 'express';
import { RequestIdMiddleware } from './request-id.middleware';
import { RequestContextService } from './request-context.service';

describe('RequestIdMiddleware', () => {
  it('assigns requestId and correlationId and sets response headers', () => {
    const ctx = new RequestContextService();
    const middleware = new RequestIdMiddleware(ctx);

    const req = {
      headers: {},
    } as unknown as Request & { requestId?: string; correlationId?: string };

    const res = {
      setHeader: jest.fn(),
    } as unknown as Response;

    const next: NextFunction = jest.fn();

    middleware.use(req, res, next);

    expect(req.requestId).toBeDefined();
    expect(req.correlationId).toBe(req.requestId);
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', req.requestId);
    expect(res.setHeader).toHaveBeenCalledWith('X-Correlation-Id', req.correlationId);
    expect(next).toHaveBeenCalled();
  });
});

