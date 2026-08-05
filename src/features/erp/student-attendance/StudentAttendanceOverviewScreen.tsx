import { useCallback, useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { getCalendarWeeks, WEEKDAY_LABELS, MONTH_NAMES } from "@/utils/calendar";
import { attendanceSummary, mockDayMarks, defaultViewMonth, type DayMark } from "./data/mockStudentAttendance";

type ResolvedMark = DayMark | "present";

// TODO: this is a view-only calendar over mockStudentAttendance - wire to a
// real attendance backend endpoint once one exists. This is the logged-in
// student's OWN attendance %/eligibility, not the Class Advisor's "Student
// Attendance" marking screen for their section (see erp/attendance).
export function StudentAttendanceOverviewScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [viewYear, setViewYear] = useState(defaultViewMonth.year);
  const [viewMonth, setViewMonth] = useState(defaultViewMonth.month);

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return () => {
        navigation.getParent()?.setOptions({ headerShown: true, header: () => <CollegeHeader /> });
      };
    }, [navigation]),
  );

  const weeks = useMemo(() => getCalendarWeeks(viewYear, viewMonth), [viewYear, viewMonth]);
  const isEligible = attendanceSummary.overallPercent >= attendanceSummary.eligibilityThresholdPercent;

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

  function markFor(day: number): ResolvedMark {
    const explicit = mockDayMarks[`${viewYear}-${viewMonth}-${day}`];
    if (explicit) return explicit;
    return new Date(viewYear, viewMonth, day).getDay() === 0 ? "holiday" : "present";
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
        <Text style={styles.headerTitle}>Attendance</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryTopRow}>
            <View style={styles.percentRow}>
              <Text style={styles.percentValue}>{attendanceSummary.overallPercent}%</Text>
              <View style={[styles.eligibleBadge, !isEligible && styles.eligibleBadgeAtRisk]}>
                <Text style={[styles.eligibleBadgeText, !isEligible && styles.eligibleBadgeTextAtRisk]}>
                  {isEligible ? "Eligible" : "At risk"}
                </Text>
              </View>
            </View>
            <View style={styles.hoursCol}>
              <Text style={styles.hoursValue}>
                {attendanceSummary.hoursAttended}
                <Text style={styles.hoursValueTotal}> / {attendanceSummary.totalHours}</Text>
              </Text>
              <Text style={styles.hoursLabel}>hours attended</Text>
            </View>
          </View>
          <Text style={styles.summarySubtitle}>Overall attendance · {attendanceSummary.semesterLabel}</Text>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${attendanceSummary.overallPercent}%` }]} />
            <View
              style={[styles.progressMarker, { left: `${attendanceSummary.eligibilityThresholdPercent}%` }]}
            />
          </View>
          <Text style={styles.markerHint}>
            Marker shows the {attendanceSummary.eligibilityThresholdPercent}% requirement
          </Text>
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
                const mark = markFor(day);
                return (
                  <View key={dayIndex} style={styles.dayCell}>
                    <View
                      style={[
                        styles.dayCellInner,
                        mark === "absent" && styles.dayCellAbsent,
                        mark === "onDuty" && styles.dayCellOnDuty,
                        mark === "holiday" && styles.dayCellHoliday,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayCellText,
                          mark === "absent" && styles.dayCellTextAbsent,
                          mark === "onDuty" && styles.dayCellTextOnDuty,
                          mark === "holiday" && styles.dayCellTextHoliday,
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
            <LegendItem swatchStyle={styles.legendSwatchOnDuty} label="On Duty" />
            <LegendItem swatchStyle={styles.legendSwatchHoliday} label="Holiday" />
          </View>
        </View>

        <Text style={styles.footerNote}>
          {attendanceSummary.eligibilityThresholdPercent}% attendance is required to sit the end-semester exams.
        </Text>
      </ScrollView>
    </SafeAreaView>
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
  eligibleBadgeAtRisk: {
    backgroundColor: "#FEF2F2",
  },
  eligibleBadgeText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  eligibleBadgeTextAtRisk: {
    color: "#DC2626",
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
    marginBottom: 14,
  },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: "#EEF0F4",
    marginBottom: 8,
    overflow: "hidden",
  },
  progressFill: {
    height: 10,
    borderRadius: 5,
    backgroundColor: "#2F6FE0",
  },
  progressMarker: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: "#fff",
  },
  markerHint: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
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
  dayCellAbsent: {
    backgroundColor: "#2F6FE0",
    borderColor: "#2F6FE0",
  },
  dayCellOnDuty: {
    backgroundColor: "#EAF0FD",
    borderColor: "#C7D8FA",
  },
  dayCellHoliday: {
    backgroundColor: "#F7F8FA",
    borderColor: "#F7F8FA",
  },
  dayCellText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  dayCellTextAbsent: {
    color: "#fff",
    fontFamily: fonts.bold,
  },
  dayCellTextOnDuty: {
    color: "#2F6FE0",
    fontFamily: fonts.bold,
  },
  dayCellTextHoliday: {
    color: "#C4CAD3",
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
    backgroundColor: "#fff",
  },
  legendSwatchAbsent: {
    backgroundColor: "#2F6FE0",
    borderColor: "#2F6FE0",
  },
  legendSwatchOnDuty: {
    backgroundColor: "#EAF0FD",
    borderColor: "#C7D8FA",
  },
  legendSwatchHoliday: {
    backgroundColor: "#F7F8FA",
  },
  legendLabel: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#6B7280",
  },
  footerNote: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    textAlign: "center",
    marginTop: 16,
  },
});
