interface PlayerSlotProps {
  name?: string;
  isOwner?: boolean;
  isCurrent?: boolean;
}

export function PlayerSlot({ name, isOwner, isCurrent }: PlayerSlotProps) {
  if (!name) {
    return <div className="rounded border border-dashed border-gray-700 px-3 py-2 text-xs text-gray-500">Свободно</div>;
  }
  return (
    <div className="flex items-center justify-between rounded border border-gray-700 px-3 py-2 text-xs">
      <div>
        <div className="font-medium text-sm">{name}</div>
        {isOwner && <div className="text-[10px] text-yellow-400 mt-0.5">Создатель</div>}
      </div>
      {isCurrent && <span className="text-[10px] text-blue-400">Вы</span>}
    </div>
  );
}

