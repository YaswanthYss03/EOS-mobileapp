import { useRef } from "react";
import type { FlatList, NativeScrollEvent, NativeSyntheticEvent, ScrollView } from "react-native";

type ScrollableNode = ScrollView | FlatList<unknown> | null;

// Pairs with TabTransitionView: since an inactive tab's scroll container
// unmounts while it's off-screen (see TabTransitionView's doc comment), its
// scroll offset would normally reset to 0 the next time that tab is
// selected. This keeps a small per-screen offset map alive across those
// remounts and reapplies it once the container comes back, so each tab
// "remembers" approximately where the user left it. Works with both
// ScrollView and FlatList - their onScroll payload is identical, only the
// imperative "jump to offset" call differs (scrollTo vs scrollToOffset).
export function useTabScrollMemory() {
  const offsets = useRef(new Map<string, number>()).current;

  function bind(key: string) {
    return {
      onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        offsets.set(key, e.nativeEvent.contentOffset.y);
      },
      scrollEventThrottle: 32,
      ref: (node: ScrollableNode) => {
        if (!node) return;
        const saved = offsets.get(key);
        if (!saved) return;
        // Let this tab's own content finish laying out first, or there's
        // nothing yet to scroll into.
        requestAnimationFrame(() => {
          if ("scrollToOffset" in node) {
            node.scrollToOffset({ offset: saved, animated: false });
          } else {
            node.scrollTo({ y: saved, animated: false });
          }
        });
      },
    };
  }

  return { bind };
}
