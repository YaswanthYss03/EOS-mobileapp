import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { getApiErrorMessage } from "@/services/api/client";
import { getPrincipalFinanceOverview, type PrincipalFinanceOverview } from "@/services/api/principal-finance.api";

function formatRupees(amount: number): string {
  if (amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(2)} Cr`;
  if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(2)} L`;
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function FinanceFeesScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

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

  const [overview, setOverview] = useState<PrincipalFinanceOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getPrincipalFinanceOverview()
      .then(setOverview)
      .catch((err) => setError(getApiErrorMessage(err, "Couldn't load finance & fees overview.")))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <LinearGradient
        colors={["#2F6FE0", "#1A3D8F"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>Finance & fees</Text>
          <Text style={styles.subtitle}>Oversight only · transaction-level accounting stays with the Finance office</Text>
        </View>
      </LinearGradient>

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
                label="Total collection"
                value={formatRupees(overview.total_collected)}
                subtitle={
                  overview.collected_pct_of_demand !== null ? `${overview.collected_pct_of_demand}% of demand` : "—"
                }
                subtitleTone="green"
              />
              <StatCard
                label="Outstanding dues"
                value={formatRupees(overview.outstanding_dues)}
                valueTone="red"
                subtitle={`${overview.students_with_dues.toLocaleString()} students`}
              />
              <StatCard
                label="Scholarships"
                value={formatRupees(overview.scholarship_total)}
                subtitle={`${overview.scholarship_beneficiaries.toLocaleString()} beneficiaries`}
              />
              <StatCard
                label="Total expenditure"
                value={formatRupees(overview.total_expenditure)}
                subtitle={`${overview.expenditure_category_count} categories · this year`}
              />
            </View>

            <View style={styles.tableCard}>
              <Text style={styles.tableTitle}>Collection by year of study</Text>

              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderCell, styles.colYear]}>YEAR</Text>
                <Text style={[styles.tableHeaderCell, styles.colNum]}>DEMAND</Text>
                <Text style={[styles.tableHeaderCell, styles.colNum]}>COLLECTED</Text>
                <Text style={[styles.tableHeaderCell, styles.colNum]}>PENDING</Text>
              </View>

              {overview.collection_by_year.length === 0 && (
                <View style={styles.centerState}>
                  <Text style={styles.centerStateText}>No fee demand data found.</Text>
                </View>
              )}

              {overview.collection_by_year.map((row) => (
                <View key={row.year} style={styles.tableRow}>
                  <Text style={[styles.tableCellStrong, styles.colYear]}>{row.label}</Text>
                  <Text style={[styles.tableCell, styles.colNum]}>{formatRupees(row.demand)}</Text>
                  <Text style={[styles.tableCell, styles.colNum]}>{formatRupees(row.collected)}</Text>
                  <Text style={[styles.tableCell, styles.colNum, row.pending > 0 ? styles.tableCellDanger : null]}>
                    {formatRupees(row.pending)}
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
  subtitleTone?: "green";
}) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, valueTone === "red" ? { color: "#C0392B" } : null]}>{value}</Text>
      <Text style={[styles.statSubtitle, subtitleTone === "green" ? { color: "#3FA66B" } : null]}>{subtitle}</Text>
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
    paddingBottom: 14,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
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
  statValue: { fontSize: 20, fontFamily: fonts.bold, color: "#111827" },
  statSubtitle: { fontSize: 10, fontFamily: fonts.regular, color: "#9AA6B2" },
  tableCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 16,
    marginBottom: 16,
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
  colYear: { flex: 1.2 },
  colNum: { flex: 1, textAlign: "right" },
});
