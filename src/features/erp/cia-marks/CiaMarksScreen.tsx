import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { SkeletonListRows } from "@/components/ui/Skeleton";
import { AcademicScopeSelector, useAcademicScope } from "@/components/ui/AcademicScopeSelector";
import { ExamMarksTable, type ExamMarksColumn, type ExamMarksRow } from "@/components/ui/ExamMarksTable";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { getApiErrorMessage } from "@/services/api/client";
import { getMySubjectRecordMappings, publishSubjectRecordResult, type SubjectRecordMapping } from "@/services/api/subject-records.api";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";
import { getExamMarksRoster, enterExamMarks, updateExamMark, type ExamMarksRoster } from "@/services/api/exam-marks.api";

type LoadStatus = "loading" | "success" | "error";
const CIA_MAX_MARKS = 50;

function examTabLabel(type: string): string {
  return type === "University End Semester Exam" ? "SEM" : type;
}

function cellKey(studentId: number, mappingId: number): string {
  return `${studentId}-${mappingId}`;
}

function sanitizeMark(text: string, max: number): string {
  const digitsOnly = text.replace(/[^0-9]/g, "");
  if (!digitsOnly) return "";
  return String(Math.min(parseInt(digitsOnly, 10), max));
}

// Per-mapping (per exam-type column) working state - each column has its
// own max marks, its own "already rescaled to /100" guard, and its own
// locked/published flags, since a faculty can be entering CIA1 for the
// first time while CIA2 is already published, in the same table.
type ColumnState = {
  mapping: SubjectRecordMapping;
  maxMarks: number;
  convertedToHundred: boolean;
  locked: boolean;
  roster: ExamMarksRoster;
};

export function CiaMarksScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [mappingsStatus, setMappingsStatus] = useState<LoadStatus>("loading");
  const [mappingsError, setMappingsError] = useState<string | null>(null);
  const [mappings, setMappings] = useState<SubjectRecordMapping[]>([]);
  const scope = useAcademicScope(mappings);

  const [rosterStatus, setRosterStatus] = useState<LoadStatus>("loading");
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [columns, setColumns] = useState<ColumnState[]>([]);
  const [draftMarks, setDraftMarks] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [publishingKey, setPublishingKey] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return () => {
        navigation.getParent()?.setOptions({ headerShown: true, header: () => <CollegeHeader /> });
      };
    }, [navigation]),
  );

  const loadMappings = useCallback(() => {
    setMappingsStatus("loading");
    setMappingsError(null);
    getMySubjectRecordMappings()
      .then((rows) => {
        setMappings(rows);
        setMappingsStatus("success");
      })
      .catch((err) => {
        setMappingsError(getApiErrorMessage(err, "Couldn't load your classes & subjects."));
        setMappingsStatus("error");
      });
  }, []);

  useEffect(() => {
    loadMappings();
  }, [loadMappings]);

  const loadRosters = useCallback((matchingMappings: SubjectRecordMapping[]) => {
    if (matchingMappings.length === 0) {
      setColumns([]);
      setRosterStatus("success");
      return;
    }
    setRosterStatus("loading");
    setRosterError(null);
    // Sequential, not Promise.all - fetching every exam type's roster at once
    // can exceed the backend's DB connection pool under load.
    (async () => {
      const rosters = [];
      for (const m of matchingMappings) {
        rosters.push(await getExamMarksRoster(m.exam_subject_mapping_id));
      }
      return rosters;
    })()
      .then((rosters) => {
        const nextColumns: ColumnState[] = matchingMappings.map((mapping, i) => ({
          mapping,
          roster: rosters[i],
          maxMarks: rosters[i].max_marks !== null ? Number(rosters[i].max_marks) : CIA_MAX_MARKS,
          convertedToHundred: false,
          locked: rosters[i].locked,
        }));
        setColumns(nextColumns);

        const initialDraft: Record<string, string> = {};
        for (const col of nextColumns) {
          for (const s of col.roster.students) {
            if (s.marks_obtained !== null) {
              initialDraft[cellKey(s.student_id, col.mapping.exam_subject_mapping_id)] = String(s.marks_obtained);
            }
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
    loadRosters(scope.matchingMappings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope.matchingMappings.map((m) => m.exam_subject_mapping_id).join(",")]);

  // Every student appearing in any one column's roster - same class for
  // every column here, so this is really just "the class roster", read off
  // whichever column loaded first.
  const rows = useMemo<ExamMarksRow[]>(() => {
    if (columns.length === 0) return [];
    const base = columns[0].roster.students;
    return base.map((s) => {
      const cells: ExamMarksRow["cells"] = {};
      for (const col of columns) {
        cells[String(col.mapping.exam_subject_mapping_id)] = {
          value: draftMarks[cellKey(s.student_id, col.mapping.exam_subject_mapping_id)] ?? "",
          editable: !col.mapping.is_published,
        };
      }
      return { studentId: s.student_id, name: s.name, rollNo: s.roll_no, cells };
    });
  }, [columns, draftMarks]);

  const tableColumns = useMemo<ExamMarksColumn[]>(
    () =>
      columns.map((col) => ({
        key: String(col.mapping.exam_subject_mapping_id),
        label: examTabLabel(col.mapping.exam.type),
        maxMarks: col.maxMarks,
      })),
    [columns],
  );

  function handleChangeCell(studentId: number, columnKey: string, text: string) {
    const col = columns.find((c) => String(c.mapping.exam_subject_mapping_id) === columnKey);
    if (!col) return;
    const sanitized = sanitizeMark(text, col.maxMarks);
    setDraftMarks((prev) => ({ ...prev, [cellKey(studentId, col.mapping.exam_subject_mapping_id)]: sanitized }));
  }

  // Same "an exam scored out of 50 or 60 auto-converts to /100 the moment
  // you finish entering into it" behaviour as before - now scoped to just
  // the one column being edited, since each column is an independent exam.
  function handleBlurCell(_studentId: number, columnKey: string) {
    const mappingId = Number(columnKey);
    setColumns((prevCols) => {
      const col = prevCols.find((c) => c.mapping.exam_subject_mapping_id === mappingId);
      if (!col || col.convertedToHundred || (col.maxMarks !== 50 && col.maxMarks !== 60)) return prevCols;
      const fromMax = col.maxMarks;

      setDraftMarks((prevMarks) => {
        const next = { ...prevMarks };
        for (const s of col.roster.students) {
          const key = cellKey(s.student_id, mappingId);
          const value = next[key];
          if (!value) continue;
          const scaled = Math.round((Number(value) * 100) / fromMax);
          next[key] = String(Math.min(scaled, 100));
        }
        return next;
      });

      return prevCols.map((c) =>
        c.mapping.exam_subject_mapping_id === mappingId ? { ...c, maxMarks: 100, convertedToHundred: true } : c,
      );
    });
  }

  function handleSave() {
    if (saving || columns.length === 0) return;

    const calls: Array<() => Promise<unknown>> = [];
    let anyChange = false;

    for (const col of columns) {
      if (col.mapping.is_published) continue;
      const mappingId = col.mapping.exam_subject_mapping_id;

      const newEntries = col.roster.students
        .filter((s) => s.mark_id === null && (draftMarks[cellKey(s.student_id, mappingId)] ?? "") !== "")
        .map((s) => ({ student_id: s.student_id, marks_obtained: Number(draftMarks[cellKey(s.student_id, mappingId)]) }));

      const changedEntries = col.roster.students.filter((s) => {
        if (s.mark_id === null) return false;
        const draft = draftMarks[cellKey(s.student_id, mappingId)] ?? "";
        const original = s.marks_obtained !== null ? String(s.marks_obtained) : "";
        return draft !== "" && draft !== original;
      });

      if (newEntries.length > 0) {
        anyChange = true;
        calls.push(() => enterExamMarks(mappingId, col.maxMarks, newEntries));
      }
      for (const s of changedEntries) {
        anyChange = true;
        calls.push(() => updateExamMark(s.mark_id as number, Number(draftMarks[cellKey(s.student_id, mappingId)])));
      }
    }

    if (!anyChange) {
      toast.info("No changes to save.");
      return;
    }

    setSaving(true);
    // Sequential, not Promise.all - a save can involve many calls (one per
    // changed cell); firing them all at once can exceed the backend's DB
    // connection pool.
    (async () => {
      for (const call of calls) {
        await call();
      }
    })()
      .then(() => {
        toast.success("Marks saved");
        loadRosters(scope.matchingMappings);
      })
      .catch((err) => toast.error(getApiErrorMessage(err, "Couldn't save marks.")))
      .finally(() => setSaving(false));
  }

  function handlePublish(col: ColumnState) {
    if (publishingKey !== null || col.mapping.is_published) return;
    setPublishingKey(col.mapping.exam_subject_mapping_id);
    publishSubjectRecordResult(col.mapping.exam_subject_mapping_id)
      .then((updated) => {
        setMappings((current) =>
          current.map((m) => (m.exam_subject_mapping_id === updated.exam_subject_mapping_id ? { ...m, ...updated } : m)),
        );
        toast.success(`${examTabLabel(col.mapping.exam.type)} marks published to class`);
      })
      .catch((err) => toast.error(getApiErrorMessage(err, "Couldn't publish these marks.")))
      .finally(() => setPublishingKey(null));
  }

  const enteredCount = useMemo(() => Object.values(draftMarks).filter((v) => v !== "").length, [draftMarks]);
  const anyEditableColumn = columns.some((c) => !c.mapping.is_published);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <WatermarkBackground />
      <LinearGradient
        colors={["#2F6FE0", "#1A3D8F"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Exam Marks</Text>
          <Text style={styles.headerSubtitle}>Continuous internal assessment</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {mappingsStatus === "loading" && <SkeletonListRows count={4} />}

        {mappingsStatus === "error" && (
          <ErrorNotice message={mappingsError ?? "Something went wrong."} onRetry={loadMappings} />
        )}

        {mappingsStatus === "success" && mappings.length === 0 && (
          <View style={styles.emptyCard}>
            <Ionicons name="create-outline" size={26} color="#B0B7C3" />
            <Text style={styles.emptyCardText}>No subjects mapped to you yet</Text>
          </View>
        )}

        {mappingsStatus === "success" && mappings.length > 0 && (
          <>
            <AcademicScopeSelector scope={scope} />

            {rosterStatus === "loading" && <SkeletonListRows count={5} />}

            {rosterStatus === "error" && (
              <ErrorNotice message={rosterError ?? "Something went wrong."} onRetry={() => loadRosters(scope.matchingMappings)} />
            )}

            {rosterStatus === "success" && columns.length === 0 && (
              <View style={styles.emptyCard}>
                <Ionicons name="create-outline" size={26} color="#B0B7C3" />
                <Text style={styles.emptyCardText}>No exams created yet for this class & subject.</Text>
              </View>
            )}

            {rosterStatus === "success" && columns.length > 0 && (
              <>
                <View style={styles.infoRow}>
                  <Text style={styles.infoText}>{rows.length} students · {enteredCount} marks entered</Text>
                </View>

                <ExamMarksTable columns={tableColumns} rows={rows} onChangeCell={handleChangeCell} onBlurCell={handleBlurCell} />

                <TouchableOpacity
                  style={[styles.saveButton, (saving || !anyEditableColumn) && styles.saveButtonDisabled]}
                  onPress={handleSave}
                  activeOpacity={0.85}
                  disabled={saving || !anyEditableColumn}
                >
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save All Marks</Text>}
                </TouchableOpacity>

                <Text style={styles.sectionTitle}>Publish to class</Text>
                <View style={styles.publishList}>
                  {columns.map((col) => (
                    <View key={col.mapping.exam_subject_mapping_id} style={styles.publishRow}>
                      <Text style={styles.publishRowLabel}>{examTabLabel(col.mapping.exam.type)}</Text>
                      <TouchableOpacity
                        style={[
                          styles.publishButton,
                          (publishingKey !== null || col.mapping.is_published) && styles.publishButtonDisabled,
                        ]}
                        onPress={() => handlePublish(col)}
                        activeOpacity={0.85}
                        disabled={publishingKey !== null || col.mapping.is_published}
                      >
                        {publishingKey === col.mapping.exam_subject_mapping_id ? (
                          <ActivityIndicator size="small" color="#2F6FE0" />
                        ) : (
                          <Text style={styles.publishButtonText}>{col.mapping.is_published ? "Published" : "Publish"}</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  ))}
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
  container: { flex: 1, backgroundColor: "#F7F8FA" },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 14 },
  backButton: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "#fff", fontSize: 18, fontFamily: fonts.bold },
  headerSubtitle: { color: "#D7E2FA", fontSize: 12, fontFamily: fonts.medium, marginTop: 2 },
  content: { padding: 16, paddingBottom: 32 },
  errorNotice: { alignItems: "center", gap: 8, paddingVertical: 20 },
  errorNoticeText: { fontSize: 13, fontFamily: fonts.regular, color: "#6B7280", textAlign: "center", paddingHorizontal: 12 },
  retryButton: { marginTop: 4, borderRadius: 999, borderWidth: 1, borderColor: "#2F6FE0", paddingHorizontal: 16, paddingVertical: 6 },
  retryButtonText: { fontSize: 12, fontFamily: fonts.bold, color: "#2F6FE0" },
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
  emptyCardText: { fontSize: 13, fontFamily: fonts.medium, color: "#9AA6B2", textAlign: "center" },
  infoRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  infoText: { fontSize: 12, fontFamily: fonts.medium, color: "#9AA6B2" },
  saveButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2F6FE0",
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 20,
    elevation: 3,
    shadowColor: "#2F6FE0",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  saveButtonDisabled: { backgroundColor: "#9AB3E8", shadowOpacity: 0, elevation: 0 },
  saveButtonText: { fontSize: 15, fontFamily: fonts.bold, color: "#fff" },
  sectionTitle: { fontSize: 12, fontFamily: fonts.bold, color: "#8A93A3", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 },
  publishList: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 16,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  publishRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F6",
  },
  publishRowLabel: { fontSize: 13, fontFamily: fonts.semibold, color: "#111827" },
  publishButton: {
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "#2F6FE0",
    backgroundColor: "#EAF0FD",
    paddingHorizontal: 16,
    paddingVertical: 7,
    minWidth: 90,
    alignItems: "center",
  },
  publishButtonDisabled: { borderColor: "#D1D9EC", backgroundColor: "#F7F8FA" },
  publishButtonText: { fontSize: 12.5, fontFamily: fonts.bold, color: "#2F6FE0" },
});
