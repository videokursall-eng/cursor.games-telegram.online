import { api } from './client';

export interface AdminStatsOverview {
  matchesTotal: number;
  matchesByMode: { mode: string; count: number }[];
  dau: number;
  mau: number;
  purchasesTotal: number;
  topCosmetics: { itemId: string; purchases: number }[];
  activePlayers: number;
  newPlayersLast7d: number;
  seasonClaims: { seasonId: string; claims: number }[];
}

export async function fetchAdminStatsOverview(token: string | null) {
  return api<AdminStatsOverview>('/admin/stats/overview', { token });
}

