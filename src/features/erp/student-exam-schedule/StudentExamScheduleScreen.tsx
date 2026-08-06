import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, View, Text, ScrollView, TouchableOpacity, Modal, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { getApiErrorMessage } from "@/services/api/client";
import { getMyExamSchedule, type MyExamScheduleRow } from "@/services/api/exam-schedule.api";

type LoadStatus = "loading" | "success" | "error";

const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

type ExamTypeFilter = "internal1" | "internal2" | "semester";

const EXAM_TYPE_FILTERS: { id: ExamTypeFilter; label: string }[] = [
  { id: "internal1", label: "Internal 1" },
  { id: "internal2", label: "Internal 2" },
  { id: "semester", label: "Semester" },
];

// Real exam_types in the DB are free-text (e.g. "Internal Assessment 1",
// "Model Examination", "End Semester Examination") - not this fixed 3-way
// split. Bucket them into it: anything naming "internal ... 1"/"... 2" maps
// to that internal, everything else (model exams, end-semester exams, ...)
// counts as "Semester".
function bucketForExamType(examType: string): ExamTypeFilter {
  const normalized = examType.toLowerCase();
  if (normalized.includes("internal") && normalized.includes("1")) return "internal1";
  if (normalized.includes("internal") && normalized.includes("2")) return "internal2";
  return "semester";
}

function formatExamDate(dateOnly: string): string {
  return new Date(dateOnly).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function formatTime(hhmm: string): string {
  const [hourStr, minute] = hhmm.split(":");
  const hour = parseInt(hourStr, 10);
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${minute} ${period}`;
}

// Wired to GET /me/exam-schedule (real, published exam_timetable rows for
// the student's own class). Semester (1-8) and exam type (Internal
// 1/Internal 2/Semester) are fixed UI filters - see bucketForExamType() for
// how real exam_types map onto that 3-way split. Reachable from the
// Student dashboard's Campus "Exam schedule" item.
export function StudentExamScheduleScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<MyExamScheduleRow[]>([]);
  const [examType, setExamType] = useState<ExamTypeFilter>("internal1");
  const [semester, setSemester] = useState(5);
  const [semesterPickerOpen, setSemesterPickerOpen] = useState(false);

  const load = useCallback(() => {
    setStatus("loading");
    setError(null);
    getMyExamSchedule()
      .then((response) => {
        setRows(response);
        setStatus("success");
        const realSemesters = response.map((row) => row.semester).filter((value) => SEMESTERS.includes(value));
        if (realSemesters.length > 0) {
          setSemester(Math.max(...realSemesters));
        }
      })
      .catch((err) => {
        setError(getApiErrorMessage(err, "Couldn't load your exam schedule."));
        setStatus("error");
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return () => {
        navigation.getParent()?.setOptions({ headerShown: true, header: () => <CollegeHeader /> });
      };
    }, [navigation]),
  );

  const filteredRows = useMemo(
    () =>
      rows.filter((row) => row.semester === semester && bucketForExamType(row.exam_type) === examType),
    [rows, semester, examType],
  );

  function selectSemester(value: number) {
    setSemester(value);
    setSemesterPickerOpen(false);
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
        <Text style={styles.headerTitle}>Exam schedule</Text>
      </LinearGradient>

      {status === "loading" && (
        <View style={styles.inlineLoading}>
          <ActivityIndicator color="#2F6FE0" />
        </View>
      )}

      {status === "error" && (
        <View style={styles.errorNotice}>
          <Ionicons name="alert-circle-outline" size={22} color="#DC2626" />
          <Text style={styles.errorNoticeText}>{error ?? "Something went wrong."}</Text>
          <TouchableOpacity onPress={load} style={styles.retryButton} activeOpacity={0.8}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === "success" && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Semester</Text>
            <TouchableOpacity
              style={styles.selectRow}
              onPress={() => setSemesterPickerOpen(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.selectValue}>Semester {semester}</Text>
              <Ionicons name="chevron-down" size={18} color="#B0B7C3" />
            </TouchableOpacity>

            <View style={styles.examTypeRow}>
              {EXAM_TYPE_FILTERS.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[styles.examTypePill, examType === type.id && styles.examTypePillActive]}
                  onPress={() => setExamType(type.id)}
                >
                  <Text style={[styles.examTypePillText, examType === type.id && styles.examTypePillTextActive]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {filteredRows.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={32} color="#B0B7C3" />
              <Text style={styles.emptyStateText}>Schedule not published yet</Text>
            </View>
          ) : (
            <View style={styles.tableCard}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderText, styles.dateCol]}>DATE</Text>
                <Text style={[styles.tableHeaderText, styles.courseCol]}>COURSE</Text>
                <Text style={[styles.tableHeaderText, styles.sessionCol]}>TIME</Text>
              </View>
              {filteredRows.map((row, index) => (
                <ExamRow key={row.id} row={row} isLast={index === filteredRows.length - 1} />
              ))}
              <Text style={styles.footerNote}>
                Report 30 minutes before each session with your hall ticket and ID card.
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      <Modal
        visible={semesterPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSemesterPickerOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSemesterPickerOpen(false)}
        >
          <TouchableOpacity style={styles.modalCard} activeOpacity={1}>
            <Text style={styles.modalTitle}>Semester</Text>
            <ScrollView style={styles.modalList}>
              {SEMESTERS.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={styles.modalOptionRow}
                  onPress={() => selectSemester(option)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalOptionName}>Semester {option}</Text>
                  {semester === option && <Ionicons name="checkmark" size={18} color="#2F6FE0" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

function ExamRow({ row, isLast }: { row: MyExamScheduleRow; isLast: boolean }) {
  return (
    <View style={[styles.tableRow, isLast && styles.tableRowLast]}>
      <Text style={[styles.dateText, styles.dateCol]}>{formatExamDate(row.exam_date)}</Text>
      <View style={styles.courseCol}>
        <Text style={styles.courseName}>{row.subject_name}</Text>
        <Text style={styles.courseCode}>
          {row.subject_code} · {row.exam_type}
        </Text>
      </View>
      <View style={styles.sessionCol}>
        <View style={styles.sessionBadge}>
          <Text style={styles.sessionBadgeText}>{formatTime(row.start_time)}</Text>
        </View>
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
    fontSize: 20,
    fontFamily: fonts.bold,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  inlineLoading: {
    paddingVertical: 48,
    alignItems: "center",
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
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#6B7280",
    marginBottom: 8,
  },
  selectRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 16,
  },
  selectValue: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: "#111827",
  },
  examTypeRow: {
    flexDirection: "row",
    gap: 10,
  },
  examTypePill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
    paddingVertical: 12,
  },
  examTypePillActive: {
    borderColor: "#2F6FE0",
    backgroundColor: "#EAF0FD",
  },
  examTypePillText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  examTypePillTextActive: {
    color: "#2F6FE0",
    fontFamily: fonts.bold,
  },
  tableCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  tableHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7F8FA",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tableHeaderText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: "#9AA6B2",
    letterSpacing: 0.5,
  },
  dateCol: {
    width: 56,
  },
  courseCol: {
    flex: 1,
  },
  sessionCol: {
    width: 90,
    alignItems: "flex-end",
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F6",
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  dateText: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  courseName: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  courseCode: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 2,
  },
  sessionBadge: {
    backgroundColor: "#EAF0FD",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  sessionBadgeText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  footerNote: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    lineHeight: 18,
    padding: 16,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 8,
  },
  emptyStateText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
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
    marginBottom: 4,
  },
  modalOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F6",
  },
  modalOptionName: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
});
