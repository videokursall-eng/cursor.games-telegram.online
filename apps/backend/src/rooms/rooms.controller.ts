import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Card } from 'game-core';
import { JwtAuthGuard, type RequestWithSession } from '../auth/jwt-auth.guard';
import { RoomsService } from './rooms.service';
import { RateLimit } from '../rate-limit/rate-limit.decorator';
import { RateLimitGuard } from '../rate-limit/rate-limit.guard';
import type { RoomMode } from './rooms.types';

interface CreateRoomDto {
  mode: RoomMode;
  maxPlayers: number;
  isPrivate: boolean;
  bots: number;
  botDifficulties?: Array<'easy' | 'normal' | 'hard'>;
}

interface UpdateBotProfileDto {
  difficulty: 'easy' | 'normal' | 'hard';
}

interface UpdateTimeoutsDto {
  roomTimeoutMs?: number | null;
  perPlayerTimeoutMs?: Record<string, number | null>;
}

@Controller('rooms')
@UseGuards(JwtAuthGuard)
export class RoomsController {
  constructor(private readonly rooms: RoomsService) {}

  @Get()
  list() {
    return this.rooms.listRooms();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.rooms.getRoom(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RateLimitGuard)
  @RateLimit({ limit: 5, windowMs: 60_000, keyType: 'user' })
  create(@Req() req: RequestWithSession, @Body() body: CreateRoomDto) {
    const userId = req.session!.userId;
    return this.rooms.createRoom(userId, body);
  }

  @Post(':id/join')
  @UseGuards(JwtAuthGuard, RateLimitGuard)
  @RateLimit({ limit: 20, windowMs: 60_000, keyType: 'ip' })
  join(@Req() req: RequestWithSession, @Param('id') id: string) {
    const userId = req.session!.userId;
    return this.rooms.joinRoom(id, userId);
  }

  @Post(':id/leave')
  leave(@Req() req: RequestWithSession, @Param('id') id: string) {
    const userId = req.session!.userId;
    return this.rooms.leaveRoom(id, userId);
  }

  @Post(':id/start')
  start(@Req() req: RequestWithSession, @Param('id') id: string) {
    const userId = req.session!.userId;
    return this.rooms.startMatch(id, userId);
  }

  @Post(':id/timeouts')
  updateTimeouts(
    @Req() req: RequestWithSession,
    @Param('id') id: string,
    @Body() body: UpdateTimeoutsDto,
  ) {
    const userId = req.session!.userId;
    return this.rooms.updateTimeouts(id, userId, body);
  }

  @Post(':id/bots/:botId/profile')
  updateBotProfile(
    @Req() req: RequestWithSession,
    @Param('id') id: string,
    @Param('botId') botId: string,
    @Body() body: UpdateBotProfileDto,
  ) {
    const userId = req.session!.userId;
    return this.rooms.updateBotProfile(id, userId, botId, body);
  }

  @Post(':id/action')
  action(
    @Req() req: RequestWithSession,
    @Param('id') id: string,
    @Body()
    body:
      | { type: 'attack'; card: Card; clientSeq?: number; clientCommandId?: string }
      | { type: 'throwIn'; card: Card; clientSeq?: number; clientCommandId?: string }
      | { type: 'transfer'; card: Card; clientSeq?: number; clientCommandId?: string }
      | { type: 'defend'; card: Card; attackIndex: number; clientSeq?: number; clientCommandId?: string }
      | { type: 'take'; clientSeq?: number; clientCommandId?: string }
      | { type: 'finish'; clientSeq?: number; clientCommandId?: string },
  ) {
    const userId = req.session!.userId;
    return this.rooms.applyAction(id, userId, body);
  }
}

