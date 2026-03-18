import { Injectable, BadRequestException } from '@nestjs/common';
import type { WalletDto, CurrencyTransactionDto } from 'shared';
import { emptyWallet } from 'shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  private toWalletDto(entity: { userId: string; currency: string; balance: number; updatedAt?: Date }): WalletDto {
    // We only support soft currency for now; other codes may be added later.
    const currency = entity.currency === 'stars' ? 'stars' : 'soft';
    return {
      userId: entity.userId,
      currency,
      balance: entity.balance,
      updatedAt: (entity.updatedAt ?? new Date(0)).toISOString(),
    };
  }

  private toTransactionDto(entity: {
    id: string;
    wallet?: { userId: string; currency: string };
    walletId?: string;
    userId?: string;
    currency?: string;
    amount: number;
    type: 'CREDIT' | 'DEBIT';
    reason: string | null;
    meta: unknown | null;
    createdAt?: Date;
  }): CurrencyTransactionDto {
    const walletUserId = entity.wallet?.userId ?? entity.userId ?? '';
    const walletCurrency = entity.wallet?.currency ?? entity.currency ?? 'soft';
    const currency = walletCurrency === 'stars' ? 'stars' : 'soft';
    const signedAmount = entity.type === 'DEBIT' ? -Math.abs(entity.amount) : Math.abs(entity.amount);
    return {
      id: entity.id,
      userId: walletUserId,
      currency,
      amount: signedAmount,
      reason: (entity.reason as CurrencyTransactionDto['reason']) ?? 'other',
      metadata: (entity.meta as Record<string, unknown> | undefined) ?? undefined,
      createdAt: (entity.createdAt ?? new Date(0)).toISOString(),
    };
  }

  async getWallet(userId: string, currency: 'soft' | 'stars' = 'soft'): Promise<WalletDto> {
    const row = await this.prisma.economyWallet.findUnique({
      where: { userId_currency: { userId, currency } },
    });
    if (!row) return emptyWallet(userId, currency);
    return this.toWalletDto(row);
  }

  async getBalance(userId: string, currency: 'soft' | 'stars' = 'soft'): Promise<number> {
    const wallet = await this.getWallet(userId, currency);
    return wallet.balance;
  }

  async credit(
    userId: string,
    amount: number,
    reason: CurrencyTransactionDto['reason'],
    metadata?: Record<string, unknown>,
    currency: 'soft' | 'stars' = 'soft',
  ): Promise<{ wallet: WalletDto; transaction: CurrencyTransactionDto }> {
    if (amount <= 0) {
      throw new BadRequestException('Credit amount must be positive');
    }

    const [walletRow, txRow] = await this.prisma.$transaction([
      this.prisma.economyWallet.upsert({
        where: { userId_currency: { userId, currency } },
        update: { balance: { increment: amount } },
        create: { userId, currency, balance: amount },
      }),
      this.prisma.transaction.create({
        // JSON typing is enforced by Prisma; for DTO we only care about runtime shape.
        data: {
          wallet: { connect: { userId_currency: { userId, currency } } },
          amount,
          type: 'CREDIT',
          reason,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          meta: (metadata as any) ?? undefined,
        },
        include: { wallet: true },
      }),
    ]);

    return {
      wallet: this.toWalletDto(walletRow),
      transaction: this.toTransactionDto(txRow),
    };
  }

  async debit(
    userId: string,
    amount: number,
    reason: CurrencyTransactionDto['reason'],
    metadata?: Record<string, unknown>,
    currency: 'soft' | 'stars' = 'soft',
  ): Promise<{ wallet: WalletDto; transaction: CurrencyTransactionDto }> {
    if (amount <= 0) {
      throw new BadRequestException('Debit amount must be positive');
    }

    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.economyWallet.findUnique({
        where: { userId_currency: { userId, currency } },
      });
      const current = wallet?.balance ?? 0;
      if (current < amount) {
        throw new BadRequestException('Insufficient funds');
      }

      const updated = await tx.economyWallet.update({
        where: { userId_currency: { userId, currency } },
        data: { balance: { decrement: amount } },
      });

      const txRow = await tx.transaction.create({
        data: {
          walletId: updated.id,
          amount,
          type: 'DEBIT',
          reason,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          meta: (metadata as any) ?? undefined,
        },
        include: { wallet: true },
      });

      return {
        wallet: this.toWalletDto(updated),
        transaction: this.toTransactionDto(txRow),
      };
    });
  }

  async getTransactions(userId: string, currency: 'soft' | 'stars' = 'soft', limit = 50): Promise<CurrencyTransactionDto[]> {
    const rows = await this.prisma.transaction.findMany({
      where: { wallet: { userId, currency } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { wallet: true },
    });
    return rows.map((row) => this.toTransactionDto(row));
  }
}

