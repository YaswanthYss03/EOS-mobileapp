// Consolidated HTTP client for the RestaurantAppClean backend (Express + Prisma).
// Replaces the old direct-to-Supabase calls in supabaseAPI.js/supabaseClient.js and
// merges what used to be split across services/apiClient.js and services/secureAPI.js
// into a single module.
//
// Responsibilities:
//  - Attach `Authorization: Bearer <token>` from the same SecureStore key the app has
//    always used ('userToken' / 'userData' — see config/supabaseClient.js's
//    BillingDBHelper.signInUser/getCurrentUser).
//  - Normalize errors/timeouts into plain Error objects with `.statusCode`/`.code`.
//
// Note: the backend used to also require an HMAC request-signature header on the
// secure order-creation endpoints (backend/routes/secure/authMiddleware.js's
// validateRequestSignature). That's been removed server-side — the signing secret
// only ever existed in the backend's own .env, so the client had no legitimate way
// to compute a matching signature without shipping that secret into the app bundle
// (the same class of problem as the Supabase service-role key this migration
// removes). The JWT bearer token already authenticates the user, which is what
// actually matters here.
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL, APP_CONFIG } from '../constants/config';

// Same keys BillingDBHelper (config/supabaseClient.js) has always used, so a session
// created by the old code (or the other in-flight migration work) is still readable.
const TOKEN_KEY = 'userToken';
const USER_KEY = 'userData';

export async function getToken() {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error('httpClient.getToken error:', error);
    return null;
  }
}

export async function getStoredUser() {
  try {
    const raw = await SecureStore.getItemAsync(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error('httpClient.getStoredUser error:', error);
    return null;
  }
}

export async function saveSession(token, user) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user || {}));
}

export async function clearSession() {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
  } catch (error) {
    console.error('httpClient.clearSession error:', error);
  }
}

// Decodes (without verifying) the payload of a JWT the app already holds, so we can
// read our own `user_id` out of it client-side (e.g. to hit a user-scoped GET route)
// without an extra round trip. Never use this to trust claims from someone else's token.
export function decodeJwtPayload(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(json);
  } catch (error) {
    console.error('httpClient.decodeJwtPayload error:', error);
    return null;
  }
}

/**
 * Core request helper.
 * @param {string} path - path relative to API_BASE_URL, e.g. '/menu/dishes'
 * @param {object} options
 * @param {'GET'|'POST'|'PUT'|'PATCH'|'DELETE'} [options.method='GET']
 * @param {object} [options.body]
 * @param {boolean} [options.auth=true] - attach Authorization: Bearer <token> if a token exists
 * @param {number} [options.timeout]
 */
export async function apiRequest(path, options = {}) {
  const {
    method = 'GET',
    body,
    auth = true,
    timeout = APP_CONFIG.DEFAULT_TIMEOUT,
  } = options;

  const url = `${API_BASE_URL}${path}`;
  const headers = { 'Content-Type': 'application/json' };

  if (auth) {
    const token = await getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout: server is taking too long to respond');
    }
    throw new Error('Network error. Please check your connection.');
  }
  clearTimeout(timeoutId);

  let json = null;
  try {
    json = await response.json();
  } catch (_) {
    // Non-JSON body (or empty) — leave json as null.
  }

  if (!response.ok) {
    const message =
      (json && (json.error || json.message)) ||
      `HTTP ${response.status}: ${response.statusText}`;
    const error = new Error(message);
    error.statusCode = response.status;
    error.code = json && json.code;
    error.details = json && json.details;
    error.body = json;
    throw error;
  }

  return json;
}

export { API_BASE_URL };
