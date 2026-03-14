import { PrismaClient, GameMode, RoomStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Basic demo user + room for local development
  const user = await prisma.user.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
    },
  });

  await prisma.telegramProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      telegramId: 123456,
      firstName: 'Demo',
      username: 'demo_player',
      language: 'ru',
    },
  });

  const room = await prisma.room.upsert({
    where: { code: 'DEMO1234' },
    update: {},
    create: {
      code: 'DEMO1234',
      ownerId: user.id,
      mode: GameMode.PODKIDNOY,
      status: RoomStatus.LOBBY,
      maxPlayers: 4,
    },
  });

  await prisma.roomParticipant.upsert({
    where: { roomId_seat: { roomId: room.id, seat: 0 } },
    update: {},
    create: {
      roomId: room.id,
      userId: user.id,
      seat: 0,
    },
  });

  await prisma.economyWallet.upsert({
    where: { userId_currency: { userId: user.id, currency: 'chips' } },
    update: {},
    create: {
      userId: user.id,
      currency: 'chips',
      balance: 1000,
    },
  });

  // Seed basic cosmetic catalog (purely visual, no gameplay impact).
  const baseCosmetics = [
    {
      id: 'avatar_default',
      code: 'avatar_default',
      slot: 'avatar',
      title: 'Классический аватар',
      description: 'Стандартный круглый аватар.',
      icon: null,
      rarity: 'common',
      priceSoft: 0,
      priceStars: null,
      isExclusive: false,
      isLimited: false,
      isActive: true,
      seasonId: null,
    },
    {
      id: 'avatar_hat_red',
      code: 'avatar_hat_red',
      slot: 'avatar',
      title: 'Красная шляпа',
      description: 'Яркая шляпа для вашего аватара.',
      icon: null,
      rarity: 'rare',
      priceSoft: 500,
      priceStars: null,
      isExclusive: false,
      isLimited: true,
      isActive: true,
      seasonId: null,
    },
    {
      id: 'frame_gold',
      code: 'frame_gold',
      slot: 'avatar_frame',
      title: 'Золотая рамка',
      description: 'Покажите свой статус красивой рамкой.',
      icon: null,
      rarity: 'epic',
      priceSoft: 800,
      priceStars: null,
      isExclusive: true,
      isLimited: false,
      isActive: true,
      seasonId: null,
    },
    {
      id: 'card_back_red',
      code: 'card_back_red',
      slot: 'card_back',
      title: 'Красная рубашка',
      description: 'Стильная красная рубашка карт.',
      icon: null,
      rarity: 'common',
      priceSoft: 200,
      priceStars: null,
      isExclusive: false,
      isLimited: false,
      isActive: true,
      seasonId: null,
    },
    {
      id: 'table_dark',
      code: 'table_dark',
      slot: 'table_theme',
      title: 'Тёмный стол',
      description: 'Минималистичный тёмный стол.',
      icon: null,
      rarity: 'legendary',
      priceSoft: 300,
      priceStars: null,
      isExclusive: true,
      isLimited: true,
      isActive: true,
      seasonId: null,
    },
    {
      id: 'emote_smile',
      code: 'emote_smile',
      slot: 'emote',
      title: 'Смайлик',
      description: 'Простая позитивная реакция.',
      icon: null,
      rarity: 'common',
      priceSoft: 100,
      priceStars: null,
      isExclusive: false,
      isLimited: false,
      isActive: true,
      seasonId: null,
    },
  ];

  for (const item of baseCosmetics) {
    await prisma.cosmeticCatalogItem.upsert({
      where: { code: item.code },
      update: {
        slot: item.slot,
        title: item.title,
        description: item.description,
        icon: item.icon,
        rarity: item.rarity,
        priceSoft: item.priceSoft,
        priceStars: item.priceStars,
        isExclusive: item.isExclusive,
        isLimited: item.isLimited,
        isActive: item.isActive,
        seasonId: item.seasonId,
      },
      create: item,
    });
  }

  // Seed base badges
  const baseBadges = [
    {
      code: 'first_win',
      title: 'Первая победа',
      description: 'Получите за первую победу.',
      icon: null,
      rarity: 'common',
    },
    {
      code: 'matches_10',
      title: '10 матчей',
      description: 'Сыграйте 10 матчей.',
      icon: null,
      rarity: 'rare',
    },
    {
      code: 'season_champion',
      title: 'Чемпион сезона',
      description: 'Завершите сезон на максимальном уровне.',
      icon: null,
      rarity: 'legendary',
    },
    {
      code: 'collector',
      title: 'Коллекционер',
      description: 'Соберите коллекцию косметики.',
      icon: null,
      rarity: 'epic',
    },
  ];

  for (const badge of baseBadges) {
    await prisma.badge.upsert({
      where: { code: badge.code },
      update: {
        title: badge.title,
        description: badge.description,
        icon: badge.icon,
        rarity: badge.rarity,
      },
      create: {
        code: badge.code,
        title: badge.title,
        description: badge.description,
        icon: badge.icon,
        rarity: badge.rarity,
      },
    });
  }

  // Seed simple reward track for Season 1 (soft currency, cosmetics, badges).
  const season = await prisma.season.findFirst({
    where: { code: 'season_1' },
  });
  const seasonId = season?.id;

  if (seasonId) {
    // Attach some cosmetics to this season to demonstrate seasonal items.
    await prisma.cosmeticCatalogItem.updateMany({
      where: { code: { in: ['avatar_hat_red', 'frame_gold'] } },
      data: { seasonId },
    });
    const rewards = [
      // level 1 — мягкая валюта
      {
        level: 1,
        rewardType: 'soft',
        amountSoft: 100,
        cosmeticItemId: null,
        badgeCode: null,
      },
      // level 2 — косметика (simple cosmetic)
      {
        level: 2,
        rewardType: 'cosmetic',
        amountSoft: null,
        cosmeticItemId: 'card_back_red',
        badgeCode: null,
      },
      // level 3 — мягкая валюта
      {
        level: 3,
        rewardType: 'soft',
        amountSoft: 200,
        cosmeticItemId: null,
        badgeCode: null,
      },
      // level 4 — косметика
      {
        level: 4,
        rewardType: 'cosmetic',
        amountSoft: null,
        cosmeticItemId: 'table_dark',
        badgeCode: null,
      },
      // level 5 — badge
      {
        level: 5,
        rewardType: 'badge',
        amountSoft: null,
        cosmeticItemId: null,
        badgeCode: 'season_champion',
      },
      // level 6 — мягкая валюта
      {
        level: 6,
        rewardType: 'soft',
        amountSoft: 300,
        cosmeticItemId: null,
        badgeCode: null,
      },
      // level 7 — косметика
      {
        level: 7,
        rewardType: 'cosmetic',
        amountSoft: null,
        cosmeticItemId: 'avatar_hat_red',
        badgeCode: null,
      },
      // level 8 — badge
      {
        level: 8,
        rewardType: 'badge',
        amountSoft: null,
        cosmeticItemId: null,
        badgeCode: 'collector',
      },
      // level 9 — мягкая валюта
      {
        level: 9,
        rewardType: 'soft',
        amountSoft: 400,
        cosmeticItemId: null,
        badgeCode: null,
      },
      // level 10 — косметика (премиальная рамка)
      {
        level: 10,
        rewardType: 'cosmetic',
        amountSoft: null,
        cosmeticItemId: 'frame_gold',
        badgeCode: null,
      },
    ];

    for (const r of rewards) {
      let badgeId: string | null = null;
      if (r.rewardType === 'badge' && r.badgeCode) {
        const badge = await prisma.badge.upsert({
          where: { code: r.badgeCode },
          update: {},
          create: {
            code: r.badgeCode,
            title: r.badgeCode,
            description: null,
            icon: null,
            rarity: null,
          },
        });
        badgeId = badge.id;
      }

      await prisma.rewardTrackItem.upsert({
        where: {
          seasonId_level: {
            seasonId,
            level: r.level,
          },
        },
        update: {
          rewardType: r.rewardType,
          amountSoft: r.amountSoft,
          cosmeticItemId: r.cosmeticItemId,
          badgeId,
        },
        create: {
          seasonId,
          level: r.level,
          rewardType: r.rewardType,
          amountSoft: r.amountSoft,
          cosmeticItemId: r.cosmeticItemId,
          badgeId,
        },
      });
    }
  }

  // Seed basic store offers
  await prisma.storeOffer.upsert({
    where: { id: 'offer_hat_soft' },
    update: {},
    create: {
      id: 'offer_hat_soft',
      code: 'OFFER_HAT_SOFT',
      itemId: 'avatar_hat_red',
      priceSoft: 400,
      priceStars: null,
      currencyType: 'soft',
      isActive: true,
      sortOrder: 1,
      startsAt: null,
      endsAt: null,
    },
  });
  await prisma.storeOffer.upsert({
    where: { id: 'offer_frame_soft' },
    update: {},
    create: {
      id: 'offer_frame_soft',
      code: 'OFFER_FRAME_SOFT',
      itemId: 'frame_gold',
      priceSoft: 900,
      priceStars: null,
      currencyType: 'soft',
      isActive: true,
      sortOrder: 2,
      startsAt: null,
      endsAt: null,
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

