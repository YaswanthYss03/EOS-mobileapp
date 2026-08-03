import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { hideToast, subscribeToast, type ToastState, type ToastType } from "@/utils/toast";

const ICONS: Record<ToastType, keyof typeof Ionicons.glyphMap> = {
  success: "checkmark-circle",
  error: "alert-circle",
  info: "information-circle",
  warning: "warning",
};

const COLORS: Record<ToastType, string> = {
  success: "#1E8A5A",
  error: "#DC2626",
  info: "#235EAA",
  warning: "#B45309",
};

// Mounted once at the app root (see app/_layout.tsx) - every tab, including the
// Craveo module, shows toasts through this one component via src/utils/toast.
export function ToastHost() {
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<ToastState>(null);
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => subscribeToast(setState), []);

  useEffect(() => {
    const toValue = state ? 0 : -100;
    const targetOpacity = state ? 1 : 0;
    Animated.parallel([
      Animated.spring(translateY, { toValue, useNativeDriver: true, tension: 120, friction: 14 }),
      Animated.timing(opacity, { toValue: targetOpacity, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [state, translateY, opacity]);

  if (!state) return null;

  const color = COLORS[state.type];

  return (
    <Animated.View
      style={[styles.container, { top: insets.top + 8, transform: [{ translateY }], opacity }]}
    >
      <Pressable style={styles.toast} onPress={hideToast}>
        <View style={[styles.iconWrap, { backgroundColor: `${color}1A` }]}>
          <Ionicons name={ICONS[state.type]} size={18} color={color} />
        </View>
        <Text style={styles.message} numberOfLines={2}>
          {state.message}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    elevation: 6,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#111",
  },
});
