/**
 * Mock PrismaService for unit tests (no DB). Override in tests as needed.
 */
import { PrismaService } from './prisma.service';

const noop = () => Promise.resolve();
const mockUser = (id: string, telegramId: number, firstName: string, lastName: string | null = null) => ({
  id,
  createdAt: new Date(),
  updatedAt: new Date(),
  telegram: {
    telegramId,
    firstName,
    lastName,
    username: null,
    language: null,
    isPremium: false,
    photoUrl: null,
  },
});

export function createMockPrismaService(overrides?: Partial<PrismaService>): PrismaService {
  const createdByTid = new Map<number, ReturnType<typeof mockUser>>();
  const createdById = new Map<string, ReturnType<typeof mockUser>>();
  return {
    $connect: noop,
    $disconnect: noop,
    onModuleInit: noop,
    onModuleDestroy: noop,
    telegramProfile: {
      findUnique: async (args: { where: { telegramId?: number } }) => {
        const tid = args.where.telegramId;
        if (tid !== undefined && createdByTid.has(tid)) {
          const u = createdByTid.get(tid)!;
          return {
            userId: u.id,
            user: { id: u.id, createdAt: u.createdAt, updatedAt: u.updatedAt },
            telegramId: u.telegram.telegramId,
            firstName: u.telegram.firstName,
            lastName: u.telegram.lastName,
            username: u.telegram.username,
            language: u.telegram.language,
            isPremium: u.telegram.isPremium,
            photoUrl: u.telegram.photoUrl,
          };
        }
        return null;
      },
      findUniqueOrThrow: async () => {
        const u = createdByTid.get(1) ?? mockUser('e2e-1', 1, 'E2E', 'User');
        return { userId: u.id, user: { id: u.id, createdAt: u.createdAt, updatedAt: u.updatedAt }, telegramId: 1, firstName: 'E2E', lastName: 'User', username: null, language: null, isPremium: false, photoUrl: null };
      },
      update: async () => ({ userId: 'u1', user: mockUser('u1', 456, 'Spec'), telegramId: 456, firstName: 'Spec', lastName: null, username: null, language: null, isPremium: false, photoUrl: null }),
      create: async () => ({}),
    },
    user: {
      create: async (args: { data: { updatedAt: Date; telegram?: { create: { telegramId: number; firstName: string; lastName?: string | null; username?: string | null; language?: string | null; isPremium?: boolean; photoUrl?: string | null; updatedAt: Date } } } }) => {
        const tg = args.data.telegram?.create;
        const id = tg ? `user-${tg.telegramId}` : 'user-1';
        const u = mockUser(id, tg?.telegramId ?? 0, tg?.firstName ?? 'Test', tg?.lastName ?? null);
        if (tg) {
          createdByTid.set(tg.telegramId, u);
          createdById.set(u.id, u);
        }
        return u;
      },
      update: async () => mockUser('u1', 456, 'Spec'),
      findUnique: async (args: { where: { id: string }; include?: { telegram: boolean } }) => {
        const u = args?.where?.id ? createdById.get(args.where.id) : null;
        if (!u) return null;
        return { ...u, telegram: u.telegram };
      },
      findMany: async () => [],
    },
    playerMatchRecord: { findMany: async () => [], create: async () => ({}) },
    achievementProgress: { findMany: async () => [], upsert: async () => ({}) },
    ...overrides,
  } as unknown as PrismaService;
}
