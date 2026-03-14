import { Test, TestingModule } from '@nestjs/testing';
import { WalletService } from './wallet.service';
import { PrismaService } from '../prisma/prisma.service';
import { createMockPrismaService } from '../prisma/prisma.service.mock';
import { BadRequestException } from '@nestjs/common';

describe('WalletService', () => {
  let service: WalletService;

  function createInMemoryPrisma(): PrismaService {
    const wallets: {
      id: string;
      userId: string;
      currency: string;
      balance: number;
      createdAt: Date;
      updatedAt: Date;
    }[] = [];
    const txs: {
      id: string;
      walletId: string;
      amount: number;
      type: 'CREDIT' | 'DEBIT';
      reason: string | null;
      meta: unknown | null;
      createdAt: Date;
    }[] = [];

    let idCounter = 1;
    const genId = () => `id-${idCounter++}`;

    const base = createMockPrismaService({
      economyWallet: {
        findUnique: async (args: { where: { userId_currency: { userId: string; currency: string } } }) => {
          const { userId, currency } = args.where.userId_currency;
          return wallets.find((w) => w.userId === userId && w.currency === currency) ?? null;
        },
        upsert: async (args: {
          where: { userId_currency: { userId: string; currency: string } };
          update: { balance: { increment: number } };
          create: { userId: string; currency: string; balance: number };
        }) => {
          const { userId, currency } = args.where.userId_currency;
          let w = wallets.find((it) => it.userId === userId && it.currency === currency);
          if (!w) {
            w = {
              id: genId(),
              userId,
              currency,
              balance: args.create.balance,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            wallets.push(w);
          } else {
            w.balance += args.update.balance.increment;
            w.updatedAt = new Date();
          }
          return { ...w };
        },
        update: async (args: {
          where: { userId_currency: { userId: string; currency: string } };
          data: { balance: { decrement: number } };
        }) => {
          const { userId, currency } = args.where.userId_currency;
          const w = wallets.find((it) => it.userId === userId && it.currency === currency);
          if (!w) throw new Error('Wallet not found');
          w.balance -= args.data.balance.decrement;
          w.updatedAt = new Date();
          return { ...w };
        },
      } as never,
      transaction: {
        create: async (args: {
          data: { walletId?: string; wallet?: { connect: { userId_currency: { userId: string; currency: string } } }; amount: number; type: 'CREDIT' | 'DEBIT'; reason?: string; meta?: unknown };
          include?: { wallet: boolean };
        }) => {
          let walletId = args.data.walletId;
          if (!walletId && args.data.wallet?.connect) {
            const { userId, currency } = args.data.wallet.connect.userId_currency;
            const w = wallets.find((it) => it.userId === userId && it.currency === currency);
            if (!w) throw new Error('Wallet not found for connect');
            walletId = w.id;
          }
          const row = {
            id: genId(),
            walletId: walletId!,
            amount: args.data.amount,
            type: args.data.type,
            reason: args.data.reason ?? null,
            meta: args.data.meta ?? null,
            createdAt: new Date(),
          };
          txs.push(row);
          if (args.include?.wallet) {
            const wallet = wallets.find((w) => w.id === walletId)!;
            return { ...row, wallet };
          }
          return row;
        },
        findMany: async (args: {
          where: { wallet: { userId: string; currency: string } };
          orderBy?: { createdAt: 'asc' | 'desc' };
          take?: number;
          include?: { wallet: boolean };
        }) => {
          const { userId, currency } = args.where.wallet;
          const wallet = wallets.find((w) => w.userId === userId && w.currency === currency);
          if (!wallet) return [];
          let rows = txs.filter((t) => t.walletId === wallet.id);
          if (args.orderBy?.createdAt === 'desc') {
            rows = rows.slice().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
          }
          if (typeof args.take === 'number') {
            rows = rows.slice(0, args.take);
          }
          if (args.include?.wallet) {
            return rows.map((r) => ({ ...r, wallet }));
          }
          return rows;
        },
      } as never,
      $transaction: async <T>(arg: T | ((prisma: PrismaService) => Promise<T>)): Promise<T> => {
        if (typeof arg === 'function') {
          // interactive transaction (callback receives same mock client)
          return (arg as (prisma: PrismaService) => Promise<T>)(base);
        }
        // batched operations: array of promises
        if (Array.isArray(arg)) {
          const results: unknown[] = [];
          for (const p of arg as unknown as Promise<unknown>[]) {
            // eslint-disable-next-line no-await-in-loop
            results.push(await p);
          }
          return results as T;
        }
        return arg as T;
      },
    });

    return base;
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WalletService, PrismaService],
    })
      .overrideProvider(PrismaService)
      .useValue(createInMemoryPrisma())
      .compile();

    service = module.get<WalletService>(WalletService);
  });

  it('credits soft currency and updates balance with transaction', async () => {
    const result = await service.credit('u1', 100, 'match_reward', { matchId: 'm1' });
    expect(result.wallet.userId).toBe('u1');
    expect(result.wallet.balance).toBe(100);
    expect(result.transaction.amount).toBe(100);
    expect(result.transaction.currency).toBe('soft');
    expect(result.transaction.reason).toBe('match_reward');
    expect(result.transaction.metadata?.matchId).toBe('m1');
  });

  it('debits soft currency when balance is sufficient', async () => {
    await service.credit('u1', 150, 'match_reward');
    const result = await service.debit('u1', 50, 'store_purchase', { offerId: 'offer1' });
    expect(result.wallet.balance).toBe(100);
    expect(result.transaction.amount).toBe(-50);
    expect(result.transaction.reason).toBe('store_purchase');
    expect(result.transaction.metadata?.offerId).toBe('offer1');
  });

  it('throws when debit would make balance negative', async () => {
    await expect(service.debit('u1', 10, 'store_purchase')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('getTransactions returns recent history for user wallet', async () => {
    await service.credit('u1', 200, 'match_reward');
    await service.debit('u1', 50, 'store_purchase');
    const history = await service.getTransactions('u1', 'soft', 10);
    expect(history.length).toBe(2);
    const amounts = history.map((h) => h.amount).sort((a, b) => a - b);
    expect(amounts).toEqual([-50, 200]);
  });
});

