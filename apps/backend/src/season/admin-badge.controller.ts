import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../admin/admin.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('admin/badges')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminBadgeController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list() {
    const rows = await (this.prisma as any).badge.findMany({
      orderBy: { code: 'asc' },
    });
    return rows.map((b: any) => ({
      id: b.id,
      code: b.code,
      title: b.title,
      description: b.description ?? undefined,
      icon: b.icon ?? undefined,
      rarity: b.rarity ?? undefined,
    }));
  }
}

