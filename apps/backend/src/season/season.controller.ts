import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Session } from '../auth/session.decorator';
import type { AuthSessionPayload, SeasonWithTrackDto } from 'shared';
import { SeasonProgressService } from './season-progress.service';

@Controller('me')
@UseGuards(JwtAuthGuard)
export class SeasonController {
  constructor(private readonly seasonProgressService: SeasonProgressService) {}

  @Get('season')
  async getMySeason(@Session() session: AuthSessionPayload): Promise<SeasonWithTrackDto> {
    return this.seasonProgressService.getSeasonWithTrack(session.userId);
  }

  @Post('season/claim')
  async claimReward(
    @Session() session: AuthSessionPayload,
    @Body() body: { level: number },
  ): Promise<SeasonWithTrackDto> {
    return this.seasonProgressService.claimRewardLevel(session.userId, body.level);
  }
}

