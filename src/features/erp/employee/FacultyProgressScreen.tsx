import { useCallback, useMemo } from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";
import { QuickAccessGrid } from "../components/QuickAccessGrid";
import { DashboardHeader } from "../components/DashboardHeader";
import { employeeSectionItems } from "../data/employeeSectionItems";

// Employee's (faculty's) "Progress" tab (see app/(tabs)/_layout.tsx and
// app/(tabs)/academics/index.tsx) - the Employee section minus Venue (now
// Class-tab-only, see EmployeeDashboard.tsx's classTabItems) and minus
// Library/Medical (now Campus-tab-only, see AmenityHomeScreen.tsx's
// studentOptions, also reused by this role) - just this dashboard's own
// grid, no section-title text above it.
export function FacultyProgressScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  // Routes remapped from /(tabs)/erp/* to this tab's own /(tabs)/academics/*
  // local copies (see app/(tabs)/academics/leave-request/index.tsx etc.) -
  // employeeSectionItems' own routes point at the erp (Class) tab's Stack,
  // which is correct for every OTHER dashboard reusing that same list
  // (HoD/Secretary/HR Payroll/Warden), but reaching an erp-tab route from
  // this Progress tab was a cross-tab jump: router.back() inside those
  // screens then popped within the erp Stack instead of back to Progress,
  // landing the user on the Class tab dashboard instead. Same reasoning as
  // every other erp-local route copy elsewhere in this app, just mirrored
  // for this tab instead.
  const items = useMemo(
    () =>
      employeeSectionItems
        .filter((item) => !["venue", "library", "medical"].includes(item.id))
        .map((item) => ({
          ...item,
          route: item.route?.startsWith("/(tabs)/erp/")
            ? item.route.replace("/(tabs)/erp/", "/(tabs)/academics/")
            : item.route,
        })),
    [],
  );

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
      <WatermarkBackground />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <QuickAccessGrid items={items} size="campus" gap={12} />
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
