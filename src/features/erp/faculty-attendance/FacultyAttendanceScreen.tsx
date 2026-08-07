import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { MONTH_NAMES } from "@/utils/calendar";
import { toast } from "@/utils/toast";
import { getApiErrorMessage } from "@/services/api/client";
import { listStaffAttendanceForReview } from "@/services/api/staff-attendance.api";
import { mockOtherStaffAttendance, type StaffAttendanceRow } from "./data/mockFacultyAttendance";

type Tab = "faculty" | "others";
type LoadStatus = "loading" | "success" | "error";

function initialsFromName(name: string) {
  return name
    .replace(/^(Dr|Mr|Mrs|Ms)\.?\s+/i, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

// Wired to GET /me/staff-attendance-review (real faculty_daily_attendance
// rows, plus the same approved-leave/holiday-slot fallback used by the
// faculty's own My Attendance screen) for the Faculty tab - this HR Payroll
// caller sees every active faculty member's monthly stats, one row each.
// Tapping a row drills into that faculty's day-by-day calendar (reused from
// the My Attendance screen's design). The Others (non-teaching staff) tab
// has no backend module at all and stays on mock data, same gap as the
// sibling Leave/OD screens' Others tab.
export function FacultyAttendanceScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const today = useMemo(() => new Date(), []);

  const [tab, setTab] = useState<Tab>("faculty");
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const [facultyStatus, setFacultyStatus] = useState<LoadStatus>("loading");
  const [facultyError, setFacultyError] = useState<string | null>(null);
  const [facultyRows, setFacultyRows] = useState<StaffAttendanceRow[]>([]);

  const loadFacultyRows = useCallback(() => {
    setFacultyStatus("loading");
    setFacultyError(null);
    listStaffAttendanceForReview(viewYear, viewMonth + 1)
      .then((rows) => {
        setFacultyRows(
          rows.map((row) => ({
            id: String(row.faculty.id),
            name: `${row.faculty.first_name} ${row.faculty.last_name}`,
            subtitle: row.faculty.designation,
            stats: row.stats,
          })),
        );
        setFacultyStatus("success");
      })
      .catch((err) => {
        setFacultyError(getApiErrorMessage(err, "Couldn't load faculty attendance."));
        setFacultyStatus("error");
      });
  }, [viewYear, viewMonth]);

  useEffect(() => {
    loadFacultyRows();
  }, [loadFacultyRows]);

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return () => {
        navigation.getParent()?.setOptions({ headerShown: true, header: () => <CollegeHeader /> });
      };
    }, [navigation]),
  );

  const rows = tab === "faculty" ? facultyRows : mockOtherStaffAttendance;

  function goToPreviousMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((year) => year - 1);
    } else {
      setViewMonth((month) => month - 1);
    }
  }

  function goToNextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((year) => year + 1);
    } else {
      setViewMonth((month) => month + 1);
    }
  }

  function openDetail(row: StaffAttendanceRow) {
    if (tab === "others") {
      toast.info("Attendance details aren't available for support staff yet.");
      return;
    }
    router.push({
      pathname: "/(tabs)/erp/faculty-attendance/[facultyId]",
      params: {
        facultyId: row.id,
        name: row.name,
        subtitle: row.subtitle,
        year: String(viewYear),
        month: String(viewMonth + 1),
      },
    });
  }

  function switchTab(nextTab: Tab) {
    setTab(nextTab);
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
          <Text style={styles.headerTitle}>Attendance</Text>
          <Text style={styles.headerSubtitle}>
            {tab === "faculty" ? "Faculty attendance" : "Support staff attendance"}
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.tabSwitch}>
        <TouchableOpacity
          style={[styles.tabSwitchButton, tab === "faculty" && styles.tabSwitchButtonActive]}
          onPress={() => switchTab("faculty")}
        >
          <Text style={[styles.tabSwitchText, tab === "faculty" && styles.tabSwitchTextActive]}>Faculty</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabSwitchButton, tab === "others" && styles.tabSwitchButtonActive]}
          onPress={() => switchTab("others")}
        >
          <Text style={[styles.tabSwitchText, tab === "others" && styles.tabSwitchTextActive]}>Others</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.monthNav}>
        <TouchableOpacity onPress={goToPreviousMonth} style={styles.navButton} hitSlop={8}>
          <Ionicons name="chevron-back" size={18} color="#2F6FE0" />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>
          {MONTH_NAMES[viewMonth]} {viewYear}
        </Text>
        <TouchableOpacity onPress={goToNextMonth} style={styles.navButton} hitSlop={8}>
          <Ionicons name="chevron-forward" size={18} color="#2F6FE0" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {tab === "faculty" && facultyStatus === "loading" ? (
          <View style={styles.inlineLoading}>
            <ActivityIndicator color="#2F6FE0" />
          </View>
        ) : tab === "faculty" && facultyStatus === "error" ? (
          <View style={styles.emptyState}>
            <Ionicons name="alert-circle-outline" size={22} color="#DC2626" />
            <Text style={styles.emptyStateText}>{facultyError ?? "Something went wrong."}</Text>
            <TouchableOpacity onPress={loadFacultyRows} style={styles.retryButton} activeOpacity={0.8}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {rows.map((row) => (
              <StaffAttendanceCard key={row.id} row={row} onPress={() => openDetail(row)} />
            ))}

            {rows.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={32} color="#B0B7C3" />
                <Text style={styles.emptyStateText}>No attendance records here</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StaffAttendanceCard({ row, onPress }: { row: StaffAttendanceRow; onPress: () => void }) {
  const { name, subtitle, stats } = row;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initialsFromName(name)}</Text>
        </View>
        <View style={styles.cardHeaderTextWrap}>
          <Text style={styles.cardName}>{name}</Text>
          <Text style={styles.cardSubtitle}>{subtitle}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#B0B7C3" />
      </View>

      <View style={styles.divider} />

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.present}</Text>
          <Text style={styles.statLabel}>PRESENT</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, styles.statValueAbsent]}>{stats.absent}</Text>
          <Text style={styles.statLabel}>ABSENT</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, styles.statValueOnDuty]}>{stats.onDuty}</Text>
          <Text style={styles.statLabel}>ON DUTY</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.overallPercent}%</Text>
          <Text style={styles.statLabel}>OVERALL</Text>
        </View>
      </View>
    </TouchableOpacity>
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
  tabSwitch: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 12,
    padding: 4,
    gap: 4,
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
    paddingVertical: 10,
  },
  tabSwitchButtonActive: {
    backgroundColor: "#2F6FE0",
  },
  tabSwitchText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#4B5563",
  },
  tabSwitchTextActive: {
    color: "#fff",
  },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginTop: 14,
    marginHorizontal: 16,
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    elevation: 1,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  monthLabel: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
    minWidth: 130,
    textAlign: "center",
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
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
  cardHeaderTextWrap: {
    flex: 1,
  },
  cardName: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  cardSubtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F3F6",
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: "#111827",
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
    marginTop: 4,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 8,
  },
  emptyStateText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
    textAlign: "center",
  },
  inlineLoading: {
    paddingVertical: 40,
    alignItems: "center",
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
});
