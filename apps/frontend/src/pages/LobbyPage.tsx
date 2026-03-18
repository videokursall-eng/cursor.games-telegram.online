import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useTelegramContext } from '../telegram';
import { CreateRoomModal } from '../components/CreateRoomModal';
import { fetchRooms, joinRoom, type RoomDto } from '../api/rooms';

export function LobbyPage() {
  const navigate = useNavigate();
  const { authAttempted, user, accessToken } = useAuthStore();
  const { isTelegram } = useTelegramContext();
  const [rooms, setRooms] = useState<RoomDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [joinInput, setJoinInput] = useState('');

  const loadRooms = () => {
    setLoading(true);
    fetchRooms(accessToken ?? null)
      .then((data) => {
        setRooms(data);
        setError(null);
      })
      .catch((e: Error) => {
        setError(e.message || 'Ошибка загрузки комнат');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!authAttempted || !accessToken) return;
    loadRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authAttempted, accessToken]);

  useEffect(() => {
    if (!isTelegram) return;
    const tw = window.Telegram?.WebApp as unknown as { initDataUnsafe?: { start_param?: string } } | undefined;
    const start = tw?.initDataUnsafe?.start_param;
    if (start && start.startsWith('room_')) {
      const id = start.replace('room_', '');
      handleJoinById(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTelegram, accessToken]);

  const handleCreateRoom = async (params: {
    mode: 'podkidnoy' | 'perevodnoy';
    maxPlayers: number;
    bots: number;
    botDifficulties: import('../api/rooms').BotDifficulty[];
    isPrivate: boolean;
  }) => {
    const res = await (await import('../api/rooms')).createRoom(
      {
        mode: params.mode,
        maxPlayers: params.maxPlayers,
        isPrivate: params.isPrivate,
        bots: params.bots,
        botDifficulties: params.botDifficulties.length > 0 ? params.botDifficulties : undefined,
      },
      accessToken ?? null,
    );
    setRooms((prev) => [res, ...prev]);
    navigate(`/room/${res.id}`);
  };

  const handleJoinById = async (id: string) => {
    try {
      const res = await joinRoom(id, accessToken ?? null);
      navigate(`/room/${res.id}`);
    } catch {
      // ignore; можно показать тост позже
    }
  };

  const handleJoinByLink = async () => {
    const value = joinInput.trim();
    if (!value) return;
    let id = value;
    if (value.startsWith('room_')) {
      id = value.replace('room_', '');
    }
    await handleJoinById(id);
  };

  return (
    <main className="p-4 min-h-full space-y-4">
      <header>
        <h1 className="text-xl font-bold">Дурак</h1>
        {authAttempted && user && (
          <p className="text-[var(--tg-theme-hint-color,#98989d)] mt-1 text-xs">
            Вы вошли (ID: {user.telegramId})
          </p>
        )}
      </header>

      {!authAttempted && <p className="text-[var(--tg-theme-hint-color)] text-sm">Авторизация…</p>}
      {authAttempted && isTelegram && !accessToken && (
        <p className="text-[var(--tg-theme-hint-color)] text-sm">
          Не удалось войти. Откройте приложение из Telegram.
        </p>
      )}
      {authAttempted && !isTelegram && (
        <p className="text-[var(--tg-theme-hint-color)] text-sm">Откройте в Telegram для входа.</p>
      )}

      {authAttempted && accessToken && (
        <>
          <section className="space-y-3">
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="w-full rounded bg-blue-600 px-3 py-2 text-sm"
            >
              Создать комнату
            </button>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="room_<id> или id комнаты"
                value={joinInput}
                onChange={(e) => setJoinInput(e.target.value)}
                className="flex-1 rounded bg-gray-900 px-3 py-2 text-xs outline-none"
              />
              <button
                type="button"
                onClick={handleJoinByLink}
                className="rounded bg-gray-800 px-3 py-2 text-xs"
              >
                Войти по ссылке
              </button>
            </div>
          </section>

          <section className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Доступные комнаты</h2>
              <button
                type="button"
                onClick={loadRooms}
                className="text-[11px] text-blue-400"
              >
                Обновить
              </button>
            </div>
            {loading && <p className="text-xs text-gray-400">Загрузка…</p>}
            {error && (
              <p className="text-xs text-red-400">
                {error}
              </p>
            )}
            {!loading && !rooms.length && (
              <p className="text-xs text-gray-500">Комнат пока нет. Создайте первую!</p>
            )}
            <div className="space-y-2">
              {rooms.map((room) => (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => handleJoinById(room.id)}
                  className="w-full rounded border border-gray-800 px-3 py-2 text-left text-xs"
                >
                  <div className="flex justify-between">
                    <span className="font-semibold">
                      Комната #{room.id}
                    </span>
                    <span className="text-gray-400">
                      {room.players.length + room.bots.length}/{room.maxPlayers}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-gray-400">
                    {room.mode === 'podkidnoy' ? 'Подкидной' : 'Переводной'}
                    {room.isPrivate && ' · приватная'}
                  </div>
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      <CreateRoomModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreate={handleCreateRoom}
      />
    </main>
  );
}
