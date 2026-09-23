import { useRef, useState, useCallback } from "react";
import { View } from "react-native";

// Every screen-local dropdown/select/picker in the app should use this
// instead of its own open/close boolean - pairs with <AnchoredDropdown>,
// which needs `anchorRef` (measured on open to position itself under/over
// the trigger) rather than a plain useState<boolean>.
export function useDropdown() {
  const anchorRef = useRef<View>(null);
  const [visible, setVisible] = useState(false);

  const open = useCallback(() => setVisible(true), []);
  const close = useCallback(() => setVisible(false), []);
  const toggle = useCallback(() => setVisible((v) => !v), []);

  return { anchorRef, visible, open, close, toggle };
}
