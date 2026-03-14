import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SeasonProgressService } from './season-progress.service';
import { SeasonController } from './season.controller';
import { EconomyModule } from '../economy/economy.module';
import { AdminSeasonController } from './admin-season.controller';
import { AdminBadgeController } from './admin-badge.controller';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [PrismaModule, EconomyModule, AdminModule],
  providers: [SeasonProgressService],
  controllers: [SeasonController, AdminSeasonController, AdminBadgeController],
  exports: [SeasonProgressService],
})
export class SeasonModule {}

