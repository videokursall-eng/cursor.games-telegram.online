import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { AdminEconomyController } from './admin-economy.controller';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../economy/wallet.service';
import { CosmeticsService } from '../economy/cosmetics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from './admin.guard';
import { AdminAuditService } from './admin-audit.service';
import { RateLimitGuard } from '../rate-limit/rate-limit.guard';
import { RateLimitService } from '../rate-limit/rate-limit.service';

describe('AdminEconomyController', () => {
  let controller: AdminEconomyController;
  const walletService = {
    getWallet: jest.fn(),
    credit: jest.fn(),
  };
  const cosmeticsService = {
    getInventory: jest.fn(),
    grantItem: jest.fn(),
  };
  const prismaMock = {
    transaction: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    process.env.RATE_LIMIT_STORAGE = 'memory';
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminEconomyController],
      providers: [
        { provide: PrismaService, useValue: prismaMock },
        { provide: WalletService, useValue: walletService },
        { provide: CosmeticsService, useValue: cosmeticsService },
        { provide: AdminAuditService, useValue: { log: jest.fn() } },
        RateLimitGuard,
        RateLimitService,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(AdminEconomyController);

    walletService.getWallet.mockReset();
    walletService.credit.mockReset();
    cosmeticsService.getInventory.mockReset();
    cosmeticsService.grantItem.mockReset();
    prismaMock.transaction.create.mockReset();
  });

  it('returns wallet for user', async () => {
    walletService.getWallet.mockResolvedValue({
      userId: 'u1',
      currency: 'soft',
      balance: 100,
      updatedAt: new Date(0).toISOString(),
    });
    const res = await controller.getWallet('u1');
    expect(res.balance).toBe(100);
    expect(walletService.getWallet).toHaveBeenCalledWith('u1', 'soft');
  });

  it('returns inventory for user', async () => {
    cosmeticsService.getInventory.mockResolvedValue({
      userId: 'u1',
      ownedItems: [],
      equippedItems: {},
    });
    const inv = await controller.getInventory('u1');
    expect(inv.userId).toBe('u1');
    expect(cosmeticsService.getInventory).toHaveBeenCalledWith('u1');
  });

  it('credits wallet with audit metadata', async () => {
    walletService.credit.mockResolvedValue({
      wallet: {
        userId: 'u1',
        currency: 'soft',
        balance: 150,
        updatedAt: new Date(0).toISOString(),
      },
      transaction: {
        id: 't1',
        userId: 'u1',
        currency: 'soft',
        amount: 50,
        reason: 'admin_adjustment',
        metadata: { admin: true },
        createdAt: new Date(0).toISOString(),
      },
    });

    const session: any = { userId: 'admin1' };
    const res = await controller.creditWallet(session, {
      userId: 'u1',
      amount: 50,
      reason: 'admin_adjustment',
    });

    expect(walletService.credit).toHaveBeenCalledWith('u1', 50, 'admin_adjustment', { admin: true });
    expect(res.wallet.balance).toBe(150);
  });

  it('grants item and writes audit transaction', async () => {
    cosmeticsService.getInventory.mockResolvedValue({
      userId: 'u1',
      ownedItems: [],
      equippedItems: {},
    });

    const session: any = { userId: 'admin1' };
    const res = await controller.grantItem(session, {
      userId: 'u1',
      itemId: 'card_back_red',
      reason: 'admin_grant',
      tag: 'manual',
    });

    expect(cosmeticsService.grantItem).toHaveBeenCalledWith('u1', 'card_back_red', 'grant', 'manual');
    expect(prismaMock.transaction.create).toHaveBeenCalled();
    expect(res.userId).toBe('u1');
  });
});

