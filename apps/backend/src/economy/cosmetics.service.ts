import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import type {
  CosmeticItemDto,
  PlayerInventoryDto,
  PlayerOwnedItemDto,
  CosmeticSlot,
} from 'shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CosmeticsService {
  constructor(private readonly prisma: PrismaService) {}

  private toDto(row: {
    id: string;
    code: string;
    slot: string;
    title: string;
    description: string | null;
    icon: string | null;
    rarity: string;
    priceSoft: number | null;
    priceStars: number | null;
    isExclusive: boolean;
    isLimited: boolean;
    seasonId: string | null;
  }): CosmeticItemDto {
    return {
      id: row.id,
      key: row.code,
      name: row.title,
      description: row.description ?? undefined,
      slot: row.slot as CosmeticSlot,
      rarity: row.rarity as CosmeticItemDto['rarity'],
      iconUrl: row.icon,
      priceSoft: row.priceSoft,
      priceStars: row.priceStars,
      isExclusive: row.isExclusive,
      isLimited: row.isLimited,
      seasonId: row.seasonId,
    };
  }

  async getCatalog(): Promise<CosmeticItemDto[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prisma = this.prisma as any;
    const rows = await prisma.cosmeticCatalogItem.findMany({
      where: { isActive: true },
      orderBy: [{ slot: 'asc' }, { title: 'asc' }],
    });
    return rows.map((row: unknown) =>
      this.toDto(row as {
        id: string;
        code: string;
        slot: string;
        title: string;
        description: string | null;
        icon: string | null;
        rarity: string;
        priceSoft: number | null;
        priceStars: number | null;
        isExclusive: boolean;
        isLimited: boolean;
        seasonId: string | null;
      }),
    );
  }

  private async findCatalogItemOrNull(
    itemIdOrKey: string,
    options: { activeOnly?: boolean } = {},
  ): Promise<CosmeticItemDto | null> {
    const prisma = this.prisma as unknown as {
      cosmeticCatalogItem: {
        findFirst(args: { where: { OR: Array<{ id: string } | { code: string }>; isActive?: boolean } }): Promise<{
          id: string;
          code: string;
          slot: string;
          title: string;
          description: string | null;
          icon: string | null;
          rarity: string;
          priceSoft: number | null;
          priceStars: number | null;
          isExclusive: boolean;
          isLimited: boolean;
          seasonId: string | null;
        } | null>;
      };
    };
    const where: { OR: Array<{ id: string } | { code: string }>; isActive?: boolean } = {
      OR: [{ id: itemIdOrKey }, { code: itemIdOrKey }],
    };
    if (options.activeOnly) {
      where.isActive = true;
    }
    const row = await prisma.cosmeticCatalogItem.findFirst({ where });
    return row ? this.toDto(row) : null;
  }

  async getActiveItemOrThrow(itemIdOrKey: string): Promise<CosmeticItemDto> {
    const item = await this.findCatalogItemOrNull(itemIdOrKey, { activeOnly: true });
    if (!item) {
      throw new NotFoundException('Cosmetic item not found or inactive');
    }
    return item;
  }

  async getItemOrThrow(itemIdOrKey: string): Promise<CosmeticItemDto> {
    const item = await this.findCatalogItemOrNull(itemIdOrKey, { activeOnly: false });
    if (!item) {
      throw new NotFoundException('Cosmetic item not found');
    }
    return item;
  }

  async getInventory(userId: string): Promise<PlayerInventoryDto> {
    // PrismaClient typings for these models are generated from schema at build time.
    // Cast to any here to avoid coupling tests to a specific generated client shape.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prisma = this.prisma as any;

    const [ownedRows, equippedRows] = await Promise.all([
      prisma.playerCosmeticItem.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.playerEquippedCosmetic.findMany({
        where: { userId },
      }),
    ]);

    const ownedItems: PlayerOwnedItemDto[] = ownedRows.map((row: { itemId: string; createdAt: Date; source: string; tag: string | null }) => ({
      itemId: row.itemId,
      acquiredAt: row.createdAt.toISOString(),
      // source stored as string; we map to union domain here
      source: (row.source as PlayerOwnedItemDto['source']) ?? 'other',
      tag: row.tag ?? undefined,
    }));

    const equippedItems: PlayerInventoryDto['equippedItems'] = {};
    for (const eq of equippedRows) {
      const slot = eq.slot as CosmeticSlot;
      equippedItems[slot] = eq.itemId;
    }

    return {
      userId,
      ownedItems,
      equippedItems,
    };
  }

  /**
   * Grant cosmetic item to user (purchase, reward, grant, etc.).
   * Purely visual; does not affect gameplay.
   */
  async grantItem(
    userId: string,
    itemId: string,
    source: PlayerOwnedItemDto['source'],
    tag?: string,
  ): Promise<void> {
    const item = await this.getItemOrThrow(itemId);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prisma = this.prisma as any;

    await prisma.playerCosmeticItem.upsert({
      where: { userId_itemId: { userId, itemId: item.id } },
      update: { source, tag: tag ?? null },
      create: {
        userId,
        itemId: item.id,
        source,
        tag: tag ?? null,
      },
    });
  }

  /**
   * Equip cosmetic item in a given slot for the user.
   * Requires ownership; does not change game logic or strength.
   */
  async equipItem(userId: string, slot: CosmeticSlot, itemId: string): Promise<PlayerInventoryDto> {
    const item = await this.getItemOrThrow(itemId);
    if (item.slot !== slot) {
      throw new BadRequestException('Item does not match requested slot');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prisma = this.prisma as any;

    const owned = await prisma.playerCosmeticItem.findUnique({
      where: { userId_itemId: { userId, itemId: item.id } },
    });
    if (!owned) {
      throw new BadRequestException('Item not owned by user');
    }

    await prisma.playerEquippedCosmetic.upsert({
      where: { userId_slot: { userId, slot } },
      update: { itemId: item.id },
      create: {
        userId,
        slot,
        itemId: item.id,
      },
    });

    return this.getInventory(userId);
  }
}

