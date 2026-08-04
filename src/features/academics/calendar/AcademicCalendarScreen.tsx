import { useCallback, useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { mockEvents, categoryStyle, type CalendarEvent } from "./data/mockEvents";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

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

function AcademicCalendarHeader({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();

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
        <Text style={styles.headerSubtitle}>Semester VI · Jun – Nov 2026</Text>
      </View>
    </LinearGradient>
  );
}

// TODO: view-only - replace mockEvents with a real call once the academics backend endpoint exists
export function AcademicCalendarScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const [viewYear, setViewYear] = useState(2026);
  const [viewMonth, setViewMonth] = useState(7);

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({
        header: () => <AcademicCalendarHeader onBack={() => router.back()} />,
      });
      return () => {
        navigation.getParent()?.setOptions({ header: () => <CollegeHeader /> });
      };
    }, [navigation, router]),
  );

  const weeks = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  const eventsThisMonth = useMemo(
    () =>
      mockEvents
        .filter((e) => e.month === viewMonth && e.year === viewYear)
        .sort((a, b) => a.day - b.day),
    [viewMonth, viewYear],
  );
  const eventDays = useMemo(() => new Set(eventsThisMonth.map((e) => e.day)), [eventsThisMonth]);

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
          <EventCard key={event.id} event={event} monthShort={MONTH_NAMES[event.month].slice(0, 3).toUpperCase()} />
        ))}
        {eventsThisMonth.length === 0 && <Text style={styles.noEvents}>No events this month.</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

function EventCard({ event, monthShort }: { event: CalendarEvent; monthShort: string }) {
  const { bg, text } = categoryStyle[event.category];

  return (
    <View style={styles.eventCard}>
      <View style={styles.eventDateCol}>
        <Text style={styles.eventDay}>{event.day}</Text>
        <Text style={styles.eventMonth}>{monthShort}</Text>
      </View>
      <View style={styles.eventInfo}>
        <Text style={styles.eventTitle}>{event.title}</Text>
        <Text style={styles.eventWeekday}>{event.weekday}</Text>
      </View>
      <View style={[styles.eventBadge, { backgroundColor: bg }]}>
        <Text style={[styles.eventBadgeText, { color: text }]}>{event.label}</Text>
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
