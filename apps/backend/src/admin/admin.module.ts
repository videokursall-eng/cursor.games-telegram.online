import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EconomyModule } from '../economy/economy.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminController } from './admin.controller';
import { AdminGuard } from './admin.guard';
import { AdminStatsController } from './admin-stats.controller';
import { AdminEconomyController } from './admin-economy.controller';
import { AdminAuditService } from './admin-audit.service';
import { AdminAuditController } from './admin-audit.controller';
import { RateLimitModule } from '../rate-limit/rate-limit.module';

@Module({
  imports: [AuthModule, forwardRef(() => EconomyModule), PrismaModule, RateLimitModule],
  controllers: [AdminController, AdminStatsController, AdminEconomyController, AdminAuditController],
  providers: [AdminGuard, AdminAuditService],
  exports: [AdminAuditService],
})
export class AdminModule {}

