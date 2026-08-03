export type ToastType = "success" | "error" | "info" | "warning";

export type ToastState = {
  id: number;
  type: ToastType;
  message: string;
} | null;

type Listener = (state: ToastState) => void;

// Simple module-level pub-sub, not React Context - this needs to be callable
// from plain non-component code too (services/utils across the app, including
// Craveo's own .js files), not just from within a component tree.
let listener: Listener | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;
let nextId = 1;

function show(type: ToastType, message: string, duration = 3000) {
  if (!listener) return;
  if (hideTimer) clearTimeout(hideTimer);
  listener({ id: nextId++, type, message });
  hideTimer = setTimeout(() => listener?.(null), duration);
}

export function hideToast() {
  if (hideTimer) clearTimeout(hideTimer);
  listener?.(null);
}

// Single global toast API - one host component (ToastHost, mounted once at the
// app root) renders whatever is currently shown, so every tab/screen (including
// the Craveo module) shares one consistent look instead of each area rendering
// its own toast UI.
export const toast = {
  success: (message: string, duration?: number) => show("success", message, duration),
  error: (message: string, duration?: number) => show("error", message, duration),
  info: (message: string, duration?: number) => show("info", message, duration),
  warning: (message: string, duration?: number) => show("warning", message, duration),
};

export function subscribeToast(fn: Listener) {
  listener = fn;
  return () => {
    if (listener === fn) listener = null;
  };
}
