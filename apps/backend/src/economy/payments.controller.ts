import { Body, Controller, Get, Post, UseGuards, BadRequestException } from '@nestjs/common';
import type { AuthSessionPayload } from 'shared';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Session } from '../auth/session.decorator';
import { PaymentService, type TelegramStarsProduct } from './payment.service';
import { RateLimit } from '../rate-limit/rate-limit.decorator';
import { RateLimitGuard } from '../rate-limit/rate-limit.guard';

interface CreateStarsIntentDto {
  productId: string;
}

interface ConfirmStarsPaymentDto {
  intentId: string;
  payload: Record<string, unknown>;
}

@Controller('payments/stars')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentService: PaymentService,
  ) {}

  @Get('products')
  async getProducts(): Promise<TelegramStarsProduct[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await (this.prisma as any).telegramStarsProduct.findMany({
      where: { isActive: true },
      orderBy: { amountStars: 'asc' },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return rows.map((row: any) => ({
      id: row.id,
      key: row.code,
      title: row.title,
      description: row.description ?? undefined,
      starsAmount: row.amountStars,
    }));
  }

  @Post('create-intent')
  @UseGuards(JwtAuthGuard, RateLimitGuard)
  @RateLimit({ limit: 20, windowMs: 60_000, keyType: 'user' })
  async createIntent(
    @Session() session: AuthSessionPayload,
    @Body() dto: CreateStarsIntentDto,
  ) {
    if (!dto.productId) {
      throw new BadRequestException('productId is required');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const product = await (this.prisma as any).telegramStarsProduct.findFirst({
      where: { id: dto.productId, isActive: true },
    });
    if (!product) {
      throw new BadRequestException('Product not found or inactive');
    }

    const intent = await this.paymentService.createStarsPurchaseIntent({
      userId: session.userId,
      product: {
        id: product.id,
        key: product.code,
        title: product.title,
        description: product.description ?? undefined,
        starsAmount: product.amountStars,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      grants: await (this.paymentService as unknown as { resolveGrantsFromProduct(id: string): Promise<any[]> }).resolveGrantsFromProduct(
        product.id,
      ),
    });

    return {
      id: intent.id,
      userId: intent.userId,
      productId: intent.productId,
      status: intent.status,
      provider: intent.provider,
      amountStars: intent.amountStars,
      createdAt: intent.createdAt.toISOString(),
    };
  }

  @Post('confirm')
  @UseGuards(JwtAuthGuard, RateLimitGuard)
  @RateLimit({ limit: 20, windowMs: 60_000, keyType: 'user' })
  async confirm(
    @Session() session: AuthSessionPayload,
    @Body() dto: ConfirmStarsPaymentDto,
  ) {
    if (!dto.intentId) {
      throw new BadRequestException('intentId is required');
    }

    const { intent, fulfillment } = await this.paymentService.confirmTelegramStarsPayment({
      userId: session.userId,
      intentId: dto.intentId,
      payload: dto.payload ?? {},
    });

    return {
      intent: {
        id: intent.id,
        userId: intent.userId,
        productId: intent.productId,
        status: intent.status,
        provider: intent.provider,
        amountStars: intent.amountStars,
        createdAt: intent.createdAt.toISOString(),
        updatedAt: intent.updatedAt.toISOString(),
      },
      fulfillment,
    };
  }
}

