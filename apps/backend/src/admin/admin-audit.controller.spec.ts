import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { AdminAuditController } from './admin-audit.controller';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from './admin.guard';

describe('AdminAuditController', () => {
  let controller: AdminAuditController;

  const prismaMock = {
    adminActionLog: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    prismaMock.adminActionLog.findMany.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminAuditController],
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

    controller = module.get(AdminAuditController);
  });

  it('returns audit logs with filters', async () => {
    prismaMock.adminActionLog.findMany.mockResolvedValue([
      {
        id: 'log1',
        adminUserId: 'admin1',
        action: 'cosmetic_create',
        targetType: 'CosmeticCatalogItem',
        targetId: 'avatar_hat_red',
        success: true,
        reason: 'initial seed',
        createdAt: new Date(),
        payload: {},
      },
    ]);

    const result = await controller.list('admin1', 'CosmeticCatalogItem', 'avatar_hat_red', '10');

    expect(prismaMock.adminActionLog.findMany).toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0].action).toBe('cosmetic_create');
  });
});

