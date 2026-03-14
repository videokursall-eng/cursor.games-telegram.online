import { TurnTimer } from './TurnTimer';
import { PendingIndicator } from './PendingIndicator';
import { getUiTheme } from '../../theme/uiTheme';

interface GameStatusBarProps {
  currentPlayerName: string;
  phase: string;
  hint: string;
  syncing?: boolean;
  waiting?: boolean;
  reconnecting?: boolean;
  stale?: boolean;
  actionPending?: boolean;
  turnStartedAt?: number;
  turnDurationSeconds?: number;
  isCurrentPlayerActive?: boolean;
  isFinished?: boolean;
  isBotTurn?: boolean;
}

export function GameStatusBar({
  currentPlayerName,
  phase,
  hint,
  syncing,
  waiting,
  reconnecting,
  stale,
  actionPending,
  turnStartedAt,
  turnDurationSeconds,
  isCurrentPlayerActive,
  isFinished,
  isBotTurn: isBotTurnProp,
}: GameStatusBarProps) {
  const showTimer =
    !!turnStartedAt &&
    !!turnDurationSeconds &&
    !isFinished &&
    !waiting &&
    !syncing &&
    !reconnecting &&
    isCurrentPlayerActive;

  const theme = getUiTheme();

  let statusLabel = '';
  let tone = theme.statusPill.active;

  if (reconnecting) {
    statusLabel = 'Переподключение…';
    tone = theme.statusPill.reconnecting;
  } else if (syncing) {
    statusLabel = 'Синхронизация…';
    tone = theme.statusPill.syncing;
  } else if (stale) {
    statusLabel = 'Состояние может быть устаревшим';
    tone = theme.statusPill.stale;
  } else if (isBotTurnProp) {
    statusLabel = 'Ход бота';
    tone = theme.statusPill.waiting;
  } else if (waiting) {
    statusLabel = 'Ожидание хода другого игрока';
    tone = theme.statusPill.waiting;
  } else if (actionPending) {
    statusLabel = 'Отправка действия…';
    tone = theme.statusPill.pending;
  } else {
    statusLabel = phase;
    tone = theme.statusPill.active;
  }

  return (
    <div className="flex items-center justify-between gap-2 text-[11px]">
      <div className="flex items-center gap-1 font-semibold text-emerald-50">
        <span>Ход: {currentPlayerName}</span>
        {showTimer && <TurnTimer startedAt={turnStartedAt} durationSeconds={turnDurationSeconds} />}
      </div>
      <div className={`flex items-center gap-1 ${tone.textColor}`}>
        {actionPending && !reconnecting && !syncing && !stale && (
          <PendingIndicator size="sm" variant="status" />
        )}
        {statusLabel && (
          <span className={`rounded-full px-2 py-0.5 text-[10px] ${tone.badgeBg}`}>{statusLabel}</span>
        )}
      </div>
      <div className="flex-1 truncate text-right text-emerald-100/80">{hint}</div>
    </div>
  );
}

