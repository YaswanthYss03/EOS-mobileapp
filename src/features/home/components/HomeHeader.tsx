import { useCallback, useEffect, useState } from "react";
import { View, Text, Image, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/theme";
import { useRole } from "@/hooks/useRole";
import { getUnreadCount } from "@/services/api/notifications.api";

const logoSource = require("../../../../assets/logo.png");

// Home-only variant of the shared CollegeHeader (src/components/layout/CollegeHeader)
// that trades the "LEADERSHIP & EXCELLENCE" tagline for notification/wallet
// icon buttons. Swapped in only while Home is focused - see
// HomeFeedScreen's useFocusEffect, same pattern as the ERP employee
// dashboard's header override.
export function HomeHeader() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const role = useRole();
  // Every role has a wallet except Parent - see EOSbackend1's wallet
  // module's @Roles (everything but ROLES.PARENT).
  const hasWallet = role !== "parent";
  const [unreadCount, setUnreadCount] = useState(0);

  // Re-fetches every time Home regains focus (e.g. coming back from the
  // notifications screen after marking some read) - cheap enough for a
  // single count query to not need a dedicated refresh trigger.
  useFocusEffect(
    useCallback(() => {
      getUnreadCount()
        .then(setUnreadCount)
        .catch(() => {
          // Best-effort - a stale/missing badge count isn't worth surfacing an error for.
        });
    }, []),
  );

  return (
    <LinearGradient
      colors={["#2F6FE0", "#1A3D8F"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, { paddingTop: insets.top + 10 }]}
    >
      <Image source={logoSource} style={styles.logo} />
      <Text style={styles.title} numberOfLines={1}>
        Sri Eshwar College of Engineering
      </Text>

      <View style={styles.actions}>
        <Pressable
          style={styles.iconButton}
          hitSlop={8}
          onPress={() => router.push("/(tabs)/home/notifications" as never)}
        >
          <Ionicons name="notifications-outline" size={18} color="#fff" />
          {unreadCount > 0 && <View style={styles.badge} />}
        </Pressable>
        {hasWallet && (
          <Pressable
            style={styles.iconButton}
            hitSlop={8}
            // Wallet is a root-level route (app/wallet/index.tsx), a
            // sibling of (tabs) rather than nested inside the ERP tab -
            // opening it from here must not flip the bottom tab bar's
            // active tab to ERP, same reasoning as id-card.tsx/profile.tsx.
            onPress={() => router.push("/wallet" as never)}
          >
            <Ionicons name="wallet-outline" size={18} color="#fff" />
          </Pressable>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  logo: {
    width: 32,
    height: 32,
  },
  title: {
    flex: 1,
    color: "#fff",
    fontSize: 14,
    fontFamily: fonts.bold,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
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
