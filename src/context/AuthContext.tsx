import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import { login as loginRequest, type AuthUser } from "@/services/api/auth.api";
import { setAuthToken, setUnauthorizedHandler } from "@/services/api/client";

const STORAGE_KEY = "eos_auth";

type StoredAuth = {
  token: string;
  user: AuthUser;
};

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  // True only while restoring a persisted session on app launch - lets
  // app/index.tsx and app/(tabs)/_layout.tsx avoid redirecting to login
  // before we've had a chance to check SecureStore.
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore a previously-persisted session once on launch.
  useEffect(() => {
    (async () => {
      try {
        const raw = await SecureStore.getItemAsync(STORAGE_KEY);
        if (raw) {
          const stored: StoredAuth = JSON.parse(raw);
          setToken(stored.token);
          setUser(stored.user);
          setAuthToken(stored.token);
        }
      } catch {
        // Corrupted/unreadable entry - treat as logged out, no need to surface this.
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // A 401 from any protected endpoint (token expired/revoked) forces logout.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setToken(null);
      setUser(null);
      setAuthToken(null);
      SecureStore.deleteItemAsync(STORAGE_KEY).catch(() => {});
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  async function login(email: string, password: string) {
    const result = await loginRequest(email, password);
    setToken(result.accessToken);
    setUser(result.user);
    setAuthToken(result.accessToken);
    await SecureStore.setItemAsync(
      STORAGE_KEY,
      JSON.stringify({ token: result.accessToken, user: result.user }),
    );
  }

  async function logout() {
    setToken(null);
    setUser(null);
    setAuthToken(null);
    await SecureStore.deleteItemAsync(STORAGE_KEY);
  }

  return (
    <AuthContext.Provider value={{ token, user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
