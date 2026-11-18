import { View, Text, Image, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fonts } from "@/theme";

// Shared branding bar shown above all 5 bottom tabs (see app/(tabs)/_layout.tsx).
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
      <View style={styles.logoSlot}>
        <Image source={logoSource} style={styles.logo} />
      </View>
      {/* flex: 1 gives the texts exactly the room left beside the logo, so on any screen width the name stays on one
          line: it shrinks to fit (down to 70% of its size) instead of wrapping, and ignores the phone's font-size
          setting, which would otherwise make it wrap again. */}
      <View style={styles.texts}>
        <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1}>
          Sri Eshwar College of Engineering
        </Text>
        <Text style={styles.subtitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1}>
          LEADERSHIP & EXCELLENCE
        </Text>
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
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
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
  logoSlot: {
    flexShrink: 0,
  },
  texts: {
    flex: 1,
    minWidth: 0,
  },
  logo: {
    width: 44,
    height: 44,
    resizeMode: "cover",
  },
  title: {
    color: "#fff",
    fontSize: 15,
    fontFamily: fonts.bold,
  },
  subtitle: {
    color: "#D7E2FA",
    fontSize: 11,
    fontFamily: fonts.semibold,
    letterSpacing: 0.5,
    marginTop: 2,
  },
});
