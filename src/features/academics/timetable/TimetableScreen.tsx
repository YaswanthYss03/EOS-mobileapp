import { useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { mockTimetable, weekOrder, type Period } from "./data/mockTimetable";

// TODO: replace mockTimetable with a real call once the timetable backend endpoint exists
export function TimetableScreen() {
  const [view, setView] = useState<"today" | "full">("today");

  const todayName = weekOrder[(new Date().getDay() + 6) % 7];
  const todaySchedule = mockTimetable.find((d) => d.day === todayName);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader title="Timetable" />

      <View style={styles.toggleRow}>
        <Pressable style={[styles.toggle, view === "today" && styles.toggleActive]} onPress={() => setView("today")}>
          <Text style={[styles.toggleText, view === "today" && styles.toggleTextActive]}>Today</Text>
        </Pressable>
        <Pressable style={[styles.toggle, view === "full" && styles.toggleActive]} onPress={() => setView("full")}>
          <Text style={[styles.toggleText, view === "full" && styles.toggleTextActive]}>Full Timetable</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {view === "today" ? (
          todaySchedule ? (
            <View>
              <Text style={styles.dayTitle}>{todaySchedule.day}</Text>
              {todaySchedule.periods.map((period, i) => (
                <PeriodRow key={i} period={period} />
              ))}
            </View>
          ) : (
            <Text style={styles.noClasses}>No classes scheduled today.</Text>
          )
        ) : (
          mockTimetable.map((day) => (
            <View key={day.day} style={styles.daySection}>
              <Text style={styles.dayTitle}>{day.day}</Text>
              {day.periods.map((period, i) => (
                <PeriodRow key={i} period={period} />
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function PeriodRow({ period }: { period: Period }) {
  return (
    <View style={styles.periodRow}>
      <Text style={styles.periodTime}>{period.time}</Text>
      <View style={styles.periodInfo}>
        <Text style={styles.periodSubject}>{period.subject}</Text>
        <Text style={styles.periodMeta}>
          {period.faculty} · {period.room}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  toggleRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  toggle: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  toggleActive: {
    backgroundColor: "#1E3A8A",
    borderColor: "#1E3A8A",
  },
  toggleText: {
    fontSize: 13,
    color: "#333",
  },
  toggleTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  daySection: {
    marginBottom: 20,
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  periodRow: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f2f2f2",
  },
  periodTime: {
    width: 90,
    fontSize: 12,
    color: "#666",
  },
  periodInfo: {
    flex: 1,
  },
  periodSubject: {
    fontSize: 14,
    fontWeight: "600",
  },
  periodMeta: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  noClasses: {
    color: "#999",
    textAlign: "center",
    marginTop: 40,
  },
});
