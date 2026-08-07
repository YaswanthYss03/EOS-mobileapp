import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/theme";
import { getChildTimetable } from "@/services/api/parents.api";
import type { MyTimetableDay, MyTimetableSlot } from "@/services/api/current-semester.api";
import { useParentChildren } from "./useParentChildren";
import { ChildSelector } from "./ChildSelector";

const DAY_SHORT = ["", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const DAY_FULL = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type LoadStatus = "loading" | "success" | "error";

function getCurrentWeekDates(): Date[] {
  const today = new Date();
  const todayDow = today.getDay();
  const diffToMonday = todayDow === 0 ? -6 : 1 - todayDow;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diffToMonday);
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function formatTime(hhmm: string): string {
  const [hourStr, minute] = hhmm.split(":");
  const hour = parseInt(hourStr, 10);
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${minute} ${period}`;
}

function nowHHMM(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function TimetableHeader({
  weekDates,
  selectedIndex,
  onSelectDay,
  onBack,
}: {
  weekDates: Date[];
  selectedIndex: number;
  onSelectDay: (index: number) => void;
  onBack: () => void;
}) {
  const insets = useSafeAreaInsets();
  const selectedDate = weekDates[selectedIndex];

  return (
    <LinearGradient
      colors={["#2F6FE0", "#1A3D8F"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.header, { paddingTop: insets.top + 10 }]}
    >
      <View style={styles.headerTopRow}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Timetable</Text>
          <Text style={styles.headerSubtitle}>
            {DAY_FULL[selectedIndex + 1]}, {selectedDate.getDate()} {MONTH_NAMES[selectedDate.getMonth()]}
          </Text>
        </View>
      </View>

      <View style={styles.daySelector}>
        {weekDates.map((date, index) => {
          const selected = index === selectedIndex;
          return (
            <TouchableOpacity
              key={index}
              style={[styles.dayPill, selected && styles.dayPillSelected]}
              onPress={() => onSelectDay(index)}
            >
              <Text style={[styles.dayPillLabel, selected && styles.dayPillLabelSelected]}>
                {DAY_SHORT[index + 1]}
              </Text>
              <Text style={[styles.dayPillDate, selected && styles.dayPillDateSelected]}>{date.getDate()}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </LinearGradient>
  );
}

// Same real GET /me/timetable data/UI as the shared TimetableScreen
// (student/faculty/hod), just scoped to the parent's selected child via
// GET /me/children/:studentId/timetable - see parents.api.ts.
export function ParentTimetableScreen() {
  const router = useRouter();
  const navigation = useNavigation();

  const { status: childrenStatus, error: childrenError, children, selectedChild, setSelectedChildId, reload: reloadChildren } =
    useParentChildren();

  const weekDates = useMemo(() => getCurrentWeekDates(), []);
  const todayDow = useMemo(() => new Date().getDay(), []);
  const defaultDayOfWeek = todayDow >= 1 && todayDow <= 6 ? todayDow : 1;
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState(defaultDayOfWeek);

  const [status, setStatus] = useState<LoadStatus>("loading");
  const [days, setDays] = useState<MyTimetableDay[]>([]);

  const load = useCallback((studentId: number) => {
    setStatus("loading");
    getChildTimetable(studentId)
      .then((response) => {
        setDays(response);
        setStatus("success");
      })
      .catch(() => setStatus("error"));
  }, []);

  useEffect(() => {
    if (selectedChild) load(selectedChild.id);
  }, [selectedChild, load]);

  const selectedIndex = selectedDayOfWeek - 1;

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({
        header: () => (
          <TimetableHeader
            weekDates={weekDates}
            selectedIndex={selectedIndex}
            onSelectDay={(index) => setSelectedDayOfWeek(index + 1)}
            onBack={() => router.back()}
          />
        ),
      });
      return () => {
        navigation.getParent()?.setOptions({ header: () => <CollegeHeader /> });
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [navigation, router, selectedIndex, weekDates]),
  );

  const slots = useMemo(
    () => days.find((d) => d.day_of_week === selectedDayOfWeek)?.slots ?? [],
    [days, selectedDayOfWeek],
  );

  const isToday = selectedDayOfWeek === todayDow;
  const currentTime = nowHHMM();

  const forenoon = slots.filter((s) => s.start_time < "13:00");
  const afternoon = slots.filter((s) => s.start_time >= "13:00");

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {childrenStatus === "loading" && (
          <View style={styles.inlineLoading}>
            <ActivityIndicator color="#2F6FE0" />
          </View>
        )}

        {childrenStatus === "error" && (
          <View style={styles.errorNotice}>
            <Ionicons name="alert-circle-outline" size={22} color="#DC2626" />
            <Text style={styles.errorNoticeText}>{childrenError ?? "Something went wrong."}</Text>
            <TouchableOpacity onPress={reloadChildren} style={styles.retryButton} activeOpacity={0.8}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {childrenStatus === "success" && children.length === 0 && (
          <View style={styles.errorNotice}>
            <Ionicons name="people-outline" size={22} color="#B0B7C3" />
            <Text style={styles.errorNoticeText}>No linked children found</Text>
          </View>
        )}

        {childrenStatus === "success" && selectedChild && (
          <>
            <ChildSelector children={children} selected={selectedChild} onSelect={(c) => setSelectedChildId(c.id)} />

            {status === "loading" && (
              <View style={styles.inlineLoading}>
                <ActivityIndicator color="#2F6FE0" />
              </View>
            )}

            {status === "error" && (
              <View style={styles.errorNotice}>
                <Ionicons name="alert-circle-outline" size={22} color="#DC2626" />
                <Text style={styles.errorNoticeText}>Couldn't load this child's timetable.</Text>
                <TouchableOpacity onPress={() => load(selectedChild.id)} style={styles.retryButton} activeOpacity={0.8}>
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}

            {status === "success" && (
              <>
                <View style={styles.statsRow}>
                  <SummaryCard label="Classes" value={String(slots.length)} />
                  <SummaryCard label="Free" value="—" />
                  <SummaryCard label="Labs" value="—" />
                </View>

                {forenoon.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Forenoon</Text>
                    {forenoon.map((period) => (
                      <PeriodCard
                        key={period.period_number}
                        period={period}
                        isNow={isToday && currentTime >= period.start_time && currentTime < period.end_time}
                      />
                    ))}
                  </View>
                )}

                {afternoon.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.sessionDividerRow}>
                      <View style={styles.sessionDivider} />
                      <View style={styles.sessionDivider} />
                    </View>
                    <Text style={styles.sectionTitle}>Afternoon</Text>
                    {afternoon.map((period) => (
                      <PeriodCard
                        key={period.period_number}
                        period={period}
                        isNow={isToday && currentTime >= period.start_time && currentTime < period.end_time}
                      />
                    ))}
                  </View>
                )}

                {slots.length === 0 && <Text style={styles.noClasses}>No classes scheduled today.</Text>}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryLabel}>{label.toUpperCase()}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function PeriodCard({ period, isNow }: { period: MyTimetableSlot; isNow: boolean }) {
  if (isNow) {
    return (
      <View style={[styles.periodCard, styles.periodCardNow]}>
        <View style={styles.periodTimeCol}>
          <Text style={styles.periodTimeNow}>{formatTime(period.start_time)}</Text>
          <Text style={styles.periodLabelNow}>P{period.period_number}</Text>
        </View>
        <View style={styles.periodInfo}>
          <Text style={styles.periodSubjectNow}>{period.subject.name}</Text>
          <Text style={styles.periodMetaNow}>{period.faculty.name}</Text>
        </View>
        <View style={styles.nowBadge}>
          <Text style={styles.nowBadgeText}>NOW</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.periodCard}>
      <View style={styles.accentBar} />
      <View style={styles.periodTimeCol}>
        <Text style={styles.periodTime}>{formatTime(period.start_time)}</Text>
        <Text style={styles.periodLabel}>P{period.period_number}</Text>
      </View>
      <View style={styles.periodInfo}>
        <Text style={styles.periodSubject}>{period.subject.name}</Text>
        <Text style={styles.periodMeta}>{period.faculty.name}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
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
  daySelector: {
    flexDirection: "row",
    gap: 6,
  },
  dayPill: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  dayPillSelected: {
    backgroundColor: "#fff",
  },
  dayPillLabel: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: "rgba(255,255,255,0.85)",
    letterSpacing: 0.5,
  },
  dayPillLabelSelected: {
    color: "#9AA6B2",
  },
  dayPillDate: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: "#fff",
    marginTop: 2,
  },
  dayPillDateSelected: {
    color: "#2F6FE0",
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
    gap: 10,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    paddingVertical: 14,
    paddingHorizontal: 10,
    gap: 6,
  },
  summaryLabel: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: "#9AA6B2",
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#8A93A3",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  sessionDividerRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 20,
  },
  sessionDivider: {
    flex: 1,
    height: 1,
    backgroundColor: "#EEF0F4",
  },
  periodCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    overflow: "hidden",
  },
  accentBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: "#2F6FE0",
  },
  periodTimeCol: {
    width: 52,
  },
  periodTime: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  periodLabel: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 1,
  },
  periodInfo: {
    flex: 1,
  },
  periodSubject: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  periodMeta: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#8A93A3",
    marginTop: 2,
  },
  periodCardNow: {
    backgroundColor: "#2F6FE0",
    borderColor: "#2F6FE0",
  },
  periodTimeNow: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  periodLabelNow: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#D7E2FA",
    marginTop: 1,
  },
  periodSubjectNow: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  periodMetaNow: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#D7E2FA",
    marginTop: 2,
  },
  nowBadge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  nowBadgeText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  noClasses: {
    fontFamily: fonts.regular,
    color: "#999",
    textAlign: "center",
    marginTop: 40,
  },
});
