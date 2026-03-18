import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../admin/admin.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AdminAuditService } from '../admin/admin-audit.service';
import { Session } from '../auth/session.decorator';
import type { AuthSessionPayload } from 'shared';
import type { CosmeticRarity } from 'shared';

type CosmeticType = 'avatar' | 'avatar_frame' | 'table_theme' | 'card_back' | 'emote';

interface UpsertCosmeticDto {
  code: string;
  type: CosmeticType;
  title: string;
  description?: string;
  icon?: string;
  priceSoft?: number | null;
  priceStars?: number | null;
  rarity?: CosmeticRarity;
  isExclusive?: boolean;
  isLimited?: boolean;
  seasonId?: string | null;
}

@Controller('admin/cosmetics')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminCosmeticsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  @Get()
  async list() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prisma = this.prisma as any;
    const rows = await prisma.cosmeticCatalogItem.findMany({
      orderBy: [{ slot: 'asc' }, { title: 'asc' }],
    });
    return rows;
  }

  private async validatePayload(dto: UpsertCosmeticDto) {
    if (!dto.code?.trim()) throw new BadRequestException('code is required');
    if (!dto.title?.trim()) throw new BadRequestException('title is required');
    const allowedTypes: CosmeticType[] = ['avatar', 'avatar_frame', 'table_theme', 'card_back', 'emote'];
    if (!allowedTypes.includes(dto.type)) {
      throw new BadRequestException('Invalid cosmetic type');
    }
    const allowedRarities: CosmeticRarity[] = ['common', 'rare', 'epic', 'legendary'];
    if (dto.rarity && !allowedRarities.includes(dto.rarity)) {
      throw new BadRequestException('Invalid rarity');
    }
    if (dto.priceSoft != null && dto.priceSoft < 0) {
      throw new BadRequestException('priceSoft must be non-negative');
    }
    if (dto.priceStars != null && dto.priceStars < 0) {
      throw new BadRequestException('priceStars must be non-negative');
    }

    if (dto.seasonId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prisma = this.prisma as any;
      const season = await prisma.season.findUnique({ where: { id: dto.seasonId } });
      if (!season) {
        throw new BadRequestException('Invalid seasonId');
      }
    }
  }

  @Post()
  async create(@Session() session: AuthSessionPayload, @Body() dto: UpsertCosmeticDto) {
    await this.validatePayload(dto);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prisma = this.prisma as any;
    const existing = await prisma.cosmeticCatalogItem.findUnique({ where: { code: dto.code } });
    if (existing) {
      throw new BadRequestException('Cosmetic code must be unique');
    }
    const row = await prisma.cosmeticCatalogItem.create({
      data: {
        id: dto.code,
        code: dto.code,
        slot: dto.type,
        title: dto.title,
        description: dto.description ?? null,
        icon: dto.icon ?? null,
        rarity: dto.rarity ?? 'common',
        priceSoft: dto.priceSoft ?? null,
        priceStars: dto.priceStars ?? null,
        isExclusive: dto.isExclusive ?? false,
        isLimited: dto.isLimited ?? false,
        isActive: true,
        seasonId: dto.seasonId ?? null,
      },
    });
    await this.audit.log({
      admin: session,
      action: 'cosmetic_create',
      targetType: 'CosmeticCatalogItem',
      targetId: row.code,
      success: true,
      reason: dto.description ?? null,
      payload: dto,
    });
    return row;
  }

  @Patch(':code')
  async update(
    @Session() session: AuthSessionPayload,
    @Param('code') code: string,
    @Body() dto: Partial<UpsertCosmeticDto>,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prisma = this.prisma as any;
    const existing = await prisma.cosmeticCatalogItem.findUnique({ where: { code } });
    if (!existing) {
      throw new NotFoundException('Cosmetic not found');
    }
    const payload: UpsertCosmeticDto = {
      code: existing.code,
      type: (dto.type ?? existing.slot) as CosmeticType,
      title: dto.title ?? existing.title,
      description: dto.description ?? existing.description ?? undefined,
      icon: dto.icon ?? existing.icon ?? undefined,
      priceSoft: dto.priceSoft ?? existing.priceSoft,
      priceStars: dto.priceStars ?? existing.priceStars,
      rarity: (dto.rarity ?? existing.rarity) as CosmeticRarity,
      isExclusive: dto.isExclusive ?? existing.isExclusive,
      isLimited: dto.isLimited ?? existing.isLimited,
      seasonId: dto.seasonId ?? existing.seasonId ?? null,
    };
    await this.validatePayload(payload);
    const row = await prisma.cosmeticCatalogItem.update({
      where: { code },
      data: {
        slot: payload.type,
        title: payload.title,
        description: payload.description ?? null,
        icon: payload.icon ?? null,
        priceSoft: payload.priceSoft ?? null,
        priceStars: payload.priceStars ?? null,
        rarity: payload.rarity ?? existing.rarity,
        isExclusive: payload.isExclusive ?? existing.isExclusive,
        isLimited: payload.isLimited ?? existing.isLimited,
        seasonId: payload.seasonId ?? existing.seasonId,
      },
    });
    await this.audit.log({
      admin: session,
      action: 'cosmetic_update',
      targetType: 'CosmeticCatalogItem',
      targetId: code,
      success: true,
      reason: dto.description ?? undefined,
      payload: dto,
    });
    return row;
  }

  @Patch(':code/activate')
  async activate(@Session() session: AuthSessionPayload, @Param('code') code: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prisma = this.prisma as any;
    const existing = await prisma.cosmeticCatalogItem.findUnique({ where: { code } });
    if (!existing) {
      throw new NotFoundException('Cosmetic not found');
    }
    const row = await prisma.cosmeticCatalogItem.update({
      where: { code },
      data: { isActive: true },
    });
    await this.audit.log({
      admin: session,
      action: 'cosmetic_activate',
      targetType: 'CosmeticCatalogItem',
      targetId: code,
      success: true,
      reason: null,
      payload: null,
    });
    return row;
  }

  @Patch(':code/deactivate')
  async deactivate(@Session() session: AuthSessionPayload, @Param('code') code: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prisma = this.prisma as any;
    const existing = await prisma.cosmeticCatalogItem.findUnique({ where: { code } });
    if (!existing) {
      throw new NotFoundException('Cosmetic not found');
    }
    const row = await prisma.cosmeticCatalogItem.update({
      where: { code },
      data: { isActive: false },
    });
    await this.audit.log({
      admin: session,
      action: 'cosmetic_deactivate',
      targetType: 'CosmeticCatalogItem',
      targetId: code,
      success: true,
      reason: null,
      payload: null,
    });
    return row;
  }
}

