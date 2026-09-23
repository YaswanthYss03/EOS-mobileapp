import { View, Text, Image, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fonts } from "@/theme";

// Shared branding bar shown above all 5 bottom tabs (see app/(tabs)/_layout.tsx).
// No message icon here (unlike HomeHeader) - the Messages entry point is
// Home-tab-only, by design, for every login. Just the college name, no
// tagline - matches HomeHeader's own simpler look (logo + name, nothing
// else), per explicit request that every tab's header be consistent with it.
const logoSource = require("../../../assets/logo.png");

export function CollegeHeader() {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={["#2F6FE0", "#1A3D8F"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, { paddingTop: insets.top + 10 }]}
    >
      <View>
        <Image source={logoSource} style={styles.logo} />
      </View>
      <View style={styles.titleWrap}>
        <Text style={styles.title}>Sri Eshwar College of Engineering</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  titleWrap: {
    flex: 1,
  },
  logoWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logo: {
    width: 44,
    height: 44,
    resizeMode: "cover",
  },
  title: {
    color: "#fff",
    fontSize: 16,
    fontFamily: fonts.bold,
    maxWidth: 260,
  },
  subtitle: {
    color: "#D7E2FA",
    fontSize: 11,
    fontFamily: fonts.semibold,
    letterSpacing: 0.5,
    marginTop: 2,
  },
});
