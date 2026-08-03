import { View, Text, Image, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// TODO: swap the hardcoded name/avatar for the logged-in user from src/context/AuthContext
export function TopBar({ name = "Yaswanth" }: { name?: string }) {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <Image source={{ uri: "https://i.pravatar.cc/150?img=8" }} style={styles.avatar} />
        <Text style={styles.greeting}>Hi {name}!</Text>
      </View>

      <View style={styles.right}>
        <Pressable style={styles.iconButton} hitSlop={8}>
          <Ionicons name="notifications-outline" size={24} color="#111" />
          <View style={styles.badge} />
        </Pressable>
        <Pressable style={styles.iconButton} hitSlop={8}>
          <Ionicons name="wallet-outline" size={24} color="#111" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#fff",
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  greeting: {
    fontSize: 16,
    fontWeight: "600",
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  iconButton: {
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -1,
    right: -1,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#d33",
  },
});
