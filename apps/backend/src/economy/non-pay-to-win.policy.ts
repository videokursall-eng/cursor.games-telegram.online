import { BadRequestException } from '@nestjs/common';
import type { CurrencyCode } from 'shared';
import type { NonCombatGrant } from './payment.service';

const allowedCurrencies: CurrencyCode[] = ['soft', 'stars'];

export function assertNonPayToWinGrants(grants: NonCombatGrant[]): void {
  for (const grant of grants) {
    if (grant.type === 'currency') {
      if (!allowedCurrencies.includes(grant.currency)) {
        throw new BadRequestException('Unsupported currency for monetization');
      }
    } else if (grant.type === 'cosmetic') {
      // cosmetic-only, safe
    } else if (grant.type === 'season_pass') {
      // season pass is progression-only, does not affect match power
    } else {
      throw new BadRequestException('Unsupported reward type for monetization');
    }
  }
}

