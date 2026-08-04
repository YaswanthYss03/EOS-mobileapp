import { apiClient } from "./client";

// Mirrors EOS-backend's users + roles shape returned from /auth/login and
// /auth/me (see EOS-backend/src/auth/auth.service.ts). `role` is the backend
// role name (e.g. "student", "hr_payroll") - see src/hooks/useRole.ts for how
// that maps onto this app's own Role type.
export type AuthUser = {
  id: number;
  email: string;
  role: string;
  roleId: number;
};

type LoginResponse = {
  accessToken: string;
  user: AuthUser;
};

// Every successful EOS-backend response is wrapped in
// { success, message, data, timestamp } (see TransformInterceptor) - the
// actual payload is response.data.data.
export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await apiClient.post<{ data: LoginResponse }>("/auth/login", { email, password });
  return data.data;
}

export async function getMe(): Promise<unknown> {
  const { data } = await apiClient.get<{ data: unknown }>("/auth/me");
  return data.data;
}
