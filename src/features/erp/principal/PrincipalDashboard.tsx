import { useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { QuickAccessGrid } from "@/features/erp/components/QuickAccessGrid";
import type { QuickAccessItem } from "@/features/erp/types";

// People: who the institution is made of. Faculty & Staff / Department &
// HoD are institution-wide directories, not the caller's own record -
// distinct from any self-service "my profile" concept.
const peopleItems: QuickAccessItem[] = [
  { id: "students", label: "Students", icon: "people-outline", route: "/(tabs)/erp/principal/students" },
  {
    id: "faculty-staff",
    label: "Faculty & Staff",
    icon: "id-card-outline",
    route: "/(tabs)/erp/principal/faculty-staff",
  },
  {
    id: "departments",
    label: "Department & HoD",
    icon: "business-outline",
    route: "/(tabs)/erp/principal/departments",
  },
];

// Academics: Announcements reuses the exact same composer every other role
// reaches via a dashboard tile (see AnnouncementsScreen) - Principal's
// extra role-targeting capability lives inside that same screen, not a
// separate one. Calendar reuses PrincipalCalendarScreen, now a standalone
// pushed screen instead of embedded inline on this dashboard.
const academicsItems: QuickAccessItem[] = [
  {
    id: "exams-results",
    label: "Exams & Results",
    icon: "document-text-outline",
    route: "/(tabs)/erp/principal/exams-results",
  },
  { id: "announcements", label: "Announcements", icon: "megaphone-outline", route: "/(tabs)/erp/announcements" },
  { id: "calendar", label: "Calendar", icon: "calendar-outline", route: "/(tabs)/erp/principal/calendar" },
];

const institutionItems: QuickAccessItem[] = [
  {
    id: "finance-fees",
    label: "Finance & Fees",
    icon: "cash-outline",
    route: "/(tabs)/erp/principal/finance-fees",
  },
  {
    id: "approvals",
    label: "Approvals",
    icon: "checkmark-done-outline",
    route: "/(tabs)/erp/principal/approvals",
  },
  { id: "hostel", label: "Hostel", icon: "bed-outline", route: "/(tabs)/erp/principal/hostel" },
  { id: "library", label: "Library", icon: "library-outline", route: "/(tabs)/erp/principal/library" },
  { id: "transport", label: "Transport", icon: "bus-outline", route: "/(tabs)/erp/principal/transport" },
  { id: "medical", label: "Medical", icon: "medkit-outline", route: "/(tabs)/erp/principal/medical" },
  { id: "sports", label: "Sports", icon: "football-outline", route: "/(tabs)/erp/principal/sports" },
];

function PrincipalHeader({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={["#2F6FE0", "#1A3D8F"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.headerContainer, { paddingTop: insets.top + 10 }]}
    >
      <TouchableOpacity onPress={onBack} style={styles.headerIconButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="arrow-back" size={20} color="#fff" />
      </TouchableOpacity>
      <View>
        <Text style={styles.headerTitle}>EOS</Text>
        <Text style={styles.headerSubtitle}>Principal services</Text>
      </View>
    </LinearGradient>
  );
}

export function PrincipalDashboard() {
  const navigation = useNavigation();
  const router = useRouter();

  // Same header-swap pattern as the HoD/Employee ERP dashboards - see
  // HodDashboard.tsx.
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({
        header: () => <PrincipalHeader onBack={() => router.replace("/(tabs)/home")} />,
      });
      return () => {
        navigation.getParent()?.setOptions({ header: () => <CollegeHeader /> });
      };
    }, [navigation, router]),
  );

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>People</Text>
          <QuickAccessGrid items={peopleItems} gap={20} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Academics</Text>
          <QuickAccessGrid items={academicsItems} gap={20} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Institution</Text>
          <QuickAccessGrid items={institutionItems} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#8A93A3",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontFamily: fonts.bold,
  },
  headerSubtitle: {
    color: "#D7E2FA",
    fontSize: 12,
    fontFamily: fonts.medium,
    marginTop: 2,
  },
});
