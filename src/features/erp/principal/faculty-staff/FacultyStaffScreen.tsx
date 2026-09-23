import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, Image, TextInput, Pressable, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SkeletonStatCards, SkeletonListRows } from "@/components/ui/Skeleton";
import { AnchoredDropdown, useDropdown } from "@/components/ui/dropdown";
import { fonts } from "@/theme";
import { formatDate } from "@/utils/calendar";
import { getApiErrorMessage } from "@/services/api/client";
import { listDepartments, type Department } from "@/services/api/departments.api";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";
import {
  getPrincipalFacultyOverview,
  getPrincipalFacultyCoordination,
  type PrincipalFacultyOverview,
  type PrincipalFacultyCoordinationRow,
} from "@/services/api/principal-faculty.api";

function formatRupees(amount: number): string {
  if (amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(2)} Cr`;
  if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(2)} L`;
  return `₹${amount.toLocaleString("en-IN")}`;
}

function initialsFromName(name: string | null | undefined) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function FacultyStaffScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // This screen renders its own header below, so hide the shared
  // CollegeHeader (logo/college name) while it's focused.
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      // No cleanup - see PrincipalStudentsScreen.tsx's identical comment
      // (PrincipalFacultyDetailScreen.tsx races this the same way).
      return undefined;
    }, [navigation]),
  );

  const [overview, setOverview] = useState<PrincipalFacultyOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getPrincipalFacultyOverview()
      .then(setOverview)
      .catch((err) => setError(getApiErrorMessage(err, "Couldn't load faculty & staff overview.")))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Faculty search + department filter - below the department-wise-strength
  // table, same debounce/filter-pill pattern as PrincipalStudentsScreen.
  const [departments, setDepartments] = useState<Department[]>([]);
  const departmentPicker = useDropdown();
  const [searchText, setSearchText] = useState("");
  const [department, setDepartment] = useState<Department | null>(null);

  const [faculty, setFaculty] = useState<PrincipalFacultyCoordinationRow[]>([]);
  const [facultyLoading, setFacultyLoading] = useState(false);
  const [facultyError, setFacultyError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFiltered = searchText.trim().length > 0 || !!department;

  useEffect(() => {
    listDepartments().then(setDepartments).catch(() => {});
  }, []);

  const runFacultySearch = useCallback(() => {
    setFacultyLoading(true);
    setFacultyError(null);
    getPrincipalFacultyCoordination({
      search: searchText.trim() || undefined,
      department_id: department?.id,
    })
      .then(setFaculty)
      .catch((err) => setFacultyError(getApiErrorMessage(err, "Couldn't load faculty.")))
      .finally(() => setFacultyLoading(false));
  }, [searchText, department]);

  useEffect(() => {
    if (!isFiltered) {
      setFaculty([]);
      setFacultyError(null);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(runFacultySearch, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText, department]);

  function openFaculty(member: PrincipalFacultyCoordinationRow) {
    router.push({
      pathname: "/(tabs)/erp/principal/faculty-staff/[id]",
      params: { id: String(member.id), name: member.name },
    });
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
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>Faculty & staff</Text>
          <Text style={styles.subtitle}>
            {overview
              ? `${overview.total_employees.toLocaleString()} employees · ${overview.teaching_count.toLocaleString()} teaching, ${overview.non_teaching_count.toLocaleString()} non-teaching`
              : "Loading…"}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Search bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color="#8A93A3" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by faculty name"
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

        {/* Department filter pill - plain wrapping row, not a horizontal
            ScrollView, see HigherEducationScreen.tsx's identical comment
            for why. */}
        <View style={styles.pillsRow}>
          <View ref={departmentPicker.anchorRef} collapsable={false}>
            <TouchableOpacity
              style={[styles.pill, department && styles.pillActive]}
              onPress={departmentPicker.toggle}
              activeOpacity={0.8}
            >
              <Text style={[styles.pillText, department && styles.pillTextActive]}>
                {department ? department.code : "Department"}
              </Text>
              <Ionicons name="chevron-down" size={14} color={department ? "#fff" : "#8A93A3"} />
            </TouchableOpacity>
          </View>
          {isFiltered && (
            <TouchableOpacity
              style={styles.clearPill}
              onPress={() => {
                setSearchText("");
                setDepartment(null);
              }}
            >
              <Text style={styles.clearPillText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        {loading && (
          <>
            <SkeletonStatCards count={4} style={styles.statsSkeletonSpacing} />
            <SkeletonListRows count={5} />
          </>
        )}

        {!loading && error && (
          <View style={styles.centerState}>
            <Ionicons name="cloud-offline-outline" size={28} color="#B0B7C3" />
            <Text style={styles.centerStateText}>{error}</Text>
            <Pressable onPress={load}>
              <Text style={styles.retryText}>Tap to retry</Text>
            </Pressable>
          </View>
        )}

        {!loading && !error && overview && (
          <>
            <View style={styles.statsGrid}>
              <StatCard
                icon="person-circle-outline"
                value={overview.present_today.toLocaleString()}
                label="Present today"
                subtitle={`${overview.on_leave_today} on approved leave`}
              />
              <StatCard
                icon="briefcase-outline"
                value={overview.on_duty_today.toLocaleString()}
                label="On duty today"
                subtitle="out on official duty"
              />
              <StatCard
                icon="ribbon-outline"
                value={`${overview.appraisals_closed} / ${overview.appraisals_total}`}
                label="Appraisals closed"
                subtitle={overview.appraisal_academic_year ? `cycle ${overview.appraisal_academic_year}` : "No cycle yet"}
                tone="amber"
              />
              <StatCard
                icon="wallet-outline"
                value={formatRupees(overview.payroll_amount)}
                label="Payroll this month"
                subtitle={
                  overview.payroll_disbursed_at
                    ? `disbursed ${formatDate(new Date(overview.payroll_disbursed_at))}`
                    : "Not yet disbursed"
                }
              />
            </View>

            <View style={styles.tableCard}>
              <Text style={styles.tableTitle}>Department-wise strength</Text>

              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderCell, styles.colDept]}>DEPARTMENT</Text>
                <Text style={[styles.tableHeaderCell, styles.colNum]}>TEACHING</Text>
                <Text style={[styles.tableHeaderCell, styles.colNum]}>SUPPORT</Text>
                <Text style={[styles.tableHeaderCell, styles.colNum]}>ATTENDANCE</Text>
              </View>

              {overview.departments.length === 0 && (
                <View style={styles.centerState}>
                  <Text style={styles.centerStateText}>No department staffing found.</Text>
                </View>
              )}

              {overview.departments.map((dept) => (
                <View key={dept.code} style={styles.tableRow}>
                  <Text style={[styles.tableCellStrong, styles.colDept]}>{dept.code}</Text>
                  <Text style={[styles.tableCell, styles.colNum]}>{dept.teaching}</Text>
                  <Text style={[styles.tableCell, styles.colNum]}>{dept.support}</Text>
                  <Text style={[styles.tableCell, styles.colNum]}>
                    {dept.attendance_pct !== null ? `${dept.attendance_pct}%` : "—"}
                  </Text>
                </View>
              ))}
            </View>

            {/* Faculty search results - only shown once a search/filter is active */}
            {isFiltered && (
              <View style={styles.facultyResultsSection}>
                <Text style={styles.sectionTitle}>Faculty{faculty.length > 0 ? ` (${faculty.length})` : ""}</Text>

                {facultyLoading && <SkeletonListRows count={4} />}

                {!facultyLoading && facultyError && (
                  <View style={styles.centerState}>
                    <Ionicons name="cloud-offline-outline" size={28} color="#B0B7C3" />
                    <Text style={styles.centerStateText}>{facultyError}</Text>
                  </View>
                )}

                {!facultyLoading && !facultyError && faculty.length === 0 && (
                  <View style={styles.centerState}>
                    <Ionicons name="search-outline" size={28} color="#B0B7C3" />
                    <Text style={styles.centerStateText}>No faculty match this search.</Text>
                  </View>
                )}

                {!facultyLoading &&
                  !facultyError &&
                  faculty.map((member) => (
                    <FacultyRow key={member.id} faculty={member} onPress={() => openFaculty(member)} />
                  ))}
              </View>
            )}
          </>
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
    </SafeAreaView>
  );
}

function FacultyRow({ faculty, onPress }: { faculty: PrincipalFacultyCoordinationRow; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.facultyRow} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.facultyAvatar}>
        {faculty.photo_url ? (
          <Image source={{ uri: faculty.photo_url }} style={styles.facultyAvatarImage} />
        ) : (
          <Text style={styles.facultyAvatarText}>{initialsFromName(faculty.name)}</Text>
        )}
      </View>
      <View style={styles.facultyRowTextWrap}>
        <Text style={styles.facultyName} numberOfLines={1}>
          {faculty.name}
        </Text>
        <Text style={styles.facultyMeta} numberOfLines={1}>
          {faculty.department_name ?? faculty.department_code ?? "Unassigned"}
          {faculty.designation ? ` · ${faculty.designation}` : ""}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#B0B7C3" />
    </TouchableOpacity>
  );
}

function StatCard({
  icon,
  value,
  label,
  subtitle,
  tone,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  subtitle: string;
  tone?: "amber";
}) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, tone === "amber" ? { color: "#B7791F" } : null]}>{value}</Text>
      <Text style={styles.statSubtitle}>{subtitle}</Text>
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
  centerState: { alignItems: "center", paddingVertical: 40, gap: 8 },
  centerStateText: { fontSize: 13, fontFamily: fonts.medium, color: "#9AA6B2", textAlign: "center", paddingHorizontal: 20 },
  retryText: { fontSize: 13, fontFamily: fonts.bold, color: "#2F6FE0", marginTop: 4 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  statsSkeletonSpacing: { marginBottom: 16 },
  statCard: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 14,
    gap: 4,
  },
  statLabel: { fontSize: 11, fontFamily: fonts.medium, color: "#8A93A3" },
  statValue: { fontSize: 22, fontFamily: fonts.bold, color: "#111827" },
  statSubtitle: { fontSize: 10, fontFamily: fonts.regular, color: "#9AA6B2" },
  tableCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 16,
  },
  tableTitle: { fontSize: 15, fontFamily: fonts.bold, color: "#111827", marginBottom: 14 },
  tableHeaderRow: {
    flexDirection: "row",
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F6",
  },
  tableHeaderCell: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: "#9AA6B2",
    letterSpacing: 0.4,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F6F8",
  },
  tableCellStrong: { fontSize: 13, fontFamily: fonts.bold, color: "#111827" },
  tableCell: { fontSize: 13, fontFamily: fonts.regular, color: "#4B5563" },
  colDept: { flex: 1.2 },
  colNum: { flex: 1, textAlign: "right" },
  facultyResultsSection: { marginTop: 20 },
  sectionTitle: { fontSize: 14, fontFamily: fonts.bold, color: "#111827", marginBottom: 10 },
  facultyRow: {
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
  facultyAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E4EBFB",
    alignItems: "center",
    justifyContent: "center",
  },
  facultyAvatarImage: { width: 44, height: 44, borderRadius: 22 },
  facultyAvatarText: { fontSize: 15, fontFamily: fonts.bold, color: "#2F6FE0" },
  facultyRowTextWrap: { flex: 1, gap: 2 },
  facultyName: { fontSize: 14, fontFamily: fonts.bold, color: "#111827" },
  facultyMeta: { fontSize: 11, fontFamily: fonts.regular, color: "#8A93A3" },
  modalCard: { backgroundColor: "#fff", borderRadius: 18, padding: 18, maxHeight: "70%" },
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
