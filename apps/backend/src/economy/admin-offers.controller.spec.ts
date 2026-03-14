import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { AdminOffersController } from './admin-offers.controller';
import { AdminOffersService } from './admin-offers.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../admin/admin.guard';
import { AdminAuditService } from '../admin/admin-audit.service';

function createInMemoryPrisma(): PrismaService {
  const storeOffers: unknown[] = [];
  const prismaLike: Partial<PrismaService> = {
    storeOffer: {
      findMany: async () => storeOffers,
      findUnique: async (args: { where: { id: string } }) =>
        (storeOffers as Array<{ id: string }>).find((o) => o.id === args.where.id) ?? null,
      create: async (args: { data: { id: string; code: string; itemId: string; priceSoft: number; priceStars: number | null; currencyType: string; isActive: boolean; sortOrder: number; startsAt: Date | null; endsAt: Date | null } }) => {
        const row = {
          id: args.data.id,
          code: args.data.code,
          itemId: args.data.itemId,
          priceSoft: args.data.priceSoft,
          priceStars: args.data.priceStars,
          currencyType: args.data.currencyType,
          isActive: args.data.isActive,
          sortOrder: args.data.sortOrder,
          startsAt: args.data.startsAt,
          endsAt: args.data.endsAt,
        };
        (storeOffers as unknown[]).push(row);
        return row;
      },
      update: async (args: { where: { id: string }; data: Partial<{ priceSoft: number; sortOrder: number; isActive: boolean }> }) => {
        const idx = (storeOffers as Array<{ id: string }>).findIndex((o) => o.id === args.where.id);
        if (idx === -1) throw new Error('not found');
        const next = { ...(storeOffers as any)[idx], ...args.data };
        (storeOffers as any)[idx] = next;
        return next;
      },
    } as never,
    cosmeticCatalogItem: {
      findUnique: async (args: { where: { id: string } }) => {
        if (args.where.id === 'avatar_hat_red') {
          return { id: 'avatar_hat_red' };
        }
        return null;
      },
    } as never,
  };
  return prismaLike as PrismaService;
}

describe('AdminOffersController', () => {
  let controller: AdminOffersController;
  let service: AdminOffersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminOffersController],
      providers: [
        AdminOffersService,
        { provide: PrismaService, useFactory: createInMemoryPrisma },
        { provide: AdminAuditService, useValue: { log: jest.fn() } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(AdminOffersController);
    service = module.get(AdminOffersService);
  });

  it('lists offers (initially empty)', async () => {
    await expect(controller.list()).resolves.toEqual([]);
  });

  it('creates and updates offer', async () => {
    const session: any = { userId: 'admin1' };
    const created = await controller.create(session, {
      code: 'OFFER_HAT',
      itemId: 'avatar_hat_red',
      priceSoft: 300,
      priceStars: null,
      currencyType: 'soft',
      isActive: true,
      sortOrder: 1,
      startsAt: null,
      endsAt: null,
    });

    expect(created.key).toBe('OFFER_HAT');
    const list = await service.list();
    expect(list).toHaveLength(1);

    const updated = await controller.update(session, created.id, {
      code: 'OFFER_HAT',
      itemId: 'avatar_hat_red',
      priceSoft: 350,
      sortOrder: 2,
    });
    expect(updated.priceSoft).toBe(350);
  });

  it('toggles active state', async () => {
    const session: any = { userId: 'admin1' };
    const created = await controller.create(session, {
      code: 'OFFER_TOGGLE',
      itemId: 'avatar_hat_red',
      priceSoft: 100,
      priceStars: null,
      currencyType: 'soft',
      isActive: true,
      sortOrder: 0,
      startsAt: null,
      endsAt: null,
    });
    await controller.deactivate(session, created.id);
    const afterDeactivate = await service.list();
    expect(afterDeactivate[0]).toBeDefined();
    await controller.activate(session, created.id);
  });
});

