import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AdminEconomySection } from './AdminEconomySection';
import type { PlayerInventoryDto, WalletDto, CurrencyTransactionDto } from 'shared';

vi.mock('../store/authStore', () => ({
  useAuthStore: (selector: (s: { accessToken: string | null }) => unknown) =>
    selector({ accessToken: 'test-token' }),
}));

const fetchAdminWallet = vi.fn();
const fetchAdminInventory = vi.fn();
const adminCreditWallet = vi.fn();
const adminGrantItem = vi.fn();
const fetchAdminCosmetics = vi.fn();

vi.mock('../api/adminEconomy', () => ({
  fetchAdminWallet: (...args: unknown[]) => fetchAdminWallet(...args),
  fetchAdminInventory: (...args: unknown[]) => fetchAdminInventory(...args),
  adminCreditWallet: (...args: unknown[]) => adminCreditWallet(...args),
  adminGrantItem: (...args: unknown[]) => adminGrantItem(...args),
}));

vi.mock('../api/adminCosmetics', () => ({
  fetchAdminCosmetics: (...args: unknown[]) => fetchAdminCosmetics(...args),
}));

function renderSection() {
  return render(
    <MemoryRouter>
      <AdminEconomySection />
    </MemoryRouter>,
  );
}

const wallet: WalletDto = {
  userId: 'u1',
  currency: 'soft',
  balance: 100,
  updatedAt: new Date(0).toISOString(),
};

const inventory: PlayerInventoryDto = {
  userId: 'u1',
  ownedItems: [
    { itemId: 'card_back_red', acquiredAt: new Date(0).toISOString(), source: 'grant', tag: undefined },
  ],
  equippedItems: {},
};

describe('AdminEconomySection', () => {
  it('loads wallet and inventory for user', async () => {
    fetchAdminWallet.mockResolvedValue(wallet);
    fetchAdminInventory.mockResolvedValue(inventory);
    fetchAdminCosmetics.mockResolvedValue([]);

    renderSection();

    fireEvent.change(screen.getByLabelText('User ID'), {
      target: { value: 'u1' },
    });

    fireEvent.click(screen.getByText('Загрузить кошелёк и инвентарь'));

    await waitFor(() => expect(fetchAdminWallet).toHaveBeenCalledWith('u1', 'test-token'));
    await waitFor(() => expect(fetchAdminInventory).toHaveBeenCalledWith('u1', 'test-token'));

    expect(await screen.findByText('Баланс (soft)')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('card_back_red')).toBeInTheDocument();
  });

  it('grants item to user', async () => {
    fetchAdminWallet.mockResolvedValue(wallet);
    fetchAdminInventory.mockResolvedValue(inventory);
    adminGrantItem.mockResolvedValue(inventory);
    fetchAdminCosmetics.mockResolvedValue([
      {
        id: 'item1',
        code: 'card_back_blue',
        slot: 'card_back',
        title: 'Blue Back',
        description: null,
        icon: null,
        rarity: 'rare',
        priceSoft: 200,
        priceStars: null,
        isExclusive: false,
        isLimited: false,
        isActive: true,
        seasonId: null,
      },
    ]);

    renderSection();

    fireEvent.change(screen.getByLabelText('User ID'), {
      target: { value: 'u1' },
    });
    fireEvent.click(screen.getByText('Загрузить кошелёк и инвентарь'));
    await waitFor(() => expect(fetchAdminWallet).toHaveBeenCalled());

    await waitFor(() => expect(fetchAdminCosmetics).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText('Cosmetic item'), {
      target: { value: 'item1' },
    });
    fireEvent.change(screen.getAllByLabelText('Reason (audit)')[0], {
      target: { value: 'manual_grant' },
    });

    fireEvent.submit(screen.getByLabelText('Ручная выдача предмета'));

    await waitFor(() => expect(adminGrantItem).toHaveBeenCalled());
    const payload = (adminGrantItem.mock.calls[0]![0] ?? {}) as {
      userId: string;
      itemId: string;
      reason: string;
    };
    expect(payload.userId).toBe('u1');
    expect(payload.itemId).toBe('item1');
    expect(payload.reason).toBe('manual_grant');
  });

  it('credits soft currency to user', async () => {
    const tx: CurrencyTransactionDto = {
      id: 't1',
      userId: 'u1',
      currency: 'soft',
      amount: 50,
      reason: 'admin_adjustment',
      metadata: undefined,
      createdAt: new Date(0).toISOString(),
    };
    adminCreditWallet.mockResolvedValue({
      wallet: { ...wallet, balance: 150 },
      transaction: tx,
    });

    renderSection();

    fireEvent.change(screen.getByLabelText('User ID'), {
      target: { value: 'u1' },
    });

    fireEvent.change(screen.getByLabelText('Сумма (soft)'), {
      target: { value: '50' },
    });
    fireEvent.change(screen.getAllByLabelText('Reason (audit)')[1], {
      target: { value: 'admin_adjustment' },
    });

    fireEvent.submit(screen.getByLabelText('Ручное начисление валюты'));

    await waitFor(() => expect(adminCreditWallet).toHaveBeenCalled());
    const payload = (adminCreditWallet.mock.calls[0]![0] ?? {}) as {
      userId: string;
      amount: number;
      reason: string;
    };
    expect(payload.userId).toBe('u1');
    expect(payload.amount).toBe(50);
    expect(payload.reason).toBe('admin_adjustment');
  });
});

