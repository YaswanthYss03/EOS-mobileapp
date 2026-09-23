import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SkeletonDetailBlock, SkeletonCalendarBlock } from "@/components/ui/Skeleton";
import { fonts } from "@/theme";
import { getCalendarWeeks, WEEKDAY_LABELS, MONTH_NAMES } from "@/utils/calendar";
import { getApiErrorMessage } from "@/services/api/client";
import { getMyNightAttendance, type MyNightAttendanceRecord, type NightAttendanceStatus } from "@/services/api/hostel.api";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";

const OVERALL_WINDOW_DAYS = 90;

type LoadStatus = "loading" | "success" | "error";

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// One of the Hostel hub's sub-pages - always reached by pushing from the
// hub, so a plain back arrow is always correct here (no asTabRoot case).
// Read-only: this is the warden's own published night roll call, mirrored
// for the resident (see hostel.api.ts's getMyNightAttendance) - there is no
// self-marking action for a student. Same calendar-with-summary-card design
// as the Progress tab's own Attendance page (StudentAttendanceOverviewScreen)
// per explicit request - only "present"/"absent" exist here (no per-subject
// breakdown, no eligibility threshold - a night either had a resident
// present or not).
export function StudentHostelNightAttendanceScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const [overallStatus, setOverallStatus] = useState<LoadStatus>("loading");
  const [overallError, setOverallError] = useState<string | null>(null);
  const [overallRecords, setOverallRecords] = useState<MyNightAttendanceRecord[] | null>(null);
  const [overallRange, setOverallRange] = useState<{ from: Date; to: Date } | null>(null);

  const [monthStatus, setMonthStatus] = useState<LoadStatus>("loading");
  const [monthError, setMonthError] = useState<string | null>(null);
  const [monthRecords, setMonthRecords] = useState<MyNightAttendanceRecord[]>([]);

  const loadOverall = useCallback(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - OVERALL_WINDOW_DAYS);

    setOverallStatus("loading");
    setOverallError(null);
    getMyNightAttendance(toDateOnly(from), toDateOnly(to))
      .then((response) => {
        setOverallRecords(response.records);
        setOverallRange({ from, to });
        setOverallStatus("success");
      })
      .catch((err) => {
        setOverallError(getApiErrorMessage(err, "Couldn't load your attendance summary."));
        setOverallStatus("error");
      });
  }, []);

  const loadMonth = useCallback((year: number, month: number) => {
    const from = new Date(year, month, 1);
    const to = new Date(year, month + 1, 0);

    setMonthStatus("loading");
    setMonthError(null);
    getMyNightAttendance(toDateOnly(from), toDateOnly(to))
      .then((response) => {
        setMonthRecords(response.records);
        setMonthStatus("success");
      })
      .catch((err) => {
        setMonthError(getApiErrorMessage(err, "Couldn't load this month's attendance."));
        setMonthStatus("error");
      });
  }, []);

  useEffect(() => {
    loadOverall();
  }, [loadOverall]);

  useEffect(() => {
    loadMonth(viewYear, viewMonth);
  }, [viewYear, viewMonth, loadMonth]);

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return undefined;
    }, [navigation]),
  );

  const weeks = useMemo(() => getCalendarWeeks(viewYear, viewMonth), [viewYear, viewMonth]);

  const overall = useMemo(() => {
    if (!overallRecords) return null;
    const present = overallRecords.filter((r) => r.status === "present").length;
    const absent = overallRecords.filter((r) => r.status === "absent").length;
    return { total: overallRecords.length, present, absent };
  }, [overallRecords]);

  const recordByDate = useMemo(() => {
    const map = new Map<string, NightAttendanceStatus>();
    for (const record of monthRecords) {
      map.set(record.date.slice(0, 10), record.status);
    }
    return map;
  }, [monthRecords]);

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

  function markFor(day: number): NightAttendanceStatus | "no-record" {
    const key = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return recordByDate.get(key) ?? "no-record";
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
        <Text style={styles.headerTitle}>Night attendance</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          {overallStatus === "loading" && <SkeletonDetailBlock style={styles.skeletonInCard} />}

          {overallStatus === "error" && (
            <ErrorNotice message={overallError ?? "Something went wrong."} onRetry={loadOverall} />
          )}

          {overallStatus === "success" && overall && overall.total === 0 && (
            <View style={styles.emptyOverall}>
              <Ionicons name="moon-outline" size={28} color="#B0B7C3" />
              <Text style={styles.emptyOverallText}>No attendance published yet</Text>
              <Text style={styles.emptyOverallSubtext}>
                Nothing has been published by the warden
                {overallRange ? ` between ${formatShortDate(overallRange.from)} and ${formatShortDate(overallRange.to)}` : ""}.
              </Text>
            </View>
          )}

          {overallStatus === "success" && overall && overall.total > 0 && (
            <>
              <View style={styles.summaryTopRow}>
                <View style={styles.percentRow}>
                  <Text style={styles.percentValue}>{overall.present}</Text>
                  <View style={styles.eligibleBadge}>
                    <Text style={styles.eligibleBadgeText}>Present</Text>
                  </View>
                </View>
                <View style={styles.hoursCol}>
                  <Text style={styles.hoursValue}>
                    {overall.absent}
                    <Text style={styles.hoursValueTotal}> / {overall.total}</Text>
                  </Text>
                  <Text style={styles.hoursLabel}>nights absent</Text>
                </View>
              </View>
              <Text style={styles.summarySubtitle}>
                Published night attendance
                {overallRange
                  ? ` · ${formatShortDate(overallRange.from)} – ${formatShortDate(overallRange.to)}`
                  : ""}
              </Text>
            </>
          )}
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

          {monthStatus === "loading" && (
            <SkeletonCalendarBlock showNavRow={false} style={styles.skeletonInCard} />
          )}

          {monthStatus === "error" && (
            <ErrorNotice message={monthError ?? "Something went wrong."} onRetry={() => loadMonth(viewYear, viewMonth)} />
          )}

          {monthStatus === "success" && (
            <>
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
                    const mark = markFor(day);
                    return (
                      <View key={dayIndex} style={styles.dayCell}>
                        <View
                          style={[
                            styles.dayCellInner,
                            mark === "present" && styles.dayCellPresent,
                            mark === "absent" && styles.dayCellAbsent,
                            mark === "no-record" && styles.dayCellNoRecord,
                          ]}
                        >
                          <Text
                            style={[
                              styles.dayCellText,
                              mark === "present" && styles.dayCellTextPresent,
                              mark === "absent" && styles.dayCellTextAbsent,
                              mark === "no-record" && styles.dayCellTextNoRecord,
                            ]}
                          >
                            {day}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ))}

              <View style={styles.legendRow}>
                <LegendItem swatchStyle={styles.legendSwatchPresent} label="Present" />
                <LegendItem swatchStyle={styles.legendSwatchAbsent} label="Absent" />
                <LegendItem swatchStyle={styles.legendSwatchNoRecord} label="Not published" />
              </View>
            </>
          )}
        </View>
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

function LegendItem({ swatchStyle, label }: { swatchStyle: object; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, swatchStyle]} />
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
    fontSize: 20,
    fontFamily: fonts.bold,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  skeletonInCard: {
    backgroundColor: "transparent",
    borderWidth: 0,
    padding: 0,
  },
  errorNotice: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 20,
  },
  emptyOverall: {
    alignItems: "center",
    gap: 6,
    paddingVertical: 20,
  },
  emptyOverallText: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#4B5563",
  },
  emptyOverallSubtext: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    textAlign: "center",
    paddingHorizontal: 12,
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
  summaryCard: {
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
  summaryTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  percentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  percentValue: {
    fontSize: 34,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  eligibleBadge: {
    backgroundColor: "#EAF0FD",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  eligibleBadgeText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  hoursCol: {
    alignItems: "flex-end",
  },
  hoursValue: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  hoursValueTotal: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
  },
  hoursLabel: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 2,
  },
  summarySubtitle: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#8A93A3",
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
    fontSize: 17,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  weekdayRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#9AA6B2",
  },
  weekRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 2,
  },
  dayCellInner: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    alignItems: "center",
    justifyContent: "center",
  },
  dayCellPresent: {
    backgroundColor: "#F0FDF4",
    borderColor: "#16A34A",
  },
  dayCellAbsent: {
    backgroundColor: "#DC2626",
    borderColor: "#DC2626",
  },
  dayCellNoRecord: {
    backgroundColor: "#E3E3E3",
    borderColor: "#E3E3E3",
  },
  dayCellText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  dayCellTextPresent: {
    color: "#16A34A",
    fontFamily: fonts.bold,
  },
  dayCellTextAbsent: {
    color: "#fff",
    fontFamily: fonts.bold,
  },
  dayCellTextNoRecord: {
    color: "#374151",
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 16,
    marginTop: 8,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#F1F3F6",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendSwatch: {
    width: 14,
    height: 14,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#EEF0F4",
  },
  legendSwatchPresent: {
    backgroundColor: "#F0FDF4",
    borderColor: "#16A34A",
  },
  legendSwatchAbsent: {
    backgroundColor: "#DC2626",
    borderColor: "#DC2626",
  },
  legendSwatchNoRecord: {
    backgroundColor: "#E3E3E3",
    borderColor: "#E3E3E3",
  },
  legendLabel: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#6B7280",
  },
});
