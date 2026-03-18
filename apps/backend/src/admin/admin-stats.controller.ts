import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from './admin.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('admin/stats')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminStatsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('overview')
  async getOverview() {
    const prisma: any = this.prisma;

    const [matchesTotal, matchesByMode, dau, mau, purchases, topCosmetics, activePlayers, newPlayers, seasonClaims] =
      await Promise.all([
        prisma.match.count(),
        prisma.match.groupBy({
          by: ['mode'],
          _count: { _all: true },
        }),
        prisma.playerMatchRecord.groupBy({
          by: ['userId'],
          where: {
            finishedAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
          _count: { _all: true },
        }),
        prisma.playerMatchRecord.groupBy({
          by: ['userId'],
          where: {
            finishedAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
          _count: { _all: true },
        }),
        prisma.transaction.count({
          where: { reason: 'store_purchase' },
        }),
        prisma.playerCosmeticItem.groupBy({
          by: ['itemId'],
          where: { source: 'purchase' },
          _count: { _all: true },
          orderBy: { _count: { _all: 'desc' } },
          take: 5,
        }),
        prisma.session.groupBy({
          by: ['userId'],
          where: {
            expiresAt: { gt: new Date() },
          },
          _count: { _all: true },
        }),
        prisma.user.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        }),
        prisma.seasonRewardClaim.groupBy({
          by: ['seasonId'],
          _count: { _all: true },
        }),
      ]);

    return {
      matchesTotal,
      matchesByMode: matchesByMode.map((row: any) => ({
        mode: row.mode,
        count: row._count._all,
      })),
      dau: dau.length,
      mau: mau.length,
      purchasesTotal: purchases,
      topCosmetics: topCosmetics.map((row: any) => ({
        itemId: row.itemId,
        purchases: row._count._all,
      })),
      activePlayers: activePlayers.length,
      newPlayersLast7d: newPlayers,
      seasonClaims: seasonClaims.map((row: any) => ({
        seasonId: row.seasonId,
        claims: row._count._all,
      })),
    };
  }
}

