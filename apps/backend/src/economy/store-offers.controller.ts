import { Controller, Get } from '@nestjs/common';
import type { StoreOfferDto } from 'shared';
import { PrismaService } from '../prisma/prisma.service';

@Controller('store')
export class StoreOffersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('offers')
  async getOffers(): Promise<StoreOfferDto[]> {
    const prisma = this.prisma;
    const now = new Date();
    const rows = await prisma.storeOffer.findMany({
      where: {
        isActive: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ endsAt: null }, { endsAt: { gte: now } }],
      },
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
    });
    return rows.map((row: any) => ({
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
    }));
  }
}

