import { useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { QuickAccessGrid } from "@/features/erp/components/QuickAccessGrid";
import { fonts } from "@/theme";
import { useRole } from "@/hooks/useRole";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";

// Order: Daily Task, LMS, Timetable, Calendar, Exam Schedule, No-Due.
// No-Due and Exam Schedule moved in from the student's own ERP ("Class")
// dashboard grid (see src/features/erp/student/data/dashboardConfig.ts) -
// same tiles/routes, just also reachable from here now; removed from there
// so they aren't offered in two places. Feedback (course feedback) moved
// OUT of this grid entirely - it's now one of the filter options on the
// Campus tab's single consolidated Feedback card (see
// AmenityServiceFeedbackScreen), alongside Hostel Mess feedback and the
// original Campus service reviews, rather than a separate tile here.
const academicsItems = [
  { id: "daily-task", label: "Daily Task", icon: "checkbox-outline", route: "/(tabs)/academics/daily-task" },
  {
    id: "lms",
    label: "LMS",
    icon: "ribbon-outline",
    route: "/(tabs)/academics/current-semester",
  },
  { id: "timetable", label: "Timetable", icon: "time-outline", route: "/(tabs)/academics/timetable" },
  { id: "calendar", label: "Calendar", icon: "calendar-outline", route: "/(tabs)/academics/calendar" },
  {
    id: "exam-schedule",
    label: "Exam schedule",
    icon: "calendar-outline",
    route: "/(tabs)/erp/student-exam-schedule",
  },
  { id: "no-due", label: "No-Due", icon: "shield-checkmark-outline", route: "/(tabs)/erp/student-no-due" },
];

// HR Payroll and Parent both have no "own" current semester (that's a
// self-service concept for someone actually enrolled/teaching), and no-due/
// exam-schedule are student-only self-service too - only Timetable and
// Calendar are meaningful for these two roles, both of which branch to a
// different real data source instead of a self-view (HR: a department-
// roster browser; Parent: the selected child's own timetable/calendar) -
// see app/(tabs)/academics/timetable/index.tsx and .../calendar/index.tsx.
const timetableAndCalendarOnly = academicsItems.filter(
  (item) => item.id === "timetable" || item.id === "calendar",
);

function AcademicsHeader({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={["#2F6FE0", "#1A3D8F"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[headerStyles.container, { paddingTop: insets.top + 10 }]}
    >
      <TouchableOpacity
        onPress={onBack}
        style={headerStyles.backButton}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="arrow-back" size={20} color="#fff" />
      </TouchableOpacity>
      <Text style={headerStyles.title}>Current Semester</Text>
    </LinearGradient>
  );
}

export function AcademicsOverviewScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const role = useRole();
  // Daily Task/LMS/No-Due/Exam Schedule are all student-only self-service
  // endpoints (see each item's own backend) - a non-student role only gets
  // Timetable + Calendar, already handled by timetableAndCalendarOnly.
  const items = role === "hr-payroll" || role === "parent" ? timetableAndCalendarOnly : academicsItems;

  // Same header-swap pattern as AcademicsChooserScreen and the ERP role
  // dashboards - see src/features/academics/AcademicsChooserScreen.tsx.
  // No blur-cleanup on purpose - see that screen's useFocusEffect comment;
  // going back always lands on the Chooser, which re-applies its own
  // header on refocus, and a cleanup here would race it.
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({
        header: () => <AcademicsHeader onBack={() => router.back()} />,
      });
    }, [navigation, router]),
  );

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <WatermarkBackground />
      <View style={styles.section}>
        <QuickAccessGrid items={items} size="campus" />
      </View>
    </SafeAreaView>
  );
}

const headerStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontFamily: fonts.bold,
  },
  subtitle: {
    color: "#D7E2FA",
    fontSize: 12,
    fontFamily: fonts.medium,
    marginTop: 2,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#8A93A3",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 12,
  },
});
