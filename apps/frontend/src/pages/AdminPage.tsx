import { useAuthStore } from '../store/authStore';
import { fetchMyProfile, type PlayerProfileWithStatsDto } from '../api/profile';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminCosmeticsSection } from '../components/AdminCosmeticsSection';
import { AdminOffersSection } from '../components/AdminOffersSection';
import { AdminSeasonsSection } from '../components/AdminSeasonsSection';
import { AdminStatsSection } from '../components/AdminStatsSection';
import { AdminEconomySection } from '../components/AdminEconomySection';
import { AdminAuditLogSection } from '../components/AdminAuditLogSection';

export function AdminPage() {
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.accessToken);
  const [profile, setProfile] = useState<PlayerProfileWithStatsDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!token) {
      setLoading(false);
      return;
    }
    fetchMyProfile(token)
      .then((res) => {
        if (!active) return;
        setProfile(res);
      })
      .catch(() => {
        if (!active) return;
        setProfile(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  const isAdmin = !!profile?.profile.isAdmin;

  if (loading) {
    return (
      <div className="p-4 text-sm flex items-center justify-center min-h-screen">
        <p className="text-gray-300">Проверка прав доступа…</p>
      </div>
    );
  }

  if (!token || !isAdmin) {
    return (
      <div className="p-4 text-sm flex flex-col gap-3 items-start min-h-screen">
        <h1 className="text-lg font-semibold mb-2">Админ-панель</h1>
        <p>Доступ запрещён.</p>
        <button
          type="button"
          className="rounded bg-gray-800 px-3 py-1 text-xs"
          onClick={() => navigate('/')}
        >
          В лобби
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 text-sm space-y-3">
      <h1 className="text-lg font-semibold mb-1">Админ-панель</h1>
      <p className="text-gray-300 text-xs">
        Управление магазином, сезонами, косметикой, экономикой и статистикой. Эти настройки не
        влияют на баланс игры, только на экономику и внешний вид.
      </p>
      <AdminCosmeticsSection />
      <AdminOffersSection />
      <AdminSeasonsSection />
      <AdminStatsSection />
      <AdminEconomySection />
      <AdminAuditLogSection />
    </div>
  );
}

