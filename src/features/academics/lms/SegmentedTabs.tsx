import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { fonts } from "@/theme";

// Google-Classroom-style underline tabs: flat row, no pill background,
// active tab called out with bold text + a colored underline bar.
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
    <View style={styles.wrap}>
      {tabs.map((tab) => {
        const selected = tab.key === active;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => onChange(tab.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, selected && styles.tabTextSelected]} numberOfLines={1}>
              {tab.label}
            </Text>
            <View style={[styles.underline, selected && styles.underlineActive]} />
          </TouchableOpacity>
        );
      })}
    </View>
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
    marginTop: 10,
    height: 3,
    width: "70%",
    borderRadius: 3,
    backgroundColor: "transparent",
  },
  underlineActive: {
    backgroundColor: "#2F6FE0",
  },
});
