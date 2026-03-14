import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import {
  PaymentService,
  PAYMENT_VERIFICATION_PORT,
  type PaymentVerificationPort,
  type TelegramStarsProduct,
  type NonCombatGrant,
} from './payment.service';
import { WalletService } from './wallet.service';
import { CosmeticsService } from './cosmetics.service';
import { PrismaService } from '../prisma/prisma.service';
import { StructuredLoggerService } from '../logging/structured-logger.service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createInMemoryPrisma(): PrismaService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const intents: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fulfillments: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const products: any[] = [
    {
      id: 'prod1',
      code: 'starter_pack',
      title: 'Starter Pack',
      description: 'Test starter pack',
      amountStars: 100,
      isActive: true,
    },
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prisma: any = {
    telegramStarsProduct: {
      findUnique: async (args: { where: { id: string } }) =>
        products.find((p) => p.id === args.where.id) ?? null,
      findMany: async () => products,
    },
    starsPurchaseIntent: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      create: async (args: { data: any }) => {
        const intent = {
          id: `pi_${intents.length + 1}`,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...args.data,
        };
        intents.push(intent);
        return intent;
      },
      findUnique: async (args: { where: { id: string } }) =>
        intents.find((i) => i.id === args.where.id) ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      update: async (args: { where: { id: string }; data: any }) => {
        const idx = intents.findIndex((i) => i.id === args.where.id);
        if (idx === -1) throw new Error('intent not found');
        intents[idx] = { ...intents[idx], ...args.data, updatedAt: new Date() };
        return intents[idx];
      },
    },
    starsFulfillmentLog: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      create: async (args: { data: any }) => {
        const row = {
          id: `fulfill_${fulfillments.length + 1}`,
          createdAt: new Date(),
          ...args.data,
        };
        fulfillments.push(row);
        return row;
      },
      findFirst: async (args: { where: { purchaseIntentId?: string; status?: string } }) =>
        fulfillments.find(
          (f) =>
            (!args.where.purchaseIntentId || f.purchaseIntentId === args.where.purchaseIntentId) &&
            (!args.where.status || f.status === args.where.status),
        ) ?? null,
      findMany: async (args: { where: { userId: string } }) =>
        fulfillments.filter((f) => f.userId === args.where.userId),
    },
  };

  return prisma as PrismaService;
}

describe('PaymentService (Telegram Stars)', () => {
  let service: PaymentService;
  const wallet: { credit: jest.Mock } = { credit: jest.fn() };
  const cosmetics: { grantItem: jest.Mock } = { grantItem: jest.fn() };

  const verifier: PaymentVerificationPort = {
    verifyTelegramStarsPayment: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: PrismaService, useValue: createInMemoryPrisma() },
        { provide: WalletService, useValue: wallet },
        { provide: CosmeticsService, useValue: cosmetics },
        { provide: PAYMENT_VERIFICATION_PORT, useValue: verifier },
        {
          provide: StructuredLoggerService,
          useValue: {
            info: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(PaymentService);
    wallet.credit.mockReset();
    cosmetics.grantItem.mockReset();
    (verifier.verifyTelegramStarsPayment as jest.Mock).mockClear();
  });

  const product: TelegramStarsProduct = {
    id: 'prod1',
    key: 'starter_pack',
    title: 'Starter Pack',
    description: 'Test starter pack',
    starsAmount: 100,
  };

  const grants: NonCombatGrant[] = [
    { type: 'currency', currency: 'soft', amount: 500 },
    { type: 'cosmetic', itemId: 'avatar_hat_red' },
  ];

  it('creates purchase intent', async () => {
    const intent = await service.createStarsPurchaseIntent({
      userId: 'u1',
      product,
      grants,
    });

    expect(intent.id).toMatch(/^pi_/);
    expect(intent.userId).toBe('u1');
    expect(intent.productId).toBe('prod1');
    expect(intent.status).toBe('pending');
    expect(intent.provider).toBe('telegram_stars');
    expect(intent.amountStars).toBe(100);
  });

  it('fulfills entitlements on successful payment verification', async () => {
    const intent = await service.createStarsPurchaseIntent({
      userId: 'u2',
      product,
      grants,
    });

    const { intent: updated, fulfillment } = await service.confirmTelegramStarsPayment({
      userId: 'u2',
      intentId: intent.id,
      payload: { mock: true },
    });

    expect(updated.status).toBe('completed');
    expect(fulfillment).toBeDefined();
    expect(wallet.credit).toHaveBeenCalledWith('u2', 500, 'refund', {
      source: 'telegram_stars',
      intentId: intent.id,
    });
  });

  it('does not fulfill twice on repeated confirmation', async () => {
    const intent = await service.createStarsPurchaseIntent({
      userId: 'u3',
      product,
      grants,
    });

    await service.confirmTelegramStarsPayment({
      userId: 'u3',
      intentId: intent.id,
      payload: { mock: true },
    });
    wallet.credit.mockClear();
    cosmetics.grantItem.mockClear();

    const { intent: second, fulfillment } = await service.confirmTelegramStarsPayment({
      userId: 'u3',
      intentId: intent.id,
      payload: { mock: true },
    });

    expect(second.status).toBe('completed');
    expect(fulfillment).toBeDefined();
    expect(wallet.credit).not.toHaveBeenCalled();
    expect(cosmetics.grantItem).not.toHaveBeenCalled();
  });

  it('marks payment as failed when verification fails', async () => {
    (verifier.verifyTelegramStarsPayment as jest.Mock).mockResolvedValueOnce(false);

    const intent = await service.createStarsPurchaseIntent({
      userId: 'u4',
      product,
      grants,
    });

    const { intent: updated, fulfillment } = await service.confirmTelegramStarsPayment({
      userId: 'u4',
      intentId: intent.id,
      payload: { mock: true },
    });

    expect(updated.status).toBe('failed');
    expect(fulfillment).toBeUndefined();
    expect(wallet.credit).not.toHaveBeenCalled();
    expect(cosmetics.grantItem).not.toHaveBeenCalled();
  });

  it('rejects invalid Stars product amount', async () => {
    await expect(
      service.createStarsPurchaseIntent({
        userId: 'u5',
        product: { ...product, starsAmount: 0 },
        grants,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

