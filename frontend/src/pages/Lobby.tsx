import { useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { showBackButton, shareRoomLink, hapticNotification } from '../lib/telegram';
import { getSocket } from '../lib/socket';
import { useRoomStore, Room } from '../store/roomStore';
import { useAuthStore } from '../store/authStore';

export default function Lobby() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { room, setRoom, clearRoom } = useRoomStore();
  const { user } = useAuthStore();
  const joined = useRef(false);

  useEffect(() => {
    showBackButton(() => {
      getSocket().emit('room:leave');
      clearRoom();
      navigate('/home');
    });

    const socket = getSocket();

    if (!joined.current) {
      joined.current = true;
      socket.emit('room:join', roomId, (res: { room?: Room; error?: string }) => {
        if (res.room) setRoom(res.room);
      });
    }

    socket.on('room:updated', (r: Room) => setRoom(r));
    socket.on('game:started', () => navigate(`/game/${roomId}`, { replace: true }));

    return () => {
      socket.off('room:updated');
      socket.off('game:started');
    };
  }, [roomId, navigate, setRoom, clearRoom]);

  const isCreator = room?.createdBy === String(user?.id);
  const totalSlots = (room?.maxPlayers ?? 0);
  const humanSlots = totalSlots - (room?.botCount ?? 0);
  const canStart = (room?.players.length ?? 0) + (room?.botCount ?? 0) >= 2 && isCreator;

  const handleStart = () => {
    getSocket().emit('game:start', (res: { ok?: boolean; error?: string }) => {
      if (res.error) alert(res.error);
    });
  };

  const handleInvite = () => {
    if (room?.inviteLink) {
      shareRoomLink(room.inviteLink);
      hapticNotification('success');
    }
  };

  if (!room) {
    return (
      <div className="flex items-center justify-center h-full bg-felt-texture">
        <div className="text-white text-lg">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-felt-texture safe-top safe-bottom overflow-y-auto no-scrollbar">
      <div className="px-4 py-6">
        <div className="text-center mb-6">
          <h1 className="text-white text-2xl font-bold">Комната #{room.id}</h1>
          <p className="text-green-200 text-sm mt-1">
            {room.gameType === 'classic' ? '🃏 Подкидной Дурак' : '🔄 Переводной Дурак'}
          </p>
        </div>

        {/* Players list */}
        <div className="bg-white/10 rounded-2xl p-4 mb-4">
          <h2 className="text-green-200 text-sm font-medium mb-3">
            Игроки ({room.players.length}/{humanSlots})
          </h2>
          <div className="flex flex-col gap-2">
            {room.players.map((p) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3"
              >
                {p.photoUrl ? (
                  <img src={p.photoUrl} alt="" className="w-9 h-9 rounded-full border border-white/30" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-bold">
                    {p.name[0]}
                  </div>
                )}
                <span className="text-white font-medium flex-1">{p.name}</span>
                {p.id === room.createdBy && (
                  <span className="text-yellow-300 text-xs bg-yellow-400/20 px-2 py-0.5 rounded-full">Хост</span>
                )}
                {p.id === String(user?.id) && (
                  <span className="text-green-300 text-xs">Вы</span>
                )}
              </motion.div>
            ))}

            {/* Empty slots */}
            {Array.from({ length: Math.max(0, humanSlots - room.players.length) }).map((_, i) => (
              <div key={`empty-${i}`} className="flex items-center gap-3 opacity-40">
                <div className="w-9 h-9 rounded-full border-2 border-dashed border-white/40" />
                <span className="text-white/60 text-sm">Ожидание игрока...</span>
              </div>
            ))}

            {/* Bot slots */}
            {Array.from({ length: room.botCount }).map((_, i) => (
              <div key={`bot-${i}`} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-500/30 flex items-center justify-center text-xl">🤖</div>
                <span className="text-blue-200 font-medium">Бот {i + 1}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Invite button */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleInvite}
          className="w-full py-3 mb-3 bg-white/20 text-white rounded-xl font-semibold border border-white/30"
        >
          📨 Пригласить друзей
        </motion.button>

        {/* Invite link display */}
        {room.inviteLink && (
          <div className="bg-white/10 rounded-xl px-4 py-2 mb-4 flex items-center gap-2">
            <span className="text-green-200 text-xs flex-1 truncate font-mono">{room.inviteLink}</span>
          </div>
        )}

        {/* Start button */}
        {isCreator && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleStart}
            disabled={!canStart}
            className="w-full py-4 bg-white text-green-800 rounded-2xl font-bold text-lg shadow-lg disabled:opacity-40"
          >
            {canStart ? '🚀 Начать игру!' : `Ждём игроков (нужно ≥2)`}
          </motion.button>
        )}

        {!isCreator && (
          <div className="text-center text-green-200 text-sm mt-4 opacity-75">
            Ожидаем, когда хост начнёт игру...
          </div>
        )}
      </div>
    </div>
  );
}
