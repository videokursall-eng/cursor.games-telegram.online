import { describe, it, expect } from '@jest/globals';
import type { Card, Command, GameState } from 'game-core';
import { applyCommand, createInitialState, createDeck } from 'game-core';
import type { BotContext, BotDecision } from './bots.types';
import { botDecisionToCommand } from './bots.commands';

function createSimpleStateForAttack(): { state: GameState; selfId: string } {
  const deck = createDeck();
  const state = createInitialState('match-1', 'podkidnoy', ['b1', 'u2'], 'hearts', deck);
  // Ensure attacker is b1 and table is empty
  return { state, selfId: 'b1' };
}

describe('botDecisionToCommand', () => {
  it('maps attack decision to attack command', () => {
    const { state, selfId } = createSimpleStateForAttack();
    const attacker = state.players[state.attackerIndex];
    const card: Card = attacker.hand[0];

    const context: BotContext = {
      roomId: 'room-1',
      mode: state.mode,
      turn: 1,
      self: { id: selfId, name: 'Bot', isBot: true, isOwner: false },
      players: [
        { id: 'b1', name: 'Bot', isBot: true, isOwner: false },
        { id: 'u2', name: 'User', isBot: false, isOwner: false },
      ],
      bots: [],
      game: state,
    };

    const decision: BotDecision = { type: 'attack', card };
    const cmd = botDecisionToCommand(context, decision) as Command;
    expect(cmd.type).toBe('attack');
    expect(cmd.playerId).toBe(selfId);
    // Narrowing: for attack commands, card is present
    if (cmd.type === 'attack') {
      expect(cmd.card).toEqual(card);
    }
  });

  it('maps take / finishRound / pass decisions correctly', () => {
    const { state, selfId } = createSimpleStateForAttack();
    const baseContext: BotContext = {
      roomId: 'room-1',
      mode: state.mode,
      turn: 1,
      self: { id: selfId, name: 'Bot', isBot: true, isOwner: false },
      players: [
        { id: 'b1', name: 'Bot', isBot: true, isOwner: false },
        { id: 'u2', name: 'User', isBot: false, isOwner: false },
      ],
      bots: [],
      game: state,
    };

    const takeCmd = botDecisionToCommand(baseContext, { type: 'take' });
    expect(takeCmd).toEqual({ type: 'take', playerId: selfId });

    const finishCmd = botDecisionToCommand(baseContext, { type: 'finishRound' });
    expect(finishCmd).toEqual({ type: 'endTurn', playerId: selfId });

    const passCmd = botDecisionToCommand(baseContext, { type: 'pass' });
    expect(passCmd).toEqual({ type: 'throwInPass', playerId: selfId });
  });

  it('produces a command that can be applied via game-core', () => {
    const { state, selfId } = createSimpleStateForAttack();
    const attacker = state.players[state.attackerIndex];
    const card: Card = attacker.hand[0];

    const context: BotContext = {
      roomId: 'room-1',
      mode: state.mode,
      turn: 1,
      self: { id: selfId, name: 'Bot', isBot: true, isOwner: false },
      players: [
        { id: 'b1', name: 'Bot', isBot: true, isOwner: false },
        { id: 'u2', name: 'User', isBot: false, isOwner: false },
      ],
      bots: [],
      game: state,
    };

    const decision: BotDecision = { type: 'attack', card };
    const cmd = botDecisionToCommand(context, decision);
    expect(cmd).not.toBeNull();

    const next = applyCommand(state, cmd as Command);
    expect(next.table).toHaveLength(1);
    expect(next.table[0].attack).toEqual(card);
    expect(
      next.players.find((p) => p.id === selfId)?.hand.length,
    ).toBe(attacker.hand.length - 1);
  });
});


