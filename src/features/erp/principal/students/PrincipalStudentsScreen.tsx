import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
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
import { getApiErrorMessage } from "@/services/api/client";
import { listDepartments, type Department } from "@/services/api/departments.api";
import {
  searchPrincipalStudents,
  getPrincipalStudentsRollCount,
  getPrincipalAttendanceOverview,
  type PrincipalStudentRow,
  type PrincipalStudentsSearchResult,
  type PrincipalAttendanceOverview,
} from "@/services/api/principal-students.api";

const YEARS = [1, 2, 3, 4];

export function PrincipalStudentsScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // This screen renders its own header below, so hide the shared
  // CollegeHeader (logo/college name) while it's focused - same pattern as
  // the other ERP sub-screens.
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return () => {
        navigation.getParent()?.setOptions({ headerShown: true, header: () => <CollegeHeader /> });
      };
    }, [navigation]),
  );

  const [rollCount, setRollCount] = useState<number | null>(null);
  const [overview, setOverview] = useState<PrincipalAttendanceOverview | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentPickerOpen, setDepartmentPickerOpen] = useState(false);
  const [yearPickerOpen, setYearPickerOpen] = useState(false);

  const [searchText, setSearchText] = useState("");
  const [department, setDepartment] = useState<Department | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [below75, setBelow75] = useState(false);
  const [feesPending, setFeesPending] = useState(false);

  const [result, setResult] = useState<PrincipalStudentsSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [recentLookups, setRecentLookups] = useState<PrincipalStudentRow[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<PrincipalStudentRow | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isFiltered = searchText.trim().length > 0 || !!department || !!year || below75 || feesPending;

  useEffect(() => {
    getPrincipalStudentsRollCount().then(setRollCount).catch(() => {});
    listDepartments().then(setDepartments).catch(() => {});
    getPrincipalAttendanceOverview()
      .then(setOverview)
      .catch((err) => setOverviewError(getApiErrorMessage(err, "Couldn't load attendance overview.")));
  }, []);

  const runSearch = useCallback(
    (page: number) => {
      const params = {
        search: searchText.trim() || undefined,
        department_id: department?.id,
        year: year ?? undefined,
        below_75: below75 || undefined,
        fees_pending: feesPending || undefined,
        page,
        limit: 20,
      };
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setSearchError(null);
      searchPrincipalStudents(params)
        .then((res) => {
          setResult((prev) =>
            page === 1 || !prev
              ? res
              : { ...res, students: [...prev.students, ...res.students] },
          );
        })
        .catch((err) => setSearchError(getApiErrorMessage(err, "Couldn't load students.")))
        .finally(() => {
          setLoading(false);
          setLoadingMore(false);
        });
    },
    [searchText, department, year, below75, feesPending],
  );

  useEffect(() => {
    if (!isFiltered) {
      setResult(null);
      setSearchError(null);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(1), 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText, department, year, below75, feesPending]);

  function openStudent(student: PrincipalStudentRow) {
    setSelectedStudent(student);
    setRecentLookups((prev) => [student, ...prev.filter((s) => s.id !== student.id)].slice(0, 10));
  }

  function clearFilters() {
    setSearchText("");
    setDepartment(null);
    setYear(null);
    setBelow75(false);
    setFeesPending(false);
  }

  const listToShow = isFiltered ? result?.students ?? [] : recentLookups;
  const sectionTitle = isFiltered ? `Results${result ? ` (${result.total})` : ""}` : "Recent lookups";

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <LinearGradient
        colors={["#2F6FE0", "#1A3D8F"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>Students</Text>
          <Text style={styles.subtitle}>
            {rollCount !== null ? `${rollCount.toLocaleString()} on roll` : "Loading roll…"} · search a register
            number instead of browsing the roll
          </Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Search bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color="#8A93A3" />
          <TextInput
            style={styles.searchInput}
            placeholder="Register number, roll number, or name"
            placeholderTextColor="#B0B7C3"
            value={searchText}
            onChangeText={setSearchText}
            autoCapitalize="none"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color="#B0B7C3" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
          <FilterPill
            label={department ? department.code : "Department"}
            active={!!department}
            onPress={() => setDepartmentPickerOpen(true)}
            iconRight="chevron-down"
          />
          <FilterPill
            label={year ? `Year ${year}` : "Year"}
            active={!!year}
            onPress={() => setYearPickerOpen(true)}
            iconRight="chevron-down"
          />
          <FilterPill label="Attendance < 75%" active={below75} onPress={() => setBelow75((v) => !v)} />
          <FilterPill label="Fees pending" active={feesPending} onPress={() => setFeesPending((v) => !v)} />
          {isFiltered && (
            <TouchableOpacity style={styles.clearPill} onPress={clearFilters}>
              <Text style={styles.clearPillText}>Clear</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Attendance overview: 4 stat cards */}
        {overviewError ? (
          <Text style={styles.errorInline}>{overviewError}</Text>
        ) : (
          <View style={styles.statsGrid}>
            <StatCard
              icon="checkmark-circle-outline"
              value={overview ? overview.present_today.toLocaleString() : "—"}
              label="Present today"
            />
            <StatCard
              icon="stats-chart-outline"
              value={overview?.mean_attendance_pct !== null && overview?.mean_attendance_pct !== undefined ? `${overview.mean_attendance_pct}%` : "—"}
              label="Mean attendance"
            />
            <StatCard
              icon="alert-circle-outline"
              value={overview ? overview.below_75_count.toLocaleString() : "—"}
              label="Below 75%"
              tone="warning"
            />
          </View>
        )}

        {/* Department-wise attendance chart */}
        {overview && overview.departments.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Department-wise attendance</Text>
            {overview.departments.map((dept) => (
              <View key={dept.code} style={styles.chartRow}>
                <Text style={styles.chartLabel} numberOfLines={1}>
                  {dept.code}
                </Text>
                <View style={styles.chartTrack}>
                  <View
                    style={[
                      styles.chartFill,
                      {
                        width: `${Math.min(dept.attendance_pct ?? 0, 100)}%`,
                        backgroundColor: (dept.attendance_pct ?? 0) < 75 ? "#E0724F" : "#2F6FE0",
                      },
                    ]}
                  />
                </View>
                <Text style={styles.chartValue}>{dept.attendance_pct !== null ? `${dept.attendance_pct}%` : "—"}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Recent lookups / results */}
        <Text style={styles.sectionTitle}>{sectionTitle}</Text>

        {loading && (
          <View style={styles.inlineLoading}>
            <ActivityIndicator color="#2F6FE0" />
          </View>
        )}

        {!loading && searchError && (
          <View style={styles.centerState}>
            <Ionicons name="cloud-offline-outline" size={28} color="#B0B7C3" />
            <Text style={styles.centerStateText}>{searchError}</Text>
          </View>
        )}

        {!loading && !searchError && listToShow.length === 0 && (
          <View style={styles.centerState}>
            <Ionicons name={isFiltered ? "search-outline" : "time-outline"} size={28} color="#B0B7C3" />
            <Text style={styles.centerStateText}>
              {isFiltered ? "No students match this search." : "Students you look up will appear here."}
            </Text>
          </View>
        )}

        {!loading &&
          !searchError &&
          listToShow.map((student) => <StudentRow key={student.id} student={student} onPress={() => openStudent(student)} />)}

        {isFiltered && result && result.page < result.total_pages && !loading && (
          <TouchableOpacity style={styles.loadMoreButton} onPress={() => runSearch(result.page + 1)} disabled={loadingMore}>
            {loadingMore ? <ActivityIndicator color="#2F6FE0" /> : <Text style={styles.loadMoreText}>Load more</Text>}
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Department picker */}
      <Modal visible={departmentPickerOpen} transparent animationType="fade" onRequestClose={() => setDepartmentPickerOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDepartmentPickerOpen(false)}>
          <TouchableOpacity style={styles.modalCard} activeOpacity={1}>
            <Text style={styles.modalTitle}>Select a department</Text>
            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={styles.modalOptionRow}
                onPress={() => {
                  setDepartment(null);
                  setDepartmentPickerOpen(false);
                }}
              >
                <Text style={styles.modalOptionName}>All departments</Text>
                {!department && <Ionicons name="checkmark" size={16} color="#2F6FE0" />}
              </TouchableOpacity>
              {departments.map((dept) => (
                <TouchableOpacity
                  key={dept.id}
                  style={styles.modalOptionRow}
                  onPress={() => {
                    setDepartment(dept);
                    setDepartmentPickerOpen(false);
                  }}
                >
                  <Text style={styles.modalOptionName}>{dept.name}</Text>
                  {department?.id === dept.id && <Ionicons name="checkmark" size={16} color="#2F6FE0" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Year picker */}
      <Modal visible={yearPickerOpen} transparent animationType="fade" onRequestClose={() => setYearPickerOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setYearPickerOpen(false)}>
          <TouchableOpacity style={styles.modalCard} activeOpacity={1}>
            <Text style={styles.modalTitle}>Select a year</Text>
            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={styles.modalOptionRow}
                onPress={() => {
                  setYear(null);
                  setYearPickerOpen(false);
                }}
              >
                <Text style={styles.modalOptionName}>All years</Text>
                {!year && <Ionicons name="checkmark" size={16} color="#2F6FE0" />}
              </TouchableOpacity>
              {YEARS.map((y) => (
                <TouchableOpacity
                  key={y}
                  style={styles.modalOptionRow}
                  onPress={() => {
                    setYear(y);
                    setYearPickerOpen(false);
                  }}
                >
                  <Text style={styles.modalOptionName}>Year {y}</Text>
                  {year === y && <Ionicons name="checkmark" size={16} color="#2F6FE0" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Student detail modal */}
      <Modal visible={!!selectedStudent} transparent animationType="fade" onRequestClose={() => setSelectedStudent(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSelectedStudent(null)}>
          <TouchableOpacity style={styles.modalCard} activeOpacity={1}>
            {selectedStudent && (
              <>
                <Text style={styles.modalTitle}>{selectedStudent.name}</Text>
                <DetailLine label="Student ID" value={selectedStudent.student_id_no} />
                <DetailLine label="Register no" value={selectedStudent.register_no ?? "—"} />
                <DetailLine
                  label="Dept · Sem"
                  value={
                    selectedStudent.department_code
                      ? `${selectedStudent.department_code} · ${selectedStudent.semester ?? "Unassigned"}`
                      : "Unassigned"
                  }
                />
                <DetailLine
                  label="Attendance"
                  value={selectedStudent.attendance_pct !== null ? `${selectedStudent.attendance_pct}%` : "No records yet"}
                />
                <DetailLine label="CGPA" value={selectedStudent.cgpa !== null ? selectedStudent.cgpa.toFixed(2) : "No results yet"} />
                <DetailLine label="Fees" value={feeStatusLabel(selectedStudent)} />
                <TouchableOpacity style={styles.closeModalButton} onPress={() => setSelectedStudent(null)}>
                  <Text style={styles.closeModalButtonText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

function feeStatusLabel(student: PrincipalStudentRow): string {
  if (student.fee_status === "scholarship") return "Scholarship";
  if (student.fee_status === "paid") return "Paid";
  if (student.fee_status === "due") return `₹${student.fee_outstanding.toLocaleString()} due`;
  return "No demand raised";
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailLine}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function FilterPill({
  label,
  active,
  onPress,
  iconRight,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  iconRight?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <TouchableOpacity style={[styles.pill, active && styles.pillActive]} onPress={onPress} activeOpacity={0.8}>
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
      {iconRight && <Ionicons name={iconRight} size={14} color={active ? "#fff" : "#8A93A3"} />}
    </TouchableOpacity>
  );
}

function StatCard({
  icon,
  value,
  label,
  tone,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  tone?: "warning";
}) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={18} color={tone === "warning" ? "#E0724F" : "#2F6FE0"} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function StudentRow({ student, onPress }: { student: PrincipalStudentRow; onPress: () => void }) {
  const feeTone = student.fee_status === "due" ? "#E0724F" : student.fee_status === "scholarship" ? "#2F6FE0" : "#3FA66B";
  return (
    <TouchableOpacity style={styles.studentRow} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.studentRowTop}>
        <Text style={styles.studentName} numberOfLines={1}>
          {student.name}
        </Text>
        <Text style={styles.studentRegNo}>{student.register_no ?? student.student_id_no}</Text>
      </View>
      <Text style={styles.studentMeta}>
        {student.department_code ?? "Unassigned"} · Sem {student.semester ?? "—"}
      </Text>
      <View style={styles.studentChipsRow}>
        <Chip label={student.attendance_pct !== null ? `${student.attendance_pct}% att` : "No attendance"} />
        <Chip label={student.cgpa !== null ? `CGPA ${student.cgpa.toFixed(2)}` : "No CGPA"} />
        <Chip label={feeStatusLabel(student)} color={feeTone} />
      </View>
    </TouchableOpacity>
  );
}

function Chip({ label, color }: { label: string; color?: string }) {
  return (
    <View style={[styles.chip, color ? { borderColor: color } : null]}>
      <Text style={[styles.chipText, color ? { color } : null]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8FA" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTextWrap: { flex: 1 },
  title: { fontSize: 18, fontFamily: fonts.bold, color: "#fff" },
  subtitle: { fontSize: 11, fontFamily: fonts.regular, color: "#D7E2FA", marginTop: 2 },
  content: { padding: 16, paddingBottom: 40 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: fonts.regular, color: "#111827", padding: 0 },
  pillsRow: { gap: 8, paddingVertical: 12 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#EEF0F4",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pillActive: { backgroundColor: "#2F6FE0", borderColor: "#2F6FE0" },
  pillText: { fontSize: 12, fontFamily: fonts.medium, color: "#4B5563" },
  pillTextActive: { color: "#fff" },
  clearPill: { justifyContent: "center", paddingHorizontal: 10, paddingVertical: 8 },
  clearPillText: { fontSize: 12, fontFamily: fonts.semibold, color: "#E0724F" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  statCard: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 14,
    gap: 4,
  },
  statValue: { fontSize: 18, fontFamily: fonts.bold, color: "#111827" },
  statLabel: { fontSize: 11, fontFamily: fonts.medium, color: "#9AA6B2" },
  errorInline: { fontSize: 12, fontFamily: fonts.medium, color: "#E0724F", marginBottom: 14 },
  chartCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 16,
    marginBottom: 20,
    gap: 10,
  },
  chartTitle: { fontSize: 13, fontFamily: fonts.bold, color: "#111827", marginBottom: 4 },
  chartRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  chartLabel: { width: 32, fontSize: 11, fontFamily: fonts.semibold, color: "#4B5563" },
  chartTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: "#F1F3F6", overflow: "hidden" },
  chartFill: { height: 8, borderRadius: 4 },
  chartValue: { width: 40, fontSize: 11, fontFamily: fonts.medium, color: "#9AA6B2", textAlign: "right" },
  sectionTitle: { fontSize: 14, fontFamily: fonts.bold, color: "#111827", marginBottom: 10 },
  inlineLoading: { paddingVertical: 30, alignItems: "center" },
  centerState: { alignItems: "center", paddingVertical: 40, gap: 8 },
  centerStateText: { fontSize: 13, fontFamily: fonts.medium, color: "#9AA6B2", textAlign: "center", paddingHorizontal: 20 },
  studentRow: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 14,
    marginBottom: 10,
    gap: 6,
  },
  studentRowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  studentName: { flex: 1, fontSize: 14, fontFamily: fonts.bold, color: "#111827" },
  studentRegNo: { fontSize: 11, fontFamily: fonts.medium, color: "#9AA6B2" },
  studentMeta: { fontSize: 11, fontFamily: fonts.regular, color: "#8A93A3" },
  studentChipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 2 },
  chip: {
    borderWidth: 1,
    borderColor: "#EEF0F4",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chipText: { fontSize: 10, fontFamily: fonts.semibold, color: "#4B5563" },
  loadMoreButton: { alignItems: "center", paddingVertical: 14 },
  loadMoreText: { fontSize: 13, fontFamily: fonts.bold, color: "#2F6FE0" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.5)", justifyContent: "center", padding: 20 },
  modalCard: { backgroundColor: "#fff", borderRadius: 18, padding: 18, maxHeight: "70%" },
  modalTitle: { fontSize: 15, fontFamily: fonts.bold, color: "#111827", marginBottom: 10 },
  modalList: { marginBottom: 4 },
  modalOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F6",
  },
  modalOptionName: { fontSize: 14, fontFamily: fonts.semibold, color: "#111827" },
  detailLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F6",
  },
  detailLabel: { fontSize: 12, fontFamily: fonts.medium, color: "#9AA6B2" },
  detailValue: { fontSize: 13, fontFamily: fonts.semibold, color: "#111827" },
  closeModalButton: { alignItems: "center", paddingVertical: 12, marginTop: 8 },
  closeModalButtonText: { fontSize: 13, fontFamily: fonts.bold, color: "#2F6FE0" },
});
