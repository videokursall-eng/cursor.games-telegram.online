import { Injectable } from '@nestjs/common';
import type { AuthSessionPayload } from 'shared';
import { PrismaService } from '../prisma/prisma.service';
import { StructuredLoggerService } from '../logging/structured-logger.service';

@Injectable()
export class AdminAuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: StructuredLoggerService,
  ) {}

  async log(params: {
    admin: AuthSessionPayload;
    action: string;
    targetType: string;
    targetId?: string | null;
    success: boolean;
    reason?: string | null;
    payload?: unknown;
  }): Promise<void> {
    const { admin, action, targetType, targetId, success, reason, payload } = params;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prisma: any = this.prisma;
    await prisma.adminActionLog.create({
      data: {
        adminUserId: admin.userId,
        action,
        targetType,
        targetId: targetId ?? null,
        success,
        reason: reason ?? null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        payload: payload as any,
      },
    });
    this.logger.info('admin_action', {
      service: 'AdminAuditService',
      userId: admin.userId,
      action,
      targetType,
      targetId: targetId ?? undefined,
      success,
    });
  }
}

