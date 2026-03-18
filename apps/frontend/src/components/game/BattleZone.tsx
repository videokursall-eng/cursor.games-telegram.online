import { CardView, type CardViewProps } from './CardView';

interface BattlePair {
  attack: CardViewProps;
  defense?: CardViewProps;
}

interface BattleZoneProps {
  pairs: BattlePair[];
}

export function BattleZone({ pairs }: BattleZoneProps) {
  if (!pairs.length) {
    return <div className="text-xs text-emerald-100/80">Стол пуст — ожидание атаки</div>;
  }
  return (
    <div className="flex w-full flex-wrap items-center justify-center gap-3">
      {pairs.map((pair, idx) => (
        <div key={idx} className="flex flex-col items-center gap-1">
          <CardView {...pair.attack} />
          <div className="h-1 w-px bg-emerald-600/60" />
          {pair.defense ? (
            <CardView {...pair.defense} />
          ) : (
            <div className="h-20 w-14 rounded-md border border-dashed border-emerald-600/70 text-[10px] text-emerald-100/80 flex items-center justify-center">
              ждёт защиты
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

