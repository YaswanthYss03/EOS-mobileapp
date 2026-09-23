import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import {
  AccessibilityInfo,
  Modal,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

const GAP = 4; // space between the trigger and the dropdown
const EDGE_MARGIN = 8; // minimum space kept from any screen edge
const OPEN_MS = 180;
const CLOSE_MS = 130;

type Rect = { x: number; y: number; width: number; height: number };
type Position = { top: number; left: number; openAbove: boolean };

function computePosition(
  anchor: Rect,
  contentW: number,
  contentH: number,
  winW: number,
  winH: number,
  insetBottom: number,
  align: "left" | "right",
): Position {
  let left = align === "right" ? anchor.x + anchor.width - contentW : anchor.x;
  if (left + contentW > winW - EDGE_MARGIN) left = winW - EDGE_MARGIN - contentW;
  if (left < EDGE_MARGIN) left = EDGE_MARGIN;

  let top = anchor.y + anchor.height + GAP;
  let openAbove = false;
  const bottomLimit = winH - insetBottom - EDGE_MARGIN;
  if (top + contentH > bottomLimit) {
    const aboveTop = anchor.y - contentH - GAP;
    if (aboveTop >= EDGE_MARGIN) {
      top = aboveTop;
      openAbove = true;
    } else {
      // Doesn't cleanly fit either side (very tall content) - clamp fully
      // on-screen rather than ever letting it clip past an edge.
      top = Math.max(EDGE_MARGIN, bottomLimit - contentH);
    }
  }
  return { top, left, openAbove };
}

// The one shared behavior system for every dropdown/select/menu in the app:
// anchor measurement, below/above flip, screen-edge clamping, open/close
// fade+slide, outside-tap and Android-back to close. Screens keep 100% of
// their own visual design (colors/fonts/option rows/checkmarks) - this only
// owns positioning, animation and interaction, replacing what used to be a
// full-screen centered <Modal> per screen.
export function AnchoredDropdown({
  anchorRef,
  visible,
  onClose,
  children,
  align = "left",
  contentStyle,
}: {
  anchorRef: RefObject<View | null>;
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  align?: "left" | "right";
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();

  // Kept mounted a beat longer than `visible` so the close animation can
  // finish before the Modal (and its content) unmounts.
  const [rendered, setRendered] = useState(false);
  const [anchorRect, setAnchorRect] = useState<Rect | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const positionRef = useRef<Position | null>(null);
  const reduceMotionRef = useRef(false);

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled?.().then((enabled) => {
      reduceMotionRef.current = enabled;
    });
  }, []);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  // Re-measure only when the dropdown transitions closed -> open, never on
  // every render - the anchor's on-screen rect can't change while closed.
  useEffect(() => {
    if (visible) {
      setRendered(true);
      setPosition(null);
      anchorRef.current?.measureInWindow((x, y, width, height) => {
        setAnchorRect({ x, y, width, height });
      });
    } else if (rendered) {
      const startY = reduceMotionRef.current ? 0 : positionRef.current?.openAbove ? 8 : -8;
      opacity.value = withTiming(0, { duration: CLOSE_MS, easing: Easing.out(Easing.cubic) });
      translateY.value = withTiming(startY, { duration: CLOSE_MS, easing: Easing.out(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(setRendered)(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Second measurement pass: content is laid out off-screen (invisible) once
  // the anchor rect is known, then the real position is computed from its
  // natural size - this is what lets the dropdown flip above/clamp to edges
  // instead of guessing a size up front.
  function handleContentLayout(width: number, height: number) {
    if (!anchorRect || position) return;
    const next = computePosition(anchorRect, width, height, winW, winH, insets.bottom, align);
    setPosition(next);
    const startY = reduceMotionRef.current ? 0 : next.openAbove ? 8 : -8;
    opacity.value = 0;
    translateY.value = startY;
    opacity.value = withTiming(1, { duration: OPEN_MS, easing: Easing.out(Easing.cubic) });
    translateY.value = withTiming(0, { duration: OPEN_MS, easing: Easing.out(Easing.cubic) });
  }

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!rendered) return null;

  return (
    <Modal transparent visible={rendered} onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      {anchorRect && (
        <View
          style={[
            styles.wrap,
            position ? { top: position.top, left: position.left } : styles.measuring,
          ]}
          pointerEvents={position ? "box-none" : "none"}
          onLayout={(e) => handleContentLayout(e.nativeEvent.layout.width, e.nativeEvent.layout.height)}
        >
          <Animated.View style={[contentStyle, animatedStyle]}>{children}</Animated.View>
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
  },
  measuring: {
    top: 0,
    left: -9999,
    opacity: 0,
  },
});
