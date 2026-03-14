import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProfilePage } from './ProfilePage';

vi.mock('../api/profile', () => {
  return {
    fetchMyProfile: vi.fn(async () => ({
      profile: {
        userId: 'u1',
        displayName: 'Test User',
        avatarUrl: null,
        joinedAt: '2024-01-01T00:00:00.000Z',
      },
      stats: {
        matchesPlayed: 10,
        wins: 6,
        losses: 4,
        draws: 0,
        winRate: 0.6,
        currentWinStreak: 2,
        bestWinStreak: 4,
        averageMatchDurationMs: 120_000,
        totalMatchDurationMs: 1_200_000,
        favoriteMode: 'podkidnoy',
        perModeTotals: {
          podkidnoy: { matchesPlayed: 7, wins: 5, losses: 2, draws: 0 },
          perevodnoy: { matchesPlayed: 3, wins: 1, losses: 2, draws: 0 },
        },
      },
      achievements: [
        {
          code: 'first_win',
          name: 'Первая победа',
          description: 'Выиграйте хотя бы один матч.',
          icon: '🏆',
          unlockedAt: '2024-01-10T00:00:00.000Z',
          currentValue: 1,
          targetValue: 1,
        },
        {
          code: 'matches_10',
          name: '10 матчей',
          description: 'Сыграйте 10 матчей в любых режимах.',
          icon: '📈',
          unlockedAt: null,
          currentValue: 7,
          targetValue: 10,
        },
      ],
    })),
  };
});

vi.mock('../store/authStore', () => {
  return {
    useAuthStore: (selector: (s: { accessToken: string | null }) => unknown) =>
      selector({ accessToken: 'token' }),
  };
});

describe('ProfilePage', () => {
  it('renders profile, stats cards and achievements preview', async () => {
    render(
      <MemoryRouter initialEntries={['/profile']}>
        <Routes>
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Профиль/)).toBeInTheDocument();
    expect(await screen.findByText('Test User')).toBeInTheDocument();
    expect(screen.getAllByText(/Матчей/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Победы/)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId('achievements-strip')).toBeInTheDocument();
      expect(screen.getByTestId('achievements-list')).toBeInTheDocument();
      expect(screen.getAllByText(/Первая победа/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/10 матчей/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/7\/10/).length).toBeGreaterThan(0);
    });
  });

  it('shows loading state', async () => {
    render(
      <MemoryRouter initialEntries={['/profile']}>
        <Routes>
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText(/Загрузка профиля/)).toBeInTheDocument();
    await screen.findByText('Test User');
  });
});

