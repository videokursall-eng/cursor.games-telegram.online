import { useCallback, useEffect, useState } from "react";
import WebApp from "@twa-dev/sdk";
import axios from "axios";
import { track } from "../../shared/analytics";

interface AuthUser {
  id: number;
  username?: string;
}

interface AuthState {
  loading: boolean;
  error?: string;
  token?: string;
  user?: AuthUser;
  activeMatchId?: string | null;
}

interface UseTelegramAuthResult extends AuthState {
  refresh: () => void;
}

export function useTelegramAuth(): UseTelegramAuthResult {
  const [state, setState] = useState<AuthState>({ loading: true });
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setState((prev) => ({ ...prev, loading: true, error: undefined }));
      try {
        const initData = WebApp.initData;
        if (!initData) {
          throw new Error("Missing Telegram initData");
        }
        const res = await axios.post("/api/auth/telegram/validate", { initData });
        if (cancelled) return;
        const data = res.data as {
          jwt: string;
          user: AuthUser;
          activeMatchId?: string | null;
        };
        setState({
          loading: false,
          token: data.jwt,
          user: data.user,
          activeMatchId: data.activeMatchId ?? null,
        });
        void track("auth_success_frontend", {
          userId: data.user.id,
          username: data.user.username,
        });
      } catch (e: any) {
        if (cancelled) return;
        const message =
          e?.response?.data?.error?.code === "INIT_DATA_EXPIRED"
            ? "Сессия Telegram устарела, откройте Mini App заново."
            : e?.response?.data?.error?.message || e?.message || "Auth failed";
        setState({
          loading: false,
          error: message,
        });
        void track("auth_failed_frontend", {
          message,
        });
      }
    }
    run();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return { ...state, refresh };
}

