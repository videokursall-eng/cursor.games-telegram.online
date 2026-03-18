import { describe, it, expect } from 'vitest';
import { computeAvailableActions, isBotTurn } from './selectors';
import type { GameTableState } from './adapters';

function state(overrides: Partial<Omit<GameTableState, 'currentPlayer'>> & { currentPlayer?: Partial<Pick<GameTableState['currentPlayer'], 'isActive'>> }): GameTableState {
  const base: GameTableState = {
    roomId: 'r1',
    mode: 'podkidnoy',
    phase: 'attack',
    currentPlayer: {
      id: 'u1',
      name: 'You',
      isBot: false,
      cardCount: 5,
      isCurrent: true,
      isActive: true,
    },
    opponents: [],
    hand: [],
    battlePairs: [],
    deckCount: 10,
    trump: { id: 't', rank: 'A', suit: 'hearts', playable: false },
    isFinished: false,
    hint: '',
  };
  const { currentPlayer: cp, ...rest } = overrides;
  return {
    ...base,
    ...rest,
    currentPlayer: { ...base.currentPlayer, ...cp },
  } as GameTableState;
}

describe('computeAvailableActions', () => {
  it('returns all false when isFinished', () => {
    const s = state({ isFinished: true });
    const actions = computeAvailableActions(s, { id: 'c1', rank: '6', suit: 'hearts', playable: true });
    expect(actions.canAttack).toBe(false);
    expect(actions.canDefend).toBe(false);
    expect(actions.canThrowIn).toBe(false);
    expect(actions.canTransfer).toBe(false);
    expect(actions.canTake).toBe(false);
    expect(actions.canFinish).toBe(false);
  });

  it('returns all false when currentPlayer.isActive is false (e.g. bot turn)', () => {
    const s = state({ phase: 'attack', currentPlayer: { isActive: false } });
    const actions = computeAvailableActions(s, { id: 'c1', rank: '6', suit: 'hearts', playable: true });
    expect(actions.canAttack).toBe(false);
    expect(actions.canDefend).toBe(false);
    expect(actions.canThrowIn).toBe(false);
    expect(actions.canTransfer).toBe(false);
    expect(actions.canTake).toBe(false);
    expect(actions.canFinish).toBe(false);
  });

  it('allows canAttack when active and phase attack and card selected', () => {
    const s = state({ phase: 'attack', currentPlayer: { isActive: true } });
    const actions = computeAvailableActions(s, { id: 'c1', rank: '6', suit: 'hearts', playable: true });
    expect(actions.canAttack).toBe(true);
  });

  it('allows canDefend when active and phase defense and card selected', () => {
    const s = state({ phase: 'defense', currentPlayer: { isActive: true } });
    const actions = computeAvailableActions(s, { id: 'c1', rank: '7', suit: 'hearts', playable: true });
    expect(actions.canDefend).toBe(true);
  });
});

describe('isBotTurn', () => {
  it('returns true when current player is not active and an opponent bot is active', () => {
    const s = state({
      phase: 'attack',
      currentPlayer: { isActive: false },
      opponents: [
        { id: 'b1', name: 'Bot', isBot: true, cardCount: 5, isCurrent: false, isActive: true },
      ] as GameTableState['opponents'],
    });
    expect(isBotTurn(s)).toBe(true);
  });

  it('returns false when current player is active', () => {
    const s = state({ phase: 'attack', currentPlayer: { isActive: true } });
    expect(isBotTurn(s)).toBe(false);
  });

  it('returns false when finished', () => {
    const s = state({
      isFinished: true,
      currentPlayer: { isActive: false },
      opponents: [
        { id: 'b1', name: 'Bot', isBot: true, cardCount: 0, isCurrent: false, isActive: true },
      ] as GameTableState['opponents'],
    });
    expect(isBotTurn(s)).toBe(false);
  });
});
