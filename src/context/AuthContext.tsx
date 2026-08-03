import { createContext, useContext } from "react";
import type { Role } from "@/hooks/useRole";

type AuthState = {
  token: string | null;
  role: Role | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
};

// TODO: implement provider - login via src/services/api/auth.api.ts, persist token with AsyncStorage
export const AuthContext = createContext<AuthState | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
