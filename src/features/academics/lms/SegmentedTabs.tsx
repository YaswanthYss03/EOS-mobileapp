import { StyleSheet } from "react-native";
import { fonts } from "@/theme";
import { AnimatedTabBar } from "@/components/ui/tabs";

// Google-Classroom-style underline tabs: flat row, no pill background,
// active tab called out with bold text + a colored underline bar that now
// glides to the tapped tab instead of instantly swapping (via the shared
// AnimatedTabBar motion layer - same at-rest look as before).
export function SegmentedTabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: T; label: string }[];
  active: T;
  onChange: (key: T) => void;
}) {
  return (
    <AnimatedTabBar
      tabs={tabs}
      active={active}
      onChange={onChange}
      containerStyle={styles.wrap}
      tabStyle={styles.tab}
      tabTextStyle={styles.tabText}
      activeTabTextStyle={styles.tabTextSelected}
      indicatorStyle={styles.underline}
      indicatorWidthRatio={0.7}
    />
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF0F4",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingBottom: 12,
  },
  tabText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#8A93A3",
  },
  tabTextSelected: {
    color: "#1A3D8F",
    fontFamily: fonts.bold,
  },
  underline: {
    bottom: 0,
    height: 3,
    borderRadius: 3,
    backgroundColor: "#2F6FE0",
  },
});
