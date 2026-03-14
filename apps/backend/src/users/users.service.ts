import { Injectable } from '@nestjs/common';
import type { TelegramWebAppUser } from 'shared';
import { PrismaService } from '../prisma/prisma.service';

export interface User {
  id: string;
  telegramId: number;
  firstName: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
  isPremium?: boolean;
  photoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private toUser(
    user: { id: string; createdAt: Date; updatedAt: Date },
    telegram: { telegramId: number; firstName: string; lastName?: string | null; username?: string | null; language?: string | null; photoUrl?: string | null; isPremium: boolean },
  ): User {
    return {
      id: user.id,
      telegramId: telegram.telegramId,
      firstName: telegram.firstName,
      lastName: telegram.lastName ?? undefined,
      username: telegram.username ?? undefined,
      languageCode: telegram.language ?? undefined,
      isPremium: telegram.isPremium,
      photoUrl: telegram.photoUrl ?? undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async createOrUpdateFromTelegram(tg: TelegramWebAppUser): Promise<User> {
    const existing = await this.prisma.telegramProfile.findUnique({
      where: { telegramId: tg.id },
      include: { user: true },
    });

    const now = new Date();
    if (existing) {
      await this.prisma.telegramProfile.update({
        where: { id: existing.id },
        data: {
          firstName: tg.first_name,
          lastName: tg.last_name ?? null,
          username: tg.username ?? null,
          language: tg.language_code ?? null,
          isPremium: tg.is_premium ?? false,
          photoUrl: tg.photo_url ?? null,
          updatedAt: now,
        },
      });
      await this.prisma.user.update({
        where: { id: existing.userId },
        data: { updatedAt: now },
      });
      const updated = await this.prisma.telegramProfile.findUniqueOrThrow({
        where: { id: existing.id },
        include: { user: true },
      });
      return this.toUser(updated.user, updated);
    }

    const user = await this.prisma.user.create({
      data: {
        updatedAt: now,
        telegram: {
          create: {
            telegramId: tg.id,
            firstName: tg.first_name,
            lastName: tg.last_name ?? null,
            username: tg.username ?? null,
            language: tg.language_code ?? null,
            isPremium: tg.is_premium ?? false,
            photoUrl: tg.photo_url ?? null,
            updatedAt: now,
          },
        },
      },
      include: { telegram: true },
    });
    const telegram = user.telegram!;
    return this.toUser(user, telegram);
  }

  async findById(id: string): Promise<User | undefined> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { telegram: true },
    });
    if (!user?.telegram) return undefined;
    return this.toUser(user, user.telegram);
  }

  /** E2E only: get or create a user with the given telegramId for testing. */
  async getOrCreateE2EUser(telegramId: number): Promise<User> {
    const existing = await this.prisma.telegramProfile.findUnique({
      where: { telegramId },
      include: { user: true },
    });
    if (existing) return this.toUser(existing.user, existing);

    const now = new Date();
    const user = await this.prisma.user.create({
      data: {
        updatedAt: now,
        telegram: {
          create: {
            telegramId,
            firstName: 'E2E',
            lastName: 'User',
            username: 'e2e',
            language: 'en',
            isPremium: false,
            updatedAt: now,
          },
        },
      },
      include: { telegram: true },
    });
    const telegram = user.telegram!;
    return this.toUser(user, telegram);
  }
}
