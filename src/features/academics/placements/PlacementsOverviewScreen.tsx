import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Modal } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/theme";
import { formatDate } from "@/utils/calendar";
import { toast } from "@/utils/toast";
import { useRole } from "@/hooks/useRole";
import {
  getUpcomingDrives,
  getDriveHistory,
  type UpcomingDrive,
  type DriveHistoryItem,
  type ApplicationStatus,
} from "@/services/api/placements.api";
import {
  getUpcomingDrivesForFaculty,
  getMentoredStudents,
  getDepartmentStudents,
  getDepartmentClasses,
  type UpcomingDrive as FacultyUpcomingDrive,
  type MentoredStudent,
  type DepartmentClass,
} from "@/services/api/faculty-placements.api";

type PlacementTab = "upcoming" | "history";

// "Round N cleared" comes straight from drive_application_status_enum
// (applied/r1_cleared/r2_cleared/r3_cleared/rejected/placed) - the schema
// has no named-round checklist (no "Online assessment"/"Technical
// interview"/etc.), just this one coarse per-drive status, so that's the
// most detail a status can ever show.
const APPLICATION_STATUS_META: Record<ApplicationStatus, { label: string; bg: string; text: string }> = {
  applied: { label: "Applied", bg: "#EAF0FD", text: "#2F6FE0" },
  r1_cleared: { label: "Round 1 cleared", bg: "#FEF3C7", text: "#D97706" },
  r2_cleared: { label: "Round 2 cleared", bg: "#FEF3C7", text: "#D97706" },
  r3_cleared: { label: "Round 3 cleared", bg: "#FEF3C7", text: "#D97706" },
  placed: { label: "Offer", bg: "#F0FDF4", text: "#16A34A" },
  rejected: { label: "Rejected", bg: "#FEF2F2", text: "#DC2626" },
};

function PlacementsHeader({ onBack }: { onBack: () => void }) {
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
      <Text style={styles.headerTitle}>Placements</Text>
    </LinearGradient>
  );
}

// Wired to EOS-backend's placement/drives module - see
// @/services/api/placements.api.ts (student's own self-service view) and
// @/services/api/faculty-placements.api.ts (faculty/HoD mentor view).
// Reachable from the Academics tab's chooser for every role; branches on
// useRole() since a student and a faculty/HoD mentor need genuinely
// different data here - a student has their own application outcome to
// track, a mentor has none (they're not an applicant) but instead needs to
// see students' histories. Faculty and HoD share the exact same UI (the
// "History" tab is just "pick a student, see their placement history") -
// only which students they can pick from differs: a faculty mentor sees
// their own mentored classes, a HoD sees every class in their department.
export function PlacementsOverviewScreen() {
  const role = useRole();
  const router = useRouter();
  const navigation = useNavigation();

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({
        header: () => <PlacementsHeader onBack={() => router.back()} />,
      });
    }, [navigation, router]),
  );

  if (role === "student") return <StudentPlacementsBody />;
  return role === "hod" ? (
    <MentorPlacementsBody
      fetchStudents={getDepartmentStudents}
      emptyStudentsText="No classes have been assigned to your department yet."
      classPicker
    />
  ) : (
    <MentorPlacementsBody fetchStudents={getMentoredStudents} emptyStudentsText="You aren't mentoring any class yet." />
  );
}

// ───────────────────────────── Student body ─────────────────────────────

function StudentPlacementsBody() {
  const [tab, setTab] = useState<PlacementTab>("upcoming");

  const [upcoming, setUpcoming] = useState<UpcomingDrive[] | null>(null);
  const [upcomingLoading, setUpcomingLoading] = useState(true);
  const [upcomingErrored, setUpcomingErrored] = useState(false);
  const [upcomingReloadToken, setUpcomingReloadToken] = useState(0);

  const [history, setHistory] = useState<DriveHistoryItem[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyErrored, setHistoryErrored] = useState(false);
  const [historyReloadToken, setHistoryReloadToken] = useState(0);

  useEffect(() => {
    setUpcomingLoading(true);
    setUpcomingErrored(false);
    getUpcomingDrives()
      .then(setUpcoming)
      .catch(() => setUpcomingErrored(true))
      .finally(() => setUpcomingLoading(false));
  }, [upcomingReloadToken]);

  useEffect(() => {
    setHistoryLoading(true);
    setHistoryErrored(false);
    getDriveHistory()
      .then(setHistory)
      .catch(() => setHistoryErrored(true))
      .finally(() => setHistoryLoading(false));
  }, [historyReloadToken]);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <View style={styles.content}>
        <TabSwitch tab={tab} setTab={setTab} />

        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {tab === "upcoming" ? (
            upcomingLoading ? (
              <LoadingState />
            ) : upcomingErrored ? (
              <ErrorState onRetry={() => setUpcomingReloadToken((n) => n + 1)} />
            ) : upcoming && upcoming.length > 0 ? (
              upcoming.map((drive) => <StudentUpcomingCard key={drive.drive_id} drive={drive} />)
            ) : (
              <EmptyState icon="briefcase-outline" text="No drives coming up right now." />
            )
          ) : historyLoading ? (
            <LoadingState />
          ) : historyErrored ? (
            <ErrorState onRetry={() => setHistoryReloadToken((n) => n + 1)} />
          ) : history && history.length > 0 ? (
            history.map((item) => <HistoryCard key={item.drive_id} item={item} />)
          ) : (
            <EmptyState icon="document-text-outline" text="No placement history yet." />
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function StudentUpcomingCard({ drive }: { drive: UpcomingDrive }) {
  const meta = APPLICATION_STATUS_META[drive.application_status];

  return (
    <View style={[styles.card, !drive.is_disclosed && styles.cardUndisclosed]}>
      <View style={styles.cardHeaderRow}>
        <View style={styles.cardHeader}>
          {!drive.is_disclosed && <Ionicons name="lock-closed" size={14} color="#8A93A3" />}
          <Text style={[styles.company, !drive.is_disclosed && styles.companyUndisclosed]}>{drive.company_name}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
          <Text style={[styles.statusBadgeText, { color: meta.text }]}>{meta.label}</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Ionicons name="calendar-outline" size={13} color="#8A93A3" />
        <Text style={styles.metaText}>Drive on {formatDate(new Date(drive.scheduled_date))}</Text>
      </View>

      {drive.is_disclosed && drive.company_profile_info && (
        <Text style={styles.profileInfo}>{drive.company_profile_info}</Text>
      )}

      {!drive.is_disclosed && (
        <Text style={styles.revealHint}>
          {drive.disclosed_reveal_date
            ? `Company name reveals on ${formatDate(new Date(drive.disclosed_reveal_date))}`
            : "Company name will be revealed closer to the drive date."}
        </Text>
      )}
    </View>
  );
}

// A rejection overwrites application_status, but last_cleared_round is
// tracked separately and survives it - so a student rejected after
// clearing a round gets to see that progress, not just a flat "Rejected".
function historyStatusLabel(item: DriveHistoryItem): string {
  const base = APPLICATION_STATUS_META[item.application_status].label;
  if (item.application_status === "rejected" && item.last_cleared_round) {
    return `Round ${item.last_cleared_round} cleared · ${base}`;
  }
  return base;
}

function HistoryCard({ item }: { item: DriveHistoryItem }) {
  const meta = APPLICATION_STATUS_META[item.application_status];

  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.company}>{item.company_name}</Text>
        <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
          <Text style={[styles.statusBadgeText, { color: meta.text }]}>{historyStatusLabel(item)}</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Ionicons name="calendar-outline" size={13} color="#8A93A3" />
        <Text style={styles.metaText}>Drive on {formatDate(new Date(item.scheduled_date))}</Text>
      </View>
    </View>
  );
}

// ───────────────────────────── Faculty/HoD (mentor) body ─────────────────────────────

function initialsFromName(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

// Shared by both a faculty mentor and a HoD - identical UI, only which
// students are pickable differs (fetchStudents passed in by the caller;
// see PlacementsOverviewScreen). The drill-down destination
// (StudentPlacementHistoryScreen) re-derives the same role split itself via
// useRole(), so no route/param plumbing is needed here for that.
//
// `classPicker` additionally renders a class selector above the student
// list (HoD only - a faculty mentor already has a small, fixed set of
// mentored classes, so narrowing further isn't useful) - selecting a class
// re-fetches fetchStudents(classId), "All classes" (the default) omits it.
function MentorPlacementsBody({
  fetchStudents,
  emptyStudentsText,
  classPicker,
}: {
  fetchStudents: (classId?: number) => Promise<MentoredStudent[]>;
  emptyStudentsText: string;
  classPicker?: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<PlacementTab>("upcoming");

  const [upcoming, setUpcoming] = useState<FacultyUpcomingDrive[] | null>(null);
  const [upcomingLoading, setUpcomingLoading] = useState(true);
  const [upcomingErrored, setUpcomingErrored] = useState(false);
  const [upcomingReloadToken, setUpcomingReloadToken] = useState(0);

  const [students, setStudents] = useState<MentoredStudent[] | null>(null);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [studentsErrored, setStudentsErrored] = useState(false);
  const [studentsReloadToken, setStudentsReloadToken] = useState(0);

  const [classes, setClasses] = useState<DepartmentClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<DepartmentClass | null>(null);
  const [classPickerOpen, setClassPickerOpen] = useState(false);

  useEffect(() => {
    setUpcomingLoading(true);
    setUpcomingErrored(false);
    getUpcomingDrivesForFaculty()
      .then(setUpcoming)
      .catch(() => setUpcomingErrored(true))
      .finally(() => setUpcomingLoading(false));
  }, [upcomingReloadToken]);

  useEffect(() => {
    if (!classPicker) return;
    getDepartmentClasses()
      .then(setClasses)
      .catch(() => toast.error("Couldn't load the class list"));
  }, [classPicker]);

  useEffect(() => {
    setStudentsLoading(true);
    setStudentsErrored(false);
    fetchStudents(selectedClass?.class_id)
      .then(setStudents)
      .catch(() => setStudentsErrored(true))
      .finally(() => setStudentsLoading(false));
  }, [fetchStudents, selectedClass, studentsReloadToken]);

  function openStudentHistory(student: MentoredStudent) {
    router.push({
      pathname: "/(tabs)/academics/placements/student/[studentId]",
      params: {
        studentId: String(student.student_id),
        name: student.name,
        studentIdNo: student.student_id_no,
      },
    } as never);
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <View style={styles.content}>
        <TabSwitch tab={tab} setTab={setTab} />

        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {tab === "upcoming" ? (
            upcomingLoading ? (
              <LoadingState />
            ) : upcomingErrored ? (
              <ErrorState onRetry={() => setUpcomingReloadToken((n) => n + 1)} />
            ) : upcoming && upcoming.length > 0 ? (
              upcoming.map((drive) => <FacultyUpcomingCard key={drive.drive_id} drive={drive} />)
            ) : (
              <EmptyState icon="briefcase-outline" text="No drives coming up right now." />
            )
          ) : (
            <>
              {classPicker && (
                <TouchableOpacity
                  style={styles.classPickerButton}
                  onPress={() => setClassPickerOpen(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="school-outline" size={16} color="#2F6FE0" />
                  <Text style={styles.classPickerButtonText}>
                    {selectedClass ? classLabel(selectedClass) : "All classes"}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#2F6FE0" />
                </TouchableOpacity>
              )}

              {studentsLoading ? (
                <LoadingState />
              ) : studentsErrored ? (
                <ErrorState onRetry={() => setStudentsReloadToken((n) => n + 1)} />
              ) : students && students.length > 0 ? (
                <>
                  <Text style={styles.sectionHint}>Tap a student to see their placement history.</Text>
                  {students.map((student) => (
                    <StudentRow
                      key={student.student_id}
                      student={student}
                      onPress={() => openStudentHistory(student)}
                    />
                  ))}
                </>
              ) : (
                <EmptyState icon="people-outline" text={selectedClass ? "No students in this class yet." : emptyStudentsText} />
              )}
            </>
          )}
        </ScrollView>
      </View>

      {classPicker && (
        <Modal
          visible={classPickerOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setClassPickerOpen(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setClassPickerOpen(false)}
          >
            <TouchableOpacity style={styles.modalCard} activeOpacity={1}>
              <Text style={styles.modalTitle}>Select a class</Text>
              <ScrollView style={styles.classList} showsVerticalScrollIndicator={false}>
                <TouchableOpacity
                  style={styles.classRow}
                  onPress={() => {
                    setSelectedClass(null);
                    setClassPickerOpen(false);
                  }}
                >
                  <Text style={styles.classRowText}>All classes</Text>
                  {!selectedClass && <Ionicons name="checkmark" size={16} color="#2F6FE0" />}
                </TouchableOpacity>
                {classes.map((cls) => (
                  <TouchableOpacity
                    key={cls.class_id}
                    style={styles.classRow}
                    onPress={() => {
                      setSelectedClass(cls);
                      setClassPickerOpen(false);
                    }}
                  >
                    <Text style={styles.classRowText}>{classLabel(cls)}</Text>
                    {selectedClass?.class_id === cls.class_id && (
                      <Ionicons name="checkmark" size={16} color="#2F6FE0" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}
    </SafeAreaView>
  );
}

function classLabel(cls: DepartmentClass): string {
  return `${cls.course_code} - Section ${cls.section} (${cls.batch_name})`;
}

function FacultyUpcomingCard({ drive }: { drive: FacultyUpcomingDrive }) {
  return (
    <View style={[styles.card, !drive.is_disclosed && styles.cardUndisclosed]}>
      <View style={styles.cardHeader}>
        {!drive.is_disclosed && <Ionicons name="lock-closed" size={14} color="#8A93A3" />}
        <Text style={[styles.company, !drive.is_disclosed && styles.companyUndisclosed]}>{drive.company_name}</Text>
      </View>

      <View style={styles.metaRow}>
        <Ionicons name="calendar-outline" size={13} color="#8A93A3" />
        <Text style={styles.metaText}>Drive on {formatDate(new Date(drive.scheduled_date))}</Text>
      </View>

      {drive.is_disclosed && drive.company_profile_info && (
        <Text style={styles.profileInfo}>{drive.company_profile_info}</Text>
      )}

      {!drive.is_disclosed && (
        <Text style={styles.revealHint}>
          {drive.disclosed_reveal_date
            ? `Company name reveals on ${formatDate(new Date(drive.disclosed_reveal_date))}`
            : "Company name will be revealed closer to the drive date."}
        </Text>
      )}
    </View>
  );
}

function StudentRow({ student, onPress }: { student: MentoredStudent; onPress: () => void }) {
  const classLabel = student.section
    ? `${student.department_name ?? "—"} - ${student.section}`
    : "No class assigned";

  return (
    <TouchableOpacity style={styles.studentRow} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initialsFromName(student.name)}</Text>
      </View>
      <View style={styles.studentTextWrap}>
        <Text style={styles.studentName}>{student.name}</Text>
        <Text style={styles.studentSubtext}>
          {student.student_id_no} · {classLabel}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#B0B7C3" />
    </TouchableOpacity>
  );
}

// ───────────────────────────── Shared ─────────────────────────────

function TabSwitch({ tab, setTab }: { tab: PlacementTab; setTab: (tab: PlacementTab) => void }) {
  return (
    <View style={styles.tabSwitch}>
      <TouchableOpacity
        style={[styles.tabSwitchButton, tab === "upcoming" && styles.tabSwitchButtonActive]}
        onPress={() => setTab("upcoming")}
      >
        <Text style={[styles.tabSwitchText, tab === "upcoming" && styles.tabSwitchTextActive]}>Upcoming drives</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tabSwitchButton, tab === "history" && styles.tabSwitchButtonActive]}
        onPress={() => setTab("history")}
      >
        <Text style={[styles.tabSwitchText, tab === "history" && styles.tabSwitchTextActive]}>History</Text>
      </TouchableOpacity>
    </View>
  );
}

function LoadingState() {
  return (
    <View style={styles.centerState}>
      <ActivityIndicator size="small" color="#2F6FE0" />
      <Text style={styles.centerStateText}>Loading...</Text>
    </View>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.centerState}>
      <Ionicons name="cloud-offline-outline" size={32} color="#B0B7C3" />
      <Text style={styles.centerStateText}>Couldn't load this. Please try again.</Text>
      <TouchableOpacity onPress={onRetry} activeOpacity={0.8}>
        <Text style={styles.retryText}>Tap to retry</Text>
      </TouchableOpacity>
    </View>
  );
}

function EmptyState({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.centerState}>
      <Ionicons name={icon} size={32} color="#B0B7C3" />
      <Text style={styles.centerStateText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontFamily: fonts.bold,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  tabSwitch: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 4,
    gap: 4,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  tabSwitchButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    paddingVertical: 12,
  },
  tabSwitchButtonActive: {
    backgroundColor: "#2F6FE0",
  },
  tabSwitchText: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: "#4B5563",
  },
  tabSwitchTextActive: {
    color: "#fff",
    fontFamily: fonts.bold,
  },
  list: {
    paddingBottom: 32,
  },
  sectionHint: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
    marginBottom: 10,
  },
  classPickerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    backgroundColor: "#EAF0FD",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 12,
  },
  classPickerButtonText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#2F6FE0",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
  },
  modalTitle: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
    marginBottom: 12,
  },
  classList: {
    maxHeight: 400,
  },
  classRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F6",
  },
  classRowText: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#111827",
    paddingRight: 8,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 16,
    marginBottom: 14,
  },
  cardUndisclosed: {
    borderStyle: "dashed",
    borderColor: "#D1D5DB",
    backgroundColor: "#FAFAFB",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    marginBottom: 8,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 8,
  },
  company: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  companyUndisclosed: {
    color: "#6B7280",
    fontFamily: fonts.semibold,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#8A93A3",
  },
  profileInfo: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#6B7280",
    marginTop: 8,
    lineHeight: 18,
  },
  revealHint: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
    marginTop: 8,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusBadgeText: {
    fontSize: 11,
    fontFamily: fonts.bold,
  },
  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    elevation: 1,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E4EBFB",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  studentTextWrap: {
    flex: 1,
  },
  studentName: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  studentSubtext: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 2,
  },
  centerState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 8,
  },
  centerStateText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
    textAlign: "center",
  },
  retryText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
    marginTop: 4,
  },
});
