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

// Correspondent (Management) is a strict visual replica of PrincipalDashboard
// (see that file - this one is deliberately kept in lockstep with it,
// section-for-section, tile-for-tile, same styling/spacing/icons/order,
// same tile ORDER too - see PrincipalDashboard.tsx for the canonical order
// to mirror whenever that one changes). The ONE deliberate difference:
// "Approvals" routes to this role's own Leave+OD review queue (see
// src/features/erp/leave-approval/LeaveApprovalScreen.tsx - approving the
// Principal's own leave/on-duty requests) instead of Principal's
// purchase/maintenance approvals screen - everything else still routes to
// the exact same principal/* screens Principal uses; the backend
// independently enforces which of those a Correspondent account is
// actually authorized to see (see roles.constant.ts's ROLES.CORRESPONDENT
// and the security requirement that UI visibility is never the boundary) -
// an unauthorized one will correctly 403 rather than silently leaking
// Principal-only data, by design, not by omission.
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
  // Correspondent-only additions (this role has no Campus/Bus tabs - see
  // app/(tabs)/_layout.tsx's isCorrespondent - so these two live here
  // instead): institution-wide overview dashboards, same "stat cards +
  // breakdown list" shape as every other tile in this section, not the
  // self-service ordering/fill-out flows other roles use for these.
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
  // The one tile that DOESN'T route to a principal/* screen - this role's
  // own Leave+OD review queue instead of Principal's purchase/maintenance
  // approvals (see this file's own top comment).
  {
    id: "approvals",
    label: "Approvals",
    icon: "checkmark-done-outline",
    route: "/(tabs)/erp/leave-approval",
  },
];

export function CorrespondentDashboard() {
  const navigation = useNavigation();
  const router = useRouter();

  // Same shared DashboardHeader every other role's dashboard root uses now
  // (plain "Sri Eshwar College of Engineering", no per-role subtitle, per
  // explicit request - was a custom "EIS / Correspondent services" header
  // before). Explicitly re-asserts headerShown:true on every focus instead
  // of depending on a leaf screen's blur cleanup (see
  // PrincipalStudentsScreen.tsx's comment for the double-header race this
  // avoids).
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
