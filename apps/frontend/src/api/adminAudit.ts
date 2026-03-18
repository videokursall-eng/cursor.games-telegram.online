import { api } from './client';

export interface AdminAuditLogRow {
  id: string;
  createdAt: string;
  adminUserId: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  success: boolean;
  reason?: string | null;
  payload?: unknown;
}

export async function fetchAdminAuditLogs(
  token: string | null,
  params: { adminUserId?: string; targetType?: string; targetId?: string; limit?: number } = {},
) {
  const search = new URLSearchParams();
  if (params.adminUserId) search.set('adminUserId', params.adminUserId);
  if (params.targetType) search.set('targetType', params.targetType);
  if (params.targetId) search.set('targetId', params.targetId);
  if (params.limit) search.set('limit', String(params.limit));

  const path = `/admin/audit/logs${search.toString() ? `?${search.toString()}` : ''}`;
  return api<AdminAuditLogRow[]>(path, { token });
}

