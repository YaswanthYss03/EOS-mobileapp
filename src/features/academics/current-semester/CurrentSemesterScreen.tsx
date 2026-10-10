import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { SkeletonListRows } from "@/components/ui/Skeleton";
import { fonts } from "@/theme";
import { useRole } from "@/hooks/useRole";
import { formatClassLine, type ClassLabelParts } from "@/utils/classLabel";
import {
  getMyTimetable,
  getMyClassSection,
  getMyCurrentSemesterAsFaculty,
} from "@/services/api/current-semester.api";
import { listMyAssignmentStatuses } from "@/services/api/no-due.api";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";

// One entry per class this subject is taught to - always exactly one for a
// student (their own class), but a faculty member can teach the same
// subject to several classes at once, so this merges those into one card
// listing every class in full (year, department, section - never
// abbreviated down to a bare section letter, and never truncated).
type Subject = {
  id: number;
  code: string;
  name: string;
  classes: ClassLabelParts[];
  hoursPerWeek: number;
};

type LoadStatus = "loading" | "success" | "error";

function semesterToYear(semester: number | null): number | null {
  return semester ? Math.ceil(semester / 2) : null;
}

function initialsFromSubject(name: string) {
  return name
    .split(/\s+/)
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase();
}

function CurrentSemesterHeader({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={["#2F6FE0", "#1A3D8F"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.header, { paddingTop: insets.top + 10 }]}
    >
      <TouchableOpacity
        onPress={onBack}
        style={styles.backButton}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="arrow-back" size={20} color="#fff" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Current Semester</Text>
    </LinearGradient>
  );
}

// Wired to GET /me/timetable (real per-subject weekly period counts) +
// GET /student-assignment-status (real per-subject assignment counts) + GET
// /lms-notes?subject_id= (real per-subject material counts) + GET /me/profile
// (class_section) for STUDENTS. Faculty/HoD app users reach this exact same
// screen (see AcademicsChooserScreen - "same for hod, faculty and student")
// but have no linked student record at all, so they're wired to a separate
// self-scoped GET /me/current-semester instead, which returns one row per
// (subject, class) combo the faculty teaches - a faculty member can teach
// the same subject to several sections, so section now varies per row
// instead of being one fixed value repeated on every card. timetable_slots
// has no "room" column at all, so room is dropped rather than fabricated.
export function CurrentSemesterScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const role = useRole();
  // A faculty/HoD reaches this screen via the erp tab's own local copy (see
  // app/(tabs)/erp/current-semester/index.tsx), so the subject drill-down
  // below must stay inside that same tab too - see OnlineClassScreen's
  // identical basePath comment for why crossing into the (hidden, for
  // these roles) Academics tab broke the Tabs navigator's back-stack.
  const lmsBasePath = role === "employee" || role === "hod" ? "/(tabs)/erp/lms" : "/(tabs)/academics/lms";

  const [status, setStatus] = useState<LoadStatus>("loading");
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const loadForStudent = useCallback(() => {
    return Promise.all([getMyTimetable(), listMyAssignmentStatuses(), getMyClassSection().catch(() => null)]).then(
      ([timetable, statusRows, classSectionResult]) => {
        const classPart: ClassLabelParts = {
          label: classSectionResult?.class_section ?? "—",
          year: semesterToYear(classSectionResult?.current_semester ?? null),
          department_code: classSectionResult?.department_code ?? undefined,
          section: classSectionResult?.class_section ?? undefined,
        };
        const bySubject = new Map<number, Subject>();

        for (const day of timetable.days) {
          for (const slot of day.slots) {
            const entry =
              bySubject.get(slot.subject.id) ??
              ({
                id: slot.subject.id,
                code: slot.subject.subject_code,
                name: slot.subject.name,
                classes: [classPart],
                hoursPerWeek: 0,
              } as Subject);
            entry.hoursPerWeek += 1;
            bySubject.set(slot.subject.id, entry);
          }
        }

        for (const row of statusRows) {
          const subjectId = row.assignment.subject.id;
          if (!bySubject.has(subjectId)) {
            bySubject.set(subjectId, {
              id: subjectId,
              code: row.assignment.subject.subject_code,
              name: row.assignment.subject.name,
              classes: [classPart],
              hoursPerWeek: 0,
            });
          }
        }

        const sorted = Array.from(bySubject.values()).sort((a, b) => a.code.localeCompare(b.code));
        setSubjects(sorted);
      },
    );
  }, []);

  // Merges by subject_id: a faculty member teaching the same subject to
  // several classes gets ONE card listing every one of those classes in
  // full (year/department/section), instead of one duplicate card per class.
  const loadForFaculty = useCallback(() => {
    return getMyCurrentSemesterAsFaculty().then((response) => {
      const bySubject = new Map<number, Subject>();
      for (const subject of response.subjects) {
        const classPart: ClassLabelParts = {
          label: subject.section,
          year: semesterToYear(subject.semester),
          department_code: subject.department_code ?? undefined,
          section: subject.section,
        };
        const entry =
          bySubject.get(subject.subject_id) ??
          ({
            id: subject.subject_id,
            code: subject.subject_code,
            name: subject.subject_name,
            classes: [],
            hoursPerWeek: 0,
          } as Subject);
        entry.classes.push(classPart);
        entry.hoursPerWeek += subject.hours_per_week;
        bySubject.set(subject.subject_id, entry);
      }
      setSubjects(Array.from(bySubject.values()).sort((a, b) => a.code.localeCompare(b.code)));
    });
  }, []);

  const load = useCallback(() => {
    setStatus("loading");
    const request = role === "student" ? loadForStudent() : loadForFaculty();
    request.then(() => setStatus("success")).catch(() => setStatus("error"));
  }, [role, loadForStudent, loadForFaculty]);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({
        header: () => (
          <CurrentSemesterHeader
            // A faculty member or HoD reaches this via the Class tab's own
            // Campus grid (a separate tab's Stack) - see TimetableScreen's
            // identical comment for why router.back() alone isn't reliable
            // there. A student has their own dedicated Campus tab instead
            // (this screen's own Stack), where router.back() correctly pops
            // back to Academics.
            onBack={() =>
              role === "employee" || role === "hod" ? router.replace("/(tabs)/erp") : router.back()
            }
          />
        ),
      });
      return () => {
        navigation.getParent()?.setOptions({ header: () => <CollegeHeader /> });
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [navigation, router, subjects.length]),
  );

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <WatermarkBackground />
      {status === "loading" && (
        <View style={styles.content}>
          <SkeletonListRows count={4} />
        </View>
      )}

      {status === "error" && (
        <View style={styles.errorNotice}>
          <Ionicons name="alert-circle-outline" size={22} color="#DC2626" />
          <Text style={styles.errorNoticeText}>Couldn't load your current semester.</Text>
          <TouchableOpacity onPress={load} style={styles.retryButton} activeOpacity={0.8}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === "success" && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {subjects.length === 0 ? (
            <Text style={styles.emptyText}>No subjects scheduled yet.</Text>
          ) : (
            subjects.map((subject) => (
              <SubjectCard
                key={subject.id}
                subject={subject}
                onPress={() =>
                  router.push({
                    pathname: `${lmsBasePath}/[subjectId]`,
                    params: {
                      subjectId: String(subject.id),
                      subjectName: subject.name,
                      subjectCode: subject.code,
                    },
                  })
                }
              />
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function SubjectCard({ subject, onPress }: { subject: Subject; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initialsFromSubject(subject.name)}</Text>
        </View>
        <View style={styles.cardHeaderText}>
          <Text style={styles.subjectName}>{subject.name}</Text>
          <Text style={styles.subjectMeta}>{subject.code}</Text>
        </View>
      </View>

      {subject.classes.length > 0 && (
        <View style={styles.classChipList}>
          {subject.classes.map((classPart, index) => (
            <View key={index} style={styles.classChip}>
              <Text style={styles.classChipText}>{formatClassLine(classPart)}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.divider} />

      <View style={styles.footerRow}>
        <Text style={styles.footerText}>{subject.hoursPerWeek} hrs / week</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
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
  headerSubtitle: {
    color: "#D7E2FA",
    fontSize: 12,
    fontFamily: fonts.medium,
    marginTop: 2,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  errorNotice: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 48,
    paddingHorizontal: 16,
  },
  errorNoticeText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#6B7280",
    textAlign: "center",
  },
  retryButton: {
    marginTop: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#2F6FE0",
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  retryButtonText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  emptyText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
    textAlign: "center",
    marginTop: 32,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 14,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#EAF0FD",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  cardHeaderText: {
    flex: 1,
  },
  subjectName: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  subjectMeta: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#8A93A3",
    marginTop: 2,
  },
  // Each class gets its own full-width chip (never cropped to a single
  // letter) so a subject shared across several classes can list every one
  // of them, wrapping onto new lines as needed instead of overflowing or
  // truncating.
  classChipList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  classChip: {
    backgroundColor: "#EAF0FD",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  classChipText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F3F6",
    marginBottom: 10,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#8A93A3",
  },
});
