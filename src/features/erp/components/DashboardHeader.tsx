import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/theme";

// Shared by every role's ERP dashboard root (Student/Employee/HoD/...) -
// swapped in for the shared CollegeHeader (logo + college name + tagline)
// while that role's dashboard is focused, same useFocusEffect pattern each
// dashboard already used individually before this was extracted. Title is
// always just the college name, same text on every tab in every login, per
// explicit request - no per-role subtitle ("Parent services"/"Employee
// services"/...) anymore. `subtitle` is still accepted (most call sites
// still pass one) but deliberately unused/unrendered now, rather than
// touching every one of those call sites for a prop that's inert either
// way - remove it from a call site's own props only when touching that
// file for another reason.
export function DashboardHeader({ onBack }: { subtitle?: string; onBack: () => void }) {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={["#2F6FE0", "#1A3D8F"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, { paddingTop: insets.top + 10 }]}
    >
      <TouchableOpacity
        onPress={onBack}
        style={styles.backButton}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="arrow-back" size={20} color="#fff" />
      </TouchableOpacity>
      <View style={styles.titleWrap}>
        <Text style={styles.title} numberOfLines={2}>
          Sri Eshwar College of Engineering
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
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    color: "#fff",
    fontSize: 16,
    fontFamily: fonts.bold,
  },
  subtitle: {
    color: "#D7E2FA",
    fontSize: 12,
    fontFamily: fonts.semibold,
    marginTop: 2,
  },
});
