import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

describe('WalletController', () => {
  let controller: WalletController;
  const wallet: { getWallet: jest.Mock } = {
    getWallet: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WalletController],
      providers: [{ provide: WalletService, useValue: wallet }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(WalletController);
    wallet.getWallet.mockReset();
  });

  it('returns wallet for current user', async () => {
    const session = { userId: 'u1', telegramId: 1 } as { userId: string; telegramId: number };
    wallet.getWallet.mockResolvedValue({
      userId: 'u1',
      currency: 'soft',
      balance: 150,
      updatedAt: new Date().toISOString(),
    });

    const result = await controller.getMyWallet(session);
    expect(wallet.getWallet).toHaveBeenCalledWith('u1', 'soft');
    expect(result.userId).toBe('u1');
    expect(result.balance).toBe(150);
  });
});

