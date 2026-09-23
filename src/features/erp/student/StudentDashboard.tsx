import { useCallback } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";
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
    bonafide: data.bonafide,
  };
  const campusItems: CampusItem[] = campusConfigs.map((cfg) => ({ ...cfg, value: campusStats[cfg.id]?.value }));

  // Swaps the shared CollegeHeader (mounted at the Tabs level, see
  // app/(tabs)/_layout.tsx) for this screen's own header while it's
  // focused - same pattern as the ERP employee/hod dashboards. Explicitly
  // re-asserts headerShown:true too (not just `header`), since the Hostel
  // hub (this dashboard's own "Hostel" tile, erp/student-hostel) and its 3
  // sub-pages each set headerShown:false for their own inline header with
  // no cleanup of their own (see StudentHostelScreen.tsx's comment) - this
  // screen owns restoring it instead of depending on theirs.
  //
  // No cleanup here either: an unconditional reset-on-blur raced whatever
  // the pushed screen had just set on its own focus (undefined ordering
  // between screens in the same Stack), intermittently leaving the
  // CollegeHeader shown instead of the pushed screen's own header (see
  // PrincipalStudentsScreen.tsx in erp/principal/students for the
  // identical bug and fix this mirrors). Coming back here re-fires this
  // effect regardless, so nothing is lost by not resetting on the way out.
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
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <QuickAccessStatCards items={statCards} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Requests</Text>
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
  sectionTitle: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#8A93A3",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 4,
    paddingHorizontal: 10,
  },
});
