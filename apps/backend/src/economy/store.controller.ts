import { Body, Controller, Post, UseGuards, BadRequestException } from '@nestjs/common';
import type {
  CosmeticItemDto,
  PlayerInventoryDto,
  WalletDto,
  AuthSessionPayload,
} from 'shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Session } from '../auth/session.decorator';
import { CosmeticsService } from './cosmetics.service';
import { WalletService } from './wallet.service';
import { PrismaService } from '../prisma/prisma.service';

interface PurchaseDto {
  offerId: string;
}

interface PurchaseResultDto {
  wallet: WalletDto;
  inventory: PlayerInventoryDto;
  item: CosmeticItemDto;
}

@Controller('store')
@UseGuards(JwtAuthGuard)
export class StoreController {
  constructor(
    private readonly cosmeticsService: CosmeticsService,
    private readonly walletService: WalletService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('purchase')
  async purchase(
    @Session() session: AuthSessionPayload,
    @Body() dto: PurchaseDto,
  ): Promise<PurchaseResultDto> {
    if (!dto.offerId) {
      throw new BadRequestException('offerId is required');
    }

    const now = new Date();
    const offer = await this.prisma.storeOffer.findFirst({
      where: {
        id: dto.offerId,
        isActive: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ endsAt: null }, { endsAt: { gte: now } }],
      },
    });

    if (!offer) {
      throw new BadRequestException('Offer not found or inactive');
    }

    const price = offer.priceSoft ?? null;
    if (!price || price <= 0) {
      throw new BadRequestException('Offer is not purchasable for soft currency');
    }

    const item = await this.cosmeticsService.getActiveItemOrThrow(offer.itemId);

    // Ensure not granting duplicate if inventory already contains the item.
    const inventoryBefore = await this.cosmeticsService.getInventory(session.userId);
    const alreadyOwned = inventoryBefore.ownedItems.some((o) => o.itemId === item.id);
    if (alreadyOwned) {
      throw new BadRequestException('Item already owned');
    }

    const { wallet } = await this.walletService.debit(session.userId, price, 'store_purchase', {
      offerId: offer.id,
      itemId: item.id,
    });

    await this.cosmeticsService.grantItem(session.userId, item.id, 'purchase');
    const inventory = await this.cosmeticsService.getInventory(session.userId);

    return {
      wallet,
      inventory,
      item,
    };
  }
}

