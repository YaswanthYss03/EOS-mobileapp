import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SkeletonBlock } from "@/components/ui/Skeleton";
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
          {item.loading ? (
            <>
              <SkeletonBlock width="60%" height={16} style={{ marginBottom: 8 }} />
              <SkeletonBlock width="100%" height={4} borderRadius={2} style={{ marginBottom: 6 }} />
              <SkeletonBlock width="45%" height={10} />
            </>
          ) : (
            <>
              <Text style={styles.value} numberOfLines={1}>
                {item.value}
              </Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.min(100, item.progress * 100)}%` }]} />
              </View>
              <Text style={styles.subtitle} numberOfLines={1}>
                {item.subtitle}
              </Text>
            </>
          )}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
  },
  card: {
    width: "30%",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#EEF0F4",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: ICON_COLOR,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  label: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: "#8A93A3",
    marginBottom: 4,
    textAlign: "center",
  },
  value: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: "#111111",
    marginBottom: 8,
    textAlign: "center",
  },
  progressTrack: {
    width: "100%",
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
    textAlign: "center",
  },
});
