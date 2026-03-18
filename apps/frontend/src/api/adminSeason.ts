import { api } from './client';
import type { BadgeDto } from 'shared';

export interface AdminSeasonDto {
  id: string;
  code: string;
  name: string;
  startsAt: string;
  endsAt: string | null;
  isActive: boolean;
}

export interface AdminSeasonRewardDto {
  id: string;
  level: number;
  rewardType: 'soft' | 'cosmetic' | 'badge';
  amountSoft?: number | null;
  cosmeticItemId?: string | null;
  badgeId?: string | null;
  badge?: BadgeDto | null;
}

export interface UpsertSeasonPayload {
  code: string;
  name: string;
  startsAt: string;
  endsAt?: string | null;
  isActive?: boolean;
}

export interface UpdateSeasonPayload {
  name?: string;
  startsAt?: string;
  endsAt?: string | null;
  isActive?: boolean;
}

export interface UpsertSeasonRewardPayload {
  level?: number;
  rewardType?: 'soft' | 'cosmetic' | 'badge';
  amountSoft?: number | null;
  cosmeticItemId?: string | null;
  badgeId?: string | null;
}

export async function fetchAdminSeasonsFull(token: string | null) {
  return api<AdminSeasonDto[]>('/admin/seasons', { token });
}

export async function createAdminSeason(payload: UpsertSeasonPayload, token: string | null) {
  return api<AdminSeasonDto>('/admin/seasons', {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  });
}

export async function updateAdminSeason(
  id: string,
  payload: UpdateSeasonPayload,
  token: string | null,
) {
  return api<AdminSeasonDto>(`/admin/seasons/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    token,
  });
}

export async function fetchSeasonRewards(seasonId: string, token: string | null) {
  return api<AdminSeasonRewardDto[]>(
    `/admin/seasons/${encodeURIComponent(seasonId)}/rewards`,
    { token },
  );
}

export async function createSeasonReward(
  seasonId: string,
  payload: Required<UpsertSeasonRewardPayload>,
  token: string | null,
) {
  return api<AdminSeasonRewardDto>(
    `/admin/seasons/${encodeURIComponent(seasonId)}/rewards`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
      token,
    },
  );
}

export async function updateSeasonReward(
  seasonId: string,
  id: string,
  payload: UpsertSeasonRewardPayload,
  token: string | null,
) {
  return api<AdminSeasonRewardDto>(
    `/admin/seasons/${encodeURIComponent(seasonId)}/rewards/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
      token,
    },
  );
}

export async function deleteSeasonReward(
  seasonId: string,
  id: string,
  token: string | null,
) {
  return api<{ success: boolean }>(
    `/admin/seasons/${encodeURIComponent(seasonId)}/rewards/${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
      token,
    },
  );
}

