import { useCallback, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { SkeletonListRows } from "@/components/ui/Skeleton";
import { fonts } from "@/theme";
import { useRole } from "@/hooks/useRole";
import { getMyTeachingSubjects, type LmsTeachingSubject } from "@/services/api/lms.api";
import { SegmentedTabs } from "./SegmentedTabs";
import { StudentTaskTab } from "./student/StudentTaskTab";
import { StudentLessonsTab } from "./student/StudentLessonsTab";
import { StudentOnlineClassTab } from "./student/StudentOnlineClassTab";
import { FacultyMaterialTab } from "./faculty/FacultyMaterialTab";
import { FacultyTaskTab } from "./faculty/FacultyTaskTab";
import { FacultyLessonPlanTab } from "./faculty/FacultyLessonPlanTab";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";

type FacultyTabKey = "material" | "task" | "lesson-plan";
type StudentTabKey = "task" | "lessons" | "online-class";
type TabKey = FacultyTabKey | StudentTabKey;

const FACULTY_TABS: { key: FacultyTabKey; label: string }[] = [
  { key: "material", label: "Material" },
  { key: "task", label: "Task" },
  { key: "lesson-plan", label: "Lesson plan" },
];

// Student's own "Lesson plan" and "Material" tabs are merged into one
// (each syllabus session expands to show its own matched material) - see
// StudentLessonsTab. Faculty/HoD keep all 3 tabs above, unchanged - they
// still manage folders and the lesson plan separately. "Online class" shows
// today's session for this subject, if any (see StudentOnlineClassTab).
const STUDENT_TABS: { key: StudentTabKey; label: string }[] = [
  { key: "task", label: "Task" },
  { key: "lessons", label: "Lesson plan" },
  { key: "online-class", label: "Online class" },
];

function subjectInitials(name?: string) {
  if (!name) return "SB";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase();
}

export function LmsSubjectScreen({
  subjectId,
  subjectName,
  subjectCode,
  initialTab,
}: {
  subjectId: number;
  subjectName?: string;
  subjectCode?: string;
  // Lets a caller land directly on a specific tab - e.g. Daily Task's
  // "Online Class"/"Assignment" today-cards, which open straight to the
  // relevant tab instead of always defaulting to Task (see
  // DailyTaskScreen.tsx). Only ever a student-facing tab key in practice
  // (Daily Task is student-only), but typed as the full TabKey since this
  // prop doesn't itself know which tab set will end up active.
  initialTab?: TabKey;
}) {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const role = useRole();
  const isTeaching = role === "employee" || role === "hod";
  // See FacultyMaterialTab/FacultyTaskTab's own basePath prop comment - this
  // screen itself is reachable from either tab (erp/lms/[subjectId] for
  // Employee/HoD, academics/lms/[subjectId] for a student), and the two
  // sub-tabs' own folder/task drill-down must stay in whichever one it was.
  const lmsBasePath = isTeaching ? "/(tabs)/erp/lms" : "/(tabs)/academics/lms";

  // This screen renders its own full header above, so hide the shared
  // CollegeHeader (mounted at the Tabs level) while focused, restoring it
  // on blur - same pattern as the other custom-header ERP screens. The
  // "hide" call is deferred a tick so it reliably wins if this screen was
  // reached from another screen that also hides this shared header (see
  // StudentAttendanceScreen/EnrollFacesScreen's own doc comment for the
  // exact race this avoids).
  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => {
        navigation.getParent()?.setOptions({ headerShown: false });
      }, 50);
      return () => {
        clearTimeout(timer);
        navigation.getParent()?.setOptions({ headerShown: true, header: () => <CollegeHeader /> });
      };
    }, [navigation]),
  );

  const [tab, setTab] = useState<TabKey>(initialTab ?? (isTeaching ? "material" : "task"));
  const [classes, setClasses] = useState<{ class_id: number; label: string }[]>([]);
  const [classId, setClassId] = useState<number | null>(null);
  const [classesStatus, setClassesStatus] = useState<"loading" | "success" | "error">(
    isTeaching ? "loading" : "success",
  );

  useEffect(() => {
    if (!isTeaching) return;
    getMyTeachingSubjects()
      .then((subjects: LmsTeachingSubject[]) => {
        const mine = subjects.find((s) => s.subject_id === subjectId);
        setClasses(mine?.classes ?? []);
        setClassId(mine?.classes[0]?.class_id ?? null);
        setClassesStatus("success");
      })
      .catch(() => setClassesStatus("error"));
  }, [isTeaching, subjectId]);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <WatermarkBackground />
      <LinearGradient
        colors={["#2F6FE0", "#1A3D8F"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Learning Management</Text>
      </LinearGradient>

      <View style={styles.subjectCard}>
        <View style={styles.subjectAvatar}>
          <Text style={styles.subjectAvatarText}>{subjectInitials(subjectName)}</Text>
        </View>
        <View style={styles.subjectTextWrap}>
          <Text style={styles.subjectName} numberOfLines={1}>
            {subjectName ?? "Subject"}
          </Text>
          {subjectCode && (
            <View style={styles.subjectCodePill}>
              <Text style={styles.subjectCodeText}>{subjectCode}</Text>
            </View>
          )}
        </View>
      </View>

      <SegmentedTabs tabs={isTeaching ? FACULTY_TABS : STUDENT_TABS} active={tab} onChange={setTab} />

      {isTeaching && classesStatus === "loading" && (
        <SkeletonListRows count={4} style={styles.skeletonWrap} />
      )}

      {isTeaching && classesStatus === "error" && (
        <View style={styles.noticeCard}>
          <Ionicons name="alert-circle-outline" size={18} color="#DC2626" />
          <Text style={styles.noticeText}>Couldn't load your classes for this subject.</Text>
        </View>
      )}

      {isTeaching && classesStatus === "success" && classes.length === 0 && (
        <View style={styles.noticeCard}>
          <Ionicons name="information-circle-outline" size={18} color="#8A93A3" />
          <Text style={styles.noticeText}>You are not mapped to teach this subject to any class.</Text>
        </View>
      )}

      {isTeaching && classesStatus === "success" && classes.length > 0 && classId !== null && (
        <>
          {classes.length > 1 && (
            <View style={styles.classPickerWrap}>
              <Text style={styles.classPickerLabel}>SECTION</Text>
              <View style={styles.classPickerRow}>
                {classes.map((c) => (
                  <TouchableOpacity
                    key={c.class_id}
                    style={[styles.classChip, c.class_id === classId && styles.classChipActive]}
                    onPress={() => setClassId(c.class_id)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.classChipText, c.class_id === classId && styles.classChipTextActive]}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
          <View style={styles.tabContentArea}>
            {tab === "material" ? (
              <FacultyMaterialTab subjectId={subjectId} classId={classId} basePath={lmsBasePath} />
            ) : tab === "task" ? (
              <FacultyTaskTab subjectId={subjectId} classId={classId} />
            ) : (
              <FacultyLessonPlanTab subjectId={subjectId} classId={classId} />
            )}
          </View>
        </>
      )}

      {!isTeaching && (
        <View style={styles.tabContentArea}>
          {tab === "task" ? (
            <StudentTaskTab subjectId={subjectId} />
          ) : tab === "lessons" ? (
            <StudentLessonsTab subjectId={subjectId} />
          ) : (
            <StudentOnlineClassTab subjectId={subjectId} subjectName={subjectName} />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tabContentArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "#F7F8FA",
  },
  header: {
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
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontFamily: fonts.bold,
  },
  subjectCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  subjectAvatar: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#EAF0FD",
    alignItems: "center",
    justifyContent: "center",
  },
  subjectAvatarText: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: "#1A3D8F",
  },
  subjectTextWrap: {
    flex: 1,
    gap: 6,
  },
  subjectName: {
    fontSize: 17,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  subjectCodePill: {
    alignSelf: "flex-start",
    backgroundColor: "#F3F5F9",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  subjectCodeText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: "#6B7280",
    letterSpacing: 0.3,
  },
  skeletonWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  errorText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#6B7280",
    textAlign: "center",
  },
  noticeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    margin: 16,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#EEF0F4",
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#6B7280",
  },
  classPickerWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  classPickerLabel: {
    fontSize: 10.5,
    fontFamily: fonts.bold,
    color: "#B0B7C3",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  classPickerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  classChip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#EEF0F4",
  },
  classChipActive: {
    backgroundColor: "#2F6FE0",
  },
  classChipText: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#6B7280",
  },
  classChipTextActive: {
    color: "#fff",
  },
});
