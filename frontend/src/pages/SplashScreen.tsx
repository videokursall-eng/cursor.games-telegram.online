import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import { getInitData, getTelegramUser, getStartParam, initTelegram } from '../lib/telegram';
import { initSocket } from '../lib/socket';
import { useAuthStore } from '../store/authStore';

export default function SplashScreen() {
  const navigate = useNavigate();
  const { setAuth, setError } = useAuthStore();

  useEffect(() => {
    initTelegram();
    authenticate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const authenticate = async () => {
    try {
      const initData = getInitData();
      const result = await api.auth.verify(initData);

      setAuth(
        result.user,
        initData,
        result.botUsername,
        result.appName,
        result.startParam,
      );

      initSocket(initData);

      // If started with a room param, go directly to lobby
      const startParam = result.startParam ?? getStartParam();
      if (startParam) {
        navigate(`/lobby/${startParam}`, { replace: true });
      } else {
        navigate('/home', { replace: true });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Auth failed';
      setError(msg);
    }
  };

  const { error } = useAuthStore();

  return (
    <div className="flex flex-col items-center justify-center h-full bg-felt-texture">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="flex flex-col items-center gap-6"
      >
        {/* Cards logo */}
        <div className="relative w-24 h-24">
          {['♠', '♥', '♦', '♣'].map((suit, i) => (
            <motion.div
              key={suit}
              initial={{ rotate: 0, x: 0, y: 0 }}
              animate={{
                rotate: (i - 1.5) * 15,
                x: (i - 1.5) * 8,
                y: i === 0 || i === 3 ? 4 : -4,
              }}
              transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
              className="absolute inset-0 card-face flex items-center justify-center text-3xl font-bold rounded-xl"
              style={{
                color: suit === '♥' || suit === '♦' ? '#dc2626' : '#1a1a1a',
                zIndex: i,
              }}
            >
              {suit}
            </motion.div>
          ))}
        </div>

        <div className="text-center">
          <h1 className="text-white text-3xl font-bold tracking-tight">Дурак</h1>
          <p className="text-green-200 text-sm mt-1 opacity-75">Карточные игры</p>
        </div>

        {!error ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 border-2 border-white border-t-transparent rounded-full"
          />
        ) : (
          <div className="text-center px-6">
            <p className="text-red-300 text-sm">{error}</p>
            <button
              onClick={() => { setError(''); authenticate(); }}
              className="mt-3 px-4 py-2 bg-white/20 text-white rounded-lg text-sm"
            >
              Попробовать снова
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
