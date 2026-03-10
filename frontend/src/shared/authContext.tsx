import React, { createContext, useContext, useEffect, useRef } from "react";
import axios from "axios";
import { useTelegramAuth } from "../modules/auth/useTelegramAuth";

interface AuthUser {
  id: number;
  username?: string;
}

interface AuthContextValue {
  token: string | undefined;
  user: AuthUser | undefined;
  loading: boolean;
  error: string | undefined;
  refresh: () => void;
  activeMatchId: string | null | undefined;
}

const AuthContext = createContext<AuthContextValue>({
  token: undefined,
  user: undefined,
  loading: true,
  error: undefined,
  refresh: () => {},
  activeMatchId: undefined,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useTelegramAuth();
  const prevToken = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (auth.token === prevToken.current) return;
    prevToken.current = auth.token;
    if (auth.token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${auth.token}`;
    } else {
      delete axios.defaults.headers.common["Authorization"];
    }
  }, [auth.token]);

  const value: AuthContextValue = {
    token: auth.token,
    user: auth.user,
    loading: auth.loading,
    error: auth.error,
    refresh: auth.refresh,
    activeMatchId: auth.activeMatchId,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
