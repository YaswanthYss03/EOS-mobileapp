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

// `name` is resolved server-side (see AuthService.resolveDisplayName):
// Faculty/HoD's own first_name/last_name, a Student's soa_applications
// name, or the account's email as a last resort for anyone with no name
// stored anywhere (Parent, HR, Finance, ...). Never derive a "name" from
// the email locally instead - that's what this replaced.
export type MyProfile = {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  status: string;
  created_at: string;
  roles: { id: number; name: string; description: string | null };
};

export async function getMe(): Promise<MyProfile> {
  const { data } = await apiClient.get<{ data: MyProfile }>("/auth/me");
  return data.data;
}
