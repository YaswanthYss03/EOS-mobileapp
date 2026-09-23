import { useCallback } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";
import { fonts } from "@/theme";
import { QuickAccessGrid } from "../components/QuickAccessGrid";
import { DashboardHeader } from "../components/DashboardHeader";
import { quickAccessItems } from "./data/mockDashboard";

export function ParentDashboard() {
  const navigation = useNavigation();
  const router = useRouter();

  // Swaps the shared CollegeHeader (mounted at the Tabs level, see
  // app/(tabs)/_layout.tsx) for this screen's own header while it's
  // focused - same pattern as the ERP employee/hod dashboards. Explicitly
  // re-asserts headerShown:true too (not just `header`), since
  // Attendance/Performance/Fees (this screen's other 3 tiles) each set
  // headerShown:false for their own inline header while they're open, with
  // no cleanup of their own (see ParentAttendanceScreen.tsx's comment) -
  // this screen owns restoring it instead of depending on theirs.
  //
  // No cleanup here either: this screen pushes into 6 leaf screens total
  // (Attendance/Performance/Fees/Timetable/Calendar/Placements), each of
  // which sets its own header state on its own focus without ever touching
  // this screen's - an unconditional reset-on-blur here raced those focus
  // effects (undefined ordering between screens in the same Stack),
  // intermittently leaving the CollegeHeader shown instead of the pushed
  // screen's own title+back button (see PrincipalStudentsScreen.tsx in
  // erp/principal/students for the identical bug and fix this mirrors).
  // Coming back here re-fires this effect regardless, so nothing is lost by
  // not resetting on the way out.
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({
        headerShown: true,
        header: () => <DashboardHeader subtitle="Parent services" onBack={() => router.replace("/(tabs)/home")} />,
      });
      return undefined;
    }, [navigation, router]),
  );

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <WatermarkBackground />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <QuickAccessGrid items={quickAccessItems} size="campus" />
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
  sectionTitle: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#8A93A3",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 4,
  },
});
