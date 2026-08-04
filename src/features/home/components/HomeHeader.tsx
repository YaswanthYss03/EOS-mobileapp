import { View, Text, Image, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/theme";

const logoSource = require("../../../../assets/logo.png");

// Home-only variant of the shared CollegeHeader (src/components/layout/CollegeHeader)
// that trades the "LEADERSHIP & EXCELLENCE" tagline for notification/wallet
// icon buttons. Swapped in only while Home is focused - see
// HomeFeedScreen's useFocusEffect, same pattern as the ERP employee
// dashboard's header override.
export function HomeHeader() {
  const insets = useSafeAreaInsets();

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
        <Pressable style={styles.iconButton} hitSlop={8}>
          <Ionicons name="notifications-outline" size={18} color="#fff" />
          <View style={styles.badge} />
        </Pressable>
        <Pressable style={styles.iconButton} hitSlop={8}>
          <Ionicons name="wallet-outline" size={18} color="#fff" />
        </Pressable>
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
