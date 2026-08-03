import { apiClient } from "./client";

// TODO: wire to EOS-backend src/auth login endpoint
export async function login(username: string, password: string) {
  const { data } = await apiClient.post("/auth/login", { username, password });
  return data;
}
