import { api } from './client';

export interface AdminOfferDto {
  id: string;
  code: string;
  itemId: string;
  priceSoft: number | null;
  priceStars: number | null;
  currencyType: 'soft' | 'stars';
  isActive: boolean;
  sortOrder: number;
  startsAt: string | null;
  endsAt: string | null;
}

export interface UpsertAdminOfferPayload {
  code: string;
  itemId: string;
  priceSoft?: number | null;
  priceStars?: number | null;
  currencyType: 'soft' | 'stars';
  isActive?: boolean;
  sortOrder?: number;
  startsAt?: string | null;
  endsAt?: string | null;
}

export async function fetchAdminOffers(token: string | null) {
  return api<AdminOfferDto[]>('/admin/offers', { token });
}

export async function createAdminOffer(payload: UpsertAdminOfferPayload, token: string | null) {
  return api<AdminOfferDto>('/admin/offers', {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  });
}

export async function updateAdminOffer(
  id: string,
  payload: Partial<UpsertAdminOfferPayload>,
  token: string | null,
) {
  return api<AdminOfferDto>(`/admin/offers/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    token,
  });
}

export async function toggleAdminOfferActive(id: string, isActive: boolean, token: string | null) {
  return api<AdminOfferDto>(`/admin/offers/${encodeURIComponent(id)}/${isActive ? 'activate' : 'deactivate'}`, {
    method: 'PATCH',
    token,
  });
}

