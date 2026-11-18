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

// For the rare request that can't go through this axios instance (e.g. a
// native file download that needs the header set directly - see
// fees.api.ts's downloadFeeReceipt).
export function getAuthToken(): string | null {
  return authToken;
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

/**
 * Whether a failed call means this session is over (the token expired or was revoked) rather than the server
 * refusing something else. A 401 is not always a dead session: a wrong wallet PIN (WRONG_PIN) and a wrong
 * password (INVALID_CREDENTIALS) are 401s too, and signing the user out for them would throw them out of the
 * app for a typo. The server's guard answers an expired token with the default code UNAUTHORIZED (or none),
 * and every other 401 carries its own code.
 */
export function isSessionExpired(error: unknown): boolean {
  const failure = error as { config?: { url?: unknown }; response?: { status?: number; data?: { errorCode?: unknown } } } | null;
  if (failure?.response?.status !== 401) return false;
  if (String(failure.config?.url ?? "").includes("/auth/login")) return false;
  const code = failure.response?.data?.errorCode;
  return code === undefined || code === null || code === "UNAUTHORIZED";
}

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (isSessionExpired(error)) {
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
  const failure = error as { response?: unknown; code?: string; message?: string } | null;
  // No answer at all (wrong server address, server down, phone offline): say that, not "could not log in".
  if (failure && !failure.response && (failure.code === "ERR_NETWORK" || failure.code === "ECONNABORTED" || failure.message === "Network Error")) {
    return "Could not reach the server. Check your internet connection and try again.";
  }
  const message = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  if (Array.isArray(message)) return typeof message[0] === "string" ? message[0] : fallback;
  if (typeof message === "string") return message;
  return fallback;
}
