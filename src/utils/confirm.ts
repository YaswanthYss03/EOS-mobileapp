export type ConfirmOptions = {
  title: string;
  message?: string;
  /** @default "Confirm" */
  confirmText?: string;
  /** @default "Cancel" */
  cancelText?: string;
  /** Red accent + confirm button, for irreversible/destructive actions. */
  destructive?: boolean;
};

export type PendingConfirm = (ConfirmOptions & { resolve: (value: boolean) => void }) | null;

type Listener = (state: PendingConfirm) => void;

// Same module-level pub-sub as src/utils/toast.ts, for the same reason -
// callable from plain code, not just components. One host component
// (ConfirmHost, mounted once at the app root) renders whatever confirmation
// is currently pending.
let listener: Listener | null = null;

export function subscribeConfirm(fn: Listener) {
  listener = fn;
  return () => {
    if (listener === fn) listener = null;
  };
}

/**
 * Replaces React Native's Alert.alert() for the "are you sure?" confirm
 * pattern used all over this app (log out, delete, approve/reject, ...) -
 * the system Alert renders as a plain white box with ALL-CAPS buttons that
 * doesn't match anything else in this app's UI. Every call site here only
 * ever needed Cancel + one action, so this is a focused two-button
 * confirm rather than Alert.alert's general N-button API.
 *
 * Resolves true if the action button was pressed, false for
 * cancel/backdrop-tap/hardware-back.
 */
export function confirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    if (!listener) {
      resolve(false);
      return;
    }
    listener({ ...options, resolve });
  });
}
