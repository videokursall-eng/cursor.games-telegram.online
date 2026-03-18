import { Controller, Get, NotFoundException, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Session } from '../auth/session.decorator';
import type { AuthSessionPayload } from 'shared';
import { StatsService } from './stats.service';

@Controller('me')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly statsService: StatsService) {}

  @Get('profile')
  async getProfile(@Session() session: AuthSessionPayload) {
    const data = await this.statsService.getProfileWithStats(session.userId);
    if (!data) throw new NotFoundException('Profile not found');
    return data;
  }
}
