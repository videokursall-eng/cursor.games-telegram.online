import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import type { SeasonWithTrackDto } from 'shared';
import { SeasonRewards } from './SeasonRewards';

const mockSeason: SeasonWithTrackDto = {
  progress: {
    userId: 'u1',
    seasonId: 's1',
    level: 3,
    currentXp: 250,
    xpToNextLevel: 50,
    claimedRewardIds: ['r1'],
    updatedAt: new Date(0).toISOString(),
  },
  rewardTrack: [
    {
      level: 1,
      rewardType: 'soft',
      softAmount: 100,
      cosmeticCode: undefined,
      badgeCode: undefined,
      claimed: true,
      claimable: false,
    },
    {
      level: 2,
      rewardType: 'cosmetic',
      softAmount: undefined,
      cosmeticCode: 'card_back_red',
      badgeCode: undefined,
      claimed: false,
      claimable: true,
    },
    {
      level: 5,
      rewardType: 'badge',
      softAmount: undefined,
      cosmeticCode: undefined,
      badgeCode: 'first_win',
      badge: {
        code: 'first_win',
        title: 'Первая победа',
        description: 'Бейдж за первую победу',
        icon: null,
        rarity: 'common',
      },
      claimed: false,
      claimable: false,
    },
  ],
};

const mockFetchMySeason = vi.fn().mockResolvedValue(mockSeason);
const mockClaimSeasonReward = vi.fn().mockResolvedValue(mockSeason);

vi.mock('../store/authStore', () => ({
  useAuthStore: (selector: (s: { accessToken: string | null }) => unknown) =>
    selector({ accessToken: 'test-token' }),
}));

vi.mock('../api/season', () => ({
  fetchMySeason: (token: string | null) => mockFetchMySeason(token),
  claimSeasonReward: (level: number, token: string | null) =>
    mockClaimSeasonReward(level, token),
}));

function renderComponent() {
  return render(
    <MemoryRouter>
      <SeasonRewards />
    </MemoryRouter>,
  );
}

describe('SeasonRewards', () => {
  beforeEach(() => {
    mockFetchMySeason.mockClear();
    mockClaimSeasonReward.mockClear();
  });

  it('renders reward track from API', async () => {
    renderComponent();
    await waitFor(() => {
      expect(mockFetchMySeason).toHaveBeenCalled();
    });

    expect(await screen.findByTestId('season-reward-track')).toBeInTheDocument();
    expect(screen.getByText('Уровень 1 · Получено')).toBeInTheDocument();
    expect(screen.getByText(/Косметика:/)).toBeInTheDocument();
    expect(screen.getByText(/Бейдж:/)).toBeInTheDocument();
  });

  it('shows claim button for claimable rewards and calls API', async () => {
    renderComponent();
    const claimButton = await screen.findByText('Забрать');
    fireEvent.click(claimButton);

    await waitFor(() => {
      expect(mockClaimSeasonReward).toHaveBeenCalledWith(2, 'test-token');
    });
  });

  it('does not show claim button for locked rewards', async () => {
    renderComponent();
    await screen.findByTestId('season-reward-track');

    // Only one claimable reward (level 2) should have button
    const buttons = screen.getAllByRole('button', { name: /Забрать|Забираем…/ });
    expect(buttons.length).toBe(1);
  });
});

