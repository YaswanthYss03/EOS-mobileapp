import { View, Text, FlatList, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { fonts } from "@/theme";
import { mockLessonPlans, type LessonPlanSubject } from "./data/mockLessonPlans";

// TODO: replace mockLessonPlans with a real call once the lesson-plan backend endpoint exists
export function LessonPlanScreen() {
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader title="Lesson Plan" />
      <FlatList
        data={mockLessonPlans}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <LessonPlanCard subject={item} />}
      />
    </SafeAreaView>
  );
}

function LessonPlanCard({ subject }: { subject: LessonPlanSubject }) {
  const progress = subject.unitsCompleted / subject.totalUnits;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.subject}>{subject.subject}</Text>
        <Text style={styles.units}>
          {subject.unitsCompleted}/{subject.totalUnits} units
        </Text>
      </View>
      <Text style={styles.faculty}>{subject.faculty}</Text>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <Text style={styles.lastTopic}>Last covered: {subject.lastTopic}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  list: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    padding: 14,
    marginBottom: 12,
    gap: 6,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  subject: {
    fontSize: 15,
    fontFamily: fonts.bold,
  },
  units: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#666",
  },
  faculty: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#888",
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#eee",
    overflow: "hidden",
    marginTop: 6,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#1E3A8A",
    borderRadius: 3,
  },
  lastTopic: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#444",
    marginTop: 4,
  },
});
