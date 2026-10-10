import type { LiveKitJoinInfo } from "@/services/api/online-class.api";

// Connection details for the call about to open, kept in memory only -
// the LiveKit token never goes into a route URL/params (which can be
// logged, persisted in navigation state, or deep-linked). The call screen
// takes it once; if it's missing or too old (the app was reloaded, or the
// short-lived token is near expiry) the call screen fetches a fresh one.

type CallSession = LiveKitJoinInfo & { clockOffsetMs: number; storedAt: number };

// Join tokens live 15 minutes on the backend; refresh well before that.
const MAX_AGE_MS = 10 * 60 * 1000;

let current: CallSession | null = null;

export function setCallSession(info: LiveKitJoinInfo) {
  const offset = new Date(info.serverTime).getTime() - Date.now();
  current = { ...info, clockOffsetMs: Number.isFinite(offset) ? offset : 0, storedAt: Date.now() };
}

/** Returns (and clears) the stored session for this class if it's still fresh. */
export function takeCallSession(onlineClassId: number): CallSession | null {
  const s = current;
  current = null;
  if (!s || s.onlineClassId !== onlineClassId || Date.now() - s.storedAt > MAX_AGE_MS) return null;
  return s;
}

export function toCallSession(info: LiveKitJoinInfo): CallSession {
  const offset = new Date(info.serverTime).getTime() - Date.now();
  return { ...info, clockOffsetMs: Number.isFinite(offset) ? offset : 0, storedAt: Date.now() };
}

export type { CallSession };
