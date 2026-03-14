import { api } from './client';
import type { CosmeticRarity } from 'shared';

export interface AdminCosmeticItem {
  id: string;
  code: string;
  slot: string;
  title: string;
  description: string | null;
  icon: string | null;
  rarity: CosmeticRarity;
  priceSoft: number | null;
  priceStars: number | null;
  isExclusive: boolean;
  isLimited: boolean;
  isActive: boolean;
  seasonId: string | null;
}

export interface AdminSeasonSummary {
  id: string;
  code: string;
  title: string;
}

export interface UpsertAdminCosmeticPayload {
  code: string;
  type: string;
  title: string;
  description?: string;
  icon?: string;
  priceSoft?: number | null;
  priceStars?: number | null;
  rarity?: CosmeticRarity;
  isExclusive?: boolean;
  isLimited?: boolean;
  seasonId?: string | null;
}

export async function fetchAdminCosmetics(token: string | null) {
  return api<AdminCosmeticItem[]>('/admin/cosmetics', { token });
}

export async function createAdminCosmetic(payload: UpsertAdminCosmeticPayload, token: string | null) {
  return api<AdminCosmeticItem>('/admin/cosmetics', {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  });
}

export async function updateAdminCosmetic(
  code: string,
  payload: Partial<UpsertAdminCosmeticPayload>,
  token: string | null,
) {
  return api<AdminCosmeticItem>(`/admin/cosmetics/${encodeURIComponent(code)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    token,
  });
}

export async function setAdminCosmeticActive(code: string, isActive: boolean, token: string | null) {
  const path = isActive ? 'activate' : 'deactivate';
  return api<AdminCosmeticItem>(`/admin/cosmetics/${encodeURIComponent(code)}/${path}`, {
    method: 'PATCH',
    token,
  });
}

export async function fetchAdminSeasons(token: string | null) {
  return api<AdminSeasonSummary[]>('/admin/seasons', { token });
}

