import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { AdminStatsSection } from './AdminStatsSection';
import type { AdminStatsOverview } from '../api/adminStats';

vi.mock('../store/authStore', () => ({
  useAuthStore: (selector: (s: { accessToken: string | null }) => unknown) =>
    selector({ accessToken: 'test-token' }),
}));

const fetchAdminStatsOverview = vi.fn();

vi.mock('../api/adminStats', () => ({
  fetchAdminStatsOverview: (...args: unknown[]) => fetchAdminStatsOverview(...args),
}));

function renderSection() {
  return render(
    <MemoryRouter>
      <AdminStatsSection />
    </MemoryRouter>,
  );
}

const mockOverview: AdminStatsOverview = {
  matchesTotal: 42,
  matchesByMode: [
    { mode: 'PODKIDNOY', count: 30 },
    { mode: 'PEREVODNOY', count: 12 },
  ],
  dau: 10,
  mau: 50,
  purchasesTotal: 7,
  topCosmetics: [
    { itemId: 'avatar_hat_red', purchases: 3 },
    { itemId: 'frame_gold', purchases: 2 },
  ],
  activePlayers: 15,
  newPlayersLast7d: 5,
  seasonClaims: [{ seasonId: 'season-1', claims: 4 }],
};

describe('AdminStatsSection', () => {
  beforeEach(() => {
    fetchAdminStatsOverview.mockReset();
  });

  it('loads and renders overview stats', async () => {
    fetchAdminStatsOverview.mockResolvedValue(mockOverview);
    renderSection();

    await waitFor(() => expect(fetchAdminStatsOverview).toHaveBeenCalled());

    expect(await screen.findByText('Statistics')).toBeInTheDocument();
    expect(screen.getByText('Всего матчей')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('DAU')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('shows error state when API fails', async () => {
    fetchAdminStatsOverview.mockRejectedValue(new Error('fail'));
    renderSection();

    await waitFor(() =>
      expect(fetchAdminStatsOverview).toHaveBeenCalled(),
    );

    expect(
      await screen.findByText('Не удалось загрузить статистику.'),
    ).toBeInTheDocument();
  });
});

