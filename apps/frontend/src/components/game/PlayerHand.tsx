import { CardView } from './CardView';

export interface HandCard {
  id: string;
  rank: string;
  suit: string;
  disabled?: boolean;
}

interface PlayerHandProps {
  cards: HandCard[];
  selectedId?: string | null;
  onSelect: (id: string | null) => void;
}

export function PlayerHand({ cards, selectedId, onSelect }: PlayerHandProps) {
  if (!cards.length) {
    return <div className="text-xs text-emerald-100/80">У вас нет карт</div>;
  }
  return (
    <div className="flex w-full items-center justify-center gap-2">
      {cards.map((card) => (
        <CardView
          key={card.id}
          rank={card.rank}
          suit={card.suit}
          selected={selectedId === card.id}
          disabled={card.disabled}
          onClick={() => onSelect(selectedId === card.id ? null : card.id)}
        />
      ))}
    </div>
  );
}

