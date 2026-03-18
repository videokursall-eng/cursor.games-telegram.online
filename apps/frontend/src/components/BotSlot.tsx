import type { BotDifficulty } from '../api/rooms';

const DIFFICULTY_LABELS: Record<BotDifficulty, string> = {
  easy: 'Лёгкий',
  normal: 'Нормальный',
  hard: 'Сложный',
};

interface BotSlotProps {
  name: string;
  difficulty?: BotDifficulty | null;
  isOwner?: boolean;
  inLobby?: boolean;
  onDifficultyChange?: (difficulty: BotDifficulty) => void;
}

export function BotSlot({
  name,
  difficulty,
  isOwner,
  inLobby,
  onDifficultyChange,
}: BotSlotProps) {
  const canChange = Boolean(isOwner && inLobby && onDifficultyChange);
  const displayDifficulty = difficulty ?? 'normal';

  return (
    <div className="flex items-center justify-between gap-2 rounded border border-gray-700 px-3 py-2 text-xs">
      <div className="min-w-0 flex-1">
        <div className="font-medium text-sm">{name}</div>
        <div className="text-[10px] text-green-400 mt-0.5">
          Бот · {DIFFICULTY_LABELS[displayDifficulty]}
        </div>
      </div>
      {canChange && (
        <select
          value={displayDifficulty}
          onChange={(e) => onDifficultyChange?.(e.target.value as BotDifficulty)}
          className="rounded bg-gray-800 px-2 py-1 text-xs"
          aria-label={`Сложность бота ${name}`}
        >
          {(['easy', 'normal', 'hard'] as const).map((d) => (
            <option key={d} value={d}>
              {DIFFICULTY_LABELS[d]}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
