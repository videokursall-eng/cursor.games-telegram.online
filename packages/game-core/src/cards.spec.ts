import { describe, it, expect } from 'vitest';
import { createDeck, cardId, RANKS, SUITS } from './cards';

describe('cards', () => {
  it('createDeck returns 36 cards', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(36);
  });

  it('createDeck has all rank-suit combinations', () => {
    const deck = createDeck();
    const ids = new Set(deck.map(cardId));
    expect(ids.size).toBe(36);
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        expect(ids.has(`${rank}:${suit}`)).toBe(true);
      }
    }
  });

  it('cardId is deterministic', () => {
    expect(cardId({ rank: 'A', suit: 'hearts' })).toBe('A:hearts');
  });
});
