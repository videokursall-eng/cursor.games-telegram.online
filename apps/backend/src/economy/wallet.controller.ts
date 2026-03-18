import { Controller, Get, UseGuards } from '@nestjs/common';
import type { WalletDto, AuthSessionPayload } from 'shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Session } from '../auth/session.decorator';
import { WalletService } from './wallet.service';

@Controller('me')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('wallet')
  async getMyWallet(@Session() session: AuthSessionPayload): Promise<WalletDto> {
    return this.walletService.getWallet(session.userId, 'soft');
  }
}

