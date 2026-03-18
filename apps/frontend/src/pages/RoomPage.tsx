import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { getRoom, leaveRoom, startRoomMatch, updateRoomTimeouts, updateBotProfile, type RoomDto } from '../api/rooms';
import { PlayerSlot } from '../components/PlayerSlot';
import { BotSlot } from '../components/BotSlot';
import { InviteLink } from '../components/InviteLink';

export function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const [room, setRoom] = useState<RoomDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState<string | null>(null);
  const [roomTimeoutSec, setRoomTimeoutSec] = useState<string>('');
  const [perPlayerTimeoutSec, setPerPlayerTimeoutSec] = useState<Record<string, string>>({});
  const isOwner = useMemo(() => room && user && room.ownerId === user.id, [room, user]);

  useEffect(() => {
    if (!roomId) return;
    let active = true;
    setLoading(true);
    getRoom(roomId, token ?? null)
      .then((r) => {
        if (!active) return;
        setRoom(r);
        setError(null);
        if (r) {
          const baseTimeoutMs = r.overrideTurnTimeoutMs ?? r.turnTimeoutMs ?? 0;
          setRoomTimeoutSec(baseTimeoutMs > 0 ? String(Math.floor(baseTimeoutMs / 1000)) : '');
          const per: Record<string, string> = {};
          if (r.perPlayerTimeoutMs) {
            for (const [pid, ms] of Object.entries(r.perPlayerTimeoutMs)) {
              if (ms > 0) {
                per[pid] = String(Math.floor(ms / 1000));
              }
            }
          }
          setPerPlayerTimeoutSec(per);
        }
      })
      .catch((e: Error) => {
        if (!active) return;
        setError(e.message || 'Ошибка загрузки комнаты');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [roomId, token]);

  const handleLeave = async () => {
    if (!roomId) return;
    try {
      await leaveRoom(roomId, token ?? null);
    } finally {
      navigate('/');
    }
  };

  const handleStart = async () => {
    if (!roomId) return;
    try {
      const updated = await startRoomMatch(roomId, token ?? null);
      if (updated) setRoom(updated);
    } catch {
      // ignore
    }
  };

  const handleBotDifficultyChange = async (botId: string, difficulty: 'easy' | 'normal' | 'hard') => {
    if (!roomId || !token) return;
    try {
      const updated = await updateBotProfile(roomId, botId, { difficulty }, token);
      if (updated) setRoom(updated);
    } catch {
      // ignore
    }
  };

  const handleSaveTimeouts = async () => {
    if (!roomId || !token || !room || !user || room.ownerId !== user.id) return;

    const trimmedRoom = roomTimeoutSec.trim();
    let roomTimeoutMs: number | null | undefined;
    if (trimmedRoom === '') {
      roomTimeoutMs = null;
    } else {
      const v = Number(trimmedRoom);
      roomTimeoutMs = Number.isFinite(v) && v > 0 ? Math.round(v * 1000) : null;
    }

    const per: Record<string, number | null> = {};
    const allParticipantIds = [...room.players, ...room.bots].map((p) => p.id);
    for (const pid of allParticipantIds) {
      const value = perPlayerTimeoutSec[pid];
      if (!value || value.trim() === '') {
        per[pid] = null;
      } else {
        const n = Number(value);
        per[pid] = Number.isFinite(n) && n > 0 ? Math.round(n * 1000) : null;
      }
    }

    try {
      const updated = await updateRoomTimeouts(
        roomId,
        { roomTimeoutMs, perPlayerTimeoutMs: per },
        token ?? null,
      );
      if (updated) {
        setRoom(updated);
        const baseTimeout = updated.overrideTurnTimeoutMs ?? updated.turnTimeoutMs ?? 0;
        setRoomTimeoutSec(baseTimeout > 0 ? String(Math.floor(baseTimeout / 1000)) : '');
        const nextPer: Record<string, string> = {};
        if (updated.perPlayerTimeoutMs) {
          for (const [pid, ms] of Object.entries(updated.perPlayerTimeoutMs)) {
            if (ms > 0) {
              nextPer[pid] = String(Math.floor(ms / 1000));
            }
          }
        }
        setPerPlayerTimeoutSec(nextPer);
      }
    } catch {
      // ignore for now, owner will see отсутствие обновления
    }
  };

  if (!roomId) {
    return (
      <main className="p-4">
        <p>Комната не найдена.</p>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="p-4">
        <p>Загрузка комнаты…</p>
      </main>
    );
  }

  if (!room) {
    return (
      <main className="p-4">
        <p>Комната не найдена или удалена.</p>
        <button
          type="button"
          className="mt-3 rounded bg-gray-800 px-3 py-2 text-sm"
          onClick={() => navigate('/')}
        >
          В лобби
        </button>
      </main>
    );
  }

  const totalSlots = room.maxPlayers;
  const playerSlots = room.players;
  const freeSlots = Math.max(0, totalSlots - (room.players.length + room.bots.length));

  return (
    <main className="p-4 space-y-4">
      <header className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">Комната #{room.id}</h1>
          <p className="text-xs text-gray-400 mt-1">
            Режим: {room.mode === 'podkidnoy' ? 'Подкидной' : 'Переводной'} · Статус:{' '}
            {room.status === 'lobby' ? 'Лобби' : room.status === 'in_progress' ? 'Идёт игра' : 'Завершена'}
          </p>
        </div>
        <button
          type="button"
          onClick={handleLeave}
          className="rounded bg-gray-800 px-3 py-2 text-xs"
        >
          Выйти
        </button>
      </header>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Игроки</h2>
        <div className="space-y-2">
          {playerSlots.map((p) => (
            <PlayerSlot
              key={p.id}
              name={p.name}
              isOwner={p.isOwner}
              isCurrent={user?.id === p.id}
            />
          ))}
          {room.bots.map((b) => (
            <BotSlot
              key={b.id}
              name={b.name}
              difficulty={b.botProfile?.difficulty ?? 'normal'}
              isOwner={isOwner ?? false}
              inLobby={room.status === 'lobby'}
              onDifficultyChange={(difficulty) => handleBotDifficultyChange(b.id, difficulty)}
            />
          ))}
          {Array.from({ length: freeSlots }).map((_, idx) => (
            <PlayerSlot key={`free-${idx}`} />
          ))}
        </div>
      </section>

      <section>
        <InviteLink roomId={room.id} />
      </section>

      {isOwner && (
        <section className="space-y-2 rounded-md bg-emerald-900/40 p-3 text-xs">
          <h2 className="text-sm font-semibold text-emerald-50">Тайм-ауты хода</h2>
          <p className="text-[11px] text-emerald-200">
            Текущий эффективный тайм-аут: {room.turnTimeoutMs ? Math.floor(room.turnTimeoutMs / 1000) : 0} сек.
          </p>
          <div className="mt-2 grid gap-2">
            <label className="flex items-center gap-2">
              <span className="w-40 text-emerald-100">Общий тайм-аут комнаты (сек):</span>
              <input
                type="number"
                min={0}
                className="w-20 rounded bg-emerald-950 px-2 py-1 text-right text-emerald-50"
                aria-label="room-timeout-seconds"
                value={roomTimeoutSec}
                onChange={(e) => setRoomTimeoutSec(e.target.value)}
                placeholder="по умолчанию"
              />
            </label>
            <div className="mt-1 space-y-1">
              <p className="text-[11px] text-emerald-300">Персональные тайм-ауты (сек):</p>
              {[...room.players, ...room.bots].map((p) => (
                <label key={p.id} className="flex items-center gap-2">
                  <span className="w-40 truncate text-emerald-100">
                    {p.name}
                    {p.isBot ? ' (бот)' : ''}
                  </span>
                  <input
                    type="number"
                    min={0}
                    className="w-20 rounded bg-emerald-950 px-2 py-1 text-right text-emerald-50"
                    aria-label={`timeout-${p.id}`}
                    value={perPlayerTimeoutSec[p.id] ?? ''}
                    onChange={(e) =>
                      setPerPlayerTimeoutSec((prev) => ({
                        ...prev,
                        [p.id]: e.target.value,
                      }))
                    }
                    placeholder="по умолчанию"
                  />
                </label>
              ))}
            </div>
            <button
              type="button"
              onClick={handleSaveTimeouts}
              className="mt-2 w-full rounded bg-emerald-700 px-3 py-2 text-xs font-semibold text-emerald-50"
            >
              Сохранить тайм-ауты
            </button>
          </div>
        </section>
      )}

      <section className="pt-2">
        {isOwner && room.status === 'lobby' && (
          <button
            type="button"
            onClick={handleStart}
            className="w-full rounded bg-blue-600 px-3 py-2 text-sm"
          >
            Старт игры
          </button>
        )}
        {!isOwner && room.status === 'lobby' && (
          <p className="text-xs text-gray-400">Ожидаем старт от создателя комнаты…</p>
        )}
        {room.status === 'in_progress' && (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-green-400">Игра запущена.</p>
            <button
              type="button"
              onClick={() => navigate(`/room/${room.id}/game`)}
              className="w-full rounded bg-green-600 px-3 py-2 text-sm"
            >
              К столу
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

