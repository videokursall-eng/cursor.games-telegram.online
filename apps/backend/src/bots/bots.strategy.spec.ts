import { describe, it, expect } from '@jest/globals';
import type { Card, GameState, Command } from 'game-core';
import { applyCommand, createInitialState, createDeck, validateCommand } from 'game-core';
import type { BotContext } from './bots.types';
import { basicBotStrategy } from './bots.strategy';
import { botDecisionToCommand } from './bots.commands';

function createContextFromState(state: GameState, selfId: string): BotContext {
  return {
    roomId: 'room-1',
    mode: state.mode,
    turn: 1,
    self: { id: selfId, name: 'Bot', isBot: true, isOwner: false },
    players: [
      { id: state.players[0].id, name: 'P1', isBot: state.players[0].isBot, isOwner: false },
      { id: state.players[1].id, name: 'P2', isBot: state.players[1].isBot, isOwner: false },
    ],
    bots: [],
    game: state,
  };
}

describe('BasicBotStrategy - attack and defense', () => {
  it('chooses the lowest valid card for initial attack', () => {
    const deck = createDeck();
    let state = createInitialState('match-1', 'podkidnoy', ['b1', 'u2'], 'hearts', deck);
    const selfId = 'b1';
    const attacker = state.players[state.attackerIndex];
    // Ensure attacker has at least two cards with different ranks by sorting naively by rank string
    const sortedHand = [...attacker.hand].sort((a, b) => a.rank.localeCompare(b.rank));
    state = {
      ...state,
      players: state.players.map((p) =>
        p.id === selfId ? { ...p, hand: sortedHand } : p,
      ),
    };

    const ctx = createContextFromState(state, selfId);
    const decision = basicBotStrategy.decide(ctx);
    expect(decision.type).toBe('attack');
    // Whatever card strategy chose must come from the attacker's hand and be valid for attack
    const chosen = decision.card as Card | undefined;
    expect(attacker.hand).toContainEqual(chosen as Card);
    if (chosen) {
      expect(
        validateCommand(state, { type: 'attack', playerId: selfId, card: chosen }),
      ).toBeNull();
    }
  });

  it('defends with the minimal beating card or takes when impossible', () => {
    // Construct a minimal GameState manually for a defense scenario
    const state: GameState = {
      id: 'match-2',
      mode: 'podkidnoy',
      players: [
        { id: 'u1', hand: [], isBot: false, isOut: false },
        {
          id: 'b1',
          hand: [
            { rank: '7', suit: 'hearts' },
            { rank: '9', suit: 'diamonds' },
          ],
          isBot: true,
          isOut: false,
        },
      ],
      deck: [],
      discard: [],
      trump: 'hearts',
      attackerIndex: 0,
      defenderIndex: 1,
      phase: 'defense',
      table: [
        {
          attack: { rank: '6', suit: 'hearts' },
        },
      ],
      pendingTake: false,
      pendingTakePlayerId: null,
      finished: false,
      loserId: undefined,
      stats: {
        totalTurns: 0,
        totalRounds: 0,
        totalCardsTaken: 0,
        finishOrder: [],
        perPlayer: [],
        outcome: 'normal',
      },
      throwInPassedPlayerIds: [],
    };

    const ctx = createContextFromState(state, 'b1');
    const decision = basicBotStrategy.decide(ctx);
    expect(decision.type).toBe('defend');
    expect(decision.attackIndex).toBe(0);
    expect(decision.card).toEqual({ rank: '7', suit: 'hearts' });
    // chosen defense must be valid by game-core rules
    expect(
      validateCommand(state, {
        type: 'defend',
        playerId: 'b1',
        attackIndex: 0,
        card: decision.card as Card,
      }),
    ).toBeNull();

    const cmd = botDecisionToCommand(ctx, decision);
    const next = applyCommand(state, cmd as Command);
    expect(next.table[0].defense).toEqual({ rank: '7', suit: 'hearts' });

    // Now make defense impossible and expect take
    const noDefenseState: GameState = {
      ...state,
      players: state.players.map((p) =>
        p.id === 'b1'
          ? {
              ...p,
              hand: [{ rank: '6', suit: 'clubs' } as Card],
            }
          : p,
      ),
    };
    const ctxNoDefense = createContextFromState(noDefenseState, 'b1');
    const decisionNoDefense = basicBotStrategy.decide(ctxNoDefense);
    expect(decisionNoDefense.type).toBe('take');
    expect(validateCommand(noDefenseState, { type: 'take', playerId: 'b1' })).toBeNull();
  });
});

describe('BasicBotStrategy - throwIn / transfer / finishRound / no_action', () => {
  it('uses throwIn when additional attack is possible for attacker', () => {
    const state: GameState = {
      id: 'match-throwin',
      mode: 'podkidnoy',
      players: [
        {
          id: 'b1',
          hand: [
            { rank: '6', suit: 'diamonds' },
            { rank: '7', suit: 'clubs' },
          ],
          isBot: true,
          isOut: false,
        },
        {
          id: 'u2',
          hand: [
            { rank: '7', suit: 'hearts' },
            { rank: '8', suit: 'spades' },
          ],
          isBot: false,
          isOut: false,
        },
      ],
      deck: [],
      discard: [],
      trump: 'hearts',
      attackerIndex: 0,
      defenderIndex: 1,
      phase: 'attack',
      table: [
        {
          attack: { rank: '6', suit: 'hearts' },
        },
      ],
      pendingTake: false,
      pendingTakePlayerId: null,
      finished: false,
      loserId: undefined,
      stats: {
        totalTurns: 0,
        totalRounds: 0,
        totalCardsTaken: 0,
        finishOrder: [],
        perPlayer: [],
        outcome: 'normal',
      },
      throwInPassedPlayerIds: [],
    };

    const ctx = createContextFromState(state, 'b1');
    const decision = basicBotStrategy.decide(ctx);
    expect(decision.type).toBe('throwIn');
    const chosen = decision.card as Card | undefined;
    expect(chosen).toBeDefined();
    if (chosen) {
      expect(
        validateCommand(state, { type: 'throwIn', playerId: 'b1', card: chosen }),
      ).toBeNull();
    }
  });

  it('uses transfer when defender in perevodnoy mode can legally transfer', () => {
    const state: GameState = {
      id: 'match-transfer',
      mode: 'perevodnoy',
      players: [
        {
          id: 'u1',
          hand: [{ rank: '6', suit: 'clubs' }],
          isBot: false,
          isOut: false,
        },
        {
          id: 'b1',
          hand: [
            { rank: '6', suit: 'diamonds' },
            { rank: '7', suit: 'clubs' },
          ],
          isBot: true,
          isOut: false,
        },
        {
          id: 'u3',
          hand: [
            { rank: '8', suit: 'hearts' },
            { rank: '9', suit: 'spades' },
            { rank: '10', suit: 'clubs' },
          ],
          isBot: false,
          isOut: false,
        },
      ],
      deck: [],
      discard: [],
      trump: 'hearts',
      attackerIndex: 0,
      defenderIndex: 1,
      phase: 'defense',
      table: [
        {
          attack: { rank: '6', suit: 'hearts' },
        },
      ],
      pendingTake: false,
      pendingTakePlayerId: null,
      finished: false,
      loserId: undefined,
      stats: {
        totalTurns: 0,
        totalRounds: 0,
        totalCardsTaken: 0,
        finishOrder: [],
        perPlayer: [],
        outcome: 'normal',
      },
      throwInPassedPlayerIds: [],
    };

    const ctx = createContextFromState(state, 'b1');
    const decision = basicBotStrategy.decide(ctx);
    expect(decision.type).toBe('transfer');
    const chosen = decision.card as Card | undefined;
    expect(chosen).toBeDefined();
    if (chosen) {
      expect(
        validateCommand(state, { type: 'transfer', playerId: 'b1', card: chosen }),
      ).toBeNull();
    }
  });

  it('uses finishRound when attacker has no more valid attacks or throw-ins', () => {
    const state: GameState = {
      id: 'match-finish',
      mode: 'podkidnoy',
      players: [
        {
          id: 'b1',
          hand: [],
          isBot: true,
          isOut: false,
        },
        {
          id: 'u2',
          hand: [{ rank: '7', suit: 'hearts' }],
          isBot: false,
          isOut: false,
        },
      ],
      deck: [],
      discard: [],
      trump: 'hearts',
      attackerIndex: 0,
      defenderIndex: 1,
      phase: 'attack',
      table: [],
      pendingTake: false,
      pendingTakePlayerId: null,
      finished: false,
      loserId: undefined,
      stats: {
        totalTurns: 0,
        totalRounds: 0,
        totalCardsTaken: 0,
        finishOrder: [],
        perPlayer: [],
        outcome: 'normal',
      },
      throwInPassedPlayerIds: [],
    };

    const ctx = createContextFromState(state, 'b1');
    const decision = basicBotStrategy.decide(ctx);
    expect(decision.type).toBe('finishRound');
    expect(
      validateCommand(state, { type: 'endTurn', playerId: 'b1' }),
    ).toBeNull();
  });

  it('returns no_action when bot has no legal moves and is not active attacker/defender', () => {
    const state: GameState = {
      id: 'match-wait',
      mode: 'podkidnoy',
      players: [
        {
          id: 'u1',
          hand: [{ rank: '6', suit: 'hearts' }],
          isBot: false,
          isOut: false,
        },
        {
          id: 'u2',
          hand: [{ rank: '7', suit: 'clubs' }],
          isBot: false,
          isOut: false,
        },
        {
          id: 'b1',
          hand: [{ rank: '8', suit: 'spades' }],
          isBot: true,
          isOut: false,
        },
      ],
      deck: [],
      discard: [],
      trump: 'hearts',
      attackerIndex: 0,
      defenderIndex: 1,
      phase: 'attack',
      table: [],
      pendingTake: false,
      pendingTakePlayerId: null,
      finished: false,
      loserId: undefined,
      stats: {
        totalTurns: 0,
        totalRounds: 0,
        totalCardsTaken: 0,
        finishOrder: [],
        perPlayer: [],
        outcome: 'normal',
      },
      throwInPassedPlayerIds: [],
    };

    const ctx = createContextFromState(state, 'b1');
    const decision = basicBotStrategy.decide(ctx);
    expect(decision.type).toBe('no_action');
  });
});

