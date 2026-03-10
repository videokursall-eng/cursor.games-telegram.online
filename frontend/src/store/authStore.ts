import { create } from 'zustand';

export interface AuthUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

interface AuthState {
  user: AuthUser | null;
  initData: string;
  botUsername: string;
  appName: string;
  startParam: string | null;
  isLoading: boolean;
  error: string | null;
  setAuth: (user: AuthUser, initData: string, botUsername: string, appName: string, startParam?: string) => void;
  setError: (error: string) => void;
  setLoading: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  initData: '',
  botUsername: '',
  appName: '',
  startParam: null,
  isLoading: true,
  error: null,
  setAuth: (user, initData, botUsername, appName, startParam) =>
    set({ user, initData, botUsername, appName, startParam: startParam ?? null, isLoading: false, error: null }),
  setError: (error) => set({ error, isLoading: false }),
  setLoading: (v) => set({ isLoading: v }),
}));
