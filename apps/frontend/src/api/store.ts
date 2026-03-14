import { api } from './client';
import type { StoreOfferDto, PlayerInventoryDto, WalletDto } from 'shared';

export interface PurchaseOfferResultDto {
  wallet: WalletDto;
  inventory: PlayerInventoryDto;
}

export async function fetchStoreOffers(token: string | null) {
  return api<StoreOfferDto[]>('/store/offers', { token });
}

export async function purchaseOffer(offerId: string, token: string | null) {
  return api<PurchaseOfferResultDto>('/store/purchase', {
    method: 'POST',
    body: JSON.stringify({ offerId }),
    token,
  });
}

