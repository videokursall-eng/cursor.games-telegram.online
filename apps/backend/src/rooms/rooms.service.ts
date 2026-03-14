import { Injectable, BadRequestException } from '@nestjs/common';
import type { RoomState, RoomMode, RoomPlayer, MatchStats, MatchResult } from './rooms.types';
import { RealtimeService } from '../realtime/realtime.service';
import { StatsService } from '../stats/stats.service';
import { createDeck, type Card, type GameState, applyCommand, createInitialState } from 'game-core';
import { buildBotContext } from '../bots/bots.adapter';
import { basicBotStrategy } from '../bots/bots.strategy';
import { botDecisionToCommand } from '../bots/bots.commands';
import { StructuredLoggerService } from '../logging/structured-logger.service';

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function generateInviteCode(): string {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

@Injectable()
export class RoomsService {
  private readonly rooms = new Map<string, RoomState>();
  private readonly timers = new Map<string, NodeJS.Timeout>();
  private readonly botTimers = new Map<string, NodeJS.Timeout>();
  /** Guard: prevents re-entrant / duplicate bot step for the same room. */
  private readonly botStepInProgress = new Set<string>();
  /** HTTP /rooms/:id/action idempotency guard: (roomId) -> Set<userId:clientCommandId>. */
  private readonly httpProcessedCommands = new Map<string, Set<string>>();
  private readonly defaultTurnTimeoutMs: number;
  private readonly modeTurnTimeoutMs: Record<RoomMode, number>;
  private readonly botActionDelayMs: number;

  constructor(
    private readonly realtime: RealtimeService,
    private readonly statsService: StatsService,
    private readonly logger: StructuredLoggerService,
  ) {
    const fromEnv = process.env.DURAK_TURN_TIMEOUT_MS;
    const parsed = fromEnv ? Number.parseInt(fromEnv, 10) : NaN;
    this.defaultTurnTimeoutMs = Number.isFinite(parsed) && parsed > 0 ? parsed : 30_000;

    const podkidnoyEnv = process.env.DURAK_TURN_TIMEOUT_PODKIDNOY_MS;
    const perevodnoyEnv = process.env.DURAK_TURN_TIMEOUT_PEREVODNOY_MS;
    const podkidnoyParsed = podkidnoyEnv ? Number.parseInt(podkidnoyEnv, 10) : NaN;
    const perevodnoyParsed = perevodnoyEnv ? Number.parseInt(perevodnoyEnv, 10) : NaN;

    this.modeTurnTimeoutMs = {
      podkidnoy:
        Number.isFinite(podkidnoyParsed) && podkidnoyParsed > 0 ? podkidnoyParsed : this.defaultTurnTimeoutMs,
      perevodnoy:
        Number.isFinite(perevodnoyParsed) && perevodnoyParsed > 0 ? perevodnoyParsed : this.defaultTurnTimeoutMs,
    };

    const botDelayEnv = process.env.DURAK_BOT_ACTION_DELAY_MS;
    const botDelayParsed = botDelayEnv ? Number.parseInt(botDelayEnv, 10) : NaN;
    this.botActionDelayMs = Number.isFinite(botDelayParsed) && botDelayParsed >= 0 ? botDelayParsed : 800;
  }

  private getTurnTimeoutMsForMode(mode: RoomMode): number {
    return this.modeTurnTimeoutMs[mode] ?? this.defaultTurnTimeoutMs;
  }

  private resolveTurnTimeoutMs(room: RoomState): number {
    const baseDefault = this.getTurnTimeoutMsForMode(room.mode);

    // Попробуем использовать пер-игровой override, если известен активный игрок.
    const game = room.game as GameState | undefined;
    if (game && room.perPlayerTimeoutMs) {
      const attacker = game.players[game.attackerIndex];
      const defender = game.players[game.defenderIndex];
      let activeId: string | undefined;
      if (game.phase === 'defense') {
        activeId = defender.id;
      } else {
        activeId = attacker.id;
      }
      if (activeId && room.perPlayerTimeoutMs[activeId] && room.perPlayerTimeoutMs[activeId]! > 0) {
        return room.perPlayerTimeoutMs[activeId]!;
      }
    }

    // Переопределение на уровне комнаты/матча.
    if (room.overrideTurnTimeoutMs && room.overrideTurnTimeoutMs > 0) {
      return room.overrideTurnTimeoutMs;
    }

    // Таймаут по режиму.
    if (baseDefault > 0) {
      return baseDefault;
    }

    // Жёсткий безопасный fallback.
    return 30_000;
  }

  private clearTurnTimer(roomId: string): void {
    const existing = this.timers.get(roomId);
    if (existing) {
      clearTimeout(existing);
      this.timers.delete(roomId);
    }
  }

  private clearBotTimer(roomId: string): void {
    const existing = this.botTimers.get(roomId);
    if (existing) {
      clearTimeout(existing);
      this.botTimers.delete(roomId);
    }
  }

  private resetTurnTimer(room: RoomState): void {
    const timeoutMs = this.resolveTurnTimeoutMs(room);
    room.turnTimeoutMs = timeoutMs;
    room.turnStartedAt = Date.now();
    room.turnDurationSeconds = Math.floor(timeoutMs / 1000);
    room.turnDeadlineAt = room.turnStartedAt + timeoutMs;
    this.clearTurnTimer(room.id);
    this.clearBotTimer(room.id);
    const deadlineAt = room.turnDeadlineAt;
    if (!deadlineAt) return;
    const timer = setTimeout(() => this.handleTurnTimeout(room.id, deadlineAt), timeoutMs);
    this.timers.set(room.id, timer);
  }

  private getActiveBotId(room: RoomState): string | null {
    const game = room.game as GameState | undefined;
    if (!game) return null;
    const attacker = game.players[game.attackerIndex];
    const defender = game.players[game.defenderIndex];
    const activeId = game.phase === 'defense' ? defender.id : attacker.id;
    const bot = room.bots.find((b) => b.id === activeId);
    return bot ? bot.id : null;
  }

  private scheduleBotIfNeeded(room: RoomState): void {
    this.clearBotTimer(room.id);
    if (room.status !== 'in_progress') return;
    if (!room.game) return;

    const botId = this.getActiveBotId(room);
    if (!botId) return;

    const expectedTurn = room.turn;
    const delay = this.botActionDelayMs;
    const timer = setTimeout(
      () => this.executeBotStep(room.id, botId, expectedTurn),
      delay,
    );
    this.botTimers.set(room.id, timer);
  }

  private async executeBotStep(roomId: string, botPlayerId: string, expectedTurn: number): Promise<void> {
    if (this.botStepInProgress.has(roomId)) return;
    const room = this.rooms.get(roomId);
    if (!room) return;
    if (room.status !== 'in_progress') return;
    if (!room.game) return;
    if (room.turn !== expectedTurn) return;

    const game = room.game as GameState;
    const attacker = game.players[game.attackerIndex];
    const defender = game.players[game.defenderIndex];
    const activeId = game.phase === 'defense' ? defender.id : attacker.id;
    if (activeId !== botPlayerId) return;

    this.botStepInProgress.add(roomId);
    try {
      const profiles = room.bots
        .filter((b) => b.botProfile)
        .map((b) => ({
          id: b.id,
          displayName: b.name,
          strategyId: b.botProfile!.strategyId,
          difficulty: b.botProfile!.difficulty,
          config: {
            aggression: b.botProfile!.difficulty === 'hard' ? 0.8 : b.botProfile!.difficulty === 'easy' ? 0.3 : 0.5,
            defenseBias: b.botProfile!.difficulty === 'hard' ? 0.8 : b.botProfile!.difficulty === 'easy' ? 0.4 : 0.6,
            transferBias: b.botProfile!.difficulty === 'hard' ? 0.9 : b.botProfile!.difficulty === 'easy' ? 0.2 : 0.6,
            throwInBias: b.botProfile!.difficulty === 'hard' ? 0.8 : b.botProfile!.difficulty === 'easy' ? 0.3 : 0.6,
          },
        }));

      const ctx = buildBotContext(room, botPlayerId, profiles);
      if (!ctx) return;

      const decision = basicBotStrategy.decide(ctx);
      const command = botDecisionToCommand(ctx, decision);
      if (!command) return;

      await this.applyGameCommandInternal(room, command);
      this.broadcast(room);
    } catch {
      // любое исключение в ходе бота не должно ломать матч или порождать рекурсию
    } finally {
      this.botStepInProgress.delete(roomId);
    }
  }

  listRooms(): RoomState[] {
    return Array.from(this.rooms.values()).filter((r) => r.status === 'lobby');
  }

  getRoom(id: string): RoomState | undefined {
    return this.rooms.get(id);
  }

  /** Clears all turn and bot timers (for test teardown). */
  clearAllTimers(): void {
    for (const [, t] of this.timers) clearTimeout(t);
    this.timers.clear();
    for (const [, t] of this.botTimers) clearTimeout(t);
    this.botTimers.clear();
  }

  createRoom(
    ownerId: string,
    params: {
      mode: RoomMode;
      maxPlayers: number;
      isPrivate: boolean;
      bots: number;
      botDifficulties?: Array<'easy' | 'normal' | 'hard'>;
    },
  ): RoomState {
    const requestId = generateId();
    const id = generateId();
    const inviteCode = generateInviteCode();
    const owner: RoomPlayer = {
      id: ownerId,
      name: `Player ${ownerId.slice(0, 4)}`,
      isBot: false,
      isOwner: true,
      type: 'human',
      botProfile: null,
    };

    const difficultyCycle: Array<'easy' | 'normal' | 'hard'> = ['easy', 'normal', 'hard'];
    const bots: RoomPlayer[] = [];
    for (let i = 0; i < params.bots; i++) {
      const difficulty =
        params.botDifficulties && params.botDifficulties[i] != null
          ? params.botDifficulties[i]!
          : difficultyCycle[i % difficultyCycle.length];
      bots.push({
        id: `bot-${id}-${i}`,
        name: `Bot ${i + 1}`,
        isBot: true,
        isOwner: false,
        type: 'bot',
        botProfile: {
          profileId: `${difficulty}-${i}`,
          strategyId: basicBotStrategy.id,
          difficulty,
        },
      });
    }

    const room: RoomState = {
      id,
      mode: params.mode,
      maxPlayers: Math.min(6, Math.max(2, params.maxPlayers)),
      ownerId,
      status: 'lobby',
      isPrivate: params.isPrivate,
      inviteCode,
      players: [owner],
      bots,
      turn: 0,
      matchStats: {
        totalTurns: 0,
        totalRounds: 0,
        durationSeconds: 0,
        totalCardsTaken: 0,
        perPlayer: [],
      },
      turnTimeoutMs: this.getTurnTimeoutMsForMode(params.mode),
    };
    this.rooms.set(id, room);
    this.broadcast(room);
    this.logger.info('room_created', {
      service: 'RoomsService',
      roomId: id,
      matchId: id,
      userId: ownerId,
      requestId,
      mode: params.mode,
      maxPlayers: room.maxPlayers,
      isPrivate: room.isPrivate,
      bots: bots.length,
    });
    return room;
  }

  joinRoom(roomId: string, userId: string): RoomState | undefined {
    const requestId = generateId();
    const room = this.rooms.get(roomId);
    if (!room) {
      this.logger.warn('room_join_failed', {
        service: 'RoomsService',
        roomId,
        userId,
        requestId,
        reason: 'room_not_found',
      });
      return undefined;
    }
    if (room.status !== 'lobby') {
      this.logger.warn('room_join_failed', {
        service: 'RoomsService',
        roomId,
        userId,
        matchId: room.id,
        requestId,
        reason: 'not_lobby',
      });
      return room;
    }
    if (room.players.some((p) => p.id === userId)) {
      this.logger.info('room_join_ignored_already_in_room', {
        service: 'RoomsService',
        roomId,
        userId,
        matchId: room.id,
        requestId,
      });
      return room;
    }
    const total = room.players.length + room.bots.length;
    if (total >= room.maxPlayers) {
      this.logger.warn('room_join_failed', {
        service: 'RoomsService',
        roomId,
        userId,
        matchId: room.id,
        requestId,
        reason: 'room_full',
      });
      return room;
    }

    room.players.push({
      id: userId,
      name: `Player ${userId.slice(0, 4)}`,
      isBot: false,
      isOwner: false,
      type: 'human',
      botProfile: null,
    });
    this.broadcast(room);
    this.logger.info('room_joined', {
      service: 'RoomsService',
      roomId,
      matchId: room.id,
      userId,
      requestId,
    });
    return room;
  }

  leaveRoom(roomId: string, userId: string): RoomState | undefined {
    const requestId = generateId();
    const room = this.rooms.get(roomId);
    if (!room) {
      this.logger.warn('room_leave_failed', {
        service: 'RoomsService',
        roomId,
        userId,
        requestId,
        reason: 'room_not_found',
      });
      return undefined;
    }
    room.players = room.players.filter((p) => p.id !== userId);
    if (room.players.length === 0) {
      this.rooms.delete(roomId);
      this.httpProcessedCommands.delete(roomId);
      this.broadcastDelete(roomId);
      this.logger.info('room_closed', {
        service: 'RoomsService',
        roomId,
        matchId: room.id,
        userId,
        requestId,
        reason: 'last_player_left',
      });
      return undefined;
    }
    if (!room.players.some((p) => p.isOwner)) {
      room.players[0].isOwner = true;
      room.ownerId = room.players[0].id;
    }
    this.broadcast(room);
    this.logger.info('room_left', {
      service: 'RoomsService',
      roomId,
      matchId: room.id,
      userId,
      requestId,
    });
    return room;
  }

  updateTimeouts(
    roomId: string,
    userId: string,
    body: { roomTimeoutMs?: number | null; perPlayerTimeoutMs?: Record<string, number | null> },
  ): RoomState | undefined {
    const requestId = generateId();
    const room = this.rooms.get(roomId);
    if (!room) {
      this.logger.warn('room_timeouts_update_failed', {
        service: 'RoomsService',
        roomId,
        userId,
        requestId,
        reason: 'room_not_found',
      });
      return undefined;
    }
    if (room.ownerId !== userId) {
      this.logger.warn('room_timeouts_update_failed', {
        service: 'RoomsService',
        roomId,
        matchId: room.id,
        userId,
        requestId,
        reason: 'not_owner',
      });
      return room;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'roomTimeoutMs')) {
      const value = body.roomTimeoutMs;
      if (typeof value === 'number' && value > 0) {
        room.overrideTurnTimeoutMs = value;
      } else {
        room.overrideTurnTimeoutMs = undefined;
      }
    }

    if (body.perPlayerTimeoutMs) {
      if (!room.perPlayerTimeoutMs) {
        room.perPlayerTimeoutMs = {};
      }
      for (const [playerId, maybeMs] of Object.entries(body.perPlayerTimeoutMs)) {
        if (typeof maybeMs === 'number' && maybeMs > 0) {
          room.perPlayerTimeoutMs[playerId] = maybeMs;
        } else {
          delete room.perPlayerTimeoutMs[playerId];
        }
      }
    }

    if (room.status === 'in_progress') {
      this.resetTurnTimer(room);
    }

    this.broadcast(room);
    this.logger.info('room_timeouts_updated', {
      service: 'RoomsService',
      roomId,
      matchId: room.id,
      userId,
      requestId,
    });
    return room;
  }

  updateBotProfile(
    roomId: string,
    userId: string,
    botId: string,
    body: { difficulty: 'easy' | 'normal' | 'hard' },
  ): RoomState | undefined {
    const requestId = generateId();
    const room = this.rooms.get(roomId);
    if (!room) {
      this.logger.warn('room_bot_update_failed', {
        service: 'RoomsService',
        roomId,
        userId,
        requestId,
        reason: 'room_not_found',
      });
      return undefined;
    }
    if (room.ownerId !== userId) {
      this.logger.warn('room_bot_update_failed', {
        service: 'RoomsService',
        roomId,
        matchId: room.id,
        userId,
        requestId,
        reason: 'not_owner',
      });
      return room;
    }
    if (room.status !== 'lobby') {
      this.logger.warn('room_bot_update_failed', {
        service: 'RoomsService',
        roomId,
        matchId: room.id,
        userId,
        requestId,
        reason: 'not_lobby',
      });
      return room;
    }
    const bot = room.bots.find((b) => b.id === botId);
    if (!bot || !bot.botProfile) {
      this.logger.warn('room_bot_update_failed', {
        service: 'RoomsService',
        roomId,
        matchId: room.id,
        userId,
        requestId,
        reason: 'bot_not_found',
      });
      return room;
    }
    bot.botProfile = {
      profileId: `${body.difficulty}-${botId}`,
      strategyId: bot.botProfile.strategyId,
      difficulty: body.difficulty,
    };
    this.broadcast(room);
    this.logger.info('room_bot_profile_updated', {
      service: 'RoomsService',
      roomId,
      matchId: room.id,
      userId,
      requestId,
      botId,
      difficulty: body.difficulty,
    });
    return room;
  }

  startMatch(roomId: string, userId: string, options?: { presetDeck?: Card[] }): RoomState | undefined {
    const requestId = generateId();
    const room = this.rooms.get(roomId);
    if (!room) {
      this.logger.warn('match_start_failed', {
        service: 'RoomsService',
        roomId,
        userId,
        requestId,
        reason: 'room_not_found',
      });
      return undefined;
    }
    if (room.ownerId !== userId) {
      this.logger.warn('match_start_failed', {
        service: 'RoomsService',
        roomId,
        matchId: room.id,
        userId,
        requestId,
        reason: 'not_owner',
      });
      return room;
    }
    if (room.players.length + room.bots.length < 2) {
      this.logger.warn('match_start_failed', {
        service: 'RoomsService',
        roomId,
        matchId: room.id,
        userId,
        requestId,
        reason: 'not_enough_players',
      });
      return room;
    }
    const allPlayers = [...room.players, ...room.bots];
    const playerIds = allPlayers.map((p) => p.id);
    const deck =
      options?.presetDeck && options.presetDeck.length === 36 ? [...options.presetDeck] : shuffle(createDeck());
    const trumpSuit = deck[deck.length - 1]!.suit;
    const game: GameState = createInitialState(room.id, room.mode, playerIds, trumpSuit, deck);
    room.status = 'in_progress';
    room.turn = 0;
    room.game = game;
    room.matchStartedAt = Date.now();
    room.matchStats = {
      totalTurns: 0,
      totalRounds: 0,
      durationSeconds: 0,
      totalCardsTaken: 0,
      perPlayer: [],
    };
    room.matchResult = undefined;
    room.lastAutoActionMessage = null;
    this.resetTurnTimer(room);
    this.scheduleBotIfNeeded(room);
    this.broadcast(room);
    this.logger.info('match_started', {
      service: 'RoomsService',
      roomId,
      matchId: game.id ?? room.id,
      userId,
      requestId,
      mode: room.mode,
    });
    return room;
  }

  async applyAction(
    roomId: string,
    userId: string,
    body:
      | { type: 'attack'; card: Card; clientSeq?: number; clientCommandId?: string }
      | { type: 'throwIn'; card: Card; clientSeq?: number; clientCommandId?: string }
      | { type: 'transfer'; card: Card; clientSeq?: number; clientCommandId?: string }
      | { type: 'defend'; card: Card; attackIndex: number; clientSeq?: number; clientCommandId?: string }
      | { type: 'take'; clientSeq?: number; clientCommandId?: string }
      | { type: 'finish'; clientSeq?: number; clientCommandId?: string },
  ): Promise<RoomState | undefined> {
    const requestId = generateId();
    const clientCommandId = body.clientCommandId;
    const room = this.rooms.get(roomId);
    if (!room) {
      this.logger.warn('game_action_invalid', {
        service: 'RoomsService',
        roomId,
        userId,
        requestId,
        action: body.type,
        reason: 'room_not_found',
      });
      return undefined;
    }
    if (clientCommandId) {
      const key = `${userId}:${clientCommandId}`;
      const existingSet = this.httpProcessedCommands.get(roomId);
      if (existingSet && existingSet.has(key)) {
        this.logger.info('game_action_duplicate_http', {
          service: 'RoomsService',
          roomId,
          matchId: room.id,
          userId,
          requestId,
          clientCommandId,
          action: body.type,
          reason: 'duplicate_http_action',
        });
        return room;
      }
    }
    if (room.status === 'finished') {
      this.logger.warn('game_action_invalid', {
        service: 'RoomsService',
        roomId,
        matchId: room.id,
        userId,
        requestId,
        action: body.type,
        reason: 'room_finished',
      });
      return room;
    }
    if (!room.players.some((p) => p.id === userId)) {
      this.logger.warn('game_action_invalid', {
        service: 'RoomsService',
        roomId,
        matchId: room.id,
        userId,
        requestId,
        action: body.type,
        reason: 'user_not_in_room',
      });
      return room;
    }
    if (!room.game) {
      this.logger.error('game_action_error', {
        service: 'RoomsService',
        roomId,
        matchId: room.id,
        userId,
        requestId,
        action: body.type,
        reason: 'game_not_started',
      });
      throw new BadRequestException('Матч ещё не запущен');
    }

    room.lastAutoActionMessage = null;

    try {
      let command:
        | { type: 'attack'; playerId: string; card: Card }
        | { type: 'throwIn'; playerId: string; card: Card }
        | { type: 'transfer'; playerId: string; card: Card }
        | { type: 'defend'; playerId: string; attackIndex: number; card: Card }
        | { type: 'take'; playerId: string }
        | { type: 'endTurn'; playerId: string };

      let actionType: string;
      switch (body.type) {
        case 'attack':
          command = { type: 'attack', playerId: userId, card: body.card };
          actionType = 'attack';
          break;
        case 'throwIn':
          command = { type: 'throwIn', playerId: userId, card: body.card };
          actionType = 'throwIn';
          break;
        case 'transfer':
          command = { type: 'transfer', playerId: userId, card: body.card };
          actionType = 'transfer';
          break;
        case 'defend':
          command = {
            type: 'defend',
            playerId: userId,
            attackIndex: body.attackIndex,
            card: body.card,
          };
          actionType = 'defend';
          break;
        case 'take':
          command = { type: 'take', playerId: userId };
          actionType = 'take';
          break;
        case 'finish':
        default:
          command = { type: 'endTurn', playerId: userId };
          actionType = body.type === 'finish' ? 'finish' : 'endTurn';
          break;
      }

      await this.applyGameCommandInternal(room, command);
      this.logger.info('game_action_applied', {
        service: 'RoomsService',
        roomId,
        matchId: room.id,
        userId,
        requestId,
        action: actionType,
        result: room.status,
      });
      if (clientCommandId) {
        const key = `${userId}:${clientCommandId}`;
        let set = this.httpProcessedCommands.get(roomId);
        if (!set) {
          set = new Set<string>();
          this.httpProcessedCommands.set(roomId, set);
        }
        set.add(key);
      }
    } catch (e) {
      const err = e as Error;
      this.logger.warn('game_action_invalid', {
        service: 'RoomsService',
        roomId,
        matchId: room.id,
        userId,
        requestId,
        action: body.type,
        reason: err.message || 'invalid_action',
      });
      throw new BadRequestException(err.message || 'Некорректное игровое действие');
    }
    this.broadcast(room);
    return room;
  }

  private broadcast(room: RoomState) {
    this.realtime.broadcastRoomSnapshot(room.id, room);
  }

  private broadcastDelete(roomId: string) {
    this.realtime.broadcastRoomSnapshot(roomId, null);
  }

  private async applyGameCommandInternal(
    room: RoomState,
    command:
      | { type: 'attack'; playerId: string; card: Card }
      | { type: 'throwIn'; playerId: string; card: Card }
      | { type: 'transfer'; playerId: string; card: Card }
      | { type: 'defend'; playerId: string; attackIndex: number; card: Card }
      | { type: 'take'; playerId: string }
      | { type: 'endTurn'; playerId: string }
      | { type: 'throwInPass'; playerId: string },
  ): Promise<void> {
    if (!room.game) {
      throw new Error('Game state is not initialized');
    }
    const nextGame = applyCommand(room.game as GameState, command as Parameters<typeof applyCommand>[1]);
    room.game = nextGame;
    room.turn += 1;
    room.status = nextGame.finished ? 'finished' : 'in_progress';

    this.logger.info('game_command_applied', {
      service: 'RoomsService',
      roomId: room.id,
      matchId: (nextGame as GameState).id ?? room.id,
      userId: 'playerId' in command ? command.playerId : undefined,
      requestId: generateId(),
      action: command.type,
      result: room.status,
    });

    if (!nextGame.finished) {
      this.resetTurnTimer(room);
      this.scheduleBotIfNeeded(room);
    } else {
      room.turnStartedAt = undefined;
      room.turnDurationSeconds = undefined;
      room.turnDeadlineAt = undefined;
      this.clearTurnTimer(room.id);
      this.clearBotTimer(room.id);
      await this.updateMatchResult(room);
    }
  }

  private async handleTurnTimeout(roomId: string, expectedDeadlineAt: number): Promise<void> {
    const room = this.rooms.get(roomId);
    if (!room) return;
    if (room.status !== 'in_progress') return;
    if (!room.game) return;
    if (!room.turnStartedAt || !room.turnTimeoutMs) return;
    const actualDeadline = room.turnStartedAt + room.turnTimeoutMs;
    if (actualDeadline !== expectedDeadlineAt) {
      this.logger.debug('turn_timeout_stale_ignored', {
        service: 'RoomsService',
        roomId,
        matchId: room.id,
        expectedDeadlineAt,
        actualDeadline,
      });
      return;
    }
    const game = room.game as GameState;
    if (game.finished) return;

    const attacker = game.players[game.attackerIndex];
    const defender = game.players[game.defenderIndex];

    try {
      if (game.phase === 'attack' && game.table.length > 0) {
        await this.applyGameCommandInternal(room, { type: 'throwInPass', playerId: attacker.id });
        room.lastAutoActionMessage = 'Игрок автоматически завершил подкидывание по таймауту.';
        this.logger.info('auto_timeout_action', {
          service: 'RoomsService',
          roomId,
          matchId: room.id,
          userId: attacker.id,
          action: 'throwInPass',
        });
      } else if (game.phase === 'defense') {
        if (game.pendingTake) {
          await this.applyGameCommandInternal(room, { type: 'endTurn', playerId: attacker.id });
          room.lastAutoActionMessage = 'Подкидывание завершено автоматически по таймауту.';
          this.logger.info('auto_timeout_action', {
            service: 'RoomsService',
            roomId,
            matchId: room.id,
            userId: attacker.id,
            action: 'endTurn',
          });
        } else {
          await this.applyGameCommandInternal(room, { type: 'take', playerId: defender.id });
          room.lastAutoActionMessage = 'Защита пропущена, карты взяты автоматически по таймауту.';
          this.logger.info('auto_timeout_action', {
            service: 'RoomsService',
            roomId,
            matchId: room.id,
            userId: defender.id,
            action: 'take',
          });
        }
      } else if (game.phase === 'cleanup') {
        await this.applyGameCommandInternal(room, { type: 'endTurn', playerId: attacker.id });
        room.lastAutoActionMessage = 'Раунд завершён автоматически по таймауту.';
        this.logger.info('auto_timeout_action', {
          service: 'RoomsService',
          roomId,
          matchId: room.id,
          userId: attacker.id,
          action: 'endTurn',
        });
      } else if (game.phase === 'attack' && game.table.length === 0) {
        await this.applyGameCommandInternal(room, { type: 'endTurn', playerId: attacker.id });
        room.lastAutoActionMessage = 'Ход пропущен автоматически по таймауту.';
        this.logger.info('auto_timeout_action', {
          service: 'RoomsService',
          roomId,
          matchId: room.id,
          userId: attacker.id,
          action: 'endTurn',
        });
      } else {
        // В других фазах безопаснее просто перезапустить таймер.
        this.resetTurnTimer(room);
        return;
      }
      this.broadcast(room);
    } catch {
      if (room.status === 'in_progress' && room.game && !room.game.finished) {
        this.resetTurnTimer(room);
      }
    }
  }

  private async updateMatchResult(room: RoomState): Promise<void> {
    if (!room.game) return;
    const game = room.game;
    const gameAny = game as unknown as {
      loserId?: string;
      players?: { id: string; isOut?: boolean }[];
      stats?: {
        totalTurns: number;
        totalRounds: number;
        totalCardsTaken: number;
        finishOrder: string[];
        perPlayer: {
          playerId: string;
          turnsMade: number;
          cardsTaken: number;
          defensesMade: number;
          attacksMade: number;
          transfersMade: number;
          throwInsMade: number;
          finishedPlace?: number;
        }[];
        outcome?: 'normal' | 'draw' | 'aborted';
      };
    };

    const loserId: string | null = gameAny.loserId ?? null;
    const allPlayerIds = Array.isArray(gameAny.players) ? gameAny.players.map((p) => p.id) : [];
    const statsCore = gameAny.stats;
    const finishOrder = statsCore?.finishOrder ?? [];

    const startedAt = room.matchStartedAt ?? Date.now();
    const durationSeconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));

    const perPlayer =
      statsCore?.perPlayer?.map((p) => ({
        playerId: p.playerId,
        turnsMade: p.turnsMade,
        cardsTaken: p.cardsTaken,
        defensesMade: p.defensesMade,
        attacksMade: p.attacksMade,
        transfersMade: p.transfersMade,
        throwInsMade: p.throwInsMade,
        finishedPlace: p.finishedPlace,
      })) ?? [];

    const placements =
      perPlayer
        .filter((p) => typeof p.finishedPlace === 'number')
        .map((p) => ({ playerId: p.playerId, place: p.finishedPlace! }))
        .sort((a, b) => a.place - b.place) ?? [];

    let outcome: MatchResult['outcome'] = statsCore?.outcome ?? 'normal';
    if (!finishOrder.length || finishOrder.length !== allPlayerIds.length) {
      if (!statsCore?.outcome) {
        outcome = 'aborted';
      }
    }

    let winnerIds: string[] = [];
    if (outcome === 'normal') {
      const places = perPlayer
        .map((p) => (typeof p.finishedPlace === 'number' ? p.finishedPlace : Number.MAX_SAFE_INTEGER))
        .filter((v) => v !== Number.MAX_SAFE_INTEGER);
      if (places.length > 0) {
        const bestPlace = Math.min(...places);
        winnerIds = perPlayer.filter((p) => p.finishedPlace === bestPlace).map((p) => p.playerId);
      }
    }

    const stats: MatchStats = {
      totalTurns: statsCore?.totalTurns ?? room.turn,
      totalRounds: statsCore?.totalRounds ?? 0,
      durationSeconds,
      totalCardsTaken: statsCore?.totalCardsTaken ?? 0,
      perPlayer,
    };

    const result: MatchResult = {
      winnerIds,
      loserId,
      finishOrder,
      placements,
      outcome,
      stats,
    };

    room.matchStats = stats;
    room.matchResult = result;

    const humanPlayerIds = room.players.map((p) => p.id);
    if (humanPlayerIds.length > 0) {
      await this.statsService.recordMatchComplete(
        room.id,
        room.mode,
        room.matchStartedAt ?? Date.now(),
        humanPlayerIds,
        result,
      );
    }
  }
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

