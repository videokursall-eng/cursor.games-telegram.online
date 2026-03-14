import { CardView } from './CardView';

interface DeckViewProps {
  cardsLeft: number;
  trump: { rank: string; suit: string };
}

export function DeckView({ cardsLeft, trump }: DeckViewProps) {
  return (
    <div className="flex h-full flex-col items-center justify-between gap-2 text-[10px] text-emerald-100">
      <div className="flex flex-col items-center gap-1">
        <div className="relative h-12 w-9 rounded-md border border-emerald-700 bg-emerald-950">
          <div className="absolute inset-0 translate-x-1 translate-y-1 rounded-md border border-emerald-600 bg-emerald-900" />
        </div>
        <div>{cardsLeft} в колоде</div>
      </div>
      <div className="flex flex-col items-center gap-1">
        <div className="text-[11px] text-emerald-200">Козырь</div>
        <CardView rank={trump.rank} suit={trump.suit} />
      </div>
    </div>
  );
}

