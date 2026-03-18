import { Module } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { RoomsController } from './rooms.controller';
import { RealtimeModule } from '../realtime/realtime.module';
import { AuthModule } from '../auth/auth.module';
import { StatsModule } from '../stats/stats.module';
import { LoggingModule } from '../logging/logging.module';
import { RateLimitModule } from '../rate-limit/rate-limit.module';

@Module({
  imports: [RealtimeModule, AuthModule, StatsModule, LoggingModule, RateLimitModule],
  providers: [RoomsService],
  controllers: [RoomsController],
  exports: [RoomsService],
})
export class RoomsModule {}

