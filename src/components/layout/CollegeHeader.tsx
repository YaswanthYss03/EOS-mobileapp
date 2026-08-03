import { View, Text, Image, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
      <View>
        <Image source={logoSource} style={styles.logo} />
      </View>
      <View>
        <Text style={styles.title}>Sri Eshwar College of Engineering</Text>
        <Text style={styles.subtitle}>LEADERSHIP & EXCELLENCE</Text>
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
  logo: {
    width: 44,
    height: 44,
    resizeMode: "cover",
  },
  title: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    maxWidth: 260,
  },
  subtitle: {
    color: "#D7E2FA",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginTop: 2,
  },
});
