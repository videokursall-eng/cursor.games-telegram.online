import { api } from './client';
import type { BadgeDto } from 'shared';

export interface AdminBadgeDto extends BadgeDto {
  id: string;
}

export async function fetchAdminBadges(token: string | null) {
  return api<AdminBadgeDto[]>('/admin/badges', { token });
}

