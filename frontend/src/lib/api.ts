const BASE = '/api';

async function request<T>(
  path: string,
  options: RequestInit = {},
  initData?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (initData) headers['x-init-data'] = initData;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await res.json() as T & { error?: string };
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  return data;
}

export interface AuthResponse {
  ok: boolean;
  user: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
  };
  startParam?: string;
  botUsername: string;
  appName: string;
}

export const api = {
  auth: {
    verify: (initData: string) =>
      request<AuthResponse>('/auth/verify', {
        method: 'POST',
        body: JSON.stringify({ initData }),
      }),
  },
  rooms: {
    list: (initData: string) =>
      request<{ rooms: unknown[] }>('/rooms', {}, initData),
    get: (id: string, initData: string) =>
      request<{ room: unknown }>(`/rooms/${id}`, {}, initData),
    create: (
      params: { gameType: string; maxPlayers: number; botCount: number },
      initData: string,
    ) =>
      request<{ room: unknown }>('/rooms', {
        method: 'POST',
        body: JSON.stringify(params),
      }, initData),
    delete: (id: string, initData: string) =>
      request<{ ok: boolean }>(`/rooms/${id}`, { method: 'DELETE' }, initData),
  },
};
