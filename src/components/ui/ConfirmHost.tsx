import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { subscribeConfirm, type PendingConfirm } from "@/utils/confirm";
import { fonts } from "@/theme";

// Mounted once at the app root (see app/_layout.tsx, right alongside
// ToastHost) - every screen shows its "are you sure?" confirmations through
// this one component via src/utils/confirm, instead of each screen calling
// the plain system Alert.alert.
export function ConfirmHost() {
  const [pending, setPending] = useState<PendingConfirm>(null);

  useEffect(() => subscribeConfirm(setPending), []);

  if (!pending) return null;

  const destructive = pending.destructive ?? false;
  const accentColor = destructive ? "#DC2626" : "#2F6FE0";

  function respond(value: boolean) {
    pending?.resolve(value);
    setPending(null);
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => respond(false)}>
      <Pressable style={styles.overlay} onPress={() => respond(false)}>
        {/* Inner Pressable with a no-op handler stops a tap on the card
            itself from bubbling to the backdrop's dismiss handler. */}
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={[styles.iconWrap, { backgroundColor: `${accentColor}1A` }]}>
            <Ionicons name={destructive ? "warning-outline" : "help-circle-outline"} size={24} color={accentColor} />
          </View>
          <Text style={styles.title}>{pending.title}</Text>
          {pending.message && <Text style={styles.message}>{pending.message}</Text>}
          <View style={styles.buttonRow}>
            <Pressable style={styles.cancelButton} onPress={() => respond(false)} hitSlop={4}>
              <Text style={styles.cancelText}>{pending.cancelText ?? "Cancel"}</Text>
            </Pressable>
            <Pressable
              style={[styles.confirmButton, { backgroundColor: accentColor }]}
              onPress={() => respond(true)}
              hitSlop={4}
            >
              <Text style={styles.confirmText}>{pending.confirmText ?? "Confirm"}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: "#111827",
    textAlign: "center",
  },
  message: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 19,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 22,
    width: "100%",
  },
  cancelButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 13,
  },
  cancelText: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: "#4B5563",
  },
  confirmButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: 13,
  },
  confirmText: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#fff",
  },
});
