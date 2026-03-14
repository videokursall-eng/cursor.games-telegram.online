import { describe, it, expect } from 'vitest';
import {
  emptyWallet,
  type WalletDto,
  type CurrencyTransactionDto,
  type CosmeticItemDto,
  type PlayerInventoryDto,
  type SeasonProgressDto,
  type SeasonRewardTrackItemDto,
  type SeasonWithTrackDto,
  type StoreOfferDto,
  type PurchaseOrderDto,
} from './economy';

describe('Economy DTOs', () => {
  it('emptyWallet returns zero-balance wallet with ISO date', () => {
    const w: WalletDto = emptyWallet('u1', 'soft');
    expect(w.userId).toBe('u1');
    expect(w.currency).toBe('soft');
    expect(w.balance).toBe(0);
    expect(new Date(w.updatedAt).toISOString()).toBe(w.updatedAt);
  });

  it('CurrencyTransactionDto shape is serializable', () => {
    const tx: CurrencyTransactionDto = {
      id: 'tx1',
      userId: 'u1',
      currency: 'soft',
      amount: 100,
      reason: 'match_reward',
      metadata: { matchId: 'm1' },
      createdAt: new Date('2024-01-01T00:00:00.000Z').toISOString(),
    };
    const json = JSON.stringify(tx);
    const parsed = JSON.parse(json) as CurrencyTransactionDto;
    expect(parsed.id).toBe('tx1');
    expect(parsed.metadata?.matchId).toBe('m1');
  });

  it('CosmeticItemDto describes purely visual items', () => {
    const item: CosmeticItemDto = {
      id: 'c1',
      key: 'avatar_hat_red',
      name: 'Красная шляпа',
      description: 'Яркая шляпа для аватара.',
      slot: 'avatar',
      rarity: 'rare',
      iconUrl: 'https://example.com/icons/hat-red.png',
      priceSoft: 500,
      priceStars: null,
      isExclusive: false,
      isLimited: true,
      seasonId: 's1',
    };
    const json = JSON.stringify(item);
    const parsed = JSON.parse(json) as CosmeticItemDto;
    expect(parsed.slot).toBe('avatar');
    expect(parsed.rarity).toBe('rare');
    expect(parsed.priceSoft).toBe(500);
    expect(parsed.priceStars).toBeNull();
  });

  it('PlayerInventoryDto holds owned and equipped cosmetics', () => {
    const inv: PlayerInventoryDto = {
      userId: 'u1',
      ownedItems: [
        {
          itemId: 'c1',
          acquiredAt: '2024-01-02T00:00:00.000Z',
          source: 'purchase',
          tag: 'starter-pack',
        },
      ],
      equippedItems: {
        avatar: 'c1',
      },
    };
    const json = JSON.stringify(inv);
    const parsed = JSON.parse(json) as PlayerInventoryDto;
    expect(parsed.ownedItems).toHaveLength(1);
    expect(parsed.equippedItems.avatar).toBe('c1');
  });

  it('SeasonProgressDto describes cosmetic-only season progression', () => {
    const sp: SeasonProgressDto = {
      userId: 'u1',
      seasonId: 's1',
      level: 3,
      currentXp: 1200,
      xpToNextLevel: 300,
      claimedRewardIds: ['r1', 'r2'],
      updatedAt: '2024-01-03T00:00:00.000Z',
    };
    const json = JSON.stringify(sp);
    const parsed = JSON.parse(json) as SeasonProgressDto;
    expect(parsed.level).toBe(3);
    expect(parsed.claimedRewardIds).toContain('r2');
  });

  it('SeasonWithTrackDto combines progress and reward track items', () => {
    const trackItem: SeasonRewardTrackItemDto = {
      level: 2,
      rewardType: 'soft',
      softAmount: 200,
      cosmeticCode: undefined,
      badgeCode: undefined,
      claimed: false,
      claimable: true,
    };

    const season: SeasonWithTrackDto = {
      progress: {
        userId: 'u1',
        seasonId: 's1',
        level: 2,
        currentXp: 150,
        xpToNextLevel: 50,
        claimedRewardIds: [],
        updatedAt: '2024-01-03T00:00:00.000Z',
      },
      rewardTrack: [trackItem],
    };

    const json = JSON.stringify(season);
    const parsed = JSON.parse(json) as SeasonWithTrackDto;
    expect(parsed.rewardTrack[0].level).toBe(2);
    expect(parsed.rewardTrack[0].rewardType).toBe('soft');
    expect(parsed.progress.level).toBe(2);
  });

  it('StoreOfferDto shape supports currency and cosmetics grants', () => {
    const offer: StoreOfferDto = {
      id: 'offer1',
      key: 'starter_bundle',
      title: 'Стартовый набор',
      description: 'Немного валюты и стильная рубашка карт.',
      featured: true,
      priceSoft: null,
      priceStars: 100,
      priceFiat: { amountMinor: 19900, currencyCode: 'RUB' },
      grants: [
        { type: 'currency', currency: 'soft', amount: 500 },
        { type: 'cosmetic', itemId: 'card_back_red' },
      ],
      requirements: { minSeasonLevel: 0 },
      tags: ['starter', 'limited'],
      availableFrom: '2024-01-01T00:00:00.000Z',
      availableUntil: null,
    };
    const json = JSON.stringify(offer);
    const parsed = JSON.parse(json) as StoreOfferDto;
    expect(parsed.grants[0].type).toBe('currency');
    expect(parsed.grants[1].type).toBe('cosmetic');
    expect(parsed.tags).toContain('starter');
  });

  it('PurchaseOrderDto describes payment intent without gameplay power', () => {
    const order: PurchaseOrderDto = {
      id: 'po1',
      userId: 'u1',
      offerId: 'offer1',
      status: 'pending',
      currency: 'stars',
      amount: 100,
      providerPayload: { telegramInvoiceId: 'inv1' },
      createdAt: '2024-01-04T00:00:00.000Z',
      updatedAt: '2024-01-04T00:00:00.000Z',
    };
    const json = JSON.stringify(order);
    const parsed = JSON.parse(json) as PurchaseOrderDto;
    expect(parsed.currency).toBe('stars');
    expect(parsed.amount).toBe(100);
    expect(parsed.providerPayload?.telegramInvoiceId).toBe('inv1');
  });
});

