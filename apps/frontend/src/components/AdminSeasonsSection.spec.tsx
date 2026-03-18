import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { AdminSeasonsSection } from './AdminSeasonsSection';
import type { AdminSeasonDto, AdminSeasonRewardDto } from '../api/adminSeason';
import type { CosmeticItemDto } from 'shared';

vi.mock('../store/authStore', () => ({
  useAuthStore: (selector: (s: { accessToken: string | null }) => unknown) =>
    selector({ accessToken: 'test-token' }),
}));

const mockSeasons: AdminSeasonDto[] = [
  {
    id: 's1',
    code: 'season_1',
    name: 'Season 1',
    startsAt: new Date().toISOString(),
    endsAt: null,
    isActive: true,
  },
  {
    id: 's2',
    code: 'season_2',
    name: 'Season 2',
    startsAt: new Date().toISOString(),
    endsAt: null,
    isActive: false,
  },
];

const mockRewards: AdminSeasonRewardDto[] = [
  {
    id: 'r1',
    level: 1,
    rewardType: 'soft',
    amountSoft: 100,
    cosmeticItemId: null,
    badgeId: null,
    badge: null,
  },
  {
    id: 'r2',
    level: 2,
    rewardType: 'cosmetic',
    amountSoft: null,
    cosmeticItemId: 'card_back_red',
    badgeId: null,
    badge: null,
  },
];

const mockCatalog: CosmeticItemDto[] = [
  {
    id: 'card_back_red',
    key: 'card_back_red',
    name: 'Красная рубашка',
    description: 'desc',
    slot: 'card_back',
    rarity: 'common',
    iconUrl: null,
    priceSoft: 200,
    priceStars: null,
    isExclusive: false,
    isLimited: false,
    seasonId: null,
  },
];

const fetchAdminSeasonsFull = vi.fn().mockResolvedValue(mockSeasons);
const createAdminSeason = vi.fn();
const updateAdminSeason = vi.fn().mockResolvedValue({
  ...mockSeasons[1],
  isActive: true,
} satisfies AdminSeasonDto);
const fetchSeasonRewards = vi.fn().mockResolvedValue(mockRewards);
const createSeasonReward = vi.fn();
const updateSeasonReward = vi.fn();
const deleteSeasonReward = vi.fn().mockResolvedValue({ success: true });
const fetchCosmeticsCatalog = vi.fn().mockResolvedValue(mockCatalog);
const fetchAdminBadges = vi.fn().mockResolvedValue([
  {
    id: 'badge_1',
    code: 'first_win',
    title: 'Первая победа',
    description: 'Бейдж за первую победу',
    icon: null,
    rarity: 'common',
  },
]);

vi.mock('../api/adminSeason', () => ({
  fetchAdminSeasonsFull: (...args: unknown[]) => fetchAdminSeasonsFull(...args),
  createAdminSeason: (...args: unknown[]) => createAdminSeason(...args),
  updateAdminSeason: (...args: unknown[]) => updateAdminSeason(...args),
  fetchSeasonRewards: (...args: unknown[]) => fetchSeasonRewards(...args),
  createSeasonReward: (...args: unknown[]) => createSeasonReward(...args),
  updateSeasonReward: (...args: unknown[]) => updateSeasonReward(...args),
  deleteSeasonReward: (...args: unknown[]) => deleteSeasonReward(...args),
}));

vi.mock('../api/cosmetics', () => ({
  fetchCosmeticsCatalog: (...args: unknown[]) => fetchCosmeticsCatalog(...args),
}));

vi.mock('../api/adminBadges', () => ({
  fetchAdminBadges: (...args: unknown[]) => fetchAdminBadges(...args),
}));

function renderSection() {
  return render(
    <MemoryRouter>
      <AdminSeasonsSection />
    </MemoryRouter>,
  );
}

describe('AdminSeasonsSection', () => {
  beforeEach(() => {
    fetchAdminSeasonsFull.mockClear();
    fetchSeasonRewards.mockClear();
    createAdminSeason.mockClear();
    updateAdminSeason.mockClear();
    createSeasonReward.mockClear();
    updateSeasonReward.mockClear();
    deleteSeasonReward.mockClear();
    fetchCosmeticsCatalog.mockClear();
    fetchAdminBadges.mockClear();
  });

  it('loads and renders seasons and reward track', async () => {
    renderSection();
    await waitFor(() => {
      expect(fetchAdminSeasonsFull).toHaveBeenCalled();
    });
    expect(await screen.findByText('Seasons')).toBeInTheDocument();
    expect(await screen.findByText('season_1')).toBeInTheDocument();
    expect(await screen.findByLabelText('Список наград сезона')).toBeInTheDocument();
  });

  it('renders badge dropdown when rewardType is badge and uses selected badgeId', async () => {
    createSeasonReward.mockResolvedValue({
      id: 'r4',
      level: 4,
      rewardType: 'badge',
      amountSoft: null,
      cosmeticItemId: null,
      badgeId: 'badge_1',
      badge: {
        code: 'first_win',
        title: 'Первая победа',
      },
    } satisfies AdminSeasonRewardDto);

    renderSection();
    await waitFor(() => expect(fetchAdminBadges).toHaveBeenCalled());

    fireEvent.change(await screen.findByLabelText('Type'), {
      target: { value: 'badge' },
    });

    const badgeSelect = await screen.findByLabelText('Badge');
    fireEvent.change(badgeSelect, { target: { value: 'badge_1' } });

    fireEvent.change(screen.getByLabelText('Level'), {
      target: { value: '4' },
    });

    fireEvent.submit(screen.getByLabelText('Форма награды сезона'));
    await waitFor(() => expect(createSeasonReward).toHaveBeenCalled());
    const payload = createSeasonReward.mock.calls[0][1];
    expect(payload.badgeId).toBe('badge_1');
  });

  it('allows creating a soft reward', async () => {
    createSeasonReward.mockResolvedValue({
      id: 'r3',
      level: 3,
      rewardType: 'soft',
      amountSoft: 150,
      cosmeticItemId: null,
      badgeId: null,
      badge: null,
    } satisfies AdminSeasonRewardDto);

    renderSection();
    await waitFor(() => expect(fetchSeasonRewards).toHaveBeenCalled());

    fireEvent.change(await screen.findByLabelText('Level'), {
      target: { value: '3' },
    });
    fireEvent.change(screen.getByLabelText('Type'), {
      target: { value: 'soft' },
    });
    fireEvent.change(screen.getByLabelText('Soft amount'), {
      target: { value: '150' },
    });

    fireEvent.submit(screen.getByLabelText('Форма награды сезона'));
    await waitFor(() => expect(createSeasonReward).toHaveBeenCalled());
    const payload = createSeasonReward.mock.calls[0][1];
    expect(payload.level).toBe(3);
    expect(payload.amountSoft).toBe(150);
  });

  it('switches active season', async () => {
    renderSection();
    await waitFor(() => expect(fetchAdminSeasonsFull).toHaveBeenCalled());

    const buttons = await screen.findAllByRole('button', { name: 'Сделать активным' });
    const [button] = buttons;
    fireEvent.click(button);

    await waitFor(() => expect(updateAdminSeason).toHaveBeenCalled());
    const args = updateAdminSeason.mock.calls[0];
    expect(args[0]).toBe('s2');
    expect(args[1]).toEqual({ isActive: true });
  });
});

