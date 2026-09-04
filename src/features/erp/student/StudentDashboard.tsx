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
  const campusItems: CampusItem[] = campusConfigs.map((cfg) => ({ ...cfg, value: campusStats[cfg.id].value }));

  // Swaps the shared CollegeHeader (mounted at the Tabs level, see
  // app/(tabs)/_layout.tsx) for this screen's own header while it's focused,
  // restoring the shared one on blur/unmount - same pattern as the ERP
  // employee/hod dashboards.
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({
        header: () => <DashboardHeader subtitle="Student services" onBack={() => router.replace("/(tabs)/home")} />,
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
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick Access</Text>
            {data.classSection ? <Text style={styles.sectionMeta}>{data.classSection}</Text> : null}
          </View>
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
    padding: 16,
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
  sectionMeta: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: "#B0B7C3",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
