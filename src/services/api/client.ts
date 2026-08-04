import axios from "axios";

// Base URL for EOS-backend (see EOS-backend/src/main.ts - global prefix
// api/v1). Craveo has its own separate, already-hosted backend (see
// EXPO_PUBLIC_API_BASE_URL in .env) - this client is only for EOS's own
// endpoints (auth, erp, academics, etc).
export const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
});

// Kept in memory rather than read from storage on every request - AuthContext
// calls this whenever the token changes (login/logout/restore from SecureStore).
let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

apiClient.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.set("Authorization", `Bearer ${authToken}`);
  }
  return config;
});

// AuthContext registers itself here so a 401 from any protected endpoint
// (token expired/revoked server-side) forces the app back to the login
// screen, instead of leaving the user stuck on a broken tab.
let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginCall = String(error?.config?.url ?? "").includes("/auth/login");
    if (error?.response?.status === 401 && !isLoginCall) {
      unauthorizedHandler?.();
    }
    return Promise.reject(error);
  },
);

// EOS-backend's error envelope: { success:false, statusCode, errorCode, message, ... }
// `message` is a string for most errors, but class-validator DTO errors come
// back as a string[] (one entry per invalid field).
export function getApiErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  const message = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  if (Array.isArray(message)) return typeof message[0] === "string" ? message[0] : fallback;
  if (typeof message === "string") return message;
  return fallback;
}
