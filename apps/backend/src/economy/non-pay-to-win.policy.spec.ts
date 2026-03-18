import { BadRequestException } from '@nestjs/common';
import type { CurrencyCode } from 'shared';
import type { NonCombatGrant } from './payment.service';
import { assertNonPayToWinGrants } from './non-pay-to-win.policy';

describe('non-pay-to-win policy', () => {
  it('allows soft and stars currency, cosmetics and season_pass', () => {
    const grants: NonCombatGrant[] = [
      { type: 'currency', currency: 'soft' as CurrencyCode, amount: 100 },
      { type: 'currency', currency: 'stars' as CurrencyCode, amount: 10 },
      { type: 'cosmetic', itemId: 'avatar_hat_red' },
      { type: 'season_pass', seasonId: 'season_1' },
    ];

    expect(() => assertNonPayToWinGrants(grants)).not.toThrow();
  });

  it('rejects unsupported currency for monetization', () => {
    const grants = [{ type: 'currency', currency: 'gold' as CurrencyCode, amount: 50 }] as NonCombatGrant[];

    expect(() => assertNonPayToWinGrants(grants)).toThrow(BadRequestException);
  });

  it('rejects unsupported reward types', () => {
    const grants = [{ type: 'boost' as unknown as 'currency', amount: 1 }] as NonCombatGrant[];

    expect(() => assertNonPayToWinGrants(grants)).toThrow(BadRequestException);
  });
});

