import { useCallback, useMemo, useRef, useState, type RefObject } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Modal } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { SkeletonListRows } from "@/components/ui/Skeleton";
import { AnchoredDropdown } from "@/components/ui/dropdown";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { confirm } from "@/utils/confirm";
import { getCalendarWeeks, WEEKDAY_LABELS, MONTH_NAMES, formatDate, toIsoDate } from "@/utils/calendar";
import { getApiErrorMessage } from "@/services/api/client";
import {
  getTodayClasses,
  getClassAttendanceDraft,
  recognizeAttendance,
  markClassAttendance,
  publishClassAttendance,
  MAX_RECOGNIZE_IMAGES,
  type TodayClassSlot,
  type RosterStudent,
} from "@/services/api/attendance-cv.api";
import { FaceCaptureCamera } from "./FaceCaptureCamera";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";

// Mobile-side status label - "onduty" (no underscore) is kept distinct from
// the backend's own attendance_status_enum spelling ("on_duty") purely so
// this file's existing STATUS_META/toggle-grid code (unchanged from the
// mock-data version) didn't need renaming; mapped at the two call sites that
// actually talk to the backend - see STATUS_TO_BACKEND/STATUS_FROM_BACKEND.
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

const STATUS_FROM_BACKEND: Record<"present" | "absent" | "on_duty", AttendanceStatus> = {
  present: "present",
  absent: "absent",
  on_duty: "onduty",
};

// Every student starts out present - the faculty only touches the
// exceptions (absent / on duty), there's no separate "mark all" step.
const DEFAULT_STATUS: AttendanceStatus = "present";

// One (class, subject) the faculty teaches on the selected date. Several
// periods of the same subject for the same class that day collapse into a
// single option, since attendance is stored per class+subject+date.
type ClassOption = {
  class_id: number;
  subject_id: number;
  subject_name: string;
  class_section: string;
  department_name: string;
  label: string;
};

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Slots handed over to another faculty that day (covered_by) are dropped -
// that period's attendance belongs to whoever is covering it.
function slotsToOptions(slots: TodayClassSlot[]): ClassOption[] {
  const grouped = new Map<string, TodayClassSlot[]>();
  for (const slot of slots) {
    if (slot.covered_by) continue;
    const key = `${slot.class_id}:${slot.subject_id}`;
    const group = grouped.get(key);
    if (group) group.push(slot);
    else grouped.set(key, [slot]);
  }

  return Array.from(grouped.values()).map((group) => {
    const sorted = [...group].sort((a, b) => a.period_number - b.period_number);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const periods =
      sorted.length === 1
        ? `Period ${first.period_number}`
        : `Periods ${sorted.map((s) => s.period_number).join(", ")}`;
    const substitution = sorted.some((s) => s.is_substitution) ? " · Substitution" : "";
    return {
      class_id: first.class_id,
      subject_id: first.subject_id,
      subject_name: first.subject_name,
      class_section: first.class_section,
      department_name: first.department_name,
      label: `${periods} · ${first.start_time}–${last.end_time}${substitution}`,
    };
  });
}

function allPresent(students: RosterStudent[]): Record<number, AttendanceStatus> {
  const next: Record<number, AttendanceStatus> = {};
  for (const s of students) next[s.student_id] = DEFAULT_STATUS;
  return next;
}

function initialsFromName(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

// Wired to EOSbackend1: GET /me/classes/today?date= backs the class picker
// (only classes on the selected date), POST
// /me/classes/:class_id/attendance/recognize drives the AI suggestions
// (also doubles as the plain roster fetch when called with no photos), GET
// .../attendance/draft resumes anything already saved for that date, POST
// .../attendance saves a draft and POST .../attendance/publish makes it
// final. The backend independently rejects future dates, unmapped
// classes and edits after publish - the checks here are UX, not security.
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

  const [selectedDate, setSelectedDate] = useState<Date>(startOfToday);
  const selectedDateIso = toIsoDate(selectedDate);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [pickerYear, setPickerYear] = useState(selectedDate.getFullYear());
  const [pickerMonth, setPickerMonth] = useState(selectedDate.getMonth());

  const classPickerAnchorRef = useRef<View>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [optionsLoadedFor, setOptionsLoadedFor] = useState<string | null>(null);
  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);

  const [selectedClass, setSelectedClass] = useState<ClassOption | null>(null);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [students, setStudents] = useState<RosterStudent[]>([]);
  const [analyzed, setAnalyzed] = useState(false);
  // Evidence photo URL the backend returned from the AI step, saved with
  // the attendance rows. Dropped whenever the AI result is discarded.
  const [evidencePhotoUrl, setEvidencePhotoUrl] = useState<string | null>(null);
  const [statusMap, setStatusMap] = useState<Record<number, AttendanceStatus>>({});
  const [isPublished, setIsPublished] = useState(false);
  const [hasSavedDraft, setHasSavedDraft] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Bumped on every date/class switch so a slow response for the previous
  // selection can never overwrite the current one.
  const selectionSeq = useRef(0);
  const optionsSeq = useRef(0);

  function resetRoster() {
    setSelectedClass(null);
    setStudents([]);
    setStatusMap({});
    setAnalyzed(false);
    setEvidencePhotoUrl(null);
    setIsPublished(false);
    setHasSavedDraft(false);
    setDirty(false);
  }

  async function confirmDiscardIfDirty(): Promise<boolean> {
    if (!dirty) return true;
    return confirm({
      title: "Discard changes?",
      message: "You have attendance changes that haven't been saved.",
      confirmText: "Discard",
      destructive: true,
    });
  }

  async function loadClassOptions(dateIso: string) {
    const seq = ++optionsSeq.current;
    setPickerLoading(true);
    try {
      const slots = await getTodayClasses(dateIso);
      if (seq !== optionsSeq.current) return;
      setClassOptions(slotsToOptions(slots));
      setOptionsLoadedFor(dateIso);
    } catch (error) {
      if (seq !== optionsSeq.current) return;
      setPickerVisible(false);
      toast.error(getApiErrorMessage(error, "Couldn't load your classes"));
    } finally {
      if (seq === optionsSeq.current) setPickerLoading(false);
    }
  }

  function openPicker() {
    setPickerVisible(true);
    if (optionsLoadedFor !== selectedDateIso && !pickerLoading) {
      void loadClassOptions(selectedDateIso);
    }
  }

  async function loadRoster(option: ClassOption, dateIso: string) {
    const seq = ++selectionSeq.current;
    setRosterLoading(true);
    try {
      const [roster, draft] = await Promise.all([
        recognizeAttendance(option.class_id, option.subject_id, dateIso),
        getClassAttendanceDraft(option.class_id, option.subject_id, dateIso).catch(() => null),
      ]);
      if (seq !== selectionSeq.current) return;

      const nextStatusMap = allPresent(roster.students);
      if (draft) {
        for (const record of draft.records) {
          if (record.student_id in nextStatusMap) {
            nextStatusMap[record.student_id] = STATUS_FROM_BACKEND[record.status];
          }
        }
      } else {
        toast.warning("Couldn't check for previously saved attendance - showing everyone present");
      }

      setStudents(roster.students);
      setAnalyzed(false);
      setStatusMap(nextStatusMap);
      setIsPublished(draft?.is_published ?? false);
      setHasSavedDraft(!!draft && draft.records.length > 0 && !draft.is_published);
      setDirty(false);
    } catch (error) {
      if (seq !== selectionSeq.current) return;
      toast.error(getApiErrorMessage(error, "Couldn't load the class roster"));
    } finally {
      if (seq === selectionSeq.current) setRosterLoading(false);
    }
  }

  async function handleSelectClass(option: ClassOption) {
    setPickerVisible(false);
    if (
      selectedClass &&
      selectedClass.class_id === option.class_id &&
      selectedClass.subject_id === option.subject_id
    ) {
      return;
    }
    if (!(await confirmDiscardIfDirty())) return;
    resetRoster();
    setSelectedClass(option);
    await loadRoster(option, selectedDateIso);
  }

  function openDatePicker() {
    setPickerYear(selectedDate.getFullYear());
    setPickerMonth(selectedDate.getMonth());
    setDatePickerVisible(true);
  }

  const today = startOfToday();
  const pickerWeeks = useMemo(() => getCalendarWeeks(pickerYear, pickerMonth), [pickerYear, pickerMonth]);
  const canGoToNextMonth =
    pickerYear < today.getFullYear() || (pickerYear === today.getFullYear() && pickerMonth < today.getMonth());

  function goToPreviousPickerMonth() {
    if (pickerMonth === 0) {
      setPickerMonth(11);
      setPickerYear((y) => y - 1);
    } else {
      setPickerMonth((m) => m - 1);
    }
  }

  function goToNextPickerMonth() {
    if (!canGoToNextMonth) return;
    if (pickerMonth === 11) {
      setPickerMonth(0);
      setPickerYear((y) => y + 1);
    } else {
      setPickerMonth((m) => m + 1);
    }
  }

  async function handlePickDate(day: number) {
    const picked = new Date(pickerYear, pickerMonth, day);
    if (picked > startOfToday()) return;
    setDatePickerVisible(false);
    if (isSameDay(picked, selectedDate)) return;
    if (!(await confirmDiscardIfDirty())) return;

    selectionSeq.current++;
    optionsSeq.current++;
    setRosterLoading(false);
    setPickerLoading(false);
    resetRoster();
    setClassOptions([]);
    setOptionsLoadedFor(null);
    setSelectedDate(picked);
  }

  function handleOpenCamera() {
    if (!selectedClass) {
      toast.warning("Please select a class and try again");
      return;
    }
    if (rosterLoading || students.length === 0) {
      toast.info("Class roster is still loading - try again in a moment");
      return;
    }
    if (isPublished) {
      toast.warning("Attendance for this class is already published");
      return;
    }
    setCameraOpen(true);
  }

  async function handleCameraDone(images: string[]) {
    setCameraOpen(false);
    if (!selectedClass || images.length === 0) return;
    const seq = selectionSeq.current;
    setRosterLoading(true);
    try {
      const result = await recognizeAttendance(
        selectedClass.class_id,
        selectedClass.subject_id,
        selectedDateIso,
        images,
      );
      if (seq !== selectionSeq.current) return;
      setStudents(result.students);
      setAnalyzed(result.analyzed);
      setEvidencePhotoUrl(result.photo_url);
      // Only students the AI actually has a verdict for change - everyone
      // else keeps whatever they were already marked as.
      setStatusMap((prev) => {
        const next: Record<number, AttendanceStatus> = {};
        for (const s of result.students) {
          next[s.student_id] = s.suggested_status ?? prev[s.student_id] ?? DEFAULT_STATUS;
        }
        return next;
      });
      setDirty(true);
      toast.success("Photos analyzed - review and correct below before saving");
    } catch (error) {
      if (seq !== selectionSeq.current) return;
      toast.error(getApiErrorMessage(error, "Couldn't analyze the photos"));
    } finally {
      if (seq === selectionSeq.current) setRosterLoading(false);
    }
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
    return { present, absent, onduty };
  }, [statusMap, students]);

  function setStatus(studentId: number, status: AttendanceStatus) {
    if (isPublished) return;
    setStatusMap((prev) => (prev[studentId] === status ? prev : { ...prev, [studentId]: status }));
    setDirty(true);
  }

  function handleClear() {
    setStatusMap(allPresent(students));
    setAnalyzed(false);
    setEvidencePhotoUrl(null);
    setDirty(true);
  }

  function buildRecords() {
    return students.map((s) => ({
      student_id: s.student_id,
      status: STATUS_TO_BACKEND[statusMap[s.student_id] ?? DEFAULT_STATUS],
    }));
  }

  function canSubmit(): boolean {
    if (!selectedClass || students.length === 0) {
      toast.warning("Please select a class and try again");
      return false;
    }
    if (selectedDate > startOfToday()) {
      toast.warning("Attendance can't be marked for a future date");
      return false;
    }
    if (isPublished) {
      toast.warning("Attendance for this class is already published");
      return false;
    }
    return true;
  }

  async function handleSave() {
    if (!canSubmit() || !selectedClass) return;
    setSaving(true);
    try {
      const result = await markClassAttendance(
        selectedClass.class_id,
        selectedClass.subject_id,
        selectedDateIso,
        buildRecords(),
        evidencePhotoUrl,
      );
      // Saved as a draft only (is_published: false) - not yet visible to
      // students/parents/advisors, and can still be re-marked and re-saved
      // from here before Publish.
      setHasSavedDraft(true);
      setDirty(false);
      toast.success(`Draft saved for ${result.marked} students - tap Publish to send it out`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't save attendance"));
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    if (!canSubmit() || !selectedClass) return;
    const target = selectedClass;
    const dateIso = selectedDateIso;

    const ok = await confirm({
      title: "Publish attendance?",
      message: `${target.subject_name} · ${target.department_name} ${target.class_section} on ${formatDate(selectedDate)}: ${counts.present} present, ${counts.absent} absent, ${counts.onduty} on duty. Published attendance can't be changed.`,
      confirmText: "Publish",
    });
    if (!ok) return;

    setPublishing(true);
    try {
      // Publish only ever flips the saved draft, so anything not yet saved
      // is saved first - what gets published is exactly what's on screen.
      if (dirty || !hasSavedDraft) {
        await markClassAttendance(target.class_id, target.subject_id, dateIso, buildRecords(), evidencePhotoUrl);
        setHasSavedDraft(true);
        setDirty(false);
      }
      const result = await publishClassAttendance(target.class_id, target.subject_id, dateIso);
      toast.success(`Attendance published for ${result.published} students`);
      selectionSeq.current++;
      resetRoster();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't publish attendance"));
    } finally {
      setPublishing(false);
    }
  }

  if (cameraOpen) {
    return (
      <FaceCaptureCamera
        maxPhotos={MAX_RECOGNIZE_IMAGES}
        onDone={handleCameraDone}
        onCancel={() => setCameraOpen(false)}
      />
    );
  }

  const recognizedCount = students.filter((s) => s.suggested_status !== null).length;
  const presentCount = students.filter((s) => s.suggested_status === "present").length;
  const isToday = isSameDay(selectedDate, today);
  const selectedDateLabel = `${formatDate(selectedDate)}${isToday ? " (Today)" : ""}`;
  const busy = saving || publishing;

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
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={openDatePicker}
          style={styles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Change attendance date"
        >
          <Ionicons name="calendar-outline" size={19} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Attendance</Text>
          <Text style={styles.headerSubtitle}>{selectedDateLabel} · Biometric log</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Class picker */}
        <View ref={classPickerAnchorRef} collapsable={false}>
          <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={openPicker} disabled={busy}>
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
                    : `Your classes on ${selectedDateLabel}`}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#B0B7C3" />
            </View>
          </TouchableOpacity>
        </View>

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

        {/* AI Face Attendance - always shown; Open Camera itself explains
            that a class has to be picked first. */}
        <View style={styles.aiCard}>
          <View style={styles.aiCardHeader}>
            <Text style={styles.aiCardTitle}>AI Face Attendance</Text>
            <View style={styles.notMarkedBadge}>
              <Text style={styles.notMarkedBadgeText}>
                {isPublished ? "PUBLISHED" : analyzed ? "ANALYZED" : "NOT MARKED"}
              </Text>
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
            style={[styles.openCameraButton, (!selectedClass || isPublished) && styles.openCameraButtonMuted]}
            onPress={handleOpenCamera}
            activeOpacity={0.85}
            disabled={busy}
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

        {!selectedClass && (
          <View style={styles.emptyState}>
            <Ionicons name="school-outline" size={32} color="#B0B7C3" />
            <Text style={styles.emptyStateText}>Pick a class above to load its roster</Text>
          </View>
        )}

        {selectedClass && rosterLoading && students.length === 0 && <SkeletonListRows count={4} />}

        {selectedClass && students.length > 0 && (
          <>
            {/* Mark student attendance */}
            <Text style={styles.sectionTitle}>Mark Student Attendance</Text>

            {isPublished && (
              <View style={styles.publishedBanner}>
                <Ionicons name="lock-closed-outline" size={16} color="#15803D" />
                <Text style={styles.publishedBannerText}>
                  Attendance for this class on {formatDate(selectedDate)} is already published and can't be changed.
                </Text>
              </View>
            )}

            <View style={styles.card}>
              <Text style={styles.classDate}>
                {formatDate(selectedDate)} · {students.length} students
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
              </View>

              <View style={styles.studentList}>
                {students.map((student) => (
                  <StudentAttendanceRow
                    key={student.student_id}
                    student={student}
                    status={statusMap[student.student_id] ?? DEFAULT_STATUS}
                    disabled={isPublished || busy}
                    onSetStatus={(status) => setStatus(student.student_id, status)}
                  />
                ))}
              </View>
            </View>

            {!isPublished && (
              <View style={styles.footerActions}>
                <View style={styles.bulkActionsRow}>
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={handleClear}
                    activeOpacity={0.85}
                    disabled={busy}
                  >
                    <Text style={styles.clearButtonText}>Clear</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveButton, busy && styles.saveButtonDisabled]}
                    onPress={handleSave}
                    activeOpacity={0.85}
                    disabled={busy}
                  >
                    {saving ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.saveButtonText}>Save</Text>
                    )}
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.publishButton, busy && styles.publishButtonDisabled]}
                  onPress={handlePublish}
                  activeOpacity={0.85}
                  disabled={busy}
                >
                  {publishing ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.publishButtonText}>Publish Attendance</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <ClassPickerModal
        anchorRef={classPickerAnchorRef}
        visible={pickerVisible}
        loading={pickerLoading}
        dateLabel={selectedDateLabel}
        options={classOptions}
        onSelect={handleSelectClass}
        onClose={() => setPickerVisible(false)}
      />

      <Modal
        visible={datePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDatePickerVisible(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDatePickerVisible(false)}>
          <TouchableOpacity style={styles.dateModalCard} activeOpacity={1}>
            <View style={styles.calendarNav}>
              <TouchableOpacity onPress={goToPreviousPickerMonth} style={styles.navButton} hitSlop={8}>
                <Ionicons name="chevron-back" size={18} color="#2F6FE0" />
              </TouchableOpacity>
              <Text style={styles.calendarMonthLabel}>
                {MONTH_NAMES[pickerMonth]} {pickerYear}
              </Text>
              <TouchableOpacity
                onPress={goToNextPickerMonth}
                style={[styles.navButton, !canGoToNextMonth && styles.navButtonDisabled]}
                hitSlop={8}
                disabled={!canGoToNextMonth}
              >
                <Ionicons name="chevron-forward" size={18} color={canGoToNextMonth ? "#2F6FE0" : "#C7CDD6"} />
              </TouchableOpacity>
            </View>

            <View style={styles.weekdayRow}>
              {WEEKDAY_LABELS.map((label, index) => (
                <Text key={index} style={styles.weekdayLabel}>
                  {label}
                </Text>
              ))}
            </View>

            {pickerWeeks.map((week, weekIndex) => (
              <View key={weekIndex} style={styles.weekRow}>
                {week.map((day, dayIndex) => {
                  if (day === null) {
                    return <View key={dayIndex} style={styles.dayCell} />;
                  }
                  const cellDate = new Date(pickerYear, pickerMonth, day);
                  const disabled = cellDate > today;
                  const selected = isSameDay(cellDate, selectedDate);
                  const isTodayCell = isSameDay(cellDate, today);
                  return (
                    <TouchableOpacity
                      key={dayIndex}
                      style={styles.dayCell}
                      onPress={() => handlePickDate(day)}
                      disabled={disabled}
                    >
                      <View
                        style={[
                          styles.dayCellInner,
                          isTodayCell && styles.dayCellToday,
                          selected && styles.dayCellSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayCellText,
                            disabled && styles.dayCellTextDisabled,
                            selected && styles.dayCellTextSelected,
                          ]}
                        >
                          {day}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}

            <Text style={styles.dateModalHint}>Future dates can't be selected</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

function ClassPickerModal({
  anchorRef,
  visible,
  loading,
  dateLabel,
  options,
  onSelect,
  onClose,
}: {
  anchorRef: RefObject<View | null>;
  visible: boolean;
  loading: boolean;
  dateLabel: string;
  options: ClassOption[];
  onSelect: (option: ClassOption) => void;
  onClose: () => void;
}) {
  return (
    <AnchoredDropdown
      anchorRef={anchorRef}
      visible={visible}
      onClose={onClose}
      contentStyle={[styles.modalSheet, styles.anchoredCard]}
    >
      <View style={styles.modalHandleRow}>
        <Text style={styles.modalTitle}>Choose a class</Text>
        <TouchableOpacity onPress={onClose} hitSlop={8}>
          <Ionicons name="close" size={22} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.modalList}>
          <SkeletonListRows count={4} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.modalList}>
          <Text style={styles.modalSectionLabel}>CLASSES ON {dateLabel.toUpperCase()}</Text>
          {options.length === 0 ? (
            <Text style={styles.modalEmptyText}>No classes scheduled for you on this day</Text>
          ) : (
            options.map((option) => (
              <ClassOptionRow
                key={`${option.class_id}:${option.subject_id}`}
                option={option}
                onPress={() => onSelect(option)}
              />
            ))
          )}
        </ScrollView>
      )}
    </AnchoredDropdown>
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
  disabled,
  onSetStatus,
}: {
  student: RosterStudent;
  status: AttendanceStatus;
  disabled: boolean;
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

      <View style={[styles.statusToggleRow, disabled && styles.statusToggleRowDisabled]}>
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
              disabled={disabled}
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
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,

    alignItems: "center",
    justifyContent: "center",
  },
  headerTextWrap: {
    flex: 1,
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
  openCameraButtonMuted: {
    opacity: 0.75,
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
  clearButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
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
  statusToggleRowDisabled: {
    opacity: 0.55,
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
  footerActions: {
    marginTop: 2,
  },
  publishedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  publishedBannerText: {
    flex: 1,
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#15803D",
  },
  saveButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#2F6FE0",
    paddingVertical: 10,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#fff",
  },
  publishButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#16A34A",
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 14,
    elevation: 3,
    shadowColor: "#16A34A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  publishButtonDisabled: {
    opacity: 0.6,
  },
  publishButtonText: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderRadius: 20,
    maxHeight: "75%",
    paddingTop: 16,
  },
  // Anchored dropdowns have no full-screen flex parent to resolve
  // modalSheet's percentage maxHeight (or the old overlay's implicit width)
  // against, so pin a concrete size here instead.
  anchoredCard: {
    width: 320,
    maxHeight: 420,
    elevation: 6,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  dateModalCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
  },
  calendarNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F3F6",
    alignItems: "center",
    justifyContent: "center",
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  calendarMonthLabel: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  weekdayRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    fontFamily: fonts.semibold,
    color: "#9AA6B2",
  },
  weekRow: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 6,
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCellInner: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: "#2F6FE0",
  },
  dayCellSelected: {
    backgroundColor: "#2F6FE0",
    borderColor: "#2F6FE0",
  },
  dayCellText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  dayCellTextDisabled: {
    color: "#D1D5DB",
  },
  dayCellTextSelected: {
    color: "#fff",
  },
  dateModalHint: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    textAlign: "center",
    marginTop: 6,
  },
});
