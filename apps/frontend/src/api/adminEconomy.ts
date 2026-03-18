import { api, type ApiOptions } from './client';
import type { PlayerInventoryDto, WalletDto, CurrencyTransactionDto } from 'shared';

export interface AdminGrantItemPayload {
  userId: string;
  itemId: string;
  reason: string;
  tag?: string;
}

export interface AdminAdjustWalletPayload {
  userId: string;
  amount: number;
  reason: CurrencyTransactionDto['reason'];
}

export async function fetchAdminWallet(userId: string, token: string | null) {
  return api<WalletDto>(`/admin/economy/wallet/${userId}`, { token });
}

export async function fetchAdminInventory(userId: string, token: string | null) {
  return api<PlayerInventoryDto>(`/admin/economy/inventory/${userId}`, { token });
}

export async function adminCreditWallet(payload: AdminAdjustWalletPayload, token: string | null) {
  const init: ApiOptions = {
    token,
    method: 'POST',
    body: JSON.stringify(payload),
  };
  return api<{ wallet: WalletDto; transaction: CurrencyTransactionDto }>(
    '/admin/economy/wallet/credit',
    init,
  );
}

export async function adminGrantItem(payload: AdminGrantItemPayload, token: string | null) {
  const init: ApiOptions = {
    token,
    method: 'POST',
    body: JSON.stringify(payload),
  };
  return api<PlayerInventoryDto>('/admin/economy/inventory/grant', init);
}

