import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminCosmeticsController } from './admin-cosmetics.controller';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../admin/admin.guard';
import { AdminAuditService } from '../admin/admin-audit.service';

describe('AdminCosmeticsController', () => {
  let controller: AdminCosmeticsController;
  const prismaMock = {
    cosmeticCatalogItem: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    season: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    prismaMock.cosmeticCatalogItem.findMany.mockReset();
    prismaMock.cosmeticCatalogItem.findUnique.mockReset();
    prismaMock.cosmeticCatalogItem.create.mockReset();
    prismaMock.cosmeticCatalogItem.update.mockReset();
    prismaMock.season.findUnique.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminCosmeticsController],
      providers: [
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: AdminAuditService,
          useValue: { log: jest.fn() },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(AdminCosmeticsController);
  });

  it('creates cosmetic item with valid payload', async () => {
    prismaMock.cosmeticCatalogItem.findUnique.mockResolvedValue(null);
    prismaMock.season.findUnique.mockResolvedValue({ id: 'season-1' });
    prismaMock.cosmeticCatalogItem.create.mockImplementation(async ({ data }) => data);
    const session: any = { userId: 'admin1' };
    const result = await controller.create(session, {
      code: 'avatar_hat_blue',
      type: 'avatar',
      title: 'Blue Hat',
      description: 'Cool blue hat',
      icon: 'https://example.com/hat.png',
      priceSoft: 100,
      priceStars: 0,
      rarity: 'epic',
      isExclusive: true,
      isLimited: true,
      seasonId: 'season-1',
    });
    expect(prismaMock.cosmeticCatalogItem.findUnique).toHaveBeenCalledWith({ where: { code: 'avatar_hat_blue' } });
    expect(prismaMock.cosmeticCatalogItem.create).toHaveBeenCalled();
    expect(result.code).toBe('avatar_hat_blue');
    expect(result.slot).toBe('avatar');
    expect(result.isActive).toBe(true);
    expect(result.rarity).toBe('epic');
    expect(result.isExclusive).toBe(true);
    expect(result.isLimited).toBe(true);
    expect(result.seasonId).toBe('season-1');
  });

  it('rejects negative prices', async () => {
    const session: any = { userId: 'admin1' };
    await expect(
      controller.create(session, {
        code: 'bad_price',
        type: 'avatar',
        title: 'Bad',
        priceSoft: -1,
        priceStars: 0,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects invalid rarity or seasonId', async () => {
    prismaMock.season.findUnique.mockResolvedValue(null);
    let session: any = { userId: 'admin1' };
    await expect(
      controller.create(session, {
        code: 'bad_rarity',
        type: 'avatar',
        title: 'Bad',
        rarity: 'invalid' as never,
      }),
    ).rejects.toThrow(BadRequestException);

    prismaMock.season.findUnique.mockResolvedValue(null);
    session = { userId: 'admin1' };
    await expect(
      controller.create(session, {
        code: 'bad_season',
        type: 'avatar',
        title: 'Bad',
        rarity: 'common',
        seasonId: 'unknown',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('updates cosmetic item', async () => {
    prismaMock.cosmeticCatalogItem.findUnique.mockResolvedValue({
      code: 'avatar_hat_blue',
      slot: 'avatar',
      title: 'Old',
      description: null,
      icon: null,
      priceSoft: 100,
      priceStars: null,
      rarity: 'common',
      isExclusive: false,
      isLimited: false,
      seasonId: null,
    });
    prismaMock.season.findUnique.mockResolvedValue({ id: 'season-1' });
    prismaMock.cosmeticCatalogItem.update.mockImplementation(async ({ data }) => ({
      code: 'avatar_hat_blue',
      slot: 'frame',
      title: data.title,
      description: data.description,
      icon: data.icon,
      priceSoft: data.priceSoft,
      priceStars: data.priceStars,
    }));
    const session: any = { userId: 'admin1' };
    const result = await controller.update(session, 'avatar_hat_blue', {
      type: 'avatar_frame',
      title: 'Updated',
      priceSoft: 150,
      rarity: 'legendary',
      isExclusive: true,
      isLimited: true,
      seasonId: 'season-1',
    });
    expect(prismaMock.cosmeticCatalogItem.update).toHaveBeenCalled();
    expect(result.slot).toBe('frame');
    expect(result.title).toBe('Updated');
  });

  it('deactivates cosmetic item', async () => {
    prismaMock.cosmeticCatalogItem.findUnique.mockResolvedValue({
      code: 'avatar_hat_blue',
      slot: 'avatar',
    });
    prismaMock.cosmeticCatalogItem.update.mockImplementation(async ({ data }) => ({
      code: 'avatar_hat_blue',
      isActive: data.isActive,
    }));
    const session: any = { userId: 'admin1' };
    const result = await controller.deactivate(session, 'avatar_hat_blue');
    expect(prismaMock.cosmeticCatalogItem.update).toHaveBeenCalledWith({
      where: { code: 'avatar_hat_blue' },
      data: { isActive: false },
    });
    expect(result.isActive).toBe(false);
  });

  it('throws when deactivating unknown item', async () => {
    prismaMock.cosmeticCatalogItem.findUnique.mockResolvedValue(null);
    const session: any = { userId: 'admin1' };
    await expect(controller.deactivate(session, 'unknown')).rejects.toThrow(NotFoundException);
  });
});

