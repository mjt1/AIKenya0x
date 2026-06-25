"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { clearStoredToken, getStoredToken, setStoredToken } from "./api";

/**
 * Token-only auth context. The current agent/session is fetched via the useMe
 * query (hooks/queries/use-me.ts); this provider just owns the bearer token and
 * makes it hydration-safe (localStorage is read after mount, never during SSR).
 */
interface AuthTokenContextValue {
  token: string | null;
  isHydrated: boolean;
  setToken: (token: string) => void;
  clearToken: () => void;
}

const AuthTokenContext = createContext<AuthTokenContextValue | undefined>(
  undefined,
);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setTokenState(getStoredToken());
    setIsHydrated(true);
  }, []);

  const setToken = useCallback((next: string) => {
    setStoredToken(next);
    setTokenState(next);
  }, []);

  const clearToken = useCallback(() => {
    clearStoredToken();
    setTokenState(null);
  }, []);

  return (
    <AuthTokenContext.Provider
      value={{ token, isHydrated, setToken, clearToken }}
    >
      {children}
    </AuthTokenContext.Provider>
  );
}

export function useAuthToken(): AuthTokenContextValue {
  const ctx = useContext(AuthTokenContext);
  if (!ctx) throw new Error("useAuthToken must be used within an <AuthProvider>");
  return ctx;
}
