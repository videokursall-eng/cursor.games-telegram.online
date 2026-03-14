import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
  requestId?: string;
  correlationId?: string;
}

@Injectable()
export class RequestContextService {
  private readonly storage = new AsyncLocalStorage<RequestContext>();

  run<T>(context: RequestContext, fn: () => T): T {
    return this.storage.run(context, fn);
  }

  getRequestId(): string | undefined {
    return this.storage.getStore()?.requestId;
  }

  getCorrelationId(): string | undefined {
    return this.storage.getStore()?.correlationId;
  }
}

