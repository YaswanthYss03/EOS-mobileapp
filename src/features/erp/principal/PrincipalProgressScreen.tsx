import { useCallback } from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";
import { QuickAccessGrid } from "../components/QuickAccessGrid";
import { DashboardHeader } from "../components/DashboardHeader";
import type { QuickAccessItem } from "../types";

// Principal's own "Progress" tab (the academics tab, relabeled - see
// app/(tabs)/_layout.tsx's isPrincipal) - Attendance/Leave/OD self-service,
// same "no section heading, own tab" design as FacultyProgressScreen (see
// its own doc comment). Leave Request was previously a solo tile inside
// PrincipalDashboard.tsx's "Institution" section (the Services tab, formerly
// Class) - moved here alongside the two new Attendance/OD tiles instead.
// Routed through this tab's own academics-local wrapper copies (already
// built for FacultyProgressScreen - see app/(tabs)/academics/my-attendance,
// .../leave-request, .../od-request) rather than the erp tab's, for the
// same cross-tab back-stack reason as every other *-local route copy.
const items: QuickAccessItem[] = [
  { id: "attendance", label: "Attendance", icon: "calendar-outline", route: "/(tabs)/academics/my-attendance" },
  { id: "leave", label: "Leave", icon: "airplane-outline", route: "/(tabs)/academics/leave-request" },
  { id: "od", label: "OD", icon: "person-outline", route: "/(tabs)/academics/od-request" },
];

export function PrincipalProgressScreen() {
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
