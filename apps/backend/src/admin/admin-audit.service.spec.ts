import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { AdminAuditService } from './admin-audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { StructuredLoggerService } from '../logging/structured-logger.service';

describe('AdminAuditService', () => {
  let service: AdminAuditService;

  const prismaMock = {
    adminActionLog: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    prismaMock.adminActionLog.create.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminAuditService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: StructuredLoggerService,
          useValue: { info: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(AdminAuditService);
  });

  it('logs admin action with payload and reason', async () => {
    await service.log({
      admin: { userId: 'admin1' } as { userId: string } as any,
      action: 'test_action',
      targetType: 'TestTarget',
      targetId: '123',
      success: true,
      reason: 'unit-test',
      payload: { foo: 'bar' },
    });

    expect(prismaMock.adminActionLog.create).toHaveBeenCalled();
    const args = prismaMock.adminActionLog.create.mock.calls[0][0];
    expect(args.data.adminUserId).toBe('admin1');
    expect(args.data.action).toBe('test_action');
    expect(args.data.targetType).toBe('TestTarget');
    expect(args.data.targetId).toBe('123');
    expect(args.data.success).toBe(true);
    expect(args.data.reason).toBe('unit-test');
  });
});

