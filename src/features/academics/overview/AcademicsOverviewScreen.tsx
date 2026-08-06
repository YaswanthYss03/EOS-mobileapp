import { useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { QuickAccessGrid } from "@/features/erp/components/QuickAccessGrid";
import { fonts } from "@/theme";

const academicsItems = [
  {
    id: "current-semester",
    label: "Current Semester",
    icon: "ribbon-outline",
    route: "/(tabs)/academics/current-semester",
  },
  { id: "timetable", label: "Timetable", icon: "time-outline", route: "/(tabs)/academics/timetable" },
  { id: "calendar", label: "Calendar", icon: "calendar-outline", route: "/(tabs)/academics/calendar" },
];

function AcademicsHeader({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={["#2F6FE0", "#1A3D8F"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[headerStyles.container, { paddingTop: insets.top + 10 }]}
    >
      <TouchableOpacity
        onPress={onBack}
        style={headerStyles.backButton}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="arrow-back" size={20} color="#fff" />
      </TouchableOpacity>
      <View>
        <Text style={headerStyles.title}>Academics</Text>
        <Text style={headerStyles.subtitle}>Semester VI · 2025-26</Text>
      </View>
    </LinearGradient>
  );
}

export function AcademicsOverviewScreen() {
  const router = useRouter();
  const navigation = useNavigation();

  // Same header-swap pattern as AcademicsChooserScreen and the ERP role
  // dashboards - see src/features/academics/AcademicsChooserScreen.tsx.
  // No blur-cleanup on purpose - see that screen's useFocusEffect comment;
  // going back always lands on the Chooser, which re-applies its own
  // header on refocus, and a cleanup here would race it.
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({
        header: () => <AcademicsHeader onBack={() => router.back()} />,
      });
    }, [navigation, router]),
  );

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Academics</Text>
        <QuickAccessGrid items={academicsItems} size="large" />
      </View>
    </SafeAreaView>
  );
}

const headerStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontFamily: fonts.bold,
  },
  subtitle: {
    color: "#D7E2FA",
    fontSize: 12,
    fontFamily: fonts.medium,
    marginTop: 2,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#8A93A3",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 12,
  },
});
