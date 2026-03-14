import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import type { AdminCosmeticItem, AdminSeasonSummary } from '../api/adminCosmetics';
import { AdminCosmeticsSection } from './AdminCosmeticsSection';

vi.mock('../store/authStore', () => ({
  useAuthStore: (selector: (s: { accessToken: string | null }) => unknown) =>
    selector({ accessToken: 'test-token' }),
}));

const mockItems: AdminCosmeticItem[] = [
  {
    id: 'avatar_hat_red',
    code: 'avatar_hat_red',
    slot: 'avatar',
    title: 'Красная шляпа',
    description: 'desc',
    icon: null,
    rarity: 'rare',
    priceSoft: 500,
    priceStars: null,
    isExclusive: false,
    isLimited: false,
    isActive: true,
    seasonId: null,
  },
];

const mockSeasons: AdminSeasonSummary[] = [{ id: 's1', code: 'season_1', title: 'Season 1' }];

const fetchAdminCosmetics = vi.fn().mockResolvedValue(mockItems);
const fetchAdminSeasons = vi.fn().mockResolvedValue(mockSeasons);
const createAdminCosmetic = vi.fn();
const updateAdminCosmetic = vi.fn();
const setAdminCosmeticActive = vi.fn().mockResolvedValue(mockItems[0]);

vi.mock('../api/adminCosmetics', () => ({
  fetchAdminCosmetics: (...args: unknown[]) => fetchAdminCosmetics(...args),
  fetchAdminSeasons: (...args: unknown[]) => fetchAdminSeasons(...args),
  createAdminCosmetic: (...args: unknown[]) => createAdminCosmetic(...args),
  updateAdminCosmetic: (...args: unknown[]) => updateAdminCosmetic(...args),
  setAdminCosmeticActive: (...args: unknown[]) => setAdminCosmeticActive(...args),
}));

function renderSection() {
  return render(
    <MemoryRouter>
      <AdminCosmeticsSection />
    </MemoryRouter>,
  );
}

describe('AdminCosmeticsSection', () => {
  beforeEach(() => {
    fetchAdminCosmetics.mockClear();
    fetchAdminSeasons.mockClear();
    createAdminCosmetic.mockClear();
    updateAdminCosmetic.mockClear();
    setAdminCosmeticActive.mockClear();
  });

  it('renders catalog list with rarity/exclusive/limited/season labels', async () => {
    renderSection();
    await waitFor(() => expect(fetchAdminCosmetics).toHaveBeenCalled());
    expect(await screen.findByText('Каталог косметики')).toBeInTheDocument();
    expect(await screen.findByText('Красная шляпа')).toBeInTheDocument();
    expect(await screen.findByText('rare')).toBeInTheDocument();
  });

  it('allows creating cosmetic item with rarity and flags', async () => {
    createAdminCosmetic.mockResolvedValue({
      ...mockItems[0],
      code: 'new_item',
      id: 'new_item',
      rarity: 'epic',
      isExclusive: true,
      isLimited: true,
      seasonId: 's1',
    } satisfies AdminCosmeticItem);

    renderSection();
    await waitFor(() => expect(fetchAdminCosmetics).toHaveBeenCalled());

    const codeInput = await screen.findByLabelText('Code');
    fireEvent.change(codeInput, { target: { value: 'new_item' } });
    fireEvent.change(screen.getByLabelText('Название'), { target: { value: 'Новый предмет' } });
    fireEvent.change(screen.getByLabelText('Редкость'), { target: { value: 'epic' } });
    fireEvent.click(screen.getByLabelText('Эксклюзив'));
    fireEvent.click(screen.getByLabelText('Лимитированный'));
    fireEvent.change(screen.getByLabelText('Сезон'), { target: { value: 's1' } });

    fireEvent.submit(screen.getByLabelText('Форма косметики'));

    await waitFor(() => expect(createAdminCosmetic).toHaveBeenCalled());
    const call = createAdminCosmetic.mock.calls[0][0];
    expect(call.rarity).toBe('epic');
    expect(call.isExclusive).toBe(true);
    expect(call.isLimited).toBe(true);
    expect(call.seasonId).toBe('s1');
  });

  it('allows editing cosmetic item and populates initial values', async () => {
    updateAdminCosmetic.mockResolvedValue({
      ...mockItems[0],
      rarity: 'legendary',
    } satisfies AdminCosmeticItem);

    renderSection();
    await waitFor(() => expect(fetchAdminCosmetics).toHaveBeenCalled());

    const editButton = await screen.findByText('Редактировать');
    fireEvent.click(editButton);

    const raritySelect = await screen.findByLabelText('Редкость');
    expect((raritySelect as HTMLSelectElement).value).toBe('rare');

    fireEvent.change(raritySelect, { target: { value: 'legendary' } });
    fireEvent.submit(screen.getByLabelText('Форма косметики'));

    await waitFor(() => expect(updateAdminCosmetic).toHaveBeenCalled());
    const call = updateAdminCosmetic.mock.calls[0][1];
    expect(call.rarity).toBe('legendary');
  });
});

