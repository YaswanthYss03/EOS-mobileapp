import { useCallback } from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";
import { useAuth } from "@/context/AuthContext";
import { QuickAccessGrid } from "../components/QuickAccessGrid";
import { DashboardHeader } from "../components/DashboardHeader";
import { classTabItems } from "./data/mockDashboard";
import { AdvisorClassScreen } from "./AdvisorClassScreen";

// TODO: employee RBAC - view-only pages for this role go here as siblings/subfolders.
// Anything with complex operations (bulk edits, approvals, config) stays on the web app.
export function EmployeeDashboard() {
  const navigation = useNavigation();
  const router = useRouter();
  // Switch Account (see AuthContext.tsx) - a Class Advisor gets a completely
  // different Class tab (4 cards: Academics/Placements/Higher Education/
  // Entrepreneur - see AdvisorClassScreen.tsx, which owns its own header
  // effect) and a stripped-down bottom nav (Home + Class only - see
  // app/(tabs)/_layout.tsx's isAdvisorOnly), instead of this dashboard's own
  // fixed grid below. Read before the early return below, but the return
  // itself comes after every hook call here (isAdvisorOnly can flip at
  // runtime via Switch Account, so this component's hook-call order must
  // stay identical across renders regardless of which branch renders).
  const { activeAccountMode } = useAuth();
  const isAdvisor = activeAccountMode === "ADVISOR";

  // This is the Class tab's root (see app/(tabs)/_layout.tsx) - one fixed
  // grid (Student Attendance/Online Class/Announcement/Timetable/Calendar/
  // LMS/Exam Marks/Subject Records/Venue Booking), same for every Employee-
  // mapped account (faculty/library/finance/academic_coordinator) regardless
  // of Switch Account mode - the personal HR self-service tiles that used to
  // branch on activeAccountMode here now live on the Progress tab instead
  // (see AcademicsOverviewScreen.tsx's employee branch / progressSectionItems.ts).
  //
  // Swaps the shared CollegeHeader (mounted at the Tabs level, see
  // app/(tabs)/_layout.tsx) for this screen's own header while it's focused,
  // restoring the shared one on blur/unmount - same imperative
  // parent-navigator-options pattern used elsewhere in this tab. useFocusEffect (not plain
  // useEffect) because switching tabs away doesn't necessarily unmount this
  // screen, only blurs it. Skipped while Advisor mode renders instead (that
  // branch sets its own header via AdvisorClassScreen's identical hook).
  useFocusEffect(
    useCallback(() => {
      if (isAdvisor) return undefined;
      navigation.getParent()?.setOptions({
        header: () => <DashboardHeader subtitle="Faculty services" onBack={() => router.replace("/(tabs)/home")} />,
      });
      return () => {
        navigation.getParent()?.setOptions({ header: () => <CollegeHeader /> });
      };
    }, [navigation, router, isAdvisor]),
  );

  if (isAdvisor) {
    return <AdvisorClassScreen />;
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <WatermarkBackground />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <QuickAccessGrid items={classTabItems} size="campus" gap={12} />
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
  },
  section: {
    marginBottom: 16,
  },
});
