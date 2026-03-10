import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { showBackButton } from '../lib/telegram';
import { getSocket } from '../lib/socket';
import { useRoomStore } from '../store/roomStore';
import { useAuthStore } from '../store/authStore';

export default function CreateRoom() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user } = useAuthStore();
  const { setRoom } = useRoomStore();

  const defaultType = (params.get('type') as 'classic' | 'transfer') || 'classic';
  const [gameType, setGameType] = useState<'classic' | 'transfer'>(defaultType);
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [botCount, setBotCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    showBackButton(() => navigate('/home'));
  }, [navigate]);

  const humanSlots = maxPlayers - botCount;

  const handleCreate = () => {
    setLoading(true);
    setError('');
    const socket = getSocket();
    socket.emit('room:create', { gameType, maxPlayers, botCount }, (res: { room?: { id: string }; error?: string }) => {
      setLoading(false);
      if (res.error) { setError(res.error); return; }
      if (res.room) {
        setRoom(res.room as Parameters<typeof setRoom>[0]);
        navigate(`/lobby/${res.room.id}`);
      }
    });
  };

  return (
    <div className="flex flex-col h-full bg-felt-texture safe-top safe-bottom overflow-y-auto no-scrollbar">
      <div className="px-4 py-6">
        <h1 className="text-white text-2xl font-bold text-center mb-6">Новая комната</h1>

        {/* Game type */}
        <div className="mb-6">
          <label className="text-green-200 text-sm font-medium mb-2 block">Тип игры</label>
          <div className="flex gap-2">
            {(['classic', 'transfer'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setGameType(t)}
                className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${
                  gameType === t
                    ? 'bg-white text-green-800 shadow-lg'
                    : 'bg-white/20 text-white'
                }`}
              >
                {t === 'classic' ? '🃏 Подкидной' : '🔄 Переводной'}
              </button>
            ))}
          </div>
        </div>

        {/* Max players */}
        <div className="mb-6">
          <label className="text-green-200 text-sm font-medium mb-2 block">
            Всего мест: <span className="text-white font-bold">{maxPlayers}</span>
          </label>
          <input
            type="range" min={2} max={6} value={maxPlayers}
            onChange={(e) => {
              const v = Number(e.target.value);
              setMaxPlayers(v);
              if (botCount > v - 1) setBotCount(v - 1);
            }}
            className="w-full accent-white"
          />
          <div className="flex justify-between text-green-200 text-xs mt-1">
            <span>2</span><span>3</span><span>4</span><span>5</span><span>6</span>
          </div>
        </div>

        {/* Bot count */}
        <div className="mb-8">
          <label className="text-green-200 text-sm font-medium mb-2 block">
            Боты: <span className="text-white font-bold">{botCount}</span>
            <span className="text-green-200 ml-2 opacity-70">(людей: {humanSlots})</span>
          </label>
          <input
            type="range" min={0} max={maxPlayers - 1} value={botCount}
            onChange={(e) => setBotCount(Number(e.target.value))}
            className="w-full accent-white"
          />
          <div className="flex justify-between text-green-200 text-xs mt-1">
            {Array.from({ length: maxPlayers }, (_, i) => <span key={i}>{i}</span>)}
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white/10 rounded-xl p-4 mb-6">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-green-200">Игра:</div>
            <div className="text-white font-medium">{gameType === 'classic' ? 'Подкидной' : 'Переводной'}</div>
            <div className="text-green-200">Игроки:</div>
            <div className="text-white font-medium">👤 ×{humanSlots} + 🤖 ×{botCount}</div>
          </div>
        </div>

        {error && <p className="text-red-300 text-sm text-center mb-4">{error}</p>}

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleCreate}
          disabled={loading || !user}
          className="w-full py-4 bg-white text-green-800 rounded-2xl font-bold text-lg shadow-lg disabled:opacity-50"
        >
          {loading ? '⏳ Создаём...' : '🎮 Создать комнату'}
        </motion.button>
      </div>
    </div>
  );
}
