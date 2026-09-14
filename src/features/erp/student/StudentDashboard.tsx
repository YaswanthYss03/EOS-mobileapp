import { useCallback } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { DashboardHeader } from "../components/DashboardHeader";
import { QuickAccessStatCards } from "./components/QuickAccessStatCards";
import { CampusIconGrid } from "./components/CampusIconGrid";
import { statCardConfigs, campusConfigs } from "./data/dashboardConfig";
import { useStudentDashboardData, type CardStat } from "./hooks/useStudentDashboardData";
import type { StatCardItem, CampusItem } from "./types";

export function StudentDashboard() {
  const navigation = useNavigation();
  const router = useRouter();
  const data = useStudentDashboardData();

  const statCardStats: Record<string, CardStat> = {
    attendance: data.attendance,
    performance: data.performance,
    fees: data.fees,
  };
  const statCards: StatCardItem[] = statCardConfigs.map((cfg) => ({ ...cfg, ...statCardStats[cfg.id] }));

  const campusStats: Record<string, CardStat> = {
    od: data.od,
    leave: data.leave,
    "exam-schedule": data.examSchedule,
    bonafide: data.bonafide,
    hostel: data.hostel,
    library: data.library,
    feedback: data.feedback,
    "no-due": data.noDue,
    medical: data.medical,
  };
  // Hostel is only relevant to hostel residents - a dayscholar never sees
  // the tile at all, not just a "Not allotted" value. Held back while
  // isHostelResident is still unresolved (null) so it doesn't flash in
  // for a dayscholar before disappearing again.
  const campusItems: CampusItem[] = campusConfigs
    .filter((cfg) => cfg.id !== "hostel" || data.isHostelResident === true)
    // Tiles moved in from the old Class tab (Timetable, Calendar, ...) have
    // no matching entry in campusStats - they're pure navigation shortcuts,
    // not stats, so they simply render with no value line (see CampusItem's
    // now-optional `value` and CampusIconGrid's conditional render).
    .map((cfg) => ({ ...cfg, value: campusStats[cfg.id]?.value }));

  // Swaps the shared CollegeHeader (mounted at the Tabs level, see
  // app/(tabs)/_layout.tsx) for this screen's own header while it's focused,
  // restoring the shared one on blur/unmount - same pattern as the ERP
  // employee/hod dashboards.
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({
        header: () => <DashboardHeader onBack={() => router.replace("/(tabs)/home")} />,
      });
      return () => {
        navigation.getParent()?.setOptions({ header: () => <CollegeHeader /> });
      };
    }, [navigation, router]),
  );

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <QuickAccessStatCards items={statCards} />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Campus</Text>
          </View>
          <CampusIconGrid items={campusItems} />
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
    paddingVertical: 16,
    paddingHorizontal: 6,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#8A93A3",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});
