import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Session } from '../auth/session.decorator';
import type { AuthSessionPayload } from 'shared';
import { StatsService } from './stats.service';

@Controller()
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('stats/me')
  @UseGuards(JwtAuthGuard)
  async getMyStats(@Session() session: AuthSessionPayload) {
    const data = await this.statsService.getAggregatedStats(session.userId);
    return data;
  }

  @Get('players/:id/stats')
  async getPlayerStats(@Param('id') userId: string) {
    const data = await this.statsService.getAggregatedStats(userId);
    if (!data) {
      // getAggregatedStats always returns a shape; 404 имеет смысл только,
      // если профиля вообще нет. Для простоты считаем, что профиль есть,
      // а пустая статистика — валидный ответ.
      return this.statsService.getAggregatedStats(userId);
    }
    return data;
  }
}

