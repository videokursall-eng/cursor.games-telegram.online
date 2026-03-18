import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { AdminOffersSection } from './AdminOffersSection';
import type { AdminCosmeticItem } from '../api/adminCosmetics';
import type { AdminOfferDto } from '../api/adminOffers';

vi.mock('../store/authStore', () => ({
  useAuthStore: (selector: (s: { accessToken: string | null }) => unknown) =>
    selector({ accessToken: 'test-token' }),
}));

const mockCatalog: AdminCosmeticItem[] = [
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

const mockOffers: AdminOfferDto[] = [
  {
    id: 'offer1',
    code: 'OFFER_HAT',
    itemId: 'avatar_hat_red',
    priceSoft: 400,
    priceStars: null,
    currencyType: 'soft',
    isActive: true,
    sortOrder: 1,
    startsAt: null,
    endsAt: null,
  },
];

const fetchAdminOffers = vi.fn().mockResolvedValue(mockOffers);
const fetchAdminCosmetics = vi.fn().mockResolvedValue(mockCatalog);
const createAdminOffer = vi.fn();
const updateAdminOffer = vi.fn();
const toggleAdminOfferActive = vi.fn().mockResolvedValue({
  ...mockOffers[0],
  isActive: false,
} satisfies AdminOfferDto);

vi.mock('../api/adminOffers', () => ({
  fetchAdminOffers: (...args: unknown[]) => fetchAdminOffers(...args),
  createAdminOffer: (...args: unknown[]) => createAdminOffer(...args),
  updateAdminOffer: (...args: unknown[]) => updateAdminOffer(...args),
  toggleAdminOfferActive: (...args: unknown[]) => toggleAdminOfferActive(...args),
}));

vi.mock('../api/adminCosmetics', () => ({
  fetchAdminCosmetics: (...args: unknown[]) => fetchAdminCosmetics(...args),
}));

function renderSection() {
  return render(
    <MemoryRouter>
      <AdminOffersSection />
    </MemoryRouter>,
  );
}

describe('AdminOffersSection', () => {
  beforeEach(() => {
    fetchAdminOffers.mockClear();
    fetchAdminCosmetics.mockClear();
    createAdminOffer.mockClear();
    updateAdminOffer.mockClear();
    toggleAdminOfferActive.mockClear();
  });

  it('renders offers list', async () => {
    renderSection();
    await waitFor(() => expect(fetchAdminOffers).toHaveBeenCalled());
    expect(await screen.findByText('Store Offers')).toBeInTheDocument();
    expect(await screen.findByText('OFFER_HAT')).toBeInTheDocument();
    expect(
      await screen.findAllByText(/Красная шляпа/, {
        exact: false,
      }),
    ).toHaveLength(2);
  });

  it('allows creating offer with selected item', async () => {
    createAdminOffer.mockResolvedValue({
      ...mockOffers[0],
      id: 'offer2',
      code: 'OFFER_NEW',
      itemId: 'avatar_hat_red',
      sortOrder: 2,
    } satisfies AdminOfferDto);

    renderSection();
    await waitFor(() => expect(fetchAdminOffers).toHaveBeenCalled());

    fireEvent.change(await screen.findByLabelText('Code'), {
      target: { value: 'OFFER_NEW' },
    });
    fireEvent.change(screen.getByLabelText('Item'), {
      target: { value: 'avatar_hat_red' },
    });
    fireEvent.change(screen.getByLabelText('Цена soft'), {
      target: { value: '300' },
    });
    fireEvent.change(screen.getByLabelText('Sort order'), {
      target: { value: '2' },
    });

    fireEvent.submit(screen.getByLabelText('Форма оффера'));

    await waitFor(() => expect(createAdminOffer).toHaveBeenCalled());
    const payload = createAdminOffer.mock.calls[0][0];
    expect(payload.code).toBe('OFFER_NEW');
    expect(payload.itemId).toBe('avatar_hat_red');
    expect(payload.priceSoft).toBe(300);
    expect(payload.sortOrder).toBe(2);
  });

  it('allows editing offer and toggling active', async () => {
    updateAdminOffer.mockResolvedValue({
      ...mockOffers[0],
      priceSoft: 350,
    } satisfies AdminOfferDto);

    renderSection();
    await waitFor(() => expect(fetchAdminOffers).toHaveBeenCalled());

    const editButton = await screen.findByText('Редактировать');
    fireEvent.click(editButton);

    const priceInput = await screen.findByLabelText('Цена soft');
    expect((priceInput as HTMLInputElement).value).toBe('400');

    fireEvent.change(priceInput, { target: { value: '350' } });
    fireEvent.submit(screen.getByLabelText('Форма оффера'));

    await waitFor(() => expect(updateAdminOffer).toHaveBeenCalled());
    const payload = updateAdminOffer.mock.calls[0][1];
    expect(payload.priceSoft).toBe(350);

    const toggleButton = await screen.findByText('Деактивировать');
    fireEvent.click(toggleButton);
    await waitFor(() => expect(toggleAdminOfferActive).toHaveBeenCalled());
  });
});

