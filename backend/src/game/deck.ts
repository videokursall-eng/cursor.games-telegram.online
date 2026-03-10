import { Card, Rank, Suit } from './types';

const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];
const RANKS: Rank[] = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export const RANK_VALUES: Record<Rank, number> = {
  '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 11, 'Q': 12, 'K': 13, 'A': 14,
};

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, id: `${rank}${suit}` });
    }
  }
  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/** Returns true if card `a` beats card `b` given the trump suit */
export function beats(a: Card, b: Card, trumpSuit: Suit): boolean {
  if (a.suit === b.suit) {
    return RANK_VALUES[a.rank] > RANK_VALUES[b.rank];
  }
  if (a.suit === trumpSuit) return true;
  return false;
}
