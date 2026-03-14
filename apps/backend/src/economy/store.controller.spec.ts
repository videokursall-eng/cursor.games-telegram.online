import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { StoreController } from './store.controller';
import { CosmeticsService } from './cosmetics.service';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

describe('StoreController', () => {
  let controller: StoreController;
  const cosmetics: { getActiveItemOrThrow: jest.Mock; getInventory: jest.Mock; grantItem: jest.Mock } =
    {
      getActiveItemOrThrow: jest.fn(),
      getInventory: jest.fn(),
      grantItem: jest.fn(),
    };
  const wallet: { debit: jest.Mock } = {
    debit: jest.fn(),
  };
  const prisma: {
    storeOffer: {
      findFirst: jest.Mock;
    };
  } = {
    storeOffer: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StoreController],
      providers: [
        { provide: CosmeticsService, useValue: cosmetics },
        { provide: WalletService, useValue: wallet },
        { provide: PrismaService, useValue: prisma },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(StoreController);
    cosmetics.getActiveItemOrThrow.mockReset();
    cosmetics.getInventory.mockReset();
    cosmetics.grantItem.mockReset();
    wallet.debit.mockReset();
    prisma.storeOffer.findFirst.mockReset();
  });

  it('purchases cosmetic item, debits wallet and grants inventory', async () => {
    const session = { userId: 'u1', telegramId: 1 } as { userId: string; telegramId: number };
    const item = {
      id: 'avatar_hat_red',
      key: 'avatar_hat_red',
      name: 'Красная шляпа',
      slot: 'avatar',
      rarity: 'rare',
      description: 'desc',
      iconUrl: null,
      priceSoft: 500,
      priceStars: null,
      isExclusive: false,
      isLimited: false,
      seasonId: null,
    };
    prisma.storeOffer.findFirst.mockResolvedValue({
      id: 'offer_hat_soft',
      code: 'offer_hat_soft',
      itemId: 'avatar_hat_red',
      priceSoft: 500,
      priceStars: null,
      isActive: true,
      startsAt: null,
      endsAt: null,
    });
    cosmetics.getActiveItemOrThrow.mockResolvedValue(item);
    cosmetics.getInventory.mockResolvedValueOnce({
      userId: 'u1',
      ownedItems: [],
      equippedItems: {},
    });
    cosmetics.getInventory.mockResolvedValueOnce({
      userId: 'u1',
      ownedItems: [
        {
          itemId: 'avatar_hat_red',
          acquiredAt: new Date().toISOString(),
          source: 'purchase',
        },
      ],
      equippedItems: {},
    });
    wallet.debit.mockResolvedValue({
      wallet: {
        userId: 'u1',
        currency: 'soft',
        balance: 500,
        updatedAt: new Date().toISOString(),
      },
    });

    const result = await controller.purchase(session, { offerId: 'offer_hat_soft' });

    expect(wallet.debit).toHaveBeenCalledWith('u1', 500, 'store_purchase', {
      offerId: 'offer_hat_soft',
      itemId: 'avatar_hat_red',
    });
    expect(cosmetics.grantItem).toHaveBeenCalledWith('u1', 'avatar_hat_red', 'purchase');
    expect(result.wallet.balance).toBe(500);
    expect(result.inventory.ownedItems.some((o) => o.itemId === 'avatar_hat_red')).toBe(true);
  });

  it('rejects purchase when item already owned', async () => {
    const session = { userId: 'u1', telegramId: 1 } as { userId: string; telegramId: number };
    cosmetics.getActiveItemOrThrow.mockResolvedValue({
      id: 'frame_gold',
      key: 'frame_gold',
      name: 'frame',
      slot: 'avatar_frame',
      rarity: 'epic',
      description: '',
      iconUrl: null,
      priceSoft: 800,
      priceStars: null,
      isExclusive: false,
      isLimited: false,
      seasonId: null,
    });
    prisma.storeOffer.findFirst.mockResolvedValue({
      id: 'offer_frame_soft',
      code: 'offer_frame_soft',
      itemId: 'frame_gold',
      priceSoft: 800,
      priceStars: null,
      isActive: true,
      startsAt: null,
      endsAt: null,
    });
    cosmetics.getInventory.mockResolvedValue({
      userId: 'u1',
      ownedItems: [
        {
          itemId: 'frame_gold',
          acquiredAt: new Date().toISOString(),
          source: 'purchase',
        },
      ],
      equippedItems: {},
    });

    await expect(controller.purchase(session, { offerId: 'offer_frame_soft' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(wallet.debit).not.toHaveBeenCalled();
    expect(cosmetics.grantItem).not.toHaveBeenCalled();
  });
});

