import { type ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

// Tab/segment switches render instantly - no slide/fade transition. Kept as
// a thin wrapper (rather than removing it and inlining `children` at every
// call site) so the ~40 screens that already import this one component
// don't each need their own edit if a transition is ever wanted back.
export function TabTransitionView({
  children,
  style,
}: {
  activeKey: string;
  order: readonly string[];
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.container, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
});
