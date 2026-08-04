import { useCallback, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/theme";
import { mockTimetable, monthLabel, type DaySchedule, type Period } from "./data/mockTimetable";

function TimetableHeader({
  day,
  selectedIndex,
  onSelectDay,
  onBack,
}: {
  day: DaySchedule;
  selectedIndex: number;
  onSelectDay: (index: number) => void;
  onBack: () => void;
}) {
  const insets = useSafeAreaInsets();

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
            {day.dayFull}, {day.date} {monthLabel}
          </Text>
        </View>
      </View>

      <View style={styles.daySelector}>
        {mockTimetable.map((d, index) => {
          const selected = index === selectedIndex;
          return (
            <TouchableOpacity
              key={d.dayShort}
              style={[styles.dayPill, selected && styles.dayPillSelected]}
              onPress={() => onSelectDay(index)}
            >
              <Text style={[styles.dayPillLabel, selected && styles.dayPillLabelSelected]}>{d.dayShort}</Text>
              <Text style={[styles.dayPillDate, selected && styles.dayPillDateSelected]}>{d.date}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </LinearGradient>
  );
}

// TODO: replace mockTimetable with a real call once the timetable backend endpoint exists
export function TimetableScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const day = mockTimetable[selectedIndex];

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({
        header: () => (
          <TimetableHeader
            day={day}
            selectedIndex={selectedIndex}
            onSelectDay={setSelectedIndex}
            onBack={() => router.back()}
          />
        ),
      });
      return () => {
        navigation.getParent()?.setOptions({ header: () => <CollegeHeader /> });
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [navigation, router, selectedIndex]),
  );

  const classes = day.periods.filter((p) => p.type === "class").length;
  const free = day.periods.filter((p) => p.type === "free").length;
  const labs = day.periods.filter((p) => p.type === "lab").length;

  const forenoon = day.periods.filter((p) => p.session === "forenoon");
  const afternoon = day.periods.filter((p) => p.session === "afternoon");

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statsRow}>
          <SummaryCard label="Classes" value={classes} />
          <SummaryCard label="Free" value={free} />
          <SummaryCard label="Labs" value={labs} />
        </View>

        {forenoon.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Forenoon</Text>
            {forenoon.map((period) => (
              <PeriodCard key={period.periodLabel} period={period} />
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
              <PeriodCard key={period.periodLabel} period={period} />
            ))}
          </View>
        )}

        {day.periods.length === 0 && <Text style={styles.noClasses}>No classes scheduled today.</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryLabel}>{label.toUpperCase()}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function PeriodCard({ period }: { period: Period }) {
  if (period.isNow) {
    return (
      <View style={[styles.periodCard, styles.periodCardNow]}>
        <View style={styles.periodTimeCol}>
          <Text style={styles.periodTimeNow}>{period.time}</Text>
          <Text style={styles.periodLabelNow}>{period.periodLabel}</Text>
        </View>
        <View style={styles.periodInfo}>
          <Text style={styles.periodSubjectNow}>{period.subject}</Text>
          <Text style={styles.periodMetaNow}>{period.section}</Text>
        </View>
        <View style={styles.nowBadge}>
          <Text style={styles.nowBadgeText}>NOW</Text>
        </View>
      </View>
    );
  }

  if (period.type === "free") {
    return (
      <View style={[styles.periodCard, styles.periodCardFree]}>
        <View style={[styles.accentBar, styles.accentBarFree]} />
        <View style={styles.periodTimeCol}>
          <Text style={styles.periodTimeFree}>{period.time}</Text>
          <Text style={styles.periodLabelFree}>{period.periodLabel}</Text>
        </View>
        <View style={styles.periodInfo}>
          <Text style={styles.periodSubjectFree}>{period.subject}</Text>
          <Text style={styles.periodMetaFree}>{period.section}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.periodCard}>
      <View style={styles.accentBar} />
      <View style={styles.periodTimeCol}>
        <Text style={styles.periodTime}>{period.time}</Text>
        <Text style={styles.periodLabel}>{period.periodLabel}</Text>
      </View>
      <View style={styles.periodInfo}>
        <Text style={styles.periodSubject}>{period.subject}</Text>
        <Text style={styles.periodMeta}>{period.section}</Text>
      </View>
      {period.room && (
        <View style={styles.roomBadge}>
          <Text style={styles.roomBadgeText}>{period.room}</Text>
        </View>
      )}
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
  accentBarFree: {
    backgroundColor: "#D5D9E0",
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
  roomBadge: {
    backgroundColor: "#EAF0FD",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  roomBadgeText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  periodCardFree: {
    backgroundColor: "#FAFBFC",
  },
  periodTimeFree: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#B0B7C3",
  },
  periodLabelFree: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#C4CAD3",
    marginTop: 1,
  },
  periodSubjectFree: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#B0B7C3",
  },
  periodMetaFree: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#C4CAD3",
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
