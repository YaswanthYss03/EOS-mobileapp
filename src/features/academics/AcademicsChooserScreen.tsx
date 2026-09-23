import { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";
import { fonts } from "@/theme";
import { useRole } from "@/hooks/useRole";
import { getMyArrearStatus } from "@/services/api/me-alumni.api";

type ChooserOption = {
  id: string;
  title: string;
  description?: string;
  icon: keyof typeof Ionicons.glyphMap;
  route:
    | "/(tabs)/academics/overview"
    | "/(tabs)/academics/placements"
    | "/(tabs)/erp/student-performance"
    | "/(tabs)/erp/student-exam-schedule";
};

// Alumni's own "Campus" tab - Performance always shown; Exam schedule only
// when they currently have a standing arrear (see
// MeAlumniExamStatusService.getArrearStatus - a graduated alumnus with no
// arrears has no exam to schedule for). Both point at the exact same
// routes/screens the Student ERP dashboard already uses (StudentPerformanceScreen/
// StudentExamScheduleScreen) - reused as-is, not duplicated, now widened
// server-side to accept an alumni-role JWT too.
const alumniPerformanceOption: ChooserOption = {
  id: "performance",
  title: "Performance",
  description: "Your semester marks and marksheets",
  icon: "stats-chart-outline",
  route: "/(tabs)/erp/student-performance",
};
const alumniExamScheduleOption: ChooserOption = {
  id: "exam-schedule",
  title: "Exam schedule",
  description: "Your upcoming arrear exam",
  icon: "calendar-outline",
  route: "/(tabs)/erp/student-exam-schedule",
};

// Same for hod and faculty (employee) - neither gets a different set of
// options today, see src/hooks/useRole.ts. This IS a student's own "Campus"
// tab (see app/(tabs)/_layout.tsx) - every other role still has this tab
// hidden, reaching the same options from their own dashboard's sections
// instead.
const options: ChooserOption[] = [
  {
    id: "academics",
    title: "Current Semester",
    description: "Daily task, LMS, timetable, calendar & more",
    icon: "school-outline",
    route: "/(tabs)/academics/overview",
  },
  {
    id: "placements",
    title: "Placements",
    description: "Track drives, applications and offers",
    icon: "briefcase-outline",
    route: "/(tabs)/academics/placements",
  },
];

// HR Payroll has nothing to do with student placements - only Academics
// (which itself only shows Timetable/Calendar for this role, see
// AcademicsOverviewScreen) is relevant.
const hrOptions = options.filter((option) => option.id === "academics");

function EduHeader({ onBack }: { onBack: () => void }) {
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
        <Ionicons name="chevron-back" size={20} color="#fff" />
      </TouchableOpacity>
      <View style={headerStyles.textWrap}>
        <Text style={headerStyles.title} numberOfLines={2}>
          Sri Eshwar College of Engineering
        </Text>
      </View>
    </LinearGradient>
  );
}

export function AcademicsChooserScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const role = useRole();
  const isAlumni = role === "alumni";

  const [arrearStatus, setArrearStatus] = useState<"loading" | "yes" | "no" | "error">("loading");
  useEffect(() => {
    if (!isAlumni) return;
    let cancelled = false;
    getMyArrearStatus()
      .then(({ hasStandingArrear }) => {
        if (!cancelled) setArrearStatus(hasStandingArrear ? "yes" : "no");
      })
      .catch(() => {
        if (!cancelled) setArrearStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [isAlumni]);

  const visibleOptions = isAlumni
    ? [alumniPerformanceOption, ...(arrearStatus === "yes" ? [alumniExamScheduleOption] : [])]
    : role === "hr-payroll"
      ? hrOptions
      : options;

  // Swaps the shared CollegeHeader (mounted at the Tabs level, see
  // app/(tabs)/_layout.tsx) for this screen's own header while it's focused,
  // same pattern used by the ERP hod/employee dashboards.
  //
  // No blur-cleanup here on purpose: this screen leads to other
  // header-swapping screens (Overview, Placements), and a cleanup that
  // unconditionally restores CollegeHeader races their own focus-effect -
  // observed live as "College header shows instead of Placements" when
  // pushing forward, since the child's setup and this cleanup can both
  // fire on the same transition and whichever runs last wins. Restoring
  // CollegeHeader is instead handled explicitly below, only on the one
  // path that actually needs it - leaving the Academics tab for Home.
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({
        header: () => (
          <EduHeader
            onBack={() => {
              navigation.getParent()?.setOptions({ header: () => <CollegeHeader /> });
              router.replace("/(tabs)/home");
            }}
          />
        ),
      });
    }, [navigation, router]),
  );

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <WatermarkBackground />
      {isAlumni && arrearStatus === "loading" ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color="#2F6FE0" />
        </View>
      ) : (
        <View style={styles.row}>
          {visibleOptions.map((option) => (
            <Pressable key={option.id} style={styles.card} onPress={() => router.push(option.route)}>
              <View style={styles.iconWrap}>
                <Ionicons name={option.icon} size={26} color="#2F6FE0" />
              </View>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {option.title}
              </Text>
              <Text style={styles.cardDescription} numberOfLines={2}>
                {option.description ?? " "}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
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
  textWrap: {
    flex: 1,
  },
  title: {
    color: "#fff",
    fontSize: 16,
    fontFamily: fonts.bold,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 16,
  },
  card: {
    flexBasis: "45%",
    flexGrow: 1,
    minHeight: 180,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 4,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: "#EAF0FD",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: "#111",
    textAlign: "center",
    // Fixed 2-line height (not just numberOfLines={2} on the Text, which
    // only caps it) - every card's title block reserves the exact same
    // space now regardless of whether this particular title actually wraps
    // to 1 or 2 lines, so the icon above and description below always land
    // at the same vertical position across cards (e.g. "Placements" is one
    // line, "Current Semester" is two - without a fixed height the shorter
    // one's whole content block sits lower, off-center from its neighbor).
    height: 40,
    lineHeight: 20,
  },
  cardDescription: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#7A828E",
    textAlign: "center",
    marginTop: 2,
    lineHeight: 17,
    // Same fixed-height reasoning as cardTitle above - every description
    // reserves 2 lines' worth of space even when its own text is shorter.
    height: 34,
  },
});
