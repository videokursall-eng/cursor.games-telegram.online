import { Module } from '@nestjs/common';
import { StructuredLoggerService } from './structured-logger.service';
import { RequestContextService } from './request-context.service';

@Module({
  providers: [RequestContextService, StructuredLoggerService],
  exports: [RequestContextService, StructuredLoggerService],
})
export class LoggingModule {}

