import { TelegramStarsApiVerificationService } from './payment.service';

describe('TelegramStarsApiVerificationService', () => {
  const httpMock = {
    post: jest.fn(),
  };

  const service = new TelegramStarsApiVerificationService(httpMock);

  beforeEach(() => {
    httpMock.post.mockReset();
    delete process.env.TELEGRAM_STARS_API_TOKEN;
    delete process.env.TELEGRAM_STARS_VERIFY_URL;
  });

  const baseIntent = {
    id: 'pi_1',
    userId: 'u1',
    status: 'pending' as const,
    currency: 'stars' as const,
    amount: 100,
    grants: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('returns false when required env is missing', async () => {
    const ok = await service.verifyTelegramStarsPayment(baseIntent, {
      telegramPaymentChargeId: 'ch_1',
    });
    expect(ok).toBe(false);
    expect(httpMock.post).not.toHaveBeenCalled();
  });

  it('returns false when payload is missing charge id', async () => {
    process.env.TELEGRAM_STARS_API_TOKEN = 'token';
    process.env.TELEGRAM_STARS_VERIFY_URL = 'https://example.com/verify';

    const ok = await service.verifyTelegramStarsPayment(baseIntent, {});
    expect(ok).toBe(false);
    expect(httpMock.post).not.toHaveBeenCalled();
  });

  it('returns true on successful verification with matching amount', async () => {
    process.env.TELEGRAM_STARS_API_TOKEN = 'token';
    process.env.TELEGRAM_STARS_VERIFY_URL = 'https://example.com/verify';
    httpMock.post.mockResolvedValue({
      status: 200,
      data: { success: true, amount: 100 },
    });

    const ok = await service.verifyTelegramStarsPayment(baseIntent, {
      telegramPaymentChargeId: 'ch_1',
    });
    expect(httpMock.post).toHaveBeenCalledWith(
      'https://example.com/verify',
      expect.objectContaining({
        chargeId: 'ch_1',
        amount: 100,
      }),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer token' }),
      }),
    );
    expect(ok).toBe(true);
  });

  it('returns false when remote verification fails', async () => {
    process.env.TELEGRAM_STARS_API_TOKEN = 'token';
    process.env.TELEGRAM_STARS_VERIFY_URL = 'https://example.com/verify';
    httpMock.post.mockResolvedValue({
      status: 200,
      data: { success: false },
    });

    const ok = await service.verifyTelegramStarsPayment(baseIntent, {
      telegramPaymentChargeId: 'ch_1',
    });
    expect(ok).toBe(false);
  });
});

