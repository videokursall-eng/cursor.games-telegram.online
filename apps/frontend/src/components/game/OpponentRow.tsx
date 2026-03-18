interface Opponent {
  id: string;
  name: string;
  cards: number;
  isBot?: boolean;
  isActive?: boolean;
}

interface OpponentRowProps {
  opponents: Opponent[];
}

export function OpponentRow({ opponents }: OpponentRowProps) {
  if (!opponents.length) {
    return <div className="text-center text-xs text-emerald-100/80">Нет соперников</div>;
  }
  return (
    <div className="flex h-full items-center justify-around gap-2">
      {opponents.map((opponent) => (
        <div
          key={opponent.id}
          className={`flex w-20 flex-col items-center justify-center rounded-lg border border-emerald-600/70 bg-emerald-800/70 px-2 py-1 text-[10px] ${
            opponent.isActive ? 'ring-2 ring-yellow-400' : ''
          }`}
        >
          <div className="truncate font-semibold text-emerald-50">{opponent.name}</div>
          <div className="text-emerald-200">{opponent.cards} карт</div>
          {opponent.isBot && <div className="text-[9px] text-emerald-300 mt-0.5">бот</div>}
          {opponent.isActive && <div className="text-[9px] text-yellow-300 mt-0.5">ходит</div>}
        </div>
      ))}
    </div>
  );
}

