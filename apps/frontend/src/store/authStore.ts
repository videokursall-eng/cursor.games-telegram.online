import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const API_URL = import.meta.env.VITE_API_URL || '';

export interface AuthUser {
  id: string;
  telegramId: number;
  isAdmin?: boolean;
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  /** True after first auth attempt (success or fail) so UI can show loading vs unauthenticated */
  authAttempted: boolean;
  login: (initData: string) => Promise<boolean>;
  logout: () => void;
  setAuthAttempted: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      authAttempted: false,
      setAuthAttempted: () => set({ authAttempted: true }),

      login: async (initData: string) => {
        if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
          // eslint-disable-next-line no-console
          console.log(
            'AUTH REQUEST debug: initData(from-arg-length)=',
            initData?.length || 0,
            'initData(window.Telegram.WebApp.length)=',
            ((window as any).Telegram.WebApp.initData as string | undefined)?.length || 0,
          );
        } else {
          // eslint-disable-next-line no-console
          console.log('AUTH REQUEST debug: Telegram WebApp not available in window');
        }
        if (!API_URL || !initData.trim()) {
          set({ authAttempted: true });
          return false;
        }
        try {
          const res = await fetch(`${API_URL}/auth/telegram`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData }),
          });
          const data = (await res.json()) as { ok?: boolean; accessToken?: string; user?: AuthUser };
          if (data.ok && data.accessToken && data.user) {
            set({
              accessToken: data.accessToken,
              user: data.user,
              authAttempted: true,
            });
            return true;
          }
        } catch {
          // ignore
        }
        set({ authAttempted: true });
        return false;
      },

      logout: () =>
        set({
          accessToken: null,
          user: null,
          authAttempted: true,
        }),
    }),
    { name: 'durak-auth', partialize: (s) => ({ accessToken: s.accessToken, user: s.user, authAttempted: s.authAttempted }) }
  )
);
