import { Injectable } from '@nestjs/common';
import { RequestContextService } from './request-context.service';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  service?: string;
  requestId?: string;
  correlationId?: string;
  userId?: string;
  roomId?: string;
  matchId?: string;
}

export interface LogMeta extends LogContext {
  [key: string]: unknown;
}

@Injectable()
export class StructuredLoggerService {
  constructor(private readonly requestContext: RequestContextService) {}
  info(message: string, meta: LogMeta = {}): void {
    this.log('info', message, meta);
  }

  debug(message: string, meta: LogMeta = {}): void {
    this.log('debug', message, meta);
  }

  warn(message: string, meta: LogMeta = {}): void {
    this.log('warn', message, meta);
  }

  error(message: string, meta: LogMeta = {}): void {
    this.log('error', message, meta);
  }

  private log(level: LogLevel, message: string, meta: LogMeta): void {
    const { service, requestId, correlationId, userId, roomId, matchId, ...rest } = meta;

    const ctxRequestId = requestId ?? this.requestContext.getRequestId();
    const ctxCorrelationId = correlationId ?? this.requestContext.getCorrelationId();

    const record: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };

    if (service) record.service = service;
    if (ctxRequestId) record.requestId = ctxRequestId;
    if (ctxCorrelationId) record.correlationId = ctxCorrelationId;
    if (userId) record.userId = userId;
    if (roomId) record.roomId = roomId;
    if (matchId) record.matchId = matchId;

    for (const [key, value] of Object.entries(rest)) {
      if (['password', 'token', 'secret', 'rawPayload', 'initData', 'authorization', 'cookie'].includes(key)) {
        // skip obvious sensitive fields
        continue;
      }
      record[key] = value;
    }

    // eslint-disable-next-line no-console
    console.log(JSON.stringify(record));
  }
}

