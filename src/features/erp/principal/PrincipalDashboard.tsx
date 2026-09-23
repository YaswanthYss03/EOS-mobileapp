import { useCallback } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";
import { fonts } from "@/theme";
import { QuickAccessGrid } from "@/features/erp/components/QuickAccessGrid";
import { DashboardHeader } from "@/features/erp/components/DashboardHeader";
import type { QuickAccessItem } from "@/features/erp/types";

// People: who the institution is made of. Faculty & Staff / Department &
// HoD are institution-wide directories, not the caller's own record -
// distinct from any self-service "my profile" concept.
const peopleItems: QuickAccessItem[] = [
  { id: "students", label: "Students", icon: "people-outline", route: "/(tabs)/erp/principal/students" },
  {
    id: "faculty-staff",
    label: "Faculty & Staff",
    icon: "people-circle-outline",
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
// Moved in from the Campus tab (see AmenityHomeScreen.tsx's own comment -
// Campus went back to the plain faculty-style card set, these 3 now live
// here instead, own erp-tab-local route copies so back-navigation stays
// inside Services). Current Semester/Timetable/Online Class have no
// principal-specific screen at all (not stubbed, not built) - a
// principal isn't enrolled in or teaching a subject, so there was
// nothing to move in for those.
const academicsItems: QuickAccessItem[] = [
  {
    id: "exams-results",
    label: "Exams & Results",
    icon: "document-text-outline",
    route: "/(tabs)/erp/principal/exams-results",
  },
  { id: "placements", label: "Placements", icon: "briefcase-outline", route: "/(tabs)/erp/principal/placements" },
  { id: "announcements", label: "Announcements", icon: "megaphone-outline", route: "/(tabs)/erp/announcements" },
  {
    id: "higher-education",
    label: "Higher Education",
    icon: "ribbon-outline",
    route: "/(tabs)/erp/principal/higher-education",
  },
  {
    id: "entrepreneur",
    label: "Entrepreneur",
    icon: "rocket-outline",
    route: "/(tabs)/erp/principal/entrepreneur",
  },
  { id: "calendar", label: "Calendar", icon: "calendar-outline", route: "/(tabs)/erp/principal/calendar" },
];

// Leave Request moved out to this role's own Progress tab (see
// app/(tabs)/_layout.tsx's isPrincipal, PrincipalProgressScreen.tsx) -
// alongside the Attendance/OD self-service now added there too, not left
// solo in this "Services" (formerly Class) tab's dashboard.
const institutionItems: QuickAccessItem[] = [
  {
    id: "finance-fees",
    label: "Finance & Fees",
    icon: "cash-outline",
    route: "/(tabs)/erp/principal/finance-fees",
  },
  { id: "hostel", label: "Hostel", icon: "bed-outline", route: "/(tabs)/erp/principal/hostel" },
  { id: "transport", label: "Transport", icon: "bus-outline", route: "/(tabs)/erp/principal/transport" },
  { id: "library", label: "Library", icon: "library-outline", route: "/(tabs)/erp/principal/library" },
  { id: "sports", label: "Sports", icon: "football-outline", route: "/(tabs)/erp/principal/sports" },
  { id: "medical", label: "Medical", icon: "medkit-outline", route: "/(tabs)/erp/principal/medical" },
  {
    id: "copy-center",
    label: "Copy Center",
    icon: "print-outline",
    route: "/(tabs)/erp/principal/copy-center",
  },
  {
    id: "feedback",
    label: "Feedback",
    icon: "star-outline",
    route: "/(tabs)/erp/principal/feedback",
  },
  {
    id: "approvals",
    label: "Approvals",
    icon: "checkmark-done-outline",
    route: "/(tabs)/erp/principal/approvals",
  },
];

export function PrincipalDashboard() {
  const navigation = useNavigation();
  const router = useRouter();

  // Same shared DashboardHeader every other role's dashboard root uses now
  // (plain "Sri Eshwar College of Engineering", no per-role subtitle, per
  // explicit request - was a custom "EIS / Principal services" header
  // before). Explicitly re-asserts headerShown:true (not just `header`) on
  // every focus, rather than depending on some leaf screen's own blur
  // cleanup to restore it - those leaf screens no longer do that cleanup at
  // all (see PrincipalStudentsScreen.tsx's comment), since it raced against
  // sibling screens within the same Stack and caused a double-header bug.
  // This screen now owns its own header state unconditionally instead.
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({
        headerShown: true,
        header: () => <DashboardHeader onBack={() => router.replace("/(tabs)/home")} />,
      });
      return undefined;
    }, [navigation, router]),
  );

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <WatermarkBackground />
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
});
