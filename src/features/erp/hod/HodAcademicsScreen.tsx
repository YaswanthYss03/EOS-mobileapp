import { View, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { BackHeader } from "@/components/layout/BackHeader";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";
import { QuickAccessGrid } from "../components/QuickAccessGrid";
import type { QuickAccessItem } from "../types";

// Leave/OD (?tab=student) are already department-wide for HOD (every
// class-mentor-approved request across the whole department pending HOD
// sign-off, see EOS-backend's student-leaves/student-ods services) - no
// class picker needed here. No Due is likewise already department-wide
// (see erp/no-due/NoDueScreen.tsx). "Class Records" (renamed from "Subject
// Records" - was the teaching-mapping-scoped personal view any faculty
// gets, a deliberate interim choice) now points at the genuinely
// department-wide HodClassRecordsScreen (Batch -> Class -> Semester
// filters, backed by HodClassRecordsService/hod/class-records/*).
const ITEMS: QuickAccessItem[] = [
  { id: "student-leave", label: "Leave", icon: "log-out-outline", route: "/(tabs)/erp/leave?tab=student" },
  { id: "student-od", label: "OD", icon: "people-outline", route: "/(tabs)/erp/od?tab=student" },
  { id: "no-due", label: "No Due", icon: "checkmark-done-outline", route: "/(tabs)/erp/no-due" },
  { id: "class-records", label: "Class Records", icon: "book-outline", route: "/(tabs)/erp/hod-class-records" },
];

// Reached from the HOD's own Student-tab "Academics" card (see
// HodStudentScreen.tsx).
export function HodAcademicsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <BackHeader title="Academics" onBack={() => router.back()} />
      <WatermarkBackground />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <QuickAccessGrid items={ITEMS} size="campus" gap={12} />
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
