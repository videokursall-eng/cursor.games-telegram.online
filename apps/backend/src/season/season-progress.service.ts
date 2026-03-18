import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { SeasonProgressDto, SeasonRewardTrackItemDto, SeasonWithTrackDto } from 'shared';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../economy/wallet.service';
import { CosmeticsService } from '../economy/cosmetics.service';

@Injectable()
export class SeasonProgressService {
  private static readonly DEFAULT_SEASON_CODE = 'season_1';
  private static readonly XP_PER_LEVEL = 100;

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly cosmeticsService: CosmeticsService,
  ) {}

  private computeLevel(xp: number): number {
    return Math.max(1, Math.floor(xp / SeasonProgressService.XP_PER_LEVEL) + 1);
  }

  private toDto(progress: {
    userId: string;
    seasonId: string;
    xp: number;
    level: number;
    claimedRewardIds: string | null;
    updatedAt: Date;
  }): SeasonProgressDto {
    const xpPerLevel = SeasonProgressService.XP_PER_LEVEL;
    const level = this.computeLevel(progress.xp);
    const nextLevelXp = level * xpPerLevel;
    const xpToNextLevel = Math.max(0, nextLevelXp - progress.xp);

    return {
      userId: progress.userId,
      seasonId: progress.seasonId,
      level,
      currentXp: progress.xp,
      xpToNextLevel,
      claimedRewardIds: progress.claimedRewardIds ? progress.claimedRewardIds.split(',') : [],
      updatedAt: progress.updatedAt.toISOString(),
    };
  }

  async getCurrentSeason() {
    let season = await this.prisma.season.findFirst({
      where: { isActive: true },
      orderBy: { startsAt: 'asc' },
    });
    if (!season) {
      const now = new Date();
      season = await this.prisma.season.create({
        data: {
          code: SeasonProgressService.DEFAULT_SEASON_CODE,
          name: 'Season 1',
          startsAt: now,
          isActive: true,
        },
      });
    }
    return season;
  }

  async getProgress(userId: string): Promise<SeasonProgressDto> {
    const season = await this.getCurrentSeason();
    let progress = await this.prisma.seasonProgress.findUnique({
      where: { userId_seasonId: { userId, seasonId: season.id } },
    });
    if (!progress) {
      progress = await this.prisma.seasonProgress.create({
        data: {
          userId,
          seasonId: season.id,
          xp: 0,
          level: 1,
          claimedRewardIds: '',
        },
      });
    }
    return this.toDto(progress);
  }

  /**
   * Grant seasonal XP for a completed match.
   * Idempotent per (user, season, matchId) via SeasonMatchReward unique constraint.
   */
  async addMatchXp(args: {
    userId: string;
    matchId: string;
    mode: 'podkidnoy' | 'perevodnoy';
    matchOutcome: 'normal' | 'draw' | 'aborted';
    playerOutcome: 'WIN' | 'LOSS' | 'DRAW';
  }): Promise<SeasonProgressDto> {
    const { userId, matchId, matchOutcome, playerOutcome } = args;
    const season = await this.getCurrentSeason();

    const xp = this.calculateMatchXp(matchOutcome, playerOutcome);
    if (xp <= 0) {
      return this.getProgress(userId);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const existingReward = await tx.seasonMatchReward.findUnique({
        where: {
          userId_seasonId_matchId: {
            userId,
            seasonId: season.id,
            matchId,
          },
        },
      });
      if (existingReward) {
        const current = await tx.seasonProgress.findUnique({
          where: { userId_seasonId: { userId, seasonId: season.id } },
        });
        if (!current) {
          return await tx.seasonProgress.create({
            data: {
              userId,
              seasonId: season.id,
              xp: 0,
              level: 1,
              claimedRewardIds: '',
            },
          });
        }
        return current;
      }

      await tx.seasonMatchReward.create({
        data: {
          userId,
          seasonId: season.id,
          matchId,
        },
      });

      const existing = await tx.seasonProgress.findUnique({
        where: { userId_seasonId: { userId, seasonId: season.id } },
      });
      const currentXp = existing?.xp ?? 0;
      const newXp = currentXp + xp;
      const newLevel = this.computeLevel(newXp);

      if (!existing) {
        return await tx.seasonProgress.create({
          data: {
            userId,
            seasonId: season.id,
            xp: newXp,
            level: newLevel,
            claimedRewardIds: '',
          },
        });
      }

      return await tx.seasonProgress.update({
        where: { userId_seasonId: { userId, seasonId: season.id } },
        data: {
          xp: newXp,
          level: newLevel,
        },
      });
    });

    return this.toDto(updated);
  }

  private calculateMatchXp(matchOutcome: 'normal' | 'draw' | 'aborted', playerOutcome: 'WIN' | 'LOSS' | 'DRAW'): number {
    if (matchOutcome === 'aborted') return 0;
    if (matchOutcome === 'draw') {
      // Ничья: средний XP за попытку.
      return 40;
    }
    // Нормальное завершение: участие + бонус за победу.
    let xp = 50; // базовый XP за участие
    if (playerOutcome === 'WIN') xp += 30;
    return xp;
  }

  /**
   * Claim a season reward for a specific level.
   * Idempotent per (user, season, rewardId) via SeasonRewardClaim unique constraint.
   */
  async claimRewardLevel(userId: string, level: number): Promise<SeasonWithTrackDto> {
    const season = await this.getCurrentSeason();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prisma = this.prisma as any;
    const reward = await prisma.rewardTrackItem.findFirst({
      where: { seasonId: season.id, level },
    });
    if (!reward) {
      throw new NotFoundException('Reward for this level not found');
    }

    const existingClaim = await prisma.seasonRewardClaim.findUnique({
      where: {
        userId_seasonId_rewardId: {
          userId,
          seasonId: season.id,
          rewardId: reward.id,
        },
      },
    });
    if (existingClaim) {
      throw new BadRequestException('Reward already claimed');
    }

    await this.prisma.$transaction(async (tx) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (tx as any).seasonRewardClaim.create({
        data: {
          userId,
          seasonId: season.id,
          rewardId: reward.id,
        },
      });

      if (reward.rewardType === 'soft' && reward.amountSoft && reward.amountSoft > 0) {
        await this.walletService.credit(userId, reward.amountSoft, 'season_pass', {
          seasonId: season.id,
          level,
          rewardId: reward.id,
        });
      } else if (reward.rewardType === 'cosmetic' && reward.cosmeticItemId) {
        await this.cosmeticsService.grantItem(
          userId,
          reward.cosmeticItemId,
          'season_reward',
          `level_${level}`,
        );
      }

      // Append to claimedRewardIds string for backward compatible DTO.
      const progress = await tx.seasonProgress.findUnique({
        where: { userId_seasonId: { userId, seasonId: season.id } },
      });
      if (progress) {
        const currentIds = (progress.claimedRewardIds ?? '').split(',').filter(Boolean);
        if (!currentIds.includes(reward.id)) {
          currentIds.push(reward.id);
          await tx.seasonProgress.update({
            where: { userId_seasonId: { userId, seasonId: season.id } },
            data: { claimedRewardIds: currentIds.join(',') },
          });
        }
      }
    });

    return this.getSeasonWithTrack(userId);
  }

  async getSeasonWithTrack(userId: string): Promise<SeasonWithTrackDto> {
    const season = await this.getCurrentSeason();
    const progress = await this.getProgress(userId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prisma = this.prisma as any;
    const rewards = await prisma.rewardTrackItem.findMany({
      where: { seasonId: season.id },
      orderBy: { level: 'asc' },
      include: { badge: true },
    });
    const claimedSet = new Set(progress.claimedRewardIds);

    const rewardTrack: SeasonRewardTrackItemDto[] = rewards.map(
      (r: {
        id: string;
        level: number;
        rewardType: string;
        amountSoft: number | null;
        cosmeticItemId: string | null;
        badgeId: string | null;
        badge?: { code: string; title: string; description: string | null; icon: string | null; rarity: string | null } | null;
      }) => {
      const claimed = claimedSet.has(r.id);
      const claimable = !claimed && progress.level >= r.level;
      return {
        level: r.level,
        rewardType: r.rewardType as SeasonRewardTrackItemDto['rewardType'],
        softAmount: r.amountSoft ?? undefined,
        cosmeticCode: r.cosmeticItemId ?? undefined,
        badgeCode: r.badge?.code ?? undefined,
        badge: r.badge
          ? {
              code: r.badge.code,
              title: r.badge.title,
              description: r.badge.description ?? undefined,
              icon: r.badge.icon,
              rarity: r.badge.rarity,
            }
          : undefined,
        claimed,
        claimable,
      };
    },
    );

    return {
      progress,
      rewardTrack,
    };
  }
}

