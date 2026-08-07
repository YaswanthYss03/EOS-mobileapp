import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { getChildAcademicCalendar } from "@/services/api/parents.api";
import type { CalendarEventType, MyAcademicCalendar, MyCalendarEvent } from "@/services/api/academic-calendar.api";
import { useParentChildren } from "./useParentChildren";
import { ChildSelector } from "./ChildSelector";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const WEEKDAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// calendar_event_type_enum only has these two real values - no "review"/"exam".
const categoryStyle: Record<CalendarEventType, { bg: string; text: string; label: string }> = {
  holiday: { bg: "#E7F7EF", text: "#1E8A5A", label: "Holiday" },
  event: { bg: "#EAF0FD", text: "#2F6FE0", label: "Event" },
};

type LoadStatus = "loading" | "success" | "error";

function buildMonthGrid(year: number, month: number) {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

function formatShortMonthYear(dateOnly: string): string {
  const date = new Date(dateOnly);
  return `${MONTH_NAMES[date.getMonth()].slice(0, 3)} ${date.getFullYear()}`;
}

function AcademicCalendarHeader({ onBack, calendar }: { onBack: () => void; calendar: MyAcademicCalendar | null }) {
  const insets = useSafeAreaInsets();
  const range =
    calendar?.start_date && calendar?.end_date
      ? `${formatShortMonthYear(calendar.start_date)} – ${formatShortMonthYear(calendar.end_date)}`
      : null;
  const subtitle =
    calendar?.semester !== null && calendar?.semester !== undefined
      ? `Semester ${calendar.semester}${range ? ` · ${range}` : ""}`
      : range ?? "Academic calendar";

  return (
    <LinearGradient
      colors={["#2F6FE0", "#1A3D8F"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.header, { paddingTop: insets.top + 10 }]}
    >
      <TouchableOpacity
        onPress={onBack}
        style={styles.backButton}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="arrow-back" size={20} color="#fff" />
      </TouchableOpacity>
      <View>
        <Text style={styles.headerTitle}>Academic Calendar</Text>
        <Text style={styles.headerSubtitle}>{subtitle}</Text>
      </View>
    </LinearGradient>
  );
}

// Same real GET /me/academic-calendar data/UI as the shared
// AcademicCalendarScreen (student/faculty/hod), just scoped to the parent's
// selected child via GET /me/children/:studentId/academic-calendar - see
// parents.api.ts. Only "holiday"/"event" types exist in the schema - there
// is no "review"/"exam" category to show.
export function ParentCalendarScreen() {
  const router = useRouter();
  const navigation = useNavigation();

  const { status: childrenStatus, error: childrenError, children, selectedChild, setSelectedChildId, reload: reloadChildren } =
    useParentChildren();

  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const [status, setStatus] = useState<LoadStatus>("loading");
  const [calendar, setCalendar] = useState<MyAcademicCalendar | null>(null);

  const load = useCallback((studentId: number) => {
    setStatus("loading");
    getChildAcademicCalendar(studentId)
      .then((response) => {
        setCalendar(response);
        setStatus("success");
      })
      .catch(() => setStatus("error"));
  }, []);

  useEffect(() => {
    if (selectedChild) load(selectedChild.id);
  }, [selectedChild, load]);

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({
        header: () => <AcademicCalendarHeader onBack={() => router.back()} calendar={calendar} />,
      });
      return () => {
        navigation.getParent()?.setOptions({ header: () => <CollegeHeader /> });
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [navigation, router, calendar]),
  );

  const weeks = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  const eventsThisMonth = useMemo(() => {
    if (!calendar) return [];
    return calendar.events
      .filter((e) => {
        const d = new Date(e.event_date);
        return d.getMonth() === viewMonth && d.getFullYear() === viewYear;
      })
      .sort((a, b) => a.event_date.localeCompare(b.event_date));
  }, [calendar, viewMonth, viewYear]);

  const eventDays = useMemo(
    () => new Set(eventsThisMonth.map((e) => new Date(e.event_date).getDate())),
    [eventsThisMonth],
  );

  function goToMonth(delta: number) {
    let month = viewMonth + delta;
    let year = viewYear;
    if (month < 0) {
      month = 11;
      year -= 1;
    } else if (month > 11) {
      month = 0;
      year += 1;
    }
    setViewMonth(month);
    setViewYear(year);
  }

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
                <Text style={styles.errorNoticeText}>Couldn't load this child's academic calendar.</Text>
                <TouchableOpacity onPress={() => load(selectedChild.id)} style={styles.retryButton} activeOpacity={0.8}>
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}

            {status === "success" && (
              <>
                <View style={styles.calendarCard}>
                  <View style={styles.monthNavRow}>
                    <TouchableOpacity style={styles.navButton} onPress={() => goToMonth(-1)}>
                      <Ionicons name="chevron-back" size={18} color="#2F6FE0" />
                    </TouchableOpacity>
                    <View style={styles.monthNavCenter}>
                      <Text style={styles.monthTitle}>
                        {MONTH_NAMES[viewMonth]} {viewYear}
                      </Text>
                      <Text style={styles.eventCount}>{eventsThisMonth.length} EVENTS</Text>
                    </View>
                    <TouchableOpacity style={styles.navButton} onPress={() => goToMonth(1)}>
                      <Ionicons name="chevron-forward" size={18} color="#2F6FE0" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.weekdayRow}>
                    {WEEKDAY_LABELS.map((label, i) => (
                      <Text key={`${label}-${i}`} style={styles.weekdayLabel}>
                        {label}
                      </Text>
                    ))}
                  </View>

                  {weeks.map((week, i) => (
                    <View key={i} style={styles.weekRow}>
                      {week.map((day, j) => (
                        <View key={j} style={styles.dayCell}>
                          {day !== null && (
                            <View style={[styles.dayCellInner, eventDays.has(day) && styles.dayCellHighlighted]}>
                              <Text style={[styles.dayNumber, eventDays.has(day) && styles.dayNumberHighlighted]}>
                                {day}
                              </Text>
                              {eventDays.has(day) && <View style={styles.dayDot} />}
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  ))}
                </View>

                <Text style={styles.sectionTitle}>This month</Text>
                {eventsThisMonth.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
                {eventsThisMonth.length === 0 && <Text style={styles.noEvents}>No events this month.</Text>}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function EventCard({ event }: { event: MyCalendarEvent }) {
  const { bg, text, label } = categoryStyle[event.event_type];
  const date = new Date(event.event_date);

  return (
    <View style={styles.eventCard}>
      <View style={styles.eventDateCol}>
        <Text style={styles.eventDay}>{date.getDate()}</Text>
        <Text style={styles.eventMonth}>{MONTH_NAMES[date.getMonth()].slice(0, 3).toUpperCase()}</Text>
      </View>
      <View style={styles.eventInfo}>
        <Text style={styles.eventTitle}>{event.title}</Text>
        <Text style={styles.eventWeekday}>{WEEKDAY_FULL[date.getDay()]}</Text>
      </View>
      <View style={[styles.eventBadge, { backgroundColor: bg }]}>
        <Text style={[styles.eventBadgeText, { color: text }]}>{label}</Text>
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
  calendarCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 16,
    marginBottom: 20,
  },
  monthNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  monthNavCenter: {
    alignItems: "center",
  },
  monthTitle: {
    fontSize: 17,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  eventCount: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: "#9AA6B2",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  weekdayRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#B0B7C3",
  },
  weekRow: {
    flexDirection: "row",
  },
  dayCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 4,
  },
  dayCellInner: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  dayCellHighlighted: {
    backgroundColor: "#EAF0FD",
  },
  dayNumber: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: "#111827",
  },
  dayNumberHighlighted: {
    fontFamily: fonts.bold,
    color: "#1A3D8F",
  },
  dayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#2F6FE0",
    position: "absolute",
    bottom: 5,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#8A93A3",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  eventCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 14,
    marginBottom: 12,
  },
  eventDateCol: {
    width: 40,
    alignItems: "center",
  },
  eventDay: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  eventMonth: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: "#9AA6B2",
    letterSpacing: 0.5,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  eventWeekday: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#8A93A3",
    marginTop: 2,
  },
  eventBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  eventBadgeText: {
    fontSize: 12,
    fontFamily: fonts.bold,
  },
  noEvents: {
    fontFamily: fonts.regular,
    color: "#999",
    textAlign: "center",
    marginTop: 24,
  },
});
