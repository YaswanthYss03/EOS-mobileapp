import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import { login as loginRequest, type AuthUser } from "@/services/api/auth.api";
import { setAuthToken, setUnauthorizedHandler } from "@/services/api/client";
import { registerForPushNotifications, unregisterPushToken } from "@/services/push-notifications";

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
  // This device's current Expo push token, once registration completes -
  // held in a ref (not state) purely so logout() can read it without
  // waiting on a render; it's never displayed.
  const pushTokenRef = useRef<string | null>(null);

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
          // Fire-and-forget - permission prompts/EAS lookups/network calls
          // here must never delay showing the restored session.
          registerForPushNotifications().then((t) => {
            pushTokenRef.current = t;
          });
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
    // Fire-and-forget - a permission prompt or slow Expo push lookup must
    // never delay the post-login navigation.
    registerForPushNotifications().then((t) => {
      pushTokenRef.current = t;
    });
  }

  async function logout() {
    await unregisterPushToken(pushTokenRef.current);
    pushTokenRef.current = null;
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
