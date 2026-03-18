import { api } from './client';
import type {
  CosmeticItemDto,
  PlayerInventoryDto,
  WalletDto,
  CosmeticSlot,
} from 'shared';

export interface PurchaseResultDto {
  wallet: WalletDto;
  inventory: PlayerInventoryDto;
  item: CosmeticItemDto;
}

export async function fetchCosmeticsCatalog(token: string | null) {
  return api<CosmeticItemDto[]>('/cosmetics/catalog', { token });
}

export async function fetchMyInventory(token: string | null) {
  return api<PlayerInventoryDto>('/me/inventory', { token });
}

export async function purchaseCosmetic(itemId: string, token: string | null) {
  return api<PurchaseResultDto>('/store/purchase', {
    method: 'POST',
    body: JSON.stringify({ itemId }),
    token,
  });
}

export async function equipCosmetic(slot: CosmeticSlot, itemId: string, token: string | null) {
  return api<PlayerInventoryDto>('/me/inventory/equip', {
    method: 'POST',
    body: JSON.stringify({ slot, itemId }),
    token,
  });
}

