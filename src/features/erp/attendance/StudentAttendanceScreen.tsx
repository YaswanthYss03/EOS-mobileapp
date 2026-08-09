import { useCallback, useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, ActivityIndicator } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { getApiErrorMessage } from "@/services/api/client";
import {
  getTodayClasses,
  getHandledClasses,
  recognizeAttendance,
  markClassAttendance,
  type TodayClassSlot,
  type HandledClass,
  type RosterStudent,
} from "@/services/api/attendance-cv.api";
import { FaceCaptureCamera } from "./FaceCaptureCamera";

// Mobile-side status label - "onduty" (no underscore) is kept distinct from
// the backend's own attendance_status_enum spelling ("on_duty") purely so
// this file's existing STATUS_META/toggle-grid code (unchanged from the
// mock-data version) didn't need renaming; mapped at the one call site that
// actually talks to the backend - see STATUS_TO_BACKEND in handleSave.
type AttendanceStatus = "present" | "absent" | "onduty";

const STATUS_META: Record<AttendanceStatus, { label: string; color: string }> = {
  present: { label: "P", color: "#16A34A" },
  absent: { label: "A", color: "#DC2626" },
  onduty: { label: "OD", color: "#2F6FE0" },
};

const STATUS_TO_BACKEND: Record<AttendanceStatus, "present" | "absent" | "on_duty"> = {
  present: "present",
  absent: "absent",
  onduty: "on_duty",
};

// What the class picker actually needs, whichever of the two backend list
// endpoints it came from (today's timetable vs. the broader handled-classes
// fallback) - both normalize to this shape.
type ClassOption = {
  class_id: number;
  subject_id: number;
  subject_name: string;
  class_section: string;
  department_name: string;
  label: string;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function todayClassSlotToOption(slot: TodayClassSlot): ClassOption {
  return {
    class_id: slot.class_id,
    subject_id: slot.subject_id,
    subject_name: slot.subject_name,
    class_section: slot.class_section,
    department_name: slot.department_name,
    label: `Period ${slot.period_number} · ${slot.start_time}–${slot.end_time}`,
  };
}

function handledClassToOption(cls: HandledClass): ClassOption {
  return {
    class_id: cls.class_id,
    subject_id: cls.subject_id,
    subject_name: cls.subject_name,
    class_section: cls.section,
    department_name: cls.department_name,
    label: cls.academic_year,
  };
}

function initialsFromName(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

// Wired to EOSbackend1's attendance-cv module: GET /me/classes/today +
// /me/handled-classes back the class picker, POST
// /me/classes/:class_id/attendance/recognize drives the AI suggestions
// (also doubles as the plain roster fetch when called with no photos), and
// the existing, unmodified POST /me/classes/:class_id/attendance
// (markForClass) is the only thing that ever actually persists attendance -
// the AI step only ever produces a draft the faculty reviews here first.
export function StudentAttendanceScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // Deferred by a tick - this screen and EnrollFacesScreen both hide this
  // same shared header, and on the transition back from there (pop), that
  // screen's blur cleanup (which restores CollegeHeader) can otherwise land
  // after this screen's own re-focus call, wrongly leaving CollegeHeader up
  // here. See EnrollFacesScreen's own doc comment for the forward case.
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

  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerLoaded, setPickerLoaded] = useState(false);
  const [todayOptions, setTodayOptions] = useState<ClassOption[]>([]);
  const [handledOptions, setHandledOptions] = useState<ClassOption[]>([]);

  const [selectedClass, setSelectedClass] = useState<ClassOption | null>(null);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [students, setStudents] = useState<RosterStudent[]>([]);
  const [analyzed, setAnalyzed] = useState(false);
  const [statusMap, setStatusMap] = useState<Record<number, AttendanceStatus | undefined>>({});
  const [cameraOpen, setCameraOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function openPicker() {
    setPickerVisible(true);
    if (pickerLoaded) return;
    setPickerLoading(true);
    try {
      const [today, handled] = await Promise.all([getTodayClasses(), getHandledClasses()]);
      setTodayOptions(today.map(todayClassSlotToOption));
      setHandledOptions(handled.map(handledClassToOption));
      setPickerLoaded(true);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't load your classes"));
    } finally {
      setPickerLoading(false);
    }
  }

  async function loadRoster(option: ClassOption, images: string[] | undefined) {
    setRosterLoading(true);
    try {
      const result = await recognizeAttendance(option.class_id, option.subject_id, images);
      setStudents(result.students);
      setAnalyzed(result.analyzed);
      const nextStatusMap: Record<number, AttendanceStatus | undefined> = {};
      for (const s of result.students) {
        if (s.suggested_status) nextStatusMap[s.student_id] = s.suggested_status;
      }
      setStatusMap(nextStatusMap);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't load the class roster"));
    } finally {
      setRosterLoading(false);
    }
  }

  async function handleSelectClass(option: ClassOption) {
    setPickerVisible(false);
    setSelectedClass(option);
    setStudents([]);
    setStatusMap({});
    setAnalyzed(false);
    await loadRoster(option, undefined);
  }

  async function handleCameraDone(images: string[]) {
    setCameraOpen(false);
    if (!selectedClass || images.length === 0) return;
    await loadRoster(selectedClass, images);
    toast.success("Photos analyzed - review and correct below before saving");
  }

  const counts = useMemo(() => {
    let present = 0;
    let absent = 0;
    let onduty = 0;
    for (const student of students) {
      const status = statusMap[student.student_id];
      if (status === "present") present++;
      else if (status === "absent") absent++;
      else if (status === "onduty") onduty++;
    }
    return { present, absent, onduty, left: students.length - present - absent - onduty };
  }, [statusMap, students]);

  function setStatus(studentId: number, status: AttendanceStatus) {
    setStatusMap((prev) => ({
      ...prev,
      [studentId]: prev[studentId] === status ? undefined : status,
    }));
  }

  function handleMarkAllPresent() {
    const next: Record<number, AttendanceStatus> = {};
    for (const s of students) next[s.student_id] = "present";
    setStatusMap(next);
  }

  function handleClear() {
    setStatusMap({});
  }

  async function handleSave() {
    if (!selectedClass || students.length === 0) {
      toast.warning("Choose a class first");
      return;
    }
    if (counts.left > 0) {
      toast.warning(`Mark every student before saving - ${counts.left} left`);
      return;
    }

    const records = students.map((s) => ({
      student_id: s.student_id,
      status: STATUS_TO_BACKEND[statusMap[s.student_id]!],
    }));

    setSaving(true);
    try {
      const result = await markClassAttendance(
        selectedClass.class_id,
        selectedClass.subject_id,
        todayIso(),
        records,
      );
      toast.success(`Attendance saved for ${result.marked} students`);
      setSelectedClass(null);
      setStudents([]);
      setStatusMap({});
      setAnalyzed(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't save attendance"));
    } finally {
      setSaving(false);
    }
  }

  if (cameraOpen) {
    return (
      <FaceCaptureCamera
        title="Class Attendance"
        hint="Pan across the room and take a few photos, then tap Done"
        onDone={handleCameraDone}
        onCancel={() => setCameraOpen(false)}
      />
    );
  }

  const recognizedCount = students.filter((s) => s.suggested_status !== null).length;
  const presentCount = students.filter((s) => s.suggested_status === "present").length;

  return (
    <SafeAreaView style={styles.container} edges={[]}>
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
        <View>
          <Text style={styles.headerTitle}>Attendance</Text>
          <Text style={styles.headerSubtitle}>{todayIso()} · Biometric log</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Class picker */}
        <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={openPicker}>
          <View style={styles.calendarRow}>
            <View style={styles.calendarIconWrap}>
              <Ionicons name="book-outline" size={18} color="#2F6FE0" />
            </View>
            <View style={styles.calendarTextWrap}>
              <Text style={styles.calendarTitle}>
                {selectedClass
                  ? `${selectedClass.department_name} · ${selectedClass.class_section}`
                  : "Select a class"}
              </Text>
              <Text style={styles.calendarSubtitle}>
                {selectedClass
                  ? `${selectedClass.subject_name} · ${selectedClass.label}`
                  : "Choose the class you're taking attendance for"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#B0B7C3" />
          </View>
        </TouchableOpacity>

        {/* Only class advisors can actually use this - a non-advisor just
            gets an empty state on the other end, same self-gating pattern
            as /me/mentee-classes elsewhere in the app. */}
        <TouchableOpacity
          style={styles.enrollLinkRow}
          activeOpacity={0.8}
          onPress={() => router.push("/(tabs)/erp/attendance/enroll-faces" as never)}
        >
          <Ionicons name="person-add-outline" size={16} color="#2F6FE0" />
          <Text style={styles.enrollLinkText}>Enroll student faces (class advisor)</Text>
          <Ionicons name="chevron-forward" size={16} color="#B0B7C3" />
        </TouchableOpacity>

        {!selectedClass && (
          <View style={styles.emptyState}>
            <Ionicons name="school-outline" size={32} color="#B0B7C3" />
            <Text style={styles.emptyStateText}>Pick a class above to load its roster</Text>
          </View>
        )}

        {selectedClass && rosterLoading && students.length === 0 && (
          <View style={styles.emptyState}>
            <ActivityIndicator color="#2F6FE0" />
            <Text style={styles.emptyStateText}>Loading roster...</Text>
          </View>
        )}

        {selectedClass && students.length > 0 && (
          <>
            {/* AI Face Attendance */}
            <View style={styles.aiCard}>
              <View style={styles.aiCardHeader}>
                <Text style={styles.aiCardTitle}>AI Face Attendance</Text>
                <View style={styles.notMarkedBadge}>
                  <Text style={styles.notMarkedBadgeText}>{analyzed ? "ANALYZED" : "NOT MARKED"}</Text>
                </View>
              </View>
              <Text style={styles.aiCardSubtitle}>Snap the class - students are marked present</Text>

              <View style={styles.cameraBox}>
                <View style={styles.cameraIconWrap}>
                  <Ionicons name="camera-outline" size={22} color="#fff" />
                </View>
                <Text style={styles.cameraOffText}>Camera is off</Text>
                <Text style={styles.cameraHintText}>Open the camera and photograph the class</Text>
              </View>

              <TouchableOpacity
                style={styles.openCameraButton}
                onPress={() => setCameraOpen(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="camera" size={18} color="#2F6FE0" />
                <Text style={styles.openCameraText}>Open Camera</Text>
              </TouchableOpacity>

              <View style={styles.aiStatsRow}>
                <View style={styles.aiStatBox}>
                  <Text style={styles.aiStatLabel}>RECOGNISED</Text>
                  <Text style={styles.aiStatValue}>{analyzed ? recognizedCount : "–"}</Text>
                </View>
                <View style={styles.aiStatBox}>
                  <Text style={styles.aiStatLabel}>MARKED PRESENT</Text>
                  <Text style={styles.aiStatValue}>{analyzed ? presentCount : "–"}</Text>
                </View>
              </View>
            </View>

            {/* Mark student attendance */}
            <Text style={styles.sectionTitle}>Mark Student Attendance</Text>
            <View style={styles.card}>
              <Text style={styles.classDate}>
                {todayIso()} · {students.length} students
              </Text>

              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={[styles.statValue, styles.statValuePresent]}>{counts.present}</Text>
                  <Text style={styles.statLabel}>PRESENT</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[styles.statValue, styles.statValueAbsent]}>{counts.absent}</Text>
                  <Text style={styles.statLabel}>ABSENT</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[styles.statValue, styles.statValueOnDuty]}>{counts.onduty}</Text>
                  <Text style={styles.statLabel}>ON DUTY</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[styles.statValue, styles.statValueLeft]}>{counts.left}</Text>
                  <Text style={styles.statLabel}>LEFT</Text>
                </View>
              </View>

              <View style={styles.bulkActionsRow}>
                <TouchableOpacity style={styles.markAllButton} onPress={handleMarkAllPresent} activeOpacity={0.85}>
                  <Text style={styles.markAllButtonText}>Mark all present</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.clearButton} onPress={handleClear} activeOpacity={0.85}>
                  <Text style={styles.clearButtonText}>Clear</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.studentList}>
                {students.map((student) => (
                  <StudentAttendanceRow
                    key={student.student_id}
                    student={student}
                    status={statusMap[student.student_id]}
                    onSetStatus={(status) => setStatus(student.student_id, status)}
                  />
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              activeOpacity={0.85}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save Attendance</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <ClassPickerModal
        visible={pickerVisible}
        loading={pickerLoading}
        todayOptions={todayOptions}
        handledOptions={handledOptions}
        onSelect={handleSelectClass}
        onClose={() => setPickerVisible(false)}
      />
    </SafeAreaView>
  );
}

function ClassPickerModal({
  visible,
  loading,
  todayOptions,
  handledOptions,
  onSelect,
  onClose,
}: {
  visible: boolean;
  loading: boolean;
  todayOptions: ClassOption[];
  handledOptions: ClassOption[];
  onSelect: (option: ClassOption) => void;
  onClose: () => void;
}) {
  // Classes already shown under "Today's Timetable" are dropped from "All
  // My Classes" below so the same (class, subject) never appears twice.
  const todayKeys = useMemo(
    () => new Set(todayOptions.map((o) => `${o.class_id}:${o.subject_id}`)),
    [todayOptions],
  );
  const otherOptions = useMemo(
    () => handledOptions.filter((o) => !todayKeys.has(`${o.class_id}:${o.subject_id}`)),
    [handledOptions, todayKeys],
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandleRow}>
            <Text style={styles.modalTitle}>Choose a class</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.modalLoading}>
              <ActivityIndicator color="#2F6FE0" />
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.modalList}>
              <Text style={styles.modalSectionLabel}>TODAY'S TIMETABLE</Text>
              {todayOptions.length === 0 ? (
                <Text style={styles.modalEmptyText}>No periods scheduled for you today</Text>
              ) : (
                todayOptions.map((option, index) => (
                  <ClassOptionRow key={`today-${index}`} option={option} onPress={() => onSelect(option)} />
                ))
              )}

              <Text style={[styles.modalSectionLabel, { marginTop: 18 }]}>ALL MY CLASSES</Text>
              {otherOptions.length === 0 ? (
                <Text style={styles.modalEmptyText}>Nothing else to show</Text>
              ) : (
                otherOptions.map((option, index) => (
                  <ClassOptionRow key={`handled-${index}`} option={option} onPress={() => onSelect(option)} />
                ))
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

function ClassOptionRow({ option, onPress }: { option: ClassOption; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.optionRow} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.optionIconWrap}>
        <Ionicons name="book-outline" size={16} color="#2F6FE0" />
      </View>
      <View style={styles.optionTextWrap}>
        <Text style={styles.optionTitle}>
          {option.subject_name} · {option.department_name} {option.class_section}
        </Text>
        <Text style={styles.optionSubtitle}>{option.label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#B0B7C3" />
    </TouchableOpacity>
  );
}

function StudentAttendanceRow({
  student,
  status,
  onSetStatus,
}: {
  student: RosterStudent;
  status: AttendanceStatus | undefined;
  onSetStatus: (status: AttendanceStatus) => void;
}) {
  return (
    <View style={styles.studentRow}>
      <View style={styles.studentAvatar}>
        <Text style={styles.studentAvatarText}>{initialsFromName(student.name)}</Text>
      </View>
      <View style={styles.studentTextWrap}>
        <Text style={styles.studentName} numberOfLines={1}>
          {student.name}
        </Text>
        <Text style={styles.studentRoll}>{student.student_id_no}</Text>
      </View>

      <View style={styles.statusToggleRow}>
        {(["present", "absent", "onduty"] as const).map((option) => {
          const meta = STATUS_META[option];
          const active = status === option;
          return (
            <TouchableOpacity
              key={option}
              style={[
                styles.statusToggle,
                { borderColor: meta.color },
                active && { backgroundColor: meta.color },
              ]}
              onPress={() => onSetStatus(option)}
            >
              <Text style={[styles.statusToggleText, { color: active ? "#fff" : meta.color }]}>
                {meta.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
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
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  enrollLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EAF0FD",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  enrollLinkText: {
    flex: 1,
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#2F6FE0",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
  },
  aiCard: {
    backgroundColor: "#2952B0",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  aiCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  aiCardTitle: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  notMarkedBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  notMarkedBadgeText: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: "#FDE68A",
    letterSpacing: 0.5,
  },
  aiCardSubtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#D7E2FA",
    marginTop: 4,
  },
  cameraBox: {
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    backgroundColor: "rgba(0,0,0,0.15)",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 28,
  },
  cameraIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  cameraOffText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#fff",
  },
  cameraHintText: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#C7D6F5",
    marginTop: 2,
  },
  openCameraButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingVertical: 12,
    marginTop: 14,
  },
  openCameraText: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  aiStatsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  aiStatBox: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  aiStatLabel: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: "#C7D6F5",
    letterSpacing: 0.5,
  },
  aiStatValue: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: "#fff",
    marginTop: 4,
  },
  calendarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  calendarIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#E4EBFB",
    alignItems: "center",
    justifyContent: "center",
  },
  calendarTextWrap: {
    flex: 1,
  },
  calendarTitle: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  calendarSubtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 1,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#8A93A3",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  classDate: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#2F6FE0",
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#F7F8FA",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontFamily: fonts.bold,
  },
  statValuePresent: {
    color: "#16A34A",
  },
  statValueAbsent: {
    color: "#DC2626",
  },
  statValueOnDuty: {
    color: "#2F6FE0",
  },
  statValueLeft: {
    color: "#6B7280",
  },
  statLabel: {
    fontSize: 9,
    fontFamily: fonts.bold,
    color: "#9AA6B2",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  bulkActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  markAllButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    backgroundColor: "#F0FDF4",
    paddingVertical: 10,
  },
  markAllButtonText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#16A34A",
  },
  clearButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 10,
  },
  clearButtonText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#4B5563",
  },
  studentList: {
    borderTopWidth: 1,
    borderTopColor: "#F1F3F6",
    paddingTop: 4,
  },
  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F6",
  },
  studentAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#E4EBFB",
    alignItems: "center",
    justifyContent: "center",
  },
  studentAvatarText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  studentTextWrap: {
    flex: 1,
  },
  studentName: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  studentRoll: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 1,
  },
  statusToggleRow: {
    flexDirection: "row",
    gap: 6,
  },
  statusToggle: {
    minWidth: 30,
    height: 28,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  statusToggleText: {
    fontSize: 11,
    fontFamily: fonts.bold,
  },
  saveButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2F6FE0",
    borderRadius: 16,
    paddingVertical: 16,
    elevation: 3,
    shadowColor: "#2F6FE0",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    paddingTop: 16,
  },
  modalHandleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F6",
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  modalLoading: {
    paddingVertical: 40,
    alignItems: "center",
  },
  modalList: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 12,
  },
  modalSectionLabel: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: "#8A93A3",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  modalEmptyText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginBottom: 8,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F6",
  },
  optionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#E4EBFB",
    alignItems: "center",
    justifyContent: "center",
  },
  optionTextWrap: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  optionSubtitle: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 1,
  },
});
