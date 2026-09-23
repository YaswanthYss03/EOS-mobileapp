import { View, Text, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { BackHeader } from "@/components/layout/BackHeader";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";
import { fonts } from "@/theme";
import { QuickAccessGrid } from "../components/QuickAccessGrid";
import type { QuickAccessItem } from "../types";

// Student Attendance/Class Result/Leave/OD are already scoped to the caller's
// own mentored class via class_mentors on the backend (see
// class-mentors.service.ts) - no class picker needed here, same as this
// screen's own single-class framing. Subject Records/No Due route to two
// new class-mentor-scoped pages (mentee-subject-records/mentee-no-due) -
// same class_mentors scoping, added specifically for this Advisor view since
// the existing Subject Records/No Due pages are teaching-mapping- and
// department-scoped respectively, not mentor-scoped.
const ACADEMICS_ITEMS: QuickAccessItem[] = [
  {
    id: "student-attendance",
    label: "Student Attendance",
    icon: "calendar-check-outline",
    library: "material",
    route: "/(tabs)/erp/attendance",
  },
  { id: "class-result", label: "Class Result", icon: "bar-chart-outline", route: "/(tabs)/erp/class-result" },
  {
    id: "subject-records",
    label: "Subject Records",
    icon: "book-outline",
    route: "/(tabs)/erp/mentee-subject-records",
  },
  {
    id: "announcements",
    label: "Announcement",
    icon: "megaphone-outline",
    // scope=mentor restricts Target classes to only this Advisor's own
    // mentored class - see AnnouncementsScreen.tsx's isMentorScope.
    route: "/(tabs)/erp/announcements?audience=faculty&scope=mentor",
  },
];

const REQUEST_ITEMS: QuickAccessItem[] = [
  { id: "leave", label: "Leave", icon: "log-out-outline", route: "/(tabs)/erp/student-leave" },
  { id: "od", label: "OD", icon: "people-outline", route: "/(tabs)/erp/student-od" },
  { id: "no-due", label: "No Due", icon: "checkmark-done-outline", route: "/(tabs)/erp/mentee-no-due" },
];

// Reached from the Class Advisor's own Class-tab "Academics" card (see
// AdvisorClassScreen.tsx) - everything a Class Advisor needs for their one
// mentored class: Student Attendance/Class Result/Subject Records/
// Announcement, plus a Requests section for approving that class's own
// Leave/OD/No Due.
// The Tabs-level shared header stays permanently off for the whole Class
// tab while Advisor mode is active (see app/(tabs)/_layout.tsx's
// isAdvisorOnly) - this screen just renders its own BackHeader inline,
// no per-screen header toggling needed.
export function AdvisorAcademicsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <BackHeader title="Academics" onBack={() => router.back()} />
      <WatermarkBackground />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <QuickAccessGrid items={ACADEMICS_ITEMS} size="campus" gap={12} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Requests</Text>
          <QuickAccessGrid items={REQUEST_ITEMS} size="campus" gap={12} />
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
