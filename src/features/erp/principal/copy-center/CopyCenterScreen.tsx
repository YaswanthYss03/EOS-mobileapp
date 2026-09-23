import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SkeletonStatCards, SkeletonListRows } from "@/components/ui/Skeleton";
import { fonts } from "@/theme";
import { getApiErrorMessage } from "@/services/api/client";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";
import {
  getStationaryDashboardStats,
  getStationaryUsageByDepartment,
  getStationaryRevenueReport,
  type StationaryDashboardStats,
  type StationaryDepartmentUsage,
  type StationaryRevenueReport,
} from "@/services/api/principal-stationary.api";

function formatMinutesAge(minutes: number | null): string {
  if (minutes === null) return "—";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function usageBarColor(pct: number): string {
  if (pct >= 66) return "#2F6FE0";
  if (pct >= 33) return "#5B93EA";
  return "#9CB8EF";
}

// Institution-wide Copy Center overview - Principal/Correspondent only (see
// AmenityHomeScreen/CorrespondentDashboard.tsx - this replaces the
// self-service Stationary ordering flow other roles use, same "overview
// dashboard" shape as this section's other tiles, e.g. HostelScreen.tsx).
export function CopyCenterScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      // No cleanup - see PrincipalStudentsScreen.tsx's comment.
      return undefined;
    }, [navigation]),
  );

  const [stats, setStats] = useState<StationaryDashboardStats | null>(null);
  const [usage, setUsage] = useState<StationaryDepartmentUsage[] | null>(null);
  const [revenue, setRevenue] = useState<StationaryRevenueReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([getStationaryDashboardStats(), getStationaryUsageByDepartment(), getStationaryRevenueReport()])
      .then(([statsRes, usageRes, revenueRes]) => {
        setStats(statsRes);
        setUsage(usageRes.departments);
        setRevenue(revenueRes);
      })
      .catch((err) => setError(getApiErrorMessage(err, "Couldn't load the Copy Center overview.")))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <WatermarkBackground />
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
          <Text style={styles.title}>Copy Center</Text>
          <Text style={styles.subtitle}>
            {stats ? `${stats.pending_count} pending · ${stats.completed_today} completed today` : "Loading…"}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading && (
          <>
            <SkeletonStatCards count={4} style={styles.statsSkeletonSpacing} />
            <SkeletonListRows count={4} />
          </>
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

        {!loading && !error && stats && revenue && (
          <>
            <View style={styles.statsGrid}>
              <StatCard label="Pending" value={stats.pending_count.toLocaleString()} subtitle={`oldest ${formatMinutesAge(stats.oldest_pending_minutes)}`} />
              <StatCard label="Completed today" value={stats.completed_today.toLocaleString()} subtitle="jobs" />
              <StatCard label="Pages today" value={stats.pages_printed_today.toLocaleString()} subtitle="printed" />
              <StatCard label="Collected today" value={`₹${stats.collected_today.toLocaleString()}`} subtitle="revenue" />
            </View>

            <View style={styles.revenueCard}>
              <Text style={styles.sectionTitle}>Revenue this month</Text>
              <Text style={styles.revenueTotal}>₹{revenue.collected_this_month.toLocaleString()}</Text>
              <Text style={styles.revenueSubtitle}>
                {revenue.jobs_today} job{revenue.jobs_today === 1 ? "" : "s"} today · avg ₹{revenue.avg_job_value.toLocaleString()}/job
              </Text>
            </View>

            <View style={styles.chartCard}>
              <Text style={styles.sectionTitle}>Department-wise usage</Text>

              {(!usage || usage.length === 0) && (
                <View style={styles.centerState}>
                  <Text style={styles.centerStateText}>No orders recorded this month.</Text>
                </View>
              )}

              {usage && usage.length > 0 && (() => {
                const maxAmount = Math.max(...usage.map((d) => d.amount), 1);
                return usage.map((dept) => {
                  const pct = (dept.amount / maxAmount) * 100;
                  return (
                    <View key={dept.department} style={styles.chartRow}>
                      <Text style={styles.chartLabel} numberOfLines={1}>
                        {dept.department}
                      </Text>
                      <View style={styles.chartTrack}>
                        <View
                          style={[
                            styles.chartFill,
                            { width: `${Math.max(pct, 4)}%`, backgroundColor: usageBarColor(pct) },
                          ]}
                        />
                      </View>
                      <Text style={styles.chartValue}>₹{dept.amount.toLocaleString()}</Text>
                    </View>
                  );
                });
              })()}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value, subtitle }: { label: string; value: string; subtitle: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
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
    paddingBottom: 14,
  },
  headerTextWrap: { flex: 1 },
  title: { fontSize: 18, fontFamily: fonts.bold, color: "#fff" },
  subtitle: { fontSize: 11, fontFamily: fonts.regular, color: "#D7E2FA", marginTop: 2 },
  content: { padding: 16, paddingBottom: 40 },
  centerState: { alignItems: "center", paddingVertical: 40, gap: 8 },
  centerStateText: { fontSize: 13, fontFamily: fonts.medium, color: "#9AA6B2", textAlign: "center", paddingHorizontal: 20 },
  retryText: { fontSize: 13, fontFamily: fonts.bold, color: "#2F6FE0", marginTop: 4 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  statsSkeletonSpacing: { marginBottom: 20 },
  statCard: {
    flexBasis: "47%",
    flexGrow: 1,
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
  sectionTitle: { fontSize: 14, fontFamily: fonts.bold, color: "#111827", marginBottom: 10 },
  revenueCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 16,
    marginBottom: 20,
    gap: 4,
  },
  revenueTotal: { fontSize: 24, fontFamily: fonts.bold, color: "#2F6FE0" },
  revenueSubtitle: { fontSize: 12, fontFamily: fonts.regular, color: "#8A93A3" },
  chartCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 16,
    gap: 12,
  },
  chartRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  chartLabel: { width: 84, fontSize: 11, fontFamily: fonts.semibold, color: "#4B5563" },
  chartTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F1F3F6",
    overflow: "hidden",
  },
  chartFill: { height: 8, borderRadius: 4 },
  chartValue: {
    width: 72,
    fontSize: 11,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
    textAlign: "right",
  },
});
