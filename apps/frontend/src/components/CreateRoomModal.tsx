import { useState } from 'react';
import type { BotDifficulty } from '../api/rooms';

export interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (params: {
    mode: 'podkidnoy' | 'perevodnoy';
    maxPlayers: number;
    bots: number;
    botDifficulties: BotDifficulty[];
    isPrivate: boolean;
  }) => Promise<void>;
}

const DIFFICULTIES: BotDifficulty[] = ['easy', 'normal', 'hard'];

export function CreateRoomModal({ isOpen, onClose, onCreate }: CreateRoomModalProps) {
  const [mode, setMode] = useState<'podkidnoy' | 'perevodnoy'>('podkidnoy');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [bots, setBots] = useState(0);
  const [botDifficulties, setBotDifficulties] = useState<BotDifficulty[]>([]);
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);

  const setBotsWithDefaults = (n: number) => {
    setBots(n);
    if (n > 0) {
      setBotDifficulties(
        Array.from({ length: n }, (_, i) => DIFFICULTIES[i % DIFFICULTIES.length]),
      );
    } else {
      setBotDifficulties([]);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      await onCreate({
        mode,
        maxPlayers,
        bots,
        botDifficulties: bots > 0 ? botDifficulties.slice(0, bots) : [],
        isPrivate,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-xl bg-gray-900 p-4">
        <h2 className="text-lg font-semibold mb-3">Создать комнату</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm mb-1">Режим</label>
            <div className="flex gap-2">
              <button
                type="button"
                className={`flex-1 rounded px-3 py-2 text-sm ${mode === 'podkidnoy' ? 'bg-blue-600' : 'bg-gray-800'}`}
                onClick={() => setMode('podkidnoy')}
              >
                Подкидной
              </button>
              <button
                type="button"
                className={`flex-1 rounded px-3 py-2 text-sm ${mode === 'perevodnoy' ? 'bg-blue-600' : 'bg-gray-800'}`}
                onClick={() => setMode('perevodnoy')}
              >
                Переводной
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="create-room-max-players" className="block text-sm mb-1">Игроков (2–6)</label>
            <input
              id="create-room-max-players"
              type="number"
              min={2}
              max={6}
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value) || 2)}
              className="w-full rounded bg-gray-800 px-3 py-2 text-sm outline-none"
            />
          </div>
          <div>
            <label htmlFor="create-room-bots" className="block text-sm mb-1">Ботов</label>
            <input
              id="create-room-bots"
              type="number"
              min={0}
              max={5}
              value={bots}
              onChange={(e) => setBotsWithDefaults(Number(e.target.value) || 0)}
              className="w-full rounded bg-gray-800 px-3 py-2 text-sm outline-none"
            />
            {bots > 0 && (
              <div className="mt-2 space-y-1">
                <span className="text-xs text-gray-400">Сложность по порядку:</span>
                {Array.from({ length: bots }).map((_, i) => (
                  <label key={i} className="flex items-center gap-2 text-sm">
                    <span className="w-16 text-gray-300">Бот {i + 1}:</span>
                    <select
                      value={botDifficulties[i] ?? 'normal'}
                      onChange={(e) =>
                        setBotDifficulties((prev) => {
                          const next = [...prev];
                          next[i] = e.target.value as BotDifficulty;
                          return next;
                        })
                      }
                      className="rounded bg-gray-800 px-2 py-1 text-sm"
                      aria-label={`bot-${i}-difficulty`}
                    >
                      {DIFFICULTIES.map((d) => (
                        <option key={d} value={d}>
                          {d === 'easy' ? 'Лёгкий' : d === 'normal' ? 'Нормальный' : 'Сложный'}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="h-4 w-4"
            />
            Приватная комната
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded px-3 py-2 text-sm bg-gray-800"
              disabled={loading}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="rounded px-3 py-2 text-sm bg-blue-600 disabled:opacity-60"
              disabled={loading}
            >
              {loading ? 'Создание...' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

