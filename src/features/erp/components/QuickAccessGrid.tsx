import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { fonts } from "@/theme";
import type { QuickAccessItem } from "../types";

const ICON_COLOR = "#2F6FE0";

// Sizes for a 4-per-row grid (Campus) vs a 3-per-row row with room to spare
// (Quick Access) - the fewer items per row, the bigger the circle can be.
const SIZES = {
  default: { columnWidth: "25%" as const, circle: 60, iconSize: 24, materialIconSize: 26 },
  large: { columnWidth: "33.33%" as const, circle: 76, iconSize: 30, materialIconSize: 32 },
};

// Shared across all ERP role dashboards (student, employee, ...) - each
// dashboard supplies its own item data, this just renders the icon grid.
// Items without a `route` are still inert - TODO: wire the rest up to their
// own view-only pages under app/(tabs)/erp/<role>/<item>/ or a shared one.
export function QuickAccessGrid({
  items,
  size = "default",
}: {
  items: QuickAccessItem[];
  size?: keyof typeof SIZES;
}) {
  const router = useRouter();
  const { columnWidth, circle, iconSize, materialIconSize } = SIZES[size];

  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <Pressable
          key={item.id}
          style={[styles.item, { width: columnWidth }]}
          onPress={item.route ? () => router.push(item.route as never) : undefined}
        >
          <View style={[styles.iconWrap, { width: circle, height: circle, borderRadius: circle / 2 }]}>
            {item.library === "material" ? (
              <MaterialCommunityIcons name={item.icon as never} size={materialIconSize} color="#fff" />
            ) : (
              <Ionicons name={item.icon as never} size={iconSize} color="#fff" />
            )}
          </View>
          <Text style={styles.label} numberOfLines={2}>
            {item.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  item: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
  },
  iconWrap: {
    backgroundColor: ICON_COLOR,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: "#333",
    textAlign: "center",
  },
});
