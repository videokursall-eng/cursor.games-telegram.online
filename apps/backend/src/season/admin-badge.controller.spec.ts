import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { AdminBadgeController } from './admin-badge.controller';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../admin/admin.guard';

describe('AdminBadgeController', () => {
  let controller: AdminBadgeController;

  const prismaMock = {
    badge: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    prismaMock.badge.findMany.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminBadgeController],
      providers: [
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(AdminBadgeController);
  });

  it('returns mapped badges', async () => {
    prismaMock.badge.findMany.mockResolvedValue([
      {
        id: 'badge_1',
        code: 'first_win',
        title: 'Первая победа',
        description: 'Бейдж за первую победу',
        icon: null,
        rarity: 'common',
      },
    ]);
    const result = await controller.list();
    expect(result).toEqual([
      {
        id: 'badge_1',
        code: 'first_win',
        title: 'Первая победа',
        description: 'Бейдж за первую победу',
        icon: undefined,
        rarity: 'common',
      },
    ]);
  });
});

