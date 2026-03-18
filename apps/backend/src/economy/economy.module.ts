import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminModule } from '../admin/admin.module';
import { AuthModule } from '../auth/auth.module';
import { WalletService } from './wallet.service';
import { CosmeticsService } from './cosmetics.service';
import { InventoryController } from './inventory.controller';
import { CatalogController } from './catalog.controller';
import { StoreController } from './store.controller';
import { WalletController } from './wallet.controller';
import { PaymentsController } from './payments.controller';
import { StoreOffersController } from './store-offers.controller';
import { AdminCosmeticsController } from './admin-cosmetics.controller';
import { AdminOffersService } from './admin-offers.service';
import { AdminOffersController } from './admin-offers.controller';
import { LoggingModule } from '../logging/logging.module';
import {
  MockTelegramStarsVerificationService,
  PAYMENT_VERIFICATION_PORT,
  PaymentService,
  TelegramStarsApiVerificationService,
} from './payment.service';
import { RateLimitModule } from '../rate-limit/rate-limit.module';

@Module({
  imports: [PrismaModule, forwardRef(() => AdminModule), AuthModule, LoggingModule, RateLimitModule],
  providers: [
    WalletService,
    CosmeticsService,
    PaymentService,
    AdminOffersService,
    {
      provide: PAYMENT_VERIFICATION_PORT,
      useFactory: () => {
        const provider = process.env.TELEGRAM_STARS_PROVIDER ?? 'mock';
        if (provider === 'telegram') {
          // eslint-disable-next-line @typescript-eslint/no-var-requires,@typescript-eslint/no-explicit-any
          const axios: any = require('axios');
          return new TelegramStarsApiVerificationService(axios);
        }
        return new MockTelegramStarsVerificationService();
      },
    },
  ],
  controllers: [
    InventoryController,
    CatalogController,
    StoreController,
    WalletController,
    PaymentsController,
    AdminCosmeticsController,
    AdminOffersController,
    StoreOffersController,
  ],
  exports: [WalletService, CosmeticsService, PaymentService],
})
export class EconomyModule {}

