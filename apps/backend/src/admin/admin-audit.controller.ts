import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from './admin.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('admin/audit')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminAuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('logs')
  async list(
    @Query('adminUserId') adminUserId?: string,
    @Query('targetType') targetType?: string,
    @Query('targetId') targetId?: string,
    @Query('limit') limitRaw?: string,
  ) {
    const prisma: any = this.prisma;
    const limit = Math.min(Math.max(Number(limitRaw) || 50, 1), 200);
    const where: Record<string, unknown> = {};
    if (adminUserId) where.adminUserId = adminUserId;
    if (targetType) where.targetType = targetType;
    if (targetId) where.targetId = targetId;

    const rows = await prisma.adminActionLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows;
  }
}

