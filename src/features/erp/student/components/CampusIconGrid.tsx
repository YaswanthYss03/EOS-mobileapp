import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { fonts } from "@/theme";
import type { CampusItem } from "../types";

const ICON_COLOR = "#2F6FE0";

// Student-only "Campus" grid - 3-per-row circular icons with a label and a
// bold value line underneath. Local to the student dashboard so the shared
// QuickAccessGrid (used by every other role) stays untouched.
export function CampusIconGrid({ items }: { items: CampusItem[] }) {
  const router = useRouter();

  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <Pressable
          key={item.id}
          style={styles.item}
          onPress={item.route ? () => router.push(item.route as never) : undefined}
        >
          <View style={styles.iconWrap}>
            {item.library === "material" ? (
              <MaterialCommunityIcons name={item.icon as never} size={26} color="#fff" />
            ) : (
              <Ionicons name={item.icon as never} size={24} color="#fff" />
            )}
          </View>
          <Text style={styles.label} numberOfLines={1}>
            {item.label}
          </Text>
          <Text style={styles.value} numberOfLines={1}>
            {item.value}
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
    width: "33.33%",
    alignItems: "center",
    gap: 4,
    paddingVertical: 14,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: ICON_COLOR,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#8A93A3",
  },
  value: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#1E3A8A",
  },
});
