import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { getApiErrorMessage } from "@/services/api/client";
import { getPrincipalExamsOverview, type PrincipalExamsOverview } from "@/services/api/principal-exams.api";

export function ExamsResultsScreen() {
  const router = useRouter();
  const navigation = useNavigation();

  // This screen renders its own header below, so hide the shared
  // CollegeHeader (logo/college name) while it's focused.
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return () => {
        navigation.getParent()?.setOptions({ headerShown: true, header: () => <CollegeHeader /> });
      };
    }, [navigation]),
  );

  const [overview, setOverview] = useState<PrincipalExamsOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getPrincipalExamsOverview()
      .then(setOverview)
      .catch((err) => setError(getApiErrorMessage(err, "Couldn't load exams & results overview.")))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.title}>Exams & Results</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading && (
          <View style={styles.inlineLoading}>
            <ActivityIndicator color="#2F6FE0" />
          </View>
        )}

        {!loading && error && (
          <View style={styles.centerState}>
            <Ionicons name="cloud-offline-outline" size={28} color="#B0B7C3" />
            <Text style={styles.centerStateText}>{error}</Text>
            <Pressable onPress={load}>
              <Text style={styles.retryText}>Tap to retry</Text>
            </Pressable>
          </View>
        )}

        {!loading && !error && overview && (
          <>
            <View style={styles.statsGrid}>
              <StatCard
                label="Pass percentage"
                value={overview.pass_percentage !== null ? `${overview.pass_percentage}%` : "—"}
                subtitle={
                  overview.pass_percentage_delta !== null
                    ? `${overview.pass_percentage_delta > 0 ? "+" : ""}${overview.pass_percentage_delta} vs last sem`
                    : "No prior semester yet"
                }
                subtitleTone={
                  overview.pass_percentage_delta === null ? undefined : overview.pass_percentage_delta >= 0 ? "green" : "red"
                }
              />
              <StatCard
                label="Students with arrears"
                value={overview.students_with_arrears.toLocaleString()}
                valueTone="red"
                subtitle={`${overview.arrear_papers.toLocaleString()} arrear papers`}
              />
              <StatCard
                label="CGPA above 8.5"
                value={overview.high_cgpa_count.toLocaleString()}
                subtitle={overview.high_cgpa_pct !== null ? `${overview.high_cgpa_pct}% of students` : "—"}
              />
              <StatCard
                label="Revaluation requests"
                value={overview.revaluation_total.toLocaleString()}
                subtitle={`${overview.revaluation_pending.toLocaleString()} pending review`}
              />
            </View>

            <View style={styles.tableCard}>
              <Text style={styles.tableTitle}>Department-wise results</Text>

              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderCell, styles.colDept]}>DEPARTMENT</Text>
                <Text style={[styles.tableHeaderCell, styles.colNum]}>PASS %</Text>
                <Text style={[styles.tableHeaderCell, styles.colNum]}>ARREARS</Text>
                <Text style={[styles.tableHeaderCell, styles.colNum]}>TOPPER CGPA</Text>
              </View>

              {overview.departments.length === 0 && (
                <View style={styles.centerState}>
                  <Text style={styles.centerStateText}>No exam results found.</Text>
                </View>
              )}

              {overview.departments.map((dept) => (
                <View key={dept.code} style={styles.tableRow}>
                  <Text style={[styles.tableCellStrong, styles.colDept]}>{dept.code}</Text>
                  <Text style={[styles.tableCell, styles.colNum]}>
                    {dept.pass_pct !== null ? `${dept.pass_pct}%` : "—"}
                  </Text>
                  <Text style={[styles.tableCell, styles.colNum, dept.arrear_papers > 200 ? styles.tableCellDanger : null]}>
                    {dept.arrear_papers.toLocaleString()}
                  </Text>
                  <Text style={[styles.tableCell, styles.colNum]}>
                    {dept.topper_cgpa !== null ? dept.topper_cgpa.toFixed(2) : "—"}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  label,
  value,
  subtitle,
  valueTone,
  subtitleTone,
}: {
  label: string;
  value: string;
  subtitle: string;
  valueTone?: "red";
  subtitleTone?: "green" | "red";
}) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, valueTone === "red" ? { color: "#C0392B" } : null]}>{value}</Text>
      <Text
        style={[
          styles.statSubtitle,
          subtitleTone === "green" ? { color: "#3FA66B" } : subtitleTone === "red" ? { color: "#C0392B" } : null,
        ]}
      >
        {subtitle}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8FA" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#2F6FE0",
  },
  title: { fontSize: 18, fontFamily: fonts.bold, color: "#fff" },
  content: { padding: 16, paddingBottom: 40 },
  inlineLoading: { paddingVertical: 40, alignItems: "center" },
  centerState: { alignItems: "center", paddingVertical: 40, gap: 8 },
  centerStateText: { fontSize: 13, fontFamily: fonts.medium, color: "#9AA6B2", textAlign: "center", paddingHorizontal: 20 },
  retryText: { fontSize: 13, fontFamily: fonts.bold, color: "#2F6FE0", marginTop: 4 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  statCard: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 14,
    gap: 4,
  },
  statLabel: { fontSize: 11, fontFamily: fonts.medium, color: "#8A93A3" },
  statValue: { fontSize: 22, fontFamily: fonts.bold, color: "#111827" },
  statSubtitle: { fontSize: 10, fontFamily: fonts.regular, color: "#9AA6B2" },
  tableCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 16,
  },
  tableTitle: { fontSize: 15, fontFamily: fonts.bold, color: "#111827", marginBottom: 14 },
  tableHeaderRow: {
    flexDirection: "row",
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F6",
  },
  tableHeaderCell: { fontSize: 10, fontFamily: fonts.bold, color: "#9AA6B2", letterSpacing: 0.4 },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F6F8",
  },
  tableCellStrong: { fontSize: 13, fontFamily: fonts.bold, color: "#111827" },
  tableCell: { fontSize: 13, fontFamily: fonts.regular, color: "#4B5563" },
  tableCellDanger: { color: "#C0392B", fontFamily: fonts.bold },
  colDept: { flex: 1.2 },
  colNum: { flex: 1, textAlign: "right" },
});
