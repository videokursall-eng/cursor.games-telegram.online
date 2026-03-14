import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../admin/admin.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AdminAuditService } from '../admin/admin-audit.service';
import { Session } from '../auth/session.decorator';
import type { AuthSessionPayload } from 'shared';

@Controller('admin/seasons')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminSeasonController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  @Get()
  async list() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prisma = this.prisma as any;
    const rows = await prisma.season.findMany({
      orderBy: { startsAt: 'asc' },
    });
    return rows.map((s: { id: string; code: string; title: string | null }) => ({
      id: s.id,
      code: s.code,
      title: s.title ?? s.code,
    }));
  }

  @Post()
  async createSeason(
    @Session() session: AuthSessionPayload,
    @Body()
    dto: {
      code: string;
      name: string;
      startsAt: string;
      endsAt?: string | null;
      isActive?: boolean;
    },
  ) {
    const { code, name, startsAt, endsAt, isActive } = dto;
    if (!code || !name || !startsAt) {
      throw new BadRequestException('code, name and startsAt are required');
    }

    const starts = new Date(startsAt);
    const endsDate = endsAt ? new Date(endsAt) : null;
    if (Number.isNaN(starts.getTime())) {
      throw new BadRequestException('startsAt must be a valid date');
    }
    if (endsDate && Number.isNaN(endsDate.getTime())) {
      throw new BadRequestException('endsAt must be a valid date');
    }
    if (endsDate && endsDate <= starts) {
      throw new BadRequestException('endsAt must be after startsAt');
    }

    const prisma: any = this.prisma;

    if (isActive) {
      return prisma.$transaction(async (tx: any) => {
        await tx.season.updateMany({ data: { isActive: false } });
        const created = await tx.season.create({
          data: {
            code,
            name,
            startsAt: starts,
            endsAt: endsDate,
            isActive: true,
          },
        });
        await this.audit.log({
          admin: session,
          action: 'season_create',
          targetType: 'Season',
          targetId: created.id,
          success: true,
          reason: name,
          payload: dto,
        });
        return created;
      });
    }

    const created = await prisma.season.create({
      data: {
        code,
        name,
        startsAt: starts,
        endsAt: endsDate,
        isActive: false,
      },
    });
    await this.audit.log({
      admin: session,
      action: 'season_create',
      targetType: 'Season',
      targetId: created.id,
      success: true,
      reason: name,
      payload: dto,
    });
    return created;
  }

  @Patch(':id')
  async updateSeason(
    @Session() session: AuthSessionPayload,
    @Param('id') id: string,
    @Body()
    dto: {
      name?: string;
      startsAt?: string;
      endsAt?: string | null;
      isActive?: boolean;
    },
  ) {
    const prisma: any = this.prisma;
    const existing = await prisma.season.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Season not found');
    }

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;

    let starts = existing.startsAt as Date;
    let endsDate = existing.endsAt as Date | null;

    if (dto.startsAt !== undefined) {
      const parsed = new Date(dto.startsAt);
      if (Number.isNaN(parsed.getTime())) {
        throw new BadRequestException('startsAt must be a valid date');
      }
      starts = parsed;
      data.startsAt = parsed;
    }

    if (dto.endsAt !== undefined) {
      const parsed = dto.endsAt ? new Date(dto.endsAt) : null;
      if (parsed && Number.isNaN(parsed.getTime())) {
        throw new BadRequestException('endsAt must be a valid date');
      }
      endsDate = parsed;
      data.endsAt = parsed;
    }

    if (endsDate && endsDate <= starts) {
      throw new BadRequestException('endsAt must be after startsAt');
    }

    if (dto.isActive === true) {
      return prisma.$transaction(async (tx: any) => {
        await tx.season.updateMany({ data: { isActive: false } });
        const updated = await tx.season.update({
          where: { id },
          data: { ...data, isActive: true },
        });
        await this.audit.log({
          admin: session,
          action: 'season_update',
          targetType: 'Season',
          targetId: id,
          success: true,
          reason: dto.name ?? undefined,
          payload: dto,
        });
        return updated;
      });
    }

    if (dto.isActive === false) {
      data.isActive = false;
    }

    const updated = await prisma.season.update({
      where: { id },
      data,
    });
    await this.audit.log({
      admin: session,
      action: 'season_update',
      targetType: 'Season',
      targetId: id,
      success: true,
      reason: dto.name ?? undefined,
      payload: dto,
    });
    return updated;
  }

  @Get(':seasonId/rewards')
  async listRewards(@Param('seasonId') seasonId: string) {
    const prisma: any = this.prisma;
    const season = await prisma.season.findUnique({ where: { id: seasonId } });
    if (!season) {
      throw new NotFoundException('Season not found');
    }

    const rows = await prisma.rewardTrackItem.findMany({
      where: { seasonId },
      orderBy: { level: 'asc' },
      include: { badge: true },
    });

    return rows.map((r: any) => ({
      id: r.id,
      level: r.level,
      rewardType: r.rewardType,
      amountSoft: r.amountSoft,
      cosmeticItemId: r.cosmeticItemId,
      badgeId: r.badgeId,
      badge: r.badge
        ? {
            code: r.badge.code,
            title: r.badge.title,
            description: r.badge.description ?? undefined,
            icon: r.badge.icon,
            rarity: r.badge.rarity,
          }
        : null,
    }));
  }

  @Post(':seasonId/rewards')
  async createReward(
    @Session() session: AuthSessionPayload,
    @Param('seasonId') seasonId: string,
    @Body()
    dto: {
      level: number;
      rewardType: 'soft' | 'cosmetic' | 'badge';
      amountSoft?: number | null;
      cosmeticItemId?: string | null;
      badgeId?: string | null;
    },
  ) {
    const prisma: any = this.prisma;

    const season = await prisma.season.findUnique({ where: { id: seasonId } });
    if (!season) {
      throw new NotFoundException('Season not found');
    }

    await this.validateRewardPayload(seasonId, dto, null);

    const created = await prisma.rewardTrackItem.create({
      data: {
        seasonId,
        level: dto.level,
        rewardType: dto.rewardType,
        amountSoft: dto.amountSoft ?? null,
        cosmeticItemId: dto.cosmeticItemId ?? null,
        badgeId: dto.badgeId ?? null,
      },
      include: { badge: true },
    });

    const dtoOut = {
      id: created.id,
      level: created.level,
      rewardType: created.rewardType,
      amountSoft: created.amountSoft,
      cosmeticItemId: created.cosmeticItemId,
      badgeId: created.badgeId,
      badge: created.badge
        ? {
            code: created.badge.code,
            title: created.badge.title,
            description: created.badge.description ?? undefined,
            icon: created.badge.icon,
            rarity: created.badge.rarity,
          }
        : null,
    };
    await this.audit.log({
      admin: session,
      action: 'season_reward_create',
      targetType: 'RewardTrackItem',
      targetId: created.id,
      success: true,
      reason: undefined,
      payload: dto,
    });
    return dtoOut;
  }

  @Patch(':seasonId/rewards/:id')
  async updateReward(
    @Session() session: AuthSessionPayload,
    @Param('seasonId') seasonId: string,
    @Param('id') id: string,
    @Body()
    dto: {
      level?: number;
      rewardType?: 'soft' | 'cosmetic' | 'badge';
      amountSoft?: number | null;
      cosmeticItemId?: string | null;
      badgeId?: string | null;
    },
  ) {
    const prisma: any = this.prisma;

    const existing = await prisma.rewardTrackItem.findUnique({ where: { id } });
    if (!existing || existing.seasonId !== seasonId) {
      throw new NotFoundException('Reward not found for season');
    }

    const next = {
      level: dto.level ?? existing.level,
      rewardType: (dto.rewardType ?? existing.rewardType) as 'soft' | 'cosmetic' | 'badge',
      amountSoft: dto.amountSoft ?? existing.amountSoft,
      cosmeticItemId: dto.cosmeticItemId ?? existing.cosmeticItemId,
      badgeId: dto.badgeId ?? existing.badgeId,
    };

    await this.validateRewardPayload(seasonId, next, id);

    const updated = await prisma.rewardTrackItem.update({
      where: { id },
      data: {
        level: next.level,
        rewardType: next.rewardType,
        amountSoft: next.amountSoft,
        cosmeticItemId: next.cosmeticItemId,
        badgeId: next.badgeId,
      },
      include: { badge: true },
    });

    const dtoOut = {
      id: updated.id,
      level: updated.level,
      rewardType: updated.rewardType,
      amountSoft: updated.amountSoft,
      cosmeticItemId: updated.cosmeticItemId,
      badgeId: updated.badgeId,
      badge: updated.badge
        ? {
            code: updated.badge.code,
            title: updated.badge.title,
            description: updated.badge.description ?? undefined,
            icon: updated.badge.icon,
            rarity: updated.badge.rarity,
          }
        : null,
    };
    await this.audit.log({
      admin: session,
      action: 'season_reward_update',
      targetType: 'RewardTrackItem',
      targetId: id,
      success: true,
      reason: undefined,
      payload: dto,
    });
    return dtoOut;
  }

  @Delete(':seasonId/rewards/:id')
  async deleteReward(
    @Session() session: AuthSessionPayload,
    @Param('seasonId') seasonId: string,
    @Param('id') id: string,
  ) {
    const prisma: any = this.prisma;
    const result = await prisma.rewardTrackItem.deleteMany({
      where: { id, seasonId },
    });
    if (result.count === 0) {
      throw new NotFoundException('Reward not found for season');
    }
    await this.audit.log({
      admin: session,
      action: 'season_reward_delete',
      targetType: 'RewardTrackItem',
      targetId: id,
      success: true,
      reason: undefined,
      payload: { seasonId, id },
    });
    return { success: true };
  }

  private async validateRewardPayload(
    seasonId: string,
    dto: {
      level: number;
      rewardType: 'soft' | 'cosmetic' | 'badge';
      amountSoft?: number | null;
      cosmeticItemId?: string | null;
      badgeId?: string | null;
    },
    currentId: string | null,
  ) {
    const prisma: any = this.prisma;

    if (!Number.isInteger(dto.level) || dto.level <= 0) {
      throw new BadRequestException('level must be positive integer');
    }

    const existsSameLevel = await prisma.rewardTrackItem.findFirst({
      where: {
        seasonId,
        level: dto.level,
        ...(currentId ? { NOT: { id: currentId } } : {}),
      },
    });
    if (existsSameLevel) {
      throw new BadRequestException('Level already exists for this season');
    }

    if (dto.rewardType === 'soft') {
      if (!dto.amountSoft || dto.amountSoft <= 0) {
        throw new BadRequestException('amountSoft must be positive for soft reward');
      }
    } else if (dto.rewardType === 'cosmetic') {
      if (!dto.cosmeticItemId) {
        throw new BadRequestException('cosmeticItemId is required for cosmetic reward');
      }
      const cosmetic = await prisma.cosmeticCatalogItem.findUnique({
        where: { id: dto.cosmeticItemId },
      });
      if (!cosmetic) {
        throw new BadRequestException('Cosmetic item not found');
      }
    } else if (dto.rewardType === 'badge') {
      if (!dto.badgeId) {
        throw new BadRequestException('badgeId is required for badge reward');
      }
      const badge = await prisma.badge.findUnique({
        where: { id: dto.badgeId },
      });
      if (!badge) {
        throw new BadRequestException('Badge not found');
      }
    } else {
      throw new BadRequestException('Unsupported rewardType');
    }
  }
}

