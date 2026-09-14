import { Pressable, View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMessaging } from "@/context/MessagingContext";

// Shared "open Messages" icon + unread badge, in the Home tab's own header
// (HomeHeader) for every role. Same plain circular translucent-white chip
// as every other header icon button here (see HomeHeader's own
// styles.iconButton, used for the wallet button) - just the message-square
// icon on its own, no separate solid-color box. The unread badge sits
// inside the circle's own bounds, not poking outside its edge.
export function MessagesIconButton() {
  const router = useRouter();
  const { unreadCount } = useMessaging();

  return (
    <Pressable
      style={styles.iconButton}
      hitSlop={8}
      onPress={() => router.push("/(tabs)/home/messages" as never)}
    >
      <Ionicons name="chatbox-outline" size={18} color="#fff" />
      {unreadCount > 0 && <View style={styles.badge} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#DC2626",
    borderWidth: 1,
    borderColor: "#2F6FE0",
  },
});
