import { useCallback, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/theme";
import { getStudentLessonPlan, type LmsLessonSession } from "@/services/api/lms.api";

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function DateBadge({ isoDate }: { isoDate: string }) {
  const d = new Date(isoDate);
  return (
    <View style={styles.dateBadge}>
      <Text style={styles.dateDay}>{d.getDate()}</Text>
      <Text style={styles.dateMonth}>{MONTHS[d.getMonth()]}</Text>
    </View>
  );
}

export function StudentLessonPlanTab({ subjectId }: { subjectId: number }) {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [sessions, setSessions] = useState<LmsLessonSession[]>([]);

  const load = useCallback(() => {
    setStatus("loading");
    getStudentLessonPlan(subjectId)
      .then((data) => {
        setSessions(data.sessions);
        setStatus("success");
      })
      .catch(() => setStatus("error"));
  }, [subjectId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (status === "loading") {
    return (
      <View style={styles.centerFill}>
        <ActivityIndicator color="#2F6FE0" />
      </View>
    );
  }

  if (status === "error") {
    return (
      <View style={styles.centerFill}>
        <Text style={styles.errorText}>Couldn't load the lesson plan.</Text>
        <TouchableOpacity onPress={load} style={styles.retryButton} activeOpacity={0.8}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const coveredCount = sessions.filter((s) => s.is_covered).length;

  return (
    <FlatList
      data={sessions}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        sessions.length > 0 ? (
          <View style={styles.progressCard}>
            <View style={styles.progressTextRow}>
              <Text style={styles.progressTitle}>Syllabus progress</Text>
              <Text style={styles.progressCount}>
                {coveredCount}/{sessions.length}
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${sessions.length ? (coveredCount / sessions.length) * 100 : 0}%` },
                ]}
              />
            </View>
          </View>
        ) : null
      }
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={30} color="#C7CDD8" />
          <Text style={styles.emptyText}>No lesson plan published yet</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.row}>
          <DateBadge isoDate={item.session_date} />
          <View style={styles.textWrap}>
            <Text style={styles.title}>{item.topic}</Text>
            {item.unit_title && <Text style={styles.meta}>{item.unit_title}</Text>}
          </View>
          <View style={[styles.badge, item.is_covered ? styles.badgeCovered : styles.badgePending]}>
            <Text style={[styles.badgeText, item.is_covered ? styles.badgeTextCovered : styles.badgeTextPending]}>
              {item.is_covered ? "Covered" : "Pending"}
            </Text>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  centerFill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  errorText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#6B7280",
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#2F6FE0",
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: fonts.semibold,
  },
  list: {
    padding: 16,
    paddingTop: 8,
  },
  progressCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 14,
    marginBottom: 14,
  },
  progressTextRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  progressTitle: {
    fontSize: 12.5,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  progressCount: {
    fontSize: 12.5,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  progressTrack: {
    height: 7,
    borderRadius: 999,
    backgroundColor: "#EEF0F4",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#2F6FE0",
  },
  emptyState: {
    alignItems: "center",
    gap: 10,
    marginTop: 48,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 14,
    marginBottom: 10,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  dateBadge: {
    width: 44,
    alignItems: "center",
  },
  dateDay: {
    fontSize: 17,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  dateMonth: {
    fontSize: 10,
    fontFamily: fonts.semibold,
    color: "#9AA6B2",
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  meta: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  badgeCovered: { backgroundColor: "#DCFCE7" },
  badgePending: { backgroundColor: "#E4EBFB" },
  badgeText: { fontSize: 11, fontFamily: fonts.bold },
  badgeTextCovered: { color: "#166534" },
  badgeTextPending: { color: "#2F6FE0" },
});
