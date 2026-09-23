import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
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
import { getApiErrorMessage } from "@/services/api/client";
import {
  getMySubjectRecordMappings,
  publishSubjectRecordResult,
  parseClassLabel,
  type SubjectRecordMapping,
} from "@/services/api/subject-records.api";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";
import {
  getExamMarksRoster,
  enterExamMarks,
  updateExamMark,
  type ExamMarksRosterStudent,
} from "@/services/api/exam-marks.api";

type LoadStatus = "loading" | "success" | "error";
type MarksMap = Record<number, string>;

// Faculty enters an arbitrary max-marks value once per batch (the backend
// has no fixed max per exam type) - 50 matches the CIA convention used
// across this college's internal assessments.
const CIA_MAX_MARKS = 50;

// Groups the flat mapping list from /me/subject-records by class+subject,
// so each group can offer one tab per exam (whatever exam types the COE
// has actually created for that class+subject - typically CIA-1/CIA-2).
type ClassSubjectGroup = {
  key: string;
  classLabel: string;
  batchName: string;
  section: string;
  subjectCode: string;
  subjectName: string;
  exams: SubjectRecordMapping[];
};

function groupMappings(mappings: SubjectRecordMapping[]): ClassSubjectGroup[] {
  const groups = new Map<string, ClassSubjectGroup>();
  for (const m of mappings) {
    const key = `${m.class.id}-${m.subject.id}`;
    const existing = groups.get(key);
    if (existing) {
      existing.exams.push(m);
    } else {
      const { batchName, section } = parseClassLabel(m.class.label);
      groups.set(key, {
        key,
        classLabel: m.class.label,
        batchName,
        section,
        subjectCode: m.subject.subject_code,
        subjectName: m.subject.name,
        exams: [m],
      });
    }
  }
  return Array.from(groups.values());
}

function sanitizeMark(text: string, max: number): string {
  const digitsOnly = text.replace(/[^0-9]/g, "");
  if (!digitsOnly) return "";
  return String(Math.min(parseInt(digitsOnly, 10), max));
}

// Display-only shortening for the exam-switch tabs/save button - exam.type
// is the real exam_types.name from the backend (e.g. "CIA1", "Quiz"), used
// as-is everywhere else (payloads, other screens). "University End
// Semester Exam" is long enough to crowd the tab strip, so just this one
// label gets a shorter on-screen form here; the real name is untouched.
function examTabLabel(type: string): string {
  return type === "University End Semester Exam" ? "SEM" : type;
}

export function CiaMarksScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [groupsStatus, setGroupsStatus] = useState<LoadStatus>("loading");
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [groups, setGroups] = useState<ClassSubjectGroup[]>([]);
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);
  const [selectedExamMappingId, setSelectedExamMappingId] = useState<number | null>(null);

  // Class (each option already shows class+subject together) and Exam type
  // (CIA1/CIA2/Quiz/Presentation/Semester, whatever the COE actually
  // created for that class+subject) are both picked via a dropdown -
  // anchored to each row's own node, same AnchoredDropdown component/
  // pattern as VenueRequestScreen's list pickers.
  const [classDropdownOpen, setClassDropdownOpen] = useState(false);
  const classAnchorRef = useRef<View | null>(null);
  const [examTypeDropdownOpen, setExamTypeDropdownOpen] = useState(false);
  const examTypeAnchorRef = useRef<View | null>(null);

  const [rosterStatus, setRosterStatus] = useState<LoadStatus>("loading");
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [students, setStudents] = useState<ExamMarksRosterStudent[]>([]);
  const [locked, setLocked] = useState(false);
  const [maxMarks, setMaxMarks] = useState<number>(CIA_MAX_MARKS);
  const [convertedToHundred, setConvertedToHundred] = useState(false);
  const [draftMarks, setDraftMarks] = useState<MarksMap>({});
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return () => {
        navigation.getParent()?.setOptions({ headerShown: true, header: () => <CollegeHeader /> });
      };
    }, [navigation]),
  );

  const loadGroups = useCallback(() => {
    setGroupsStatus("loading");
    setGroupsError(null);
    getMySubjectRecordMappings()
      .then((rows) => {
        const grouped = groupMappings(rows);
        setGroups(grouped);
        setGroupsStatus("success");
        if (grouped.length > 0) {
          setSelectedGroupKey((current) => current ?? grouped[0].key);
          setSelectedExamMappingId((current) => current ?? grouped[0].exams[0]?.exam_subject_mapping_id ?? null);
        }
      })
      .catch((err) => {
        setGroupsError(getApiErrorMessage(err, "Couldn't load your classes & subjects."));
        setGroupsStatus("error");
      });
  }, []);

  const loadRoster = useCallback((examSubjectMappingId: number) => {
    setRosterStatus("loading");
    setRosterError(null);
    getExamMarksRoster(examSubjectMappingId)
      .then((roster) => {
        setStudents(roster.students);
        setLocked(roster.locked);
        setMaxMarks(roster.max_marks !== null ? Number(roster.max_marks) : CIA_MAX_MARKS);
        setConvertedToHundred(false);
        const initialDraft: MarksMap = {};
        for (const s of roster.students) {
          if (s.marks_obtained !== null) {
            initialDraft[s.student_id] = String(s.marks_obtained);
          }
        }
        setDraftMarks(initialDraft);
        setRosterStatus("success");
      })
      .catch((err) => {
        setRosterError(getApiErrorMessage(err, "Couldn't load this class's roster."));
        setRosterStatus("error");
      });
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  useEffect(() => {
    if (selectedExamMappingId !== null) {
      loadRoster(selectedExamMappingId);
    }
  }, [selectedExamMappingId, loadRoster]);

  const selectedGroup = useMemo(
    () => groups.find((g) => g.key === selectedGroupKey) ?? null,
    [groups, selectedGroupKey],
  );

  const selectedExam = useMemo(
    () => selectedGroup?.exams.find((e) => e.exam_subject_mapping_id === selectedExamMappingId) ?? null,
    [selectedGroup, selectedExamMappingId],
  );

  // No Batch/Section/Subject filters here anymore - a faculty only ever
  // handles a handful of classes (typically 3-4), so every group is shown
  // directly in the chip strip below rather than filtered down to one.
  const enteredCount = useMemo(
    () => Object.values(draftMarks).filter((value) => value !== "").length,
    [draftMarks],
  );

  function handlePickGroup(group: ClassSubjectGroup) {
    setSelectedGroupKey(group.key);
    setSelectedExamMappingId(group.exams[0]?.exam_subject_mapping_id ?? null);
  }

  function handleChangeMark(studentId: number, text: string) {
    const sanitized = sanitizeMark(text, maxMarks);
    setDraftMarks((prev) => ({ ...prev, [studentId]: sanitized }));
  }

  // "if that exam[’s max] is out of 60 or 50 it automatically convert[s] to
  // 100" - the moment the faculty finishes typing into ANY row for an exam
  // whose real max is 50 or 60 (the two conventional CIA scales), every
  // currently-entered value on this roster is rescaled together onto a /100
  // basis and the roster's own max switches to 100 - guarded so this only
  // happens once per roster load (further edits/clamping then use the new
  // /100 scale, not a second conversion).
  function handleBlurMark() {
    if (convertedToHundred) return;
    if (maxMarks !== 50 && maxMarks !== 60) return;
    const fromMax = maxMarks;
    setDraftMarks((prev) => {
      const next: MarksMap = {};
      for (const [studentId, value] of Object.entries(prev)) {
        if (value === "") {
          next[Number(studentId)] = value;
          continue;
        }
        const scaled = Math.round((Number(value) * 100) / fromMax);
        next[Number(studentId)] = String(Math.min(scaled, 100));
      }
      return next;
    });
    setMaxMarks(100);
    setConvertedToHundred(true);
  }

  function handleClearAll() {
    setDraftMarks({});
  }

  function handleSave() {
    if (!selectedExamMappingId || saving) return;

    // Every row is editable regardless of "locked" - a student with no
    // mark_id yet goes into the bulk-entry call (which now fills in gaps
    // instead of rejecting the whole batch, see enterMarks on the backend);
    // a student who already has a mark_id and whose value actually changed
    // goes through the single-row correction endpoint instead.
    const newEntries = students
      .filter((s) => s.mark_id === null && (draftMarks[s.student_id] ?? "") !== "")
      .map((s) => ({ student_id: s.student_id, marks_obtained: Number(draftMarks[s.student_id]) }));

    const changedEntries = students.filter((s) => {
      if (s.mark_id === null) return false;
      const draft = draftMarks[s.student_id] ?? "";
      const original = s.marks_obtained !== null ? String(s.marks_obtained) : "";
      return draft !== "" && draft !== original;
    });

    if (newEntries.length === 0 && changedEntries.length === 0) {
      toast.info("No changes to save.");
      return;
    }

    setSaving(true);
    const calls: Promise<unknown>[] = [];
    if (newEntries.length > 0) {
      calls.push(enterExamMarks(selectedExamMappingId, maxMarks, newEntries));
    }
    for (const s of changedEntries) {
      calls.push(updateExamMark(s.mark_id as number, Number(draftMarks[s.student_id])));
    }

    Promise.all(calls)
      .then(() => {
        toast.success("Marks saved");
        loadRoster(selectedExamMappingId);
      })
      .catch((err) => toast.error(getApiErrorMessage(err, "Couldn't save marks.")))
      .finally(() => setSaving(false));
  }

  // Reuses the exact same publish mechanism Subject Records already has
  // (exam_subject_mapping.is_published, via POST /me/subject-records/:id/
  // publish) - this is the same underlying exam_subject_mapping_id, so no
  // new backend work is needed. Once published, marks become read-only
  // (see the TextInput's editable prop below).
  function handlePublish() {
    if (!selectedExamMappingId || publishing || selectedExam?.is_published) return;
    setPublishing(true);
    publishSubjectRecordResult(selectedExamMappingId)
      .then((updated) => {
        setGroups((current) =>
          current.map((g) => ({
            ...g,
            exams: g.exams.map((e) =>
              e.exam_subject_mapping_id === updated.exam_subject_mapping_id ? { ...e, ...updated } : e,
            ),
          })),
        );
        toast.success("Marks published to class");
      })
      .catch((err) => toast.error(getApiErrorMessage(err, "Couldn't publish these marks.")))
      .finally(() => setPublishing(false));
  }

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
        <View>
          <Text style={styles.headerTitle}>Exam Marks</Text>
          <Text style={styles.headerSubtitle}>Continuous internal assessment</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {groupsStatus === "loading" && <SkeletonListRows count={4} />}

        {groupsStatus === "error" && (
          <ErrorNotice message={groupsError ?? "Something went wrong."} onRetry={loadGroups} />
        )}

        {groupsStatus === "success" && groups.length === 0 && (
          <View style={styles.emptyCard}>
            <Ionicons name="create-outline" size={26} color="#B0B7C3" />
            <Text style={styles.emptyCardText}>No subjects mapped to you yet</Text>
          </View>
        )}

        {groupsStatus === "success" && groups.length > 0 && selectedGroup && (
          <>
            <View style={styles.filterRow}>
              <View ref={classAnchorRef} collapsable={false} style={styles.filterFieldFlex}>
                <TouchableOpacity
                  style={[styles.filterField, classDropdownOpen && styles.filterFieldOpen]}
                  onPress={() => setClassDropdownOpen((open) => !open)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.filterFieldLabel}>CLASS</Text>
                  <Text style={styles.filterFieldValue} numberOfLines={1}>
                    {selectedGroup.classLabel} · {selectedGroup.subjectCode} {selectedGroup.subjectName}
                  </Text>
                </TouchableOpacity>
              </View>

              {selectedGroup.exams.length > 0 && (
                <View ref={examTypeAnchorRef} collapsable={false} style={styles.filterFieldFlex}>
                  <TouchableOpacity
                    style={[styles.filterField, examTypeDropdownOpen && styles.filterFieldOpen]}
                    onPress={() => setExamTypeDropdownOpen((open) => !open)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.filterFieldLabel}>EXAM TYPE</Text>
                    <Text style={styles.filterFieldValue} numberOfLines={1}>
                      {examTabLabel(selectedExam?.exam.type ?? "Select")}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <AnchoredDropdown
              anchorRef={classAnchorRef}
              visible={classDropdownOpen}
              onClose={() => setClassDropdownOpen(false)}
              contentStyle={styles.examTypeDropdownCard}
            >
              {groups.map((group) => (
                <TouchableOpacity
                  key={group.key}
                  style={styles.filterOptionRow}
                  onPress={() => {
                    handlePickGroup(group);
                    setClassDropdownOpen(false);
                  }}
                >
                  <Text style={styles.filterOptionText} numberOfLines={1}>
                    {group.classLabel} · {group.subjectCode} {group.subjectName}
                  </Text>
                  {group.key === selectedGroupKey && <Ionicons name="checkmark" size={16} color="#2F6FE0" />}
                </TouchableOpacity>
              ))}
            </AnchoredDropdown>

            <AnchoredDropdown
              anchorRef={examTypeAnchorRef}
              visible={examTypeDropdownOpen}
              onClose={() => setExamTypeDropdownOpen(false)}
              contentStyle={styles.examTypeDropdownCard}
            >
              {selectedGroup.exams.map((exam) => (
                <TouchableOpacity
                  key={exam.exam_subject_mapping_id}
                  style={styles.filterOptionRow}
                  onPress={() => {
                    setSelectedExamMappingId(exam.exam_subject_mapping_id);
                    setExamTypeDropdownOpen(false);
                  }}
                >
                  <Text style={styles.filterOptionText}>{examTabLabel(exam.exam.type)}</Text>
                  {exam.exam_subject_mapping_id === selectedExamMappingId && (
                    <Ionicons name="checkmark" size={16} color="#2F6FE0" />
                  )}
                </TouchableOpacity>
              ))}
            </AnchoredDropdown>

            {rosterStatus === "loading" && <SkeletonListRows count={5} />}

            {rosterStatus === "error" && (
              <ErrorNotice
                message={rosterError ?? "Something went wrong."}
                onRetry={() => selectedExamMappingId !== null && loadRoster(selectedExamMappingId)}
              />
            )}

            {rosterStatus === "success" && (
              <>
                <View style={styles.infoRow}>
                  <Text style={styles.infoText}>
                    Max {maxMarks} · {enteredCount} entered{locked ? " · all entered" : ""}
                  </Text>
                  <TouchableOpacity style={styles.clearAllButton} onPress={handleClearAll} activeOpacity={0.85}>
                    <Text style={styles.clearAllButtonText}>Clear all</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.studentList}>
                  {students.map((student, index) => (
                    <View
                      key={student.student_id}
                      style={[styles.studentRow, index < students.length - 1 && styles.studentRowDivider]}
                    >
                      <View style={styles.rankBadge}>
                        <Text style={styles.rankBadgeText}>{String(index + 1).padStart(2, "0")}</Text>
                      </View>
                      <View style={styles.studentTextWrap}>
                        <Text style={styles.studentName}>{student.name}</Text>
                        <Text style={styles.studentRoll}>{student.roll_no}</Text>
                      </View>
                      <TextInput
                        style={[styles.markInput, selectedExam?.is_published && styles.markInputDisabled]}
                        value={draftMarks[student.student_id] ?? ""}
                        onChangeText={(text) => handleChangeMark(student.student_id, text)}
                        onBlur={handleBlurMark}
                        editable={!selectedExam?.is_published}
                        placeholder="–"
                        placeholderTextColor="#B0B7C3"
                        keyboardType="number-pad"
                        maxLength={3}
                      />
                    </View>
                  ))}
                </View>

                <View style={styles.actionButtonRow}>
                  <TouchableOpacity
                    style={[
                      styles.saveButton,
                      (saving || selectedExam?.is_published) && styles.saveButtonDisabled,
                    ]}
                    onPress={handleSave}
                    activeOpacity={0.85}
                    disabled={saving || !!selectedExam?.is_published}
                  >
                    {saving ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.saveButtonText}>
                        Save {examTabLabel(selectedExam?.exam.type ?? "Marks")}
                      </Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.publishButton,
                      (publishing || selectedExam?.is_published) && styles.publishButtonDisabled,
                    ]}
                    onPress={handlePublish}
                    activeOpacity={0.85}
                    disabled={publishing || !!selectedExam?.is_published}
                  >
                    {publishing ? (
                      <ActivityIndicator color="#2F6FE0" />
                    ) : (
                      <Text style={styles.publishButtonText}>
                        {selectedExam?.is_published ? "Published" : "Publish"}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ErrorNotice({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.errorNotice}>
      <Ionicons name="alert-circle-outline" size={22} color="#DC2626" />
      <Text style={styles.errorNoticeText}>{message}</Text>
      <TouchableOpacity onPress={onRetry} style={styles.retryButton} activeOpacity={0.8}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
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
    paddingVertical: 20,
  },
  errorNoticeText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 12,
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
  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    alignItems: "center",
    gap: 8,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  emptyCardText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
    textAlign: "center",
  },
  filterField: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  filterFieldOpen: {
    borderColor: "#2F6FE0",
  },
  filterFieldLabel: {
    fontSize: 9,
    fontFamily: fonts.bold,
    color: "#9AA6B2",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  filterFieldValue: {
    fontSize: 12.5,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  filterOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F6",
  },
  filterOptionText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  filterFieldFlex: {
    flex: 1,
  },
  examTypeDropdownCard: {
    width: 220,
    maxHeight: 320,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    elevation: 6,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  infoText: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
  },
  clearAllButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  clearAllButtonText: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#4B5563",
  },
  studentList: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 14,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  studentRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F6",
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#F1F3F6",
    alignItems: "center",
    justifyContent: "center",
  },
  rankBadgeText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: "#6B7280",
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
  markInput: {
    width: 56,
    height: 38,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    textAlign: "center",
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  markInputDisabled: {
    backgroundColor: "#F7F8FA",
    borderColor: "#F1F3F6",
    color: "#9AA6B2",
  },
  actionButtonRow: {
    flexDirection: "row",
    gap: 10,
  },
  saveButton: {
    flex: 1.3,
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
    backgroundColor: "#9AB3E8",
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  publishButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF0FD",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#2F6FE0",
    paddingVertical: 16,
  },
  publishButtonDisabled: {
    borderColor: "#D1D9EC",
    backgroundColor: "#F7F8FA",
  },
  publishButtonText: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
});
