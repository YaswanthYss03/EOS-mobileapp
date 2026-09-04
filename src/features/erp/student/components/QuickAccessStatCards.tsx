import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { fonts } from "@/theme";
import type { StatCardItem } from "../types";

const ICON_COLOR = "#2F6FE0";

// Student-only "Quick Access" cards - Attendance/Performance/Fees style
// summary tiles with a progress bar. Local to the student dashboard so the
// shared QuickAccessGrid (used by every other role) stays untouched.
export function QuickAccessStatCards({ items }: { items: StatCardItem[] }) {
  const router = useRouter();

  return (
    <View style={styles.row}>
      {items.map((item) => (
        <Pressable
          key={item.id}
          style={styles.card}
          onPress={item.route ? () => router.push(item.route as never) : undefined}
        >
          <View style={styles.iconWrap}>
            {item.library === "material" ? (
              <MaterialCommunityIcons name={item.icon as never} size={20} color="#fff" />
            ) : (
              <Ionicons name={item.icon as never} size={18} color="#fff" />
            )}
          </View>
          <Text style={styles.label} numberOfLines={1}>
            {item.label}
          </Text>
          <Text style={styles.value} numberOfLines={1}>
            {item.value}
          </Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.min(100, item.progress * 100)}%` }]} />
          </View>
          <Text style={styles.subtitle} numberOfLines={1}>
            {item.subtitle}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 10,
  },
  card: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#EEF0F4",
    borderRadius: 16,
    padding: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: ICON_COLOR,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  label: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: "#8A93A3",
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: "#111111",
    marginBottom: 8,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "#EEF0F4",
    overflow: "hidden",
    marginBottom: 6,
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: ICON_COLOR,
  },
  subtitle: {
    fontSize: 10,
    fontFamily: fonts.regular,
    color: "#8A93A3",
  },
});
