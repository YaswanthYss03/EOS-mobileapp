import { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { fonts } from "@/theme";
import { useAuth } from "@/context/AuthContext";
import { getMe } from "@/services/api/auth.api";

function greetingNameFromEmail(email: string) {
  const localPart = email.split("@")[0] ?? email;
  return localPart.charAt(0).toUpperCase() + localPart.slice(1);
}

// Notification/wallet icons live in HomeHeader now - this row is just the
// menu button (opens /profile) and the greeting.
export function TopBar() {
  const router = useRouter();
  const { user } = useAuth();
  // Shown instantly while the real name loads, so the greeting is never
  // blank - GET /auth/me resolves the caller's actual name server-side
  // (faculty/student profile, or email as a last resort - see
  // AuthService.resolveDisplayName) and replaces this guess once it's back.
  const [name, setName] = useState(user ? greetingNameFromEmail(user.email) : "there");

  useEffect(() => {
    getMe()
      .then((me) => setName(me.name))
      .catch(() => {}); // keep the email-derived guess if this fails
  }, []);

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
