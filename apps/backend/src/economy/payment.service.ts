import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import type { CurrencyCode } from 'shared';
import { WalletService } from './wallet.service';
import { CosmeticsService } from './cosmetics.service';
import { PrismaService } from '../prisma/prisma.service';
import { assertNonPayToWinGrants } from './non-pay-to-win.policy';
import { StructuredLoggerService } from '../logging/structured-logger.service';

export type PaymentStatus = 'pending' | 'authorized' | 'completed' | 'failed' | 'cancelled';

export interface TelegramStarsProduct {
  id: string;
  key: string;
  title: string;
  description?: string;
  /** Price in Stars as defined in Telegram bot configuration. */
  starsAmount: number;
}

export type NonCombatGrant =
  | { type: 'currency'; currency: CurrencyCode; amount: number }
  | { type: 'cosmetic'; itemId: string }
  | { type: 'season_pass'; seasonId: string };

export interface PaymentVerificationPort {
  verifyTelegramStarsPayment(
    intent: {
      id: string;
      userId: string;
      status: PaymentStatus;
      currency: CurrencyCode;
      amount: number;
      grants: NonCombatGrant[];
      providerPayload?: Record<string, unknown>;
      createdAt: Date;
      updatedAt: Date;
    },
    payload: Record<string, unknown>,
  ): Promise<boolean>;
}

export const PAYMENT_VERIFICATION_PORT = 'PAYMENT_VERIFICATION_PORT';

@Injectable()
export class MockTelegramStarsVerificationService implements PaymentVerificationPort {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async verifyTelegramStarsPayment(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    intent: {
      id: string;
      userId: string;
      status: PaymentStatus;
      currency: CurrencyCode;
      amount: number;
      grants: NonCombatGrant[];
      providerPayload?: Record<string, unknown>;
      createdAt: Date;
      updatedAt: Date;
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    payload: Record<string, unknown>,
  ) {
    // Test-only/mock implementation. Real integration must verify Telegram Stars signature.
    return true;
  }
}

@Injectable()
export class TelegramStarsApiVerificationService implements PaymentVerificationPort {
  constructor(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private readonly http: any,
  ) {}

  async verifyTelegramStarsPayment(
    intent: {
      id: string;
      userId: string;
      status: PaymentStatus;
      currency: CurrencyCode;
      amount: number;
      grants: NonCombatGrant[];
      providerPayload?: Record<string, unknown>;
      createdAt: Date;
      updatedAt: Date;
    },
    payload: Record<string, unknown>,
  ): Promise<boolean> {
    const apiToken = process.env.TELEGRAM_STARS_API_TOKEN;
    const merchantUrl = process.env.TELEGRAM_STARS_VERIFY_URL;

    if (!apiToken || !merchantUrl) {
      // Without required env, we treat verification as failed for safety.
      return false;
    }

    const chargeId = (payload['telegramPaymentChargeId'] ??
      payload['telegram_payment_charge_id'] ??
      payload['charge_id']) as string | undefined;

    if (!chargeId || typeof chargeId !== 'string') {
      return false;
    }

    try {
      const body = {
        chargeId,
        amount: intent.amount,
        currency: intent.currency,
        intentId: intent.id,
        userId: intent.userId,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response: any = await this.http.post(merchantUrl, body, {
        headers: { Authorization: `Bearer ${apiToken}` },
        timeout: 5000,
      });

      if (!response || response.status !== 200) {
        return false;
      }

      const data = response.data ?? {};
      if (data.success !== true) {
        return false;
      }

      if (typeof data.amount === 'number' && data.amount !== intent.amount) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }
}

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly cosmeticsService: CosmeticsService,
    @Inject(PAYMENT_VERIFICATION_PORT)
    private readonly verifier: PaymentVerificationPort,
    private readonly logger: StructuredLoggerService,
  ) {}

  async createStarsPurchaseIntent(params: {
    userId: string;
    product: TelegramStarsProduct;
    grants: NonCombatGrant[];
  }) {
    const { userId, product, grants } = params;

    if (!product.starsAmount || product.starsAmount <= 0) {
      throw new BadRequestException('Invalid Stars product amount');
    }

    this.assertNonCombatGrants(grants);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const intent = await (this.prisma as any).starsPurchaseIntent.create({
      data: {
        userId,
        productId: product.id,
        status: 'pending',
        provider: 'telegram_stars',
        amountStars: product.starsAmount,
        rawPayload: null,
      },
    });

    this.logger.info('stars_intent_created', {
      service: 'PaymentService',
      userId,
      intentId: intent.id,
      productKey: product.key,
      amountStars: product.starsAmount,
    });
    return intent;
  }

  async confirmTelegramStarsPayment(params: {
    userId: string;
    intentId: string;
    payload: Record<string, unknown>;
  }) {
    const { userId, intentId, payload } = params;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const intent = await (this.prisma as any).starsPurchaseIntent.findUnique({
      where: { id: intentId },
    });
    if (!intent || intent.userId !== userId) {
      throw new BadRequestException('Purchase intent not found');
    }

    if (intent.status === 'completed') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const existing = await (this.prisma as any).starsFulfillmentLog.findFirst({
        where: { purchaseIntentId: intent.id, status: 'applied' },
      });
      return { intent, fulfillment: existing };
    }

    if (intent.status === 'failed' || intent.status === 'cancelled') {
      return { intent };
    }

    const ok = await this.verifier.verifyTelegramStarsPayment(
      {
        id: intent.id,
        userId: intent.userId,
        status: intent.status as PaymentStatus,
        currency: 'stars',
        amount: intent.amountStars,
        grants: await this.resolveGrantsFromProduct(intent.productId),
        providerPayload: payload,
        createdAt: intent.createdAt,
        updatedAt: intent.updatedAt,
      },
      payload,
    );
    if (!ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const failed = await (this.prisma as any).starsPurchaseIntent.update({
        where: { id: intent.id },
        data: {
          status: 'failed',
          rawPayload: payload,
        },
      });
      this.logger.warn('stars_payment_verification_failed', {
        service: 'PaymentService',
        userId,
        intentId: intent.id,
      });
      return { intent: failed };
    }

    const grants = await this.resolveGrantsFromProduct(intent.productId);
    await this.fulfillNonCombatGrants(intent.userId, intent.id, grants);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const completed = await (this.prisma as any).starsPurchaseIntent.update({
      where: { id: intent.id },
      data: {
        status: 'completed',
        rawPayload: payload,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fulfillment = await (this.prisma as any).starsFulfillmentLog.create({
      data: {
        purchaseIntentId: completed.id,
        userId: completed.userId,
        rewardType: 'bundle',
        rewardPayload: grants as unknown as object,
        status: 'applied',
      },
    });

    this.logger.info('stars_payment_completed', {
      service: 'PaymentService',
      userId,
      intentId: intent.id,
      amountStars: intent.amountStars,
    });
    return { intent: completed, fulfillment };
  }

  async getFulfillmentsForUser(userId: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.prisma as any).starsFulfillmentLog.findMany({
      where: { userId },
    });
  }

  private assertNonCombatGrants(grants: NonCombatGrant[]) {
    assertNonPayToWinGrants(grants);
  }

  private async fulfillNonCombatGrants(userId: string, intentId: string, grants: NonCombatGrant[]) {
    for (const grant of grants) {
      if (grant.type === 'currency') {
        if (grant.currency === 'soft') {
          await this.walletService.credit(userId, grant.amount, 'refund', {
            source: 'telegram_stars',
            intentId,
          });
        }
        // Stars are charged externally; we never mint Stars inside the game.
      } else if (grant.type === 'cosmetic') {
        await this.cosmeticsService.grantItem(userId, grant.itemId, 'purchase');
      } else if (grant.type === 'season_pass') {
        // Season pass unlock can be handled here once implemented.
        // For now, just ensure we do NOT modify match balance-related data.
      }
    }
  }

  private async resolveGrantsFromProduct(productId: string): Promise<NonCombatGrant[]> {
    // For this step we keep it simple: map one Stars product to a fixed non-combat grant bundle.
    // In a real system this should be backed by a catalog table or configuration.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const product = await (this.prisma as any).telegramStarsProduct.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new BadRequestException('Stars product not found');
    }

    // Example mapping: "starter" product -> soft currency only.
    return [
      {
        type: 'currency',
        currency: 'soft',
        amount: product.amountStars * 5,
      },
    ];
  }
}

