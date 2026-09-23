import { useRef, type ReactNode } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { TAB_TRANSITION_EASING, TAB_TRANSITION_MS } from "./tabTransitionConfig";

export type AnimatedTabBarItem<T extends string> = { key: T; label: string };

// The one shared moving-indicator tab row, pairing with TabTransitionView so
// content motion and indicator motion stay in lockstep. Purely a motion
// layer: every visual (colors, padding, radius, fonts) is supplied by the
// caller's own existing style objects via the *Style props below, so a
// screen's at-rest look is unchanged - this only makes the active
// pill/underline glide to the tapped tab instead of instantly swapping.
export function AnimatedTabBar<T extends string>({
  tabs,
  active,
  onChange,
  containerStyle,
  tabStyle,
  tabTextStyle,
  activeTabTextStyle,
  indicatorStyle,
  indicatorInset = 0,
  indicatorWidthRatio,
  trailing,
}: {
  tabs: AnimatedTabBarItem<T>[];
  active: T;
  onChange: (key: T) => void;
  containerStyle?: StyleProp<ViewStyle>;
  tabStyle?: StyleProp<ViewStyle>;
  tabTextStyle?: StyleProp<TextStyle>;
  activeTabTextStyle?: StyleProp<TextStyle>;
  indicatorStyle?: StyleProp<ViewStyle>;
  // Shrinks the indicator inward from the tab's own measured width by a
  // fixed number of px - e.g. an underline drawn narrower than its tab.
  indicatorInset?: number;
  // Alternative to indicatorInset: size the indicator as a fraction (0-1) of
  // the tab's own measured width instead of a fixed px inset either side -
  // e.g. 0.7 for a centered bar 70% as wide as its tab, regardless of how
  // wide that tab actually renders (used by the underline variant).
  indicatorWidthRatio?: number;
  // Extra non-tab elements rendered after the row (e.g. a "Clear" button) -
  // kept outside the measured tab set so they don't get treated as a tab.
  trailing?: ReactNode;
}) {
  const rects = useRef(new Map<string, { x: number; width: number }>()).current;
  const indicatorX = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);
  const hasMeasuredActive = useRef(false);

  function indicatorRectFor(rect: { x: number; width: number }) {
    if (indicatorWidthRatio !== undefined) {
      const width = rect.width * indicatorWidthRatio;
      return { x: rect.x + (rect.width - width) / 2, width };
    }
    return { x: rect.x + indicatorInset, width: Math.max(rect.width - indicatorInset * 2, 0) };
  }

  function handleTabLayout(key: string, e: LayoutChangeEvent) {
    const { x, width } = e.nativeEvent.layout;
    rects.set(key, { x, width });
    if (key === active && !hasMeasuredActive.current) {
      // First measurement of the active tab - snap in place, no
      // entrance-slide from 0 on initial mount.
      const target = indicatorRectFor({ x, width });
      indicatorX.value = target.x;
      indicatorWidth.value = target.width;
      hasMeasuredActive.current = true;
    }
  }

  function handlePress(key: T) {
    onChange(key);
    const rect = rects.get(key);
    if (rect) {
      const target = indicatorRectFor(rect);
      indicatorX.value = withTiming(target.x, { duration: TAB_TRANSITION_MS, easing: TAB_TRANSITION_EASING });
      indicatorWidth.value = withTiming(target.width, {
        duration: TAB_TRANSITION_MS,
        easing: TAB_TRANSITION_EASING,
      });
    }
  }

  const indicatorAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: indicatorWidth.value,
  }));

  return (
    // `containerStyle` is the caller's own tab-row style and is already
    // `flexDirection: "row"` - it used to get wrapped in an EXTRA inner row
    // View here, which broke layout: a row parent doesn't stretch a
    // childless-of-explicit-width child across its main axis the way a
    // column parent stretches cross-axis by default, so that inner row (and
    // every flex:1 button inside it) collapsed to near-zero size instead of
    // filling the card - the tab row rendered as an empty box. Rendering
    // indicator/tabs/trailing directly inside containerStyle removes the
    // extra nesting entirely, since RN doesn't need an explicit
    // `position: relative` ancestor for `position: absolute` children.
    <View style={containerStyle}>
      <Animated.View style={[styles.indicator, indicatorStyle, indicatorAnimatedStyle]} pointerEvents="none" />
      {tabs.map((tab) => {
        const selected = tab.key === active;
        return (
          <TouchableOpacity
            key={tab.key}
            style={tabStyle}
            onPress={() => handlePress(tab.key)}
            onLayout={(e) => handleTabLayout(tab.key, e)}
            activeOpacity={0.8}
          >
            <Text style={[tabTextStyle, selected && activeTabTextStyle]} numberOfLines={1}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  indicator: {
    // Only positioning primitives that never conflict with a caller's own
    // vertical placement (top/bottom/height, e.g. full-height pill fill vs
    // a thin bottom underline) - those come entirely from `indicatorStyle`.
    position: "absolute",
    left: 0,
  },
});
