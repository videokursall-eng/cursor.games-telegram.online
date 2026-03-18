import type { MatchResultDto } from '../../api/rooms';

interface MatchResultModalProps {
  visible: boolean;
  currentPlayerId: string;
  mode: 'podkidnoy' | 'perevodnoy';
  players: { id: string; name: string; isBot: boolean }[];
  matchResult?: MatchResultDto | null;
  onExitToLobby: () => void;
  onExitToRoom: () => void;
}

export function MatchResultModal({
  visible,
  currentPlayerId,
  mode,
  players,
  matchResult,
  onExitToLobby,
  onExitToRoom,
}: MatchResultModalProps) {
  if (!visible) return null;
  const loserId = matchResult?.loserId ?? null;
  const isLoser = !!loserId && loserId === currentPlayerId;
  let title = 'Матч завершён';
  if (matchResult?.outcome === 'draw') {
    title = 'Ничья';
  } else if (matchResult?.outcome === 'aborted') {
    title = 'Матч прерван';
  } else if (isLoser) {
    title = 'Вы проиграли';
  } else if (loserId) {
    title = 'Вы победили';
  }
  const modeLabel = mode === 'podkidnoy' ? 'Подкидной дурак' : 'Переводной дурак';
  const winnerIds = matchResult?.winnerIds ?? [];
  const winnerPlayers =
    winnerIds.length > 0
      ? players.filter((p) => winnerIds.includes(p.id))
      : loserId
      ? players.filter((p) => p.id !== loserId)
      : [];
  const primaryWinner = winnerPlayers[0] ?? null;
  const stats = matchResult?.stats;

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 px-6">
      <div className="w-full max-w-sm rounded-xl bg-emerald-950/95 p-4 shadow-lg shadow-black/40">
        <h2 className="mb-1 text-center text-sm font-semibold text-emerald-50">{title}</h2>
        <p className="mb-2 text-center text-[11px] text-emerald-200">{modeLabel}</p>
        {primaryWinner && matchResult?.outcome === 'normal' && (
          <p className="mb-2 text-center text-[11px] text-emerald-100/90">
            Победитель:{' '}
            <span className="font-semibold">
              {primaryWinner.name}
              {winnerPlayers.length > 1 ? ` и ещё ${winnerPlayers.length - 1}` : ''}
            </span>
          </p>
        )}
        {!winnerIds.length && matchResult && matchResult.outcome !== 'normal' && (
          <p className="mb-2 text-center text-[11px] text-emerald-100/90">
            {matchResult.outcome === 'draw'
              ? 'Матч завершён без явного победителя (ничья).'
              : 'Матч завершён без явного победителя.'}
          </p>
        )}
        {stats && (
          <div className="mb-3 rounded-md bg-emerald-900/80 p-2">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
              Статистика партии
            </p>
            <ul className="space-y-0.5 text-[10px] text-emerald-100/90">
              <li>Раунды: {stats.totalRounds}</li>
              <li>Ходы: {stats.totalTurns}</li>
              <li>Взятых карт: {stats.totalCardsTaken}</li>
              <li>Длительность: {stats.durationSeconds} с</li>
            </ul>
          </div>
        )}
        <div className="mb-3 rounded-md bg-emerald-900/80 p-2">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
            Участники
          </p>
          <ul className="max-h-32 space-y-1 overflow-auto text-[10px] text-emerald-100/90">
            {players.map((p) => {
              const placement = matchResult?.placements.find((pl) => pl.playerId === p.id);
              const perPlayerStats = stats?.perPlayer.find((s) => s.playerId === p.id);
              return (
                <li key={p.id} className="flex flex-col gap-0.5">
                  <div className="flex items-center justify-between">
                    <span>
                      {p.name}
                      {p.isBot ? ' (бот)' : ''}
                    </span>
                    {placement && (
                      <span className="text-emerald-300">
                        {placement.place}
                        {' место'}
                      </span>
                    )}
                  </div>
                  {perPlayerStats && (
                    <div className="flex flex-wrap gap-2 text-[9px] text-emerald-300/90">
                      <span>ходов: {perPlayerStats.turnsMade}</span>
                      <span>взято: {perPlayerStats.cardsTaken}</span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={onExitToRoom}
            className="rounded bg-emerald-800 px-3 py-1.5 text-[11px] font-semibold text-white"
          >
            В комнату
          </button>
          <button
            type="button"
            onClick={onExitToLobby}
            className="rounded bg-emerald-700 px-3 py-1.5 text-[11px] font-semibold text-white"
          >
            В лобби
          </button>
        </div>
      </div>
    </div>
  );
}

