import { describe, it, expect } from '@jest/globals';
import type { StoreOfferDto, CosmeticItemDto, PlayerInventoryDto, WalletDto } from 'shared';
import { AdminOffersService } from './admin-offers.service';
import { StoreOffersController } from './store-offers.controller';
import { StoreController } from './store.controller';
import type { PrismaService } from '../prisma/prisma.service';
import { CosmeticsService } from './cosmetics.service';
import { WalletService } from './wallet.service';

describe('Store offer flow integration', () => {
  it('admin creates offer -> public lists -> purchase by offerId updates wallet and inventory', async () => {
    const offers: unknown[] = [];
    const prismaMock: Partial<PrismaService> = {
      storeOffer: {
        findMany: async () => offers,
        findFirst: async (args: { where: { id: string } }) => {
          return (
            (offers as Array<{
              id: string;
              isActive: boolean;
              startsAt: Date | null;
              endsAt: Date | null;
            }>).find((o) => {
              return (
                o.id === args.where.id &&
                o.isActive === true &&
                (!o.startsAt || o.startsAt <= new Date()) &&
                (!o.endsAt || o.endsAt >= new Date())
              );
            }) ?? null
          );
        },
        findUnique: async ({ where }: { where: { id: string } }) =>
          (offers as Array<{ id: string }>).find((o) => o.id === where.id) ?? null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        create: async ({ data }: { data: any }) => {
          const row = {
            id: data.id ?? `offer_${offers.length + 1}`,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...data,
          };
          (offers as unknown[]).push(row);
          return row;
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        update: async ({ where, data }: { where: { id: string }; data: any }) => {
          const idx = (offers as Array<{ id: string }>).findIndex((o) => o.id === where.id);
          if (idx === -1) throw new Error('Offer not found');
          const next = { ...(offers as any)[idx], ...data, updatedAt: new Date() };
          (offers as any)[idx] = next;
          return next;
        },
      } as never,
      cosmeticCatalogItem: {
        findUnique: async ({ where }: { where: { id: string } }) =>
          where.id === 'avatar_hat_red'
            ? {
                id: 'avatar_hat_red',
                code: 'avatar_hat_red',
                slot: 'avatar',
                rarity: 'rare',
                title: 'Красная шляпа',
                description: 'desc',
                iconUrl: null,
                priceSoft: 500,
                priceStars: null,
                isExclusive: false,
                isLimited: false,
                seasonId: null,
                createdAt: new Date(),
                updatedAt: new Date(),
              }
            : null,
      } as any,
    };

    const cosmetics: {
      getActiveItemOrThrow: (id: string) => Promise<CosmeticItemDto>;
      getInventory: (userId: string) => Promise<PlayerInventoryDto>;
      grantItem: (userId: string, itemId: string, source: string) => Promise<void>;
    } = {
      getActiveItemOrThrow: async (id: string) =>
        ({
          id,
          key: id,
          name: 'Красная шляпа',
          description: 'desc',
          slot: 'avatar',
          rarity: 'rare',
          iconUrl: null,
          priceSoft: 500,
          priceStars: null,
          isExclusive: false,
          isLimited: false,
          seasonId: null,
        } as CosmeticItemDto),
      getInventory: async () => currentInventory,
      grantItem: async (userId: string, itemId: string) => {
        currentInventory = {
          ...currentInventory,
          ownedItems: [
            ...currentInventory.ownedItems,
            {
              itemId,
              acquiredAt: new Date().toISOString(),
              source: 'purchase',
            },
          ],
        };
      },
    };

    let currentInventory: PlayerInventoryDto = {
      userId: 'u1',
      ownedItems: [],
      equippedItems: {},
    };

    let currentWallet: WalletDto = {
      userId: 'u1',
      currency: 'soft',
      balance: 1000,
      updatedAt: new Date().toISOString(),
    };

    const wallet: {
      debit: (userId: string, amount: number, reason: string, meta?: Record<string, unknown>) => Promise<{
        wallet: WalletDto;
      }>;
    } = {
      debit: async (_userId, amount) => {
        currentWallet = {
          ...currentWallet,
          balance: currentWallet.balance - amount,
          updatedAt: new Date().toISOString(),
        };
        return { wallet: currentWallet };
      },
    };

    const adminService = new AdminOffersService(prismaMock as PrismaService);
    const publicController = new StoreOffersController(prismaMock as PrismaService);
    const storeController = new StoreController(
      cosmetics as unknown as CosmeticsService,
      wallet as unknown as WalletService,
      prismaMock as PrismaService,
    );

    // 1) Admin creates offer.
    const created = await adminService.create({
      code: 'OFFER_HAT_SOFT',
      itemId: 'avatar_hat_red',
      priceSoft: 500,
      priceStars: null,
      currencyType: 'soft',
      isActive: true,
      sortOrder: 1,
      startsAt: null,
      endsAt: null,
    });

    expect(created.priceSoft).toBe(500);

    // 2) Public GET /store/offers sees this offer.
    const offersDto: StoreOfferDto[] = await publicController.getOffers();
    expect(offersDto.length).toBe(1);
    const offer = offersDto[0];
    expect(offer.priceSoft).toBe(500);

    // 3) Purchase by offerId updates wallet and inventory.
    const session = { userId: 'u1', telegramId: 1 } as { userId: string; telegramId: number };
    const result = await storeController.purchase(session, { offerId: offer.id });

    expect(result.wallet.balance).toBe(500);
    expect(
      result.inventory.ownedItems.some((o) => o.itemId === 'avatar_hat_red'),
    ).toBe(true);
  });
});

