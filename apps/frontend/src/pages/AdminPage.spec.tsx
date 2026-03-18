import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { AdminPage } from './AdminPage';
import * as profileApi from '../api/profile';

const mockUseAuthStore = vi.fn();

vi.mock('../store/authStore', () => ({
  useAuthStore: (selector: (s: { accessToken: string | null; user: { id: string; telegramId: number; isAdmin?: boolean } | null }) => unknown) =>
    selector(mockUseAuthStore()),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AdminPage', () => {
  it('denies access for non-admin / unauthenticated user', () => {
    mockUseAuthStore.mockReturnValue({ accessToken: null, user: null });
    renderPage();
    expect(screen.getByText('Админ-панель')).toBeInTheDocument();
    expect(screen.getByText('Доступ запрещён.')).toBeInTheDocument();
  });

  it('renders admin cosmetics section for admin user when profile isAdmin=true', async () => {
    mockUseAuthStore.mockReturnValue({ accessToken: 'token', user: { id: 'u1', telegramId: 123, isAdmin: true } });
    vi.spyOn(profileApi, 'fetchMyProfile').mockResolvedValueOnce({
      profile: { userId: 'u1', displayName: 'Admin User', joinedAt: new Date().toISOString(), isAdmin: true },
      stats: {
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winRate: 0,
        currentWinStreak: 0,
        bestWinStreak: 0,
        averageMatchDurationMs: 0,
        totalMatchDurationMs: 0,
        favoriteMode: null,
      },
      achievements: [],
      season: null,
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByLabelText('Админ: косметика')).toBeInTheDocument();
    });
  });
});

