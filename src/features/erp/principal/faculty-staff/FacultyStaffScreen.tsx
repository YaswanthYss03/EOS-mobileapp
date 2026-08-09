import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { formatDate } from "@/utils/calendar";
import { getApiErrorMessage } from "@/services/api/client";
import {
  getPrincipalFacultyOverview,
  type PrincipalFacultyOverview,
} from "@/services/api/principal-faculty.api";

function formatRupees(amount: number): string {
  if (amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(2)} Cr`;
  if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(2)} L`;
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function FacultyStaffScreen() {
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

  const [overview, setOverview] = useState<PrincipalFacultyOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getPrincipalFacultyOverview()
      .then(setOverview)
      .catch((err) => setError(getApiErrorMessage(err, "Couldn't load faculty & staff overview.")))
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
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>Faculty & staff</Text>
          <Text style={styles.subtitle}>
            {overview
              ? `${overview.total_employees.toLocaleString()} employees · ${overview.teaching_count.toLocaleString()} teaching, ${overview.non_teaching_count.toLocaleString()} non-teaching`
              : "Loading…"}
          </Text>
        </View>
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
                icon="checkmark-circle-outline"
                value={overview.present_today.toLocaleString()}
                label="Present today"
                subtitle={`${overview.on_leave_today} on approved leave`}
              />
              <StatCard
                icon="briefcase-outline"
                value={overview.on_duty_today.toLocaleString()}
                label="On duty today"
                subtitle="out on official duty"
              />
              <StatCard
                icon="ribbon-outline"
                value={`${overview.appraisals_closed} / ${overview.appraisals_total}`}
                label="Appraisals closed"
                subtitle={overview.appraisal_academic_year ? `cycle ${overview.appraisal_academic_year}` : "No cycle yet"}
                tone="amber"
              />
              <StatCard
                icon="cash-outline"
                value={formatRupees(overview.payroll_amount)}
                label="Payroll this month"
                subtitle={
                  overview.payroll_disbursed_at
                    ? `disbursed ${formatDate(new Date(overview.payroll_disbursed_at))}`
                    : "Not yet disbursed"
                }
              />
            </View>

            <View style={styles.tableCard}>
              <Text style={styles.tableTitle}>Department-wise strength</Text>

              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderCell, styles.colDept]}>DEPARTMENT</Text>
                <Text style={[styles.tableHeaderCell, styles.colNum]}>TEACHING</Text>
                <Text style={[styles.tableHeaderCell, styles.colNum]}>SUPPORT</Text>
                <Text style={[styles.tableHeaderCell, styles.colNum]}>ATTENDANCE</Text>
              </View>

              {overview.departments.length === 0 && (
                <View style={styles.centerState}>
                  <Text style={styles.centerStateText}>No department staffing found.</Text>
                </View>
              )}

              {overview.departments.map((dept) => (
                <View key={dept.code} style={styles.tableRow}>
                  <Text style={[styles.tableCellStrong, styles.colDept]}>{dept.code}</Text>
                  <Text style={[styles.tableCell, styles.colNum]}>{dept.teaching}</Text>
                  <Text style={[styles.tableCell, styles.colNum]}>{dept.support}</Text>
                  <Text style={[styles.tableCell, styles.colNum]}>
                    {dept.attendance_pct !== null ? `${dept.attendance_pct}%` : "—"}
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
  icon,
  value,
  label,
  subtitle,
  tone,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  subtitle: string;
  tone?: "amber";
}) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, tone === "amber" ? { color: "#B7791F" } : null]}>{value}</Text>
      <Text style={styles.statSubtitle}>{subtitle}</Text>
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
  headerTextWrap: { flex: 1 },
  title: { fontSize: 18, fontFamily: fonts.bold, color: "#fff" },
  subtitle: { fontSize: 11, fontFamily: fonts.regular, color: "#D7E2FA", marginTop: 2 },
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
  tableHeaderCell: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: "#9AA6B2",
    letterSpacing: 0.4,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F6F8",
  },
  tableCellStrong: { fontSize: 13, fontFamily: fonts.bold, color: "#111827" },
  tableCell: { fontSize: 13, fontFamily: fonts.regular, color: "#4B5563" },
  colDept: { flex: 1.2 },
  colNum: { flex: 1, textAlign: "right" },
});
