import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import type { CurrencyCode, StoreOfferDto } from 'shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminOffersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<StoreOfferDto[]> {
    // PrismaClient type is generated at build time.
    // Cast to unknown/any here to keep tests decoupled from client shape.
    const prisma = this.prisma;
    const rows = await prisma.storeOffer.findMany({
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
    });
    return rows.map((row) =>
      this.toDto(row as unknown as {
        id: string;
        code: string;
        itemId: string;
        priceSoft: number | null;
        priceStars: number | null;
        currencyType: string;
        isActive: boolean;
        sortOrder: number;
        startsAt: Date | null;
        endsAt: Date | null;
      }),
    );
  }

  private toDto(row: {
    id: string;
    code: string;
    itemId: string;
    priceSoft: number | null;
    priceStars: number | null;
    currencyType: string;
    isActive: boolean;
    sortOrder: number;
    startsAt: Date | null;
    endsAt: Date | null;
  }): StoreOfferDto {
    return {
      id: row.id,
      key: row.code,
      title: row.code,
      description: undefined,
      featured: false,
      priceSoft: row.priceSoft,
      priceStars: row.priceStars,
      priceFiat: null,
      grants: [{ type: 'cosmetic', itemId: row.itemId }],
      requirements: undefined,
      tags: [],
      availableFrom: row.startsAt ? row.startsAt.toISOString() : null,
      availableUntil: row.endsAt ? row.endsAt.toISOString() : null,
    };
  }

  async create(payload: {
    code: string;
    itemId: string;
    priceSoft: number | null;
    priceStars: number | null;
    currencyType: CurrencyCode;
    isActive: boolean;
    sortOrder: number;
    startsAt: string | null;
    endsAt: string | null;
  }): Promise<StoreOfferDto> {
    const code = payload.code?.trim();
    if (!code) throw new BadRequestException('code is required');
    if (!payload.itemId?.trim()) throw new BadRequestException('itemId is required');
    if (payload.priceSoft != null && payload.priceSoft < 0) {
      throw new BadRequestException('priceSoft must be non-negative');
    }
    if (payload.priceStars != null && payload.priceStars < 0) {
      throw new BadRequestException('priceStars must be non-negative');
    }
    const prisma = this.prisma;
    const existing = await prisma.cosmeticCatalogItem.findUnique({ where: { id: payload.itemId } });
    if (!existing) {
      throw new BadRequestException('itemId must reference existing cosmetic item');
    }
    const row = await prisma.storeOffer.create({
      data: {
        id: code,
        code,
        itemId: payload.itemId,
        priceSoft: payload.priceSoft,
        priceStars: payload.priceStars,
        currencyType: payload.currencyType,
        isActive: payload.isActive,
        sortOrder: payload.sortOrder,
        startsAt: payload.startsAt ? new Date(payload.startsAt) : null,
        endsAt: payload.endsAt ? new Date(payload.endsAt) : null,
      },
    });
    return this.toDto(row);
  }

  async update(
    id: string,
    changes: Partial<{
      code: string;
      itemId: string;
      priceSoft: number | null;
      priceStars: number | null;
      currencyType: CurrencyCode;
      isActive: boolean;
      sortOrder: number;
      startsAt: string | null;
      endsAt: string | null;
    }>,
  ): Promise<StoreOfferDto> {
    const prisma = this.prisma;
    const existing = await prisma.storeOffer.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Offer not found');
    }
    const code = (changes.code ?? existing.code)?.trim();
    if (!code) throw new BadRequestException('code is required');
    const itemId = (changes.itemId ?? existing.itemId)?.trim();
    if (!itemId) throw new BadRequestException('itemId is required');
    const priceSoft = changes.priceSoft ?? existing.priceSoft;
    const priceStars = changes.priceStars ?? existing.priceStars;
    if (priceSoft != null && priceSoft < 0) {
      throw new BadRequestException('priceSoft must be non-negative');
    }
    if (priceStars != null && priceStars < 0) {
      throw new BadRequestException('priceStars must be non-negative');
    }
    const row = await prisma.storeOffer.update({
      where: { id },
      data: {
        code,
        itemId,
        priceSoft,
        priceStars,
        currencyType: changes.currencyType ?? existing.currencyType,
        isActive: typeof changes.isActive === 'boolean' ? changes.isActive : existing.isActive,
        sortOrder: changes.sortOrder ?? existing.sortOrder,
        startsAt:
          changes.startsAt !== undefined
            ? changes.startsAt
              ? new Date(changes.startsAt)
              : null
            : existing.startsAt,
        endsAt:
          changes.endsAt !== undefined
            ? changes.endsAt
              ? new Date(changes.endsAt)
              : null
            : existing.endsAt,
      },
    });
    return this.toDto(row);
  }

  async setActive(id: string, isActive: boolean): Promise<StoreOfferDto> {
    return this.update(id, { isActive });
  }
}

