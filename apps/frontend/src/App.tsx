import { Routes, Route, Link } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { LobbyPage } from './pages/LobbyPage';
import { RoomPage } from './pages/RoomPage';
import { GameTablePage } from './pages/GameTablePage';
import { ProfilePage } from './pages/ProfilePage';
import { CosmeticsPage } from './pages/CosmeticsPage';
import { AdminPage } from './pages/AdminPage';

function App() {
  const isAdmin = useAuthStore((s) => Boolean(s.user?.isAdmin));
  return (
    <div className="min-h-full bg-[var(--tg-theme-bg-color,#1c1c1e)] text-[var(--tg-theme-text-color,#fff)] flex flex-col">
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<LobbyPage />} />
          <Route path="/room/:roomId" element={<RoomPage />} />
          <Route path="/room/:roomId/game" element={<GameTablePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/cosmetics" element={<CosmeticsPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </div>
      <nav className="h-12 flex items-center justify-around border-t border-gray-800 bg-[var(--tg-theme-bg-color,#1c1c1e)] text-xs">
        <Link to="/" className="flex flex-col items-center justify-center gap-0.5">
          <span>🏠</span>
          <span>Лобби</span>
        </Link>
        <Link to="/profile" className="flex flex-col items-center justify-center gap-0.5">
          <span>👤</span>
          <span>Профиль</span>
        </Link>
        <Link to="/cosmetics" className="flex flex-col items-center justify-center gap-0.5">
          <span>🛍️</span>
          <span>Магазин</span>
        </Link>
        {isAdmin && (
          <Link to="/admin" className="flex flex-col items-center justify-center gap-0.5">
            <span>🛠️</span>
            <span>Админка</span>
          </Link>
        )}
      </nav>
    </div>
  );
}

export default App;
