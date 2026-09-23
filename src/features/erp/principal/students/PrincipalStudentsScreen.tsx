import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TextInput,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SkeletonListRows } from "@/components/ui/Skeleton";
import { AnchoredDropdown, useDropdown } from "@/components/ui/dropdown";
import { fonts } from "@/theme";
import { getApiErrorMessage } from "@/services/api/client";
import { listDepartments, type Department } from "@/services/api/departments.api";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";
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
      // No cleanup - PrincipalStudentDetailScreen.tsx is pushed on top of
      // this screen and races this blur cleanup against its own focus
      // effect (undefined blur/focus ordering between siblings in the same
      // Stack), intermittently leaving both headers visible. Going back to
      // Dashboard is safe without a reset here too - PrincipalDashboard.tsx
      // now defensively re-asserts headerShown:true on its own focus
      // instead of depending on this screen's cleanup.
      return undefined;
    }, [navigation]),
  );

  const [rollCount, setRollCount] = useState<number | null>(null);
  const [overview, setOverview] = useState<PrincipalAttendanceOverview | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  const [departments, setDepartments] = useState<Department[]>([]);
  const departmentPicker = useDropdown();
  const yearPicker = useDropdown();

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
    setRecentLookups((prev) => [student, ...prev.filter((s) => s.id !== student.id)].slice(0, 10));
    router.push({
      pathname: "/(tabs)/erp/principal/students/[id]",
      params: { id: String(student.id), name: student.name },
    } as never);
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
      <WatermarkBackground />
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

        {/* Filter pills - plain wrapping row, not a horizontal ScrollView,
            see HigherEducationScreen.tsx's identical comment for why. */}
        <View style={styles.pillsRow}>
          <FilterPill
            label={department ? department.code : "Department"}
            active={!!department}
            onPress={departmentPicker.toggle}
            iconRight="chevron-down"
            anchorRef={departmentPicker.anchorRef}
          />
          <FilterPill
            label={year ? `Year ${year}` : "Year"}
            active={!!year}
            onPress={yearPicker.toggle}
            iconRight="chevron-down"
            anchorRef={yearPicker.anchorRef}
          />
          <FilterPill label="Attendance < 75%" active={below75} onPress={() => setBelow75((v) => !v)} />
          <FilterPill label="Fees pending" active={feesPending} onPress={() => setFeesPending((v) => !v)} />
          {isFiltered && (
            <TouchableOpacity style={styles.clearPill} onPress={clearFilters}>
              <Text style={styles.clearPillText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>

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

        {loading && <SkeletonListRows count={4} />}

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
      <AnchoredDropdown
        anchorRef={departmentPicker.anchorRef}
        visible={departmentPicker.visible}
        onClose={departmentPicker.close}
        contentStyle={[styles.modalCard, styles.anchoredCard]}
      >
        <Text style={styles.modalTitle}>Select a department</Text>
        <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            style={styles.modalOptionRow}
            onPress={() => {
              setDepartment(null);
              departmentPicker.close();
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
                departmentPicker.close();
              }}
            >
              <Text style={styles.modalOptionName}>{dept.name}</Text>
              {department?.id === dept.id && <Ionicons name="checkmark" size={16} color="#2F6FE0" />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </AnchoredDropdown>

      {/* Year picker */}
      <AnchoredDropdown
        anchorRef={yearPicker.anchorRef}
        visible={yearPicker.visible}
        onClose={yearPicker.close}
        contentStyle={[styles.modalCard, styles.anchoredCard]}
      >
        <Text style={styles.modalTitle}>Select a year</Text>
        <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            style={styles.modalOptionRow}
            onPress={() => {
              setYear(null);
              yearPicker.close();
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
                yearPicker.close();
              }}
            >
              <Text style={styles.modalOptionName}>Year {y}</Text>
              {year === y && <Ionicons name="checkmark" size={16} color="#2F6FE0" />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </AnchoredDropdown>
    </SafeAreaView>
  );
}


function FilterPill({
  label,
  active,
  onPress,
  iconRight,
  anchorRef,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  iconRight?: keyof typeof Ionicons.glyphMap;
  anchorRef?: RefObject<View | null>;
}) {
  return (
    <View ref={anchorRef} collapsable={false}>
      <TouchableOpacity style={[styles.pill, active && styles.pillActive]} onPress={onPress} activeOpacity={0.8}>
        <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
        {iconRight && <Ionicons name={iconRight} size={14} color={active ? "#fff" : "#8A93A3"} />}
      </TouchableOpacity>
    </View>
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

// Same avatar/name/meta/chevron row style as FacultyStaffScreen.tsx's own
// FacultyRow - kept visually identical across both directories per explicit
// request. Attendance/CGPA/fee status (still real, still fetched) moved
// off this row entirely - now only shown on the full profile detail screen
// this row navigates to, same as Faculty's own row doesn't show
// load/duties/mentees inline either.
function StudentRow({ student, onPress }: { student: PrincipalStudentRow; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.studentRow} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.studentAvatar}>
        {student.photo_url ? (
          <Image source={{ uri: student.photo_url }} style={styles.studentAvatarImage} />
        ) : (
          <Text style={styles.studentAvatarText}>{initialsFromName(student.name)}</Text>
        )}
      </View>
      <View style={styles.studentRowTextWrap}>
        <Text style={styles.studentName} numberOfLines={1}>
          {student.name}
        </Text>
        <Text style={styles.studentMeta} numberOfLines={1}>
          {student.register_no ?? student.student_id_no}
          {" · "}
          {student.department_code ?? "Unassigned"}
          {student.batch_name ? ` · ${student.batch_name}` : ""}
          {student.section ? ` · Sec ${student.section}` : ""}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#B0B7C3" />
    </TouchableOpacity>
  );
}

function initialsFromName(name: string | null | undefined) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8FA" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
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
  // Plain wrapping row, not a horizontal ScrollView - see
  // HigherEducationScreen.tsx's identical comment for why.
  pillsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingVertical: 12 },
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
  centerState: { alignItems: "center", paddingVertical: 40, gap: 8 },
  centerStateText: { fontSize: 13, fontFamily: fonts.medium, color: "#9AA6B2", textAlign: "center", paddingHorizontal: 20 },
  // Same avatar/name/meta/chevron row style as FacultyStaffScreen.tsx's own
  // facultyRow/facultyAvatar/... tokens - kept visually identical across
  // both directories per explicit request.
  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 12,
    marginBottom: 10,
  },
  studentAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E4EBFB",
    alignItems: "center",
    justifyContent: "center",
  },
  studentAvatarImage: { width: 44, height: 44, borderRadius: 22 },
  studentAvatarText: { fontSize: 15, fontFamily: fonts.bold, color: "#2F6FE0" },
  studentRowTextWrap: { flex: 1, gap: 2 },
  studentName: { fontSize: 14, fontFamily: fonts.bold, color: "#111827" },
  studentMeta: { fontSize: 11, fontFamily: fonts.regular, color: "#8A93A3" },
  loadMoreButton: { alignItems: "center", paddingVertical: 14 },
  loadMoreText: { fontSize: 13, fontFamily: fonts.bold, color: "#2F6FE0" },
  modalCard: { backgroundColor: "#fff", borderRadius: 18, padding: 18, maxHeight: "70%" },
  // Anchored dropdowns have no full-screen flex parent to resolve modalCard's
  // percentage maxHeight against, so pin a concrete size for those two
  // (department/year).
  anchoredCard: {
    width: 240,
    maxHeight: 320,
    elevation: 6,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
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
});
