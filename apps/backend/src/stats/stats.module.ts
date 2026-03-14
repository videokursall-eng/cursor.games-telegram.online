import { Module } from '@nestjs/common';
import { StatsService } from './stats.service';
import { ProfileController } from './profile.controller';
import { StatsController } from './stats.controller';
import { UsersModule } from '../users/users.module';
import { EconomyModule } from '../economy/economy.module';
import { AuthModule } from '../auth/auth.module';
import { SeasonModule } from '../season/season.module';

@Module({
  imports: [UsersModule, AuthModule, EconomyModule, SeasonModule],
  controllers: [ProfileController, StatsController],
  providers: [StatsService],
  exports: [StatsService],
})
export class StatsModule {}
