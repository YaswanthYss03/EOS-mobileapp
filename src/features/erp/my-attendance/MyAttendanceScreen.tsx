import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { getCalendarWeeks, WEEKDAY_LABELS, MONTH_NAMES } from "@/utils/calendar";
import {
  getMyStaffAttendance,
  type MyStaffAttendanceResponse,
  type StaffAttendanceDayStatus,
} from "@/services/api/staff-attendance.api";
import { getMyProfile } from "@/services/api/profile.api";

type LoadStatus = "loading" | "success" | "error";

const STATUS_STYLES: Record<StaffAttendanceDayStatus, { bg: string; text: string }> = {
  present: { bg: "#fff", text: "#111827" },
  absent: { bg: "#FEE2E2", text: "#DC2626" },
  onDuty: { bg: "#E4EBFB", text: "#2F6FE0" },
  holiday: { bg: "#F1F0FB", text: "#8B85C4" },
};

function pad2(value: number): string {
  return value < 10 ? `0${value}` : `${value}`;
}

// Wired to GET /me/staff-attendance. This is the logged-in employee's OWN
// attendance (Employee section), not the "Student Attendance" marking screen
// an employee/HoD uses for their class (see erp/attendance). Reachable from
// both the Employee/Faculty and HoD dashboards. Each day reads the real
// faculty_daily_attendance record when one exists, falling back to a
// best-effort derivation from approved leaves and opted-in holiday slots
// otherwise - see staff-attendance.api.ts for details.
export function MyAttendanceScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const [status, setStatus] = useState<LoadStatus>("loading");
  const [attendance, setAttendance] = useState<MyStaffAttendanceResponse | null>(null);

  // This screen renders its own full header below, so hide the shared
  // CollegeHeader while it's focused - same pattern as the other ERP
  // sub-screens.
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return () => {
        navigation.getParent()?.setOptions({ headerShown: true, header: () => <CollegeHeader /> });
      };
    }, [navigation]),
  );

  const [headerLabel, setHeaderLabel] = useState<string | null>(null);

  const load = useCallback(() => {
    setStatus("loading");
    getMyStaffAttendance(viewYear, viewMonth + 1)
      .then((response) => {
        setAttendance(response);
        setStatus("success");
      })
      .catch(() => setStatus("error"));
  }, [viewYear, viewMonth]);

  useEffect(() => {
    load();
  }, [load]);

  // Fetched once, not per month-navigation — this is just the header label.
  useEffect(() => {
    getMyProfile()
      .then((profile) => setHeaderLabel(`${profile.name} · ${profile.id_no}`))
      .catch(() => setHeaderLabel(null));
  }, []);

  const weeks = useMemo(() => getCalendarWeeks(viewYear, viewMonth), [viewYear, viewMonth]);

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

  function statusFor(day: number): StaffAttendanceDayStatus {
    const key = `${viewYear}-${pad2(viewMonth + 1)}-${pad2(day)}`;
    return attendance?.marks[key] ?? "present";
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
          {headerLabel && <Text style={styles.headerSubtitle}>{headerLabel}</Text>}
        </View>
      </LinearGradient>

      {status === "loading" && (
        <View style={styles.inlineLoading}>
          <ActivityIndicator color="#2F6FE0" />
        </View>
      )}

      {status === "error" && (
        <View style={styles.errorNotice}>
          <Ionicons name="alert-circle-outline" size={22} color="#DC2626" />
          <Text style={styles.errorNoticeText}>Couldn't load your attendance.</Text>
          <TouchableOpacity onPress={load} style={styles.retryButton} activeOpacity={0.8}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === "success" && attendance && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{attendance.stats.present}</Text>
              <Text style={styles.statLabel}>PRESENT</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, styles.statValueAbsent]}>{attendance.stats.absent}</Text>
              <Text style={styles.statLabel}>ABSENT</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, styles.statValueOnDuty]}>{attendance.stats.onDuty}</Text>
              <Text style={styles.statLabel}>ON DUTY</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{attendance.stats.overallPercent}%</Text>
              <Text style={styles.statLabel}>OVERALL</Text>
            </View>
          </View>

          <View style={styles.calendarCard}>
            <View style={styles.calendarNav}>
              <TouchableOpacity onPress={goToPreviousMonth} style={styles.navButton} hitSlop={8}>
                <Ionicons name="chevron-back" size={18} color="#2F6FE0" />
              </TouchableOpacity>
              <Text style={styles.calendarMonthLabel}>
                {MONTH_NAMES[viewMonth]} {viewYear}
              </Text>
              <TouchableOpacity onPress={goToNextMonth} style={styles.navButton} hitSlop={8}>
                <Ionicons name="chevron-forward" size={18} color="#2F6FE0" />
              </TouchableOpacity>
            </View>

            <View style={styles.weekdayRow}>
              {WEEKDAY_LABELS.map((label, index) => (
                <Text key={index} style={styles.weekdayLabel}>
                  {label}
                </Text>
              ))}
            </View>

            {weeks.map((week, weekIndex) => (
              <View key={weekIndex} style={styles.weekRow}>
                {week.map((day, dayIndex) => {
                  if (day === null) {
                    return <View key={dayIndex} style={styles.dayCell} />;
                  }
                  const { bg, text } = STATUS_STYLES[statusFor(day)];
                  return (
                    <View key={dayIndex} style={[styles.dayCell, styles.dayCellBox, { backgroundColor: bg }]}>
                      <Text style={[styles.dayCellText, { color: text }]}>{day}</Text>
                    </View>
                  );
                })}
              </View>
            ))}

            <View style={styles.legendRow}>
              <LegendItem color="#fff" borderColor="#E5E7EB" label="Present" />
              <LegendItem color="#FEE2E2" label="Absent" />
              <LegendItem color="#E4EBFB" label="On Duty" />
              <LegendItem color="#F1F0FB" label="Holiday" />
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function LegendItem({ color, borderColor, label }: { color: string; borderColor?: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, { backgroundColor: color, borderColor: borderColor ?? color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
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
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  statValue: {
    fontSize: 18,
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
  calendarCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
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
  dayCellBox: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#F1F3F6",
  },
  dayCellText: {
    fontSize: 12,
    fontFamily: fonts.semibold,
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 14,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F3F6",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendSwatch: {
    width: 12,
    height: 12,
    borderRadius: 3,
    borderWidth: 1,
  },
  legendLabel: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#6B7280",
  },
});
