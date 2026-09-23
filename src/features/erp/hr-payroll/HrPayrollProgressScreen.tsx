import { useCallback } from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";
import { QuickAccessGrid } from "../components/QuickAccessGrid";
import { DashboardHeader } from "../components/DashboardHeader";
import { hrProgressItems } from "./data/mockDashboard";

// HR & Payroll's "Progress" tab root (the academics tab, relabeled - see
// app/(tabs)/_layout.tsx's isHrPayroll) - this role's own personal
// Attendance/Appraisal self-service, same "no section heading, own tab"
// treatment as HrPayrollDashboard.tsx's Services tab and
// FacultyProgressScreen's own Progress tab for a plain Employee login.
export function HrPayrollProgressScreen() {
  const navigation = useNavigation();
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({
        header: () => <DashboardHeader subtitle="Progress" onBack={() => router.replace("/(tabs)/home")} />,
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
          <QuickAccessGrid items={hrProgressItems} size="campus" gap={12} />
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
