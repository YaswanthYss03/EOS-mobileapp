import { View, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { DashboardHeader } from "../components/DashboardHeader";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";
import { QuickAccessGrid } from "../components/QuickAccessGrid";
import type { QuickAccessItem } from "../types";

// Leave/OD (?tab=faculty) already cover both teaching and non-teaching
// staff in this department (EOS-backend's faculty-leaves/faculty-od
// services scope by `faculty.department_id` with no role filter on top -
// a non-teaching account still has its own `faculty` row). Timetable
// Allocation's backend (HodTimetableService, department + academic-year
// scoped slot CRUD) is real but has no mobile screen yet - reached below,
// still to be wired up.
//
// Routed to this tab's OWN academics-local wrapper copies (see
// app/(tabs)/academics/leave, .../od, etc.) rather than the erp tab's -
// pushing a route that lives under a different tab's Stack switches the
// active tab to erp (Student) and keeps its back-stack there too, the
// same "wrong tab" bug HodStudentScreen's own cards avoid by staying
// entirely within erp's Stack (see AdvisorClassScreen's identical
// erp/amenity-local route convention).
const ITEMS: QuickAccessItem[] = [
  { id: "faculty-leave", label: "Leave", icon: "log-out-outline", route: "/(tabs)/academics/leave?tab=faculty" },
  { id: "faculty-od", label: "OD", icon: "people-outline", route: "/(tabs)/academics/od?tab=faculty" },
  { id: "pop-sop", label: "POP / SOP", icon: "document-text-outline", route: "/(tabs)/academics/pop-sop" },
  {
    id: "review-appraisal",
    label: "Appraisal Review",
    icon: "ribbon-outline",
    route: "/(tabs)/academics/review-appraisal",
  },
  {
    id: "timetable-allocation",
    label: "Timetable Allocation",
    icon: "time-outline",
    route: "/(tabs)/academics/hod-timetable-allocation",
  },
  {
    id: "assign-faculty",
    label: "Assign Faculty",
    icon: "person-add-outline",
    route: "/(tabs)/academics/assign-faculty",
  },
  {
    id: "faculty-attendance",
    label: "Attendance",
    icon: "calendar-check-outline",
    route: "/(tabs)/academics/hod-faculty-attendance",
  },
];

// Reached from the HOD's own Faculty tab root (see app/(tabs)/_layout.tsx's
// isHodActingAsHod - "Faculty" is a full bottom-nav tab for HOD, not a card
// like Student's own sub-pages, since it has 7 destinations rather than 4).
export function HodFacultyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <DashboardHeader subtitle="Faculty" onBack={() => router.replace("/(tabs)/home")} />
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
