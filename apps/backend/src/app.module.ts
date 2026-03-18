import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { RealtimeModule } from './realtime/realtime.module';
import { RoomsModule } from './rooms/rooms.module';
import { StatsModule } from './stats/stats.module';
import { SeasonModule } from './season/season.module';
import { EconomyModule } from './economy/economy.module';
import { AdminModule } from './admin/admin.module';
import { LoggingModule } from './logging/logging.module';
import { RequestIdMiddleware } from './logging/request-id.middleware';
import { RateLimitModule } from './rate-limit/rate-limit.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    RealtimeModule,
    RoomsModule,
    StatsModule,
    SeasonModule,
    EconomyModule,
    AdminModule,
    LoggingModule,
    RateLimitModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
