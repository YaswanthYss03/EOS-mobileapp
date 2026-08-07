import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { getApiErrorMessage } from "@/services/api/client";
import { getMySubjectRecordMappings, type SubjectRecordMapping } from "@/services/api/subject-records.api";
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
      groups.set(key, {
        key,
        classLabel: m.class.label,
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

export function CiaMarksScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [groupsStatus, setGroupsStatus] = useState<LoadStatus>("loading");
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [groups, setGroups] = useState<ClassSubjectGroup[]>([]);
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);
  const [selectedExamMappingId, setSelectedExamMappingId] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const [rosterStatus, setRosterStatus] = useState<LoadStatus>("loading");
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [students, setStudents] = useState<ExamMarksRosterStudent[]>([]);
  const [locked, setLocked] = useState(false);
  const [maxMarks, setMaxMarks] = useState<number>(CIA_MAX_MARKS);
  const [draftMarks, setDraftMarks] = useState<MarksMap>({});
  const [saving, setSaving] = useState(false);

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

  const enteredCount = useMemo(
    () => Object.values(draftMarks).filter((value) => value !== "").length,
    [draftMarks],
  );

  function handlePickGroup(group: ClassSubjectGroup) {
    setSelectedGroupKey(group.key);
    setSelectedExamMappingId(group.exams[0]?.exam_subject_mapping_id ?? null);
    setPickerOpen(false);
  }

  function handleChangeMark(studentId: number, text: string) {
    const sanitized = sanitizeMark(text, maxMarks);
    setDraftMarks((prev) => ({ ...prev, [studentId]: sanitized }));
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
          <Text style={styles.headerTitle}>CIA Marks</Text>
          <Text style={styles.headerSubtitle}>Continuous internal assessment</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {groupsStatus === "loading" && (
          <View style={styles.inlineLoading}>
            <ActivityIndicator color="#2F6FE0" />
          </View>
        )}

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
            <TouchableOpacity style={styles.classCard} activeOpacity={0.8} onPress={() => setPickerOpen(true)}>
              <View style={styles.classCardTextWrap}>
                <Text style={styles.classCardTitle} numberOfLines={1}>
                  {selectedGroup.classLabel} · {selectedGroup.subjectCode} {selectedGroup.subjectName}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={18} color="#B0B7C3" />
            </TouchableOpacity>

            {selectedGroup.exams.length > 0 && (
              <View style={styles.examSwitch}>
                {selectedGroup.exams.map((exam) => (
                  <TouchableOpacity
                    key={exam.exam_subject_mapping_id}
                    style={[
                      styles.examSwitchButton,
                      exam.exam_subject_mapping_id === selectedExamMappingId && styles.examSwitchButtonActive,
                    ]}
                    onPress={() => setSelectedExamMappingId(exam.exam_subject_mapping_id)}
                  >
                    <Text
                      style={[
                        styles.examSwitchText,
                        exam.exam_subject_mapping_id === selectedExamMappingId && styles.examSwitchTextActive,
                      ]}
                    >
                      {exam.exam.type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {rosterStatus === "loading" && (
              <View style={styles.inlineLoading}>
                <ActivityIndicator color="#2F6FE0" />
              </View>
            )}

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
                        style={styles.markInput}
                        value={draftMarks[student.student_id] ?? ""}
                        onChangeText={(text) => handleChangeMark(student.student_id, text)}
                        placeholder="–"
                        placeholderTextColor="#B0B7C3"
                        keyboardType="number-pad"
                        maxLength={3}
                      />
                    </View>
                  ))}
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
                    <Text style={styles.saveButtonText}>
                      Save {selectedGroup.exams.find((e) => e.exam_subject_mapping_id === selectedExamMappingId)?.exam.type ?? "Marks"}
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </>
        )}
      </ScrollView>

      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setPickerOpen(false)}>
          <TouchableOpacity style={styles.modalCard} activeOpacity={1}>
            <Text style={styles.modalTitle}>Select Class & Subject</Text>
            <ScrollView style={styles.modalList}>
              {groups.map((g) => (
                <TouchableOpacity
                  key={g.key}
                  style={styles.modalRow}
                  onPress={() => handlePickGroup(g)}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalRowText}>
                      {g.classLabel} · {g.subjectCode} {g.subjectName}
                    </Text>
                  </View>
                  {g.key === selectedGroupKey && <Ionicons name="checkmark-circle" size={20} color="#2F6FE0" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
  inlineLoading: {
    paddingVertical: 24,
    alignItems: "center",
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
  classCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 14,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  classCardTextWrap: {
    flex: 1,
  },
  classCardTitle: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  examSwitch: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 4,
    gap: 4,
    marginBottom: 14,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  examSwitchButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    paddingVertical: 10,
  },
  examSwitchButtonActive: {
    backgroundColor: "#2F6FE0",
  },
  examSwitchText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#4B5563",
  },
  examSwitchTextActive: {
    color: "#fff",
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
    backgroundColor: "#9AB3E8",
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#fff",
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
    maxHeight: "70%",
  },
  modalTitle: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
    marginBottom: 10,
  },
  modalList: {
    maxHeight: 360,
  },
  modalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F6",
  },
  modalRowText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
});
