import { useCallback } from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";
import { QuickAccessGrid } from "../components/QuickAccessGrid";
import { DashboardHeader } from "../components/DashboardHeader";
import { hrSectionItems } from "./data/mockDashboard";

// HR & Payroll's "Services" tab root (see app/(tabs)/_layout.tsx's
// isHrPayroll - now a full bottom-nav tab of its own, the erp tab
// relabeled, alongside Progress (academics tab, see
// HrPayrollProgressScreen.tsx) and Campus (amenity tab, see
// AmenityHomeScreen.tsx) - HR's own Class-tab dashboard used to bundle all
// three into one screen with section headings; each now lives on its own
// tab instead, so this is just hrSectionItems' single grid, no heading.
//
// TODO: hr-payroll RBAC - view-only pages for this role go here as siblings/subfolders.
// Anything with complex operations (bulk edits, approvals, config) stays on the web app.
export function HrPayrollDashboard() {
  const navigation = useNavigation();
  const router = useRouter();

  // Swaps the shared CollegeHeader (mounted at the Tabs level, see
  // app/(tabs)/_layout.tsx) for this screen's own header while it's focused,
  // restoring the shared one on blur/unmount - same pattern used by the HoD
  // and Employee dashboards.
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({
        header: () => <DashboardHeader subtitle="Services" onBack={() => router.replace("/(tabs)/home")} />,
      });
      return () => {
        navigation.getParent()?.setOptions({ header: () => <CollegeHeader /> });
      };
    }, [navigation, router]),
  );

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <WatermarkBackground />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <QuickAccessGrid items={hrSectionItems} size="campus" gap={12} />
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
