import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { fonts } from "@/theme";
import { useAuth } from "@/context/AuthContext";

function greetingNameFromEmail(email: string) {
  const localPart = email.split("@")[0] ?? email;
  return localPart.charAt(0).toUpperCase() + localPart.slice(1);
}

// Notification/wallet icons live in HomeHeader now - this row is just the
// menu button (opens /profile) and the greeting.
export function TopBar() {
  const router = useRouter();
  const { user } = useAuth();
  const name = user ? greetingNameFromEmail(user.email) : "there";

  return (
    <View style={styles.container}>
      <Pressable style={styles.menuButton} hitSlop={8} onPress={() => router.push("/profile")}>
        <Ionicons name="menu-outline" size={22} color="#2F6FE0" />
      </Pressable>
      <Text style={styles.greeting}>Hi, {name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  menuButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  greeting: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
});
