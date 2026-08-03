import { View, Text, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatCard } from "./components/StatCard";
import { QuickAccessGrid } from "./components/QuickAccessGrid";
import { studentDashboard } from "./data/mockDashboard";

// TODO: replace studentDashboard mock with a real call once ERP backend endpoints exist
export function StudentDashboard() {
  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Dashboard</Text>

        <View style={styles.statsRow}>
          <StatCard
            label="Attendance"
            value={`${studentDashboard.attendancePercent}%`}
            icon="checkmark-circle-outline"
            color="#1E8A5A"
          />
          <StatCard label="CGPA" value={studentDashboard.cgpa.toFixed(2)} icon="school-outline" color="#1E3A8A" />
        </View>

        <Text style={styles.sectionTitle}>Quick Access</Text>
        <QuickAccessGrid />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    padding: 16,
    gap: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
  },
});
