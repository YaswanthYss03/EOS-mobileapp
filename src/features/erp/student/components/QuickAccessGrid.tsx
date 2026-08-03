import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { quickAccessItems } from "../data/mockDashboard";

// TODO: wire each item to its own view-only page under app/(tabs)/erp/student/<item>/
export function QuickAccessGrid() {
  return (
    <View style={styles.grid}>
      {quickAccessItems.map((item) => (
        <Pressable key={item.id} style={styles.item}>
          <View style={styles.iconWrap}>
            <Ionicons name={item.icon} size={22} color="#1E3A8A" />
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
    width: "25%",
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#EEF1FA",
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 11,
    color: "#333",
    textAlign: "center",
  },
});
