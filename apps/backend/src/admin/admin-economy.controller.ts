import { BadRequestException, Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from './admin.guard';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../economy/wallet.service';
import { CosmeticsService } from '../economy/cosmetics.service';
import { AdminAuditService } from './admin-audit.service';
import { Session } from '../auth/session.decorator';
import { RateLimit } from '../rate-limit/rate-limit.decorator';
import { RateLimitGuard } from '../rate-limit/rate-limit.guard';
import type { PlayerInventoryDto, WalletDto, CurrencyTransactionDto, AuthSessionPayload } from 'shared';

interface AdminGrantItemDto {
  userId: string;
  itemId: string;
  reason: string;
  tag?: string;
}

interface AdminAdjustWalletDto {
  userId: string;
  amount: number;
  reason: CurrencyTransactionDto['reason'];
}

@Controller('admin/economy')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminEconomyController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wallet: WalletService,
    private readonly cosmetics: CosmeticsService,
    private readonly audit: AdminAuditService,
  ) {}

  @Get('wallet/:userId')
  async getWallet(@Param('userId') userId: string): Promise<WalletDto> {
    return this.wallet.getWallet(userId, 'soft');
  }

  @Get('inventory/:userId')
  async getInventory(@Param('userId') userId: string): Promise<PlayerInventoryDto> {
    return this.cosmetics.getInventory(userId);
  }

  @Post('wallet/credit')
  @UseGuards(JwtAuthGuard, AdminGuard, RateLimitGuard)
  @RateLimit({ limit: 30, windowMs: 60_000, keyType: 'user' })
  async creditWallet(
    @Session() session: AuthSessionPayload,
    @Body() dto: AdminAdjustWalletDto,
  ): Promise<{ wallet: WalletDto; transaction: CurrencyTransactionDto }> {
    if (!dto.userId) {
      throw new BadRequestException('userId is required');
    }
    if (dto.amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }
    if (!dto.reason) {
      throw new BadRequestException('reason is required');
    }

    const result = await this.wallet.credit(dto.userId, dto.amount, dto.reason, { admin: true });
    await this.audit.log({
      admin: session,
      action: 'wallet_credit',
      targetType: 'EconomyWallet',
      targetId: dto.userId,
      success: true,
      reason: dto.reason,
      payload: dto,
    });
    return result;
  }

  @Post('inventory/grant')
  @UseGuards(JwtAuthGuard, AdminGuard, RateLimitGuard)
  @RateLimit({ limit: 30, windowMs: 60_000, keyType: 'user' })
  async grantItem(
    @Session() session: AuthSessionPayload,
    @Body() dto: AdminGrantItemDto,
  ): Promise<PlayerInventoryDto> {
    if (!dto.userId || !dto.itemId || !dto.reason) {
      throw new BadRequestException('userId, itemId and reason are required');
    }
    await this.cosmetics.grantItem(dto.userId, dto.itemId, 'grant', dto.tag ?? dto.reason);
    // audit log entry
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prisma: any = this.prisma;
    await prisma.transaction.create({
      data: {
        amount: 0,
        type: 'CREDIT',
        reason: 'grant_item',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        meta: {
          admin: true,
          userId: dto.userId,
          itemId: dto.itemId,
          reason: dto.reason,
          tag: dto.tag ?? null,
        } as any,
      },
    });
    const inv = await this.cosmetics.getInventory(dto.userId);
    await this.audit.log({
      admin: session,
      action: 'inventory_grant',
      targetType: 'PlayerCosmeticItem',
      targetId: dto.itemId,
      success: true,
      reason: dto.reason,
      payload: dto,
    });
    return inv;
  }
}

