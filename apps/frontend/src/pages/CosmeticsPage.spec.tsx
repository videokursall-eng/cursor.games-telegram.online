import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import type { CosmeticItemDto, PlayerInventoryDto, WalletDto, StoreOfferDto } from 'shared';
import { CosmeticsPage } from './CosmeticsPage';

vi.mock('../store/authStore', () => ({
  useAuthStore: (selector: (s: { accessToken: string | null }) => unknown) =>
    selector({
      accessToken: 'test-token',
    }),
}));

const mockCatalog: CosmeticItemDto[] = [
  {
    id: 'avatar_hat_red',
    key: 'avatar_hat_red',
    name: 'Красная шляпа',
    description: 'desc',
    slot: 'avatar',
    rarity: 'rare',
    iconUrl: null,
    priceSoft: 500,
    priceStars: null,
    isExclusive: false,
    isLimited: false,
    seasonId: null,
  },
];

const baseInventory: PlayerInventoryDto = {
  userId: 'u1',
  ownedItems: [],
  equippedItems: {},
};

const mockOffers: StoreOfferDto[] = [
  {
    id: 'offer_hat_soft',
    key: 'offer_hat_soft',
    title: 'Hat offer',
    description: 'desc',
    featured: false,
    priceSoft: 500,
    priceStars: null,
    priceFiat: null,
    grants: [{ type: 'cosmetic', itemId: 'avatar_hat_red' }],
    requirements: undefined,
    tags: [],
    availableFrom: null,
    availableUntil: null,
  },
];

const mockFetchCosmeticsCatalog = vi.fn().mockResolvedValue(mockCatalog);
const mockFetchStoreOffers = vi.fn().mockResolvedValue(mockOffers);
const mockFetchMyInventory = vi.fn().mockResolvedValue(baseInventory);
const mockFetchMyWallet = vi.fn().mockResolvedValue({
  userId: 'u1',
  currency: 'soft',
  balance: 1000,
  updatedAt: new Date().toISOString(),
} as WalletDto);
const mockPurchaseOffer = vi.fn();
const mockEquipCosmetic = vi.fn().mockResolvedValue(baseInventory);

vi.mock('../api/cosmetics', () => ({
  fetchCosmeticsCatalog: (...args: unknown[]) => mockFetchCosmeticsCatalog(...args),
  fetchMyInventory: (...args: unknown[]) => mockFetchMyInventory(...args),
  equipCosmetic: (...args: unknown[]) => mockEquipCosmetic(...args),
}));

vi.mock('../api/store', () => ({
  fetchStoreOffers: (...args: unknown[]) => mockFetchStoreOffers(...args),
  purchaseOffer: (...args: unknown[]) => mockPurchaseOffer(...args),
}));

vi.mock('../api/wallet', () => ({
  fetchMyWallet: (...args: unknown[]) => mockFetchMyWallet(...args),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <CosmeticsPage />
    </MemoryRouter>,
  );
}

describe('CosmeticsPage', () => {
  beforeEach(() => {
    mockFetchCosmeticsCatalog.mockClear();
    mockFetchStoreOffers.mockClear();
    mockFetchMyInventory.mockClear();
    mockFetchMyWallet.mockClear();
    mockPurchaseOffer.mockClear();
    mockEquipCosmetic.mockClear();
  });

  it('renders catalog from API', async () => {
    renderPage();

    await waitFor(() => {
      expect(mockFetchCosmeticsCatalog).toHaveBeenCalled();
      expect(mockFetchStoreOffers).toHaveBeenCalled();
    });

    expect(await screen.findByText('Красная шляпа')).toBeInTheDocument();
    // rarity badge
    expect(await screen.findByText('Редкий')).toBeInTheDocument();
    // wallet chip
    expect(await screen.findByLabelText('Баланс кошелька')).toBeInTheDocument();
    expect(screen.getByText('1000')).toBeInTheDocument();
  });

  it('triggers purchase and shows success message', async () => {
    mockPurchaseOffer.mockResolvedValue({
      wallet: { userId: 'u1', currency: 'soft', balance: 500, updatedAt: new Date().toISOString() },
      inventory: {
        ...baseInventory,
        ownedItems: [
          {
            itemId: 'avatar_hat_red',
            acquiredAt: new Date().toISOString(),
            source: 'purchase',
          },
        ],
      },
      item: mockCatalog[0],
    });

    renderPage();
    const buyButton = await screen.findByText('Купить');
    fireEvent.click(buyButton);

    await waitFor(() => {
      expect(mockPurchaseOffer).toHaveBeenCalled();
    });
    // wallet balance updated
    expect(await screen.findByText('500')).toBeInTheDocument();
  });

  it('shows insufficient funds error', async () => {
    mockPurchaseOffer.mockRejectedValue(new Error('Insufficient funds'));

    renderPage();
    const buyButton = await screen.findByText('Купить');
    fireEvent.click(buyButton);

    const errorText = await screen.findByText('Недостаточно монет для покупки.');
    expect(errorText).toBeInTheDocument();
  });
});

