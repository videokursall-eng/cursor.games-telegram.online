import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { hideBackButton } from '../lib/telegram';
import { useAuthStore } from '../store/authStore';

const GAMES = [
  {
    type: 'classic' as const,
    title: 'Подкидной Дурак',
    description: 'Классические правила. Нападай, отбивайся, не оставайся с картами!',
    emoji: '🃏',
    color: 'from-green-700 to-green-900',
  },
  {
    type: 'transfer' as const,
    title: 'Переводной Дурак',
    description: 'Можно переводить атаку следующему игроку той же картой.',
    emoji: '🔄',
    color: 'from-emerald-700 to-emerald-900',
  },
];

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  useEffect(() => {
    hideBackButton();
  }, []);

  return (
    <div className="flex flex-col h-full bg-felt-texture safe-top safe-bottom overflow-y-auto no-scrollbar">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        {user?.photo_url ? (
          <img src={user.photo_url} alt="" className="w-10 h-10 rounded-full border-2 border-white/30" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg">
            {user?.first_name?.[0] ?? '?'}
          </div>
        )}
        <div>
          <div className="text-white font-semibold text-base leading-tight">
            {user?.first_name} {user?.last_name}
          </div>
          {user?.username && (
            <div className="text-green-200 text-xs opacity-75">@{user.username}</div>
          )}
        </div>
      </div>

      {/* Title */}
      <div className="px-4 py-4 text-center">
        <h1 className="text-white text-2xl font-bold">Выберите игру</h1>
        <p className="text-green-200 text-sm mt-1 opacity-75">2–6 игроков, боты поддерживаются</p>
      </div>

      {/* Game cards */}
      <div className="px-4 flex flex-col gap-4 pb-6">
        {GAMES.map((game, i) => (
          <motion.button
            key={game.type}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.15 }}
            onClick={() => navigate(`/create?type=${game.type}`)}
            className={`bg-gradient-to-br ${game.color} rounded-2xl p-5 text-left shadow-xl border border-white/10 active:scale-95 transition-transform`}
          >
            <div className="flex items-start gap-4">
              <span className="text-5xl">{game.emoji}</span>
              <div className="flex-1">
                <h2 className="text-white text-xl font-bold leading-tight">{game.title}</h2>
                <p className="text-green-100 text-sm mt-1 opacity-80 leading-relaxed">{game.description}</p>
                <div className="mt-3 inline-flex items-center gap-1 bg-white/20 rounded-full px-3 py-1 text-white text-sm font-medium">
                  Создать комнату →
                </div>
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
