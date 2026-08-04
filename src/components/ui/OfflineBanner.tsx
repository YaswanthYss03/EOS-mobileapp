import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import NetInfo from "@react-native-community/netinfo";
import { fonts } from "@/theme";

type Status = "offline" | "backOnline" | null;

// Mounted once at the app root (see app/_layout.tsx) so it shows on every tab,
// including the Craveo module - shows a persistent banner while offline, then
// briefly shows "Back Online" and hides itself once the connection returns.
export function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<Status>(null);
  const wasOffline = useRef(false);
  const translateY = useRef(new Animated.Value(-120)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = Boolean(state.isConnected && state.isInternetReachable !== false);

      if (!connected) {
        if (hideTimer.current) clearTimeout(hideTimer.current);
        wasOffline.current = true;
        setStatus("offline");
      } else if (wasOffline.current) {
        wasOffline.current = false;
        setStatus("backOnline");
        hideTimer.current = setTimeout(() => setStatus(null), 2500);
      }
    });

    return () => {
      unsubscribe();
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: status ? 0 : -120,
      useNativeDriver: true,
      tension: 120,
      friction: 14,
    }).start();
  }, [status, translateY]);

  if (!status) return null;

  const isOffline = status === "offline";

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.container, { top: insets.top + 8, transform: [{ translateY }] }]}
    >
      <View style={[styles.card, isOffline ? styles.cardOffline : styles.cardOnline]}>
        <View style={styles.iconWrap}>
          <Ionicons name={isOffline ? "cloud-offline-outline" : "checkmark-circle"} size={20} color="#fff" />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.title}>{isOffline ? "No Internet Connection" : "Back Online"}</Text>
          <Text style={styles.subtitle}>
            {isOffline ? "Check your Wi-Fi or mobile data" : "You're connected again"}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 9998,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    elevation: 6,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  cardOffline: {
    backgroundColor: "#DC2626",
  },
  cardOnline: {
    backgroundColor: "#1E8A5A",
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  textWrap: {
    flex: 1,
  },
  title: {
    color: "#fff",
    fontSize: 14,
    fontFamily: fonts.bold,
  },
  subtitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    fontFamily: fonts.regular,
    marginTop: 1,
  },
});
