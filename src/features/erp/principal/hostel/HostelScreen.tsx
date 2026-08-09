import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { getApiErrorMessage } from "@/services/api/client";
import {
  getPrincipalHostelOverview,
  type PrincipalHostelOverview,
  type PrincipalHostelBlock,
} from "@/services/api/principal-hostel.api";

function occupancyColor(pct: number | null): string {
  if (pct === null) return "#D1D5DB";
  if (pct >= 95) return "#DC2626";
  if (pct >= 80) return "#2F6FE0";
  return "#D97706";
}

export function HostelScreen() {
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

  const [overview, setOverview] = useState<PrincipalHostelOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getPrincipalHostelOverview()
      .then(setOverview)
      .catch((err) => setError(getApiErrorMessage(err, "Couldn't load the hostel overview.")))
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
          <Text style={styles.title}>Hostel</Text>
          <Text style={styles.subtitle}>
            {overview
              ? `${overview.block_count} blocks · ${overview.occupied.toLocaleString()} residents of ${overview.beds_sanctioned.toLocaleString()} beds`
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
                label="Occupied"
                value={overview.occupied.toLocaleString()}
                subtitle={overview.occupancy_pct !== null ? `${overview.occupancy_pct}% occupancy` : "—"}
              />
              <StatCard label="Vacant" value={overview.vacant.toLocaleString()} subtitle="beds available" />
            </View>

            <Text style={styles.sectionTitle}>Block-wise occupancy</Text>

            {overview.blocks.length === 0 && (
              <View style={styles.centerState}>
                <Text style={styles.centerStateText}>No hostel blocks found.</Text>
              </View>
            )}

            {overview.blocks.map((block) => (
              <BlockCard key={block.id} block={block} />
            ))}
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

function BlockCard({ block }: { block: PrincipalHostelBlock }) {
  const occupancyPct = block.beds_sanctioned > 0 ? Math.round((block.occupied / block.beds_sanctioned) * 1000) / 10 : null;

  return (
    <View style={styles.blockCard}>
      <Text style={styles.blockName}>
        Block {block.name} · {block.wing === "boys" ? "Boys" : "Girls"}
      </Text>
      <Text style={styles.wardenText}>{block.warden_name ? `${block.warden_name} · Warden` : "No warden assigned"}</Text>

      <View style={styles.occupancyRow}>
        <View style={styles.occupancyTrack}>
          <View
            style={[
              styles.occupancyFill,
              { width: `${Math.min(occupancyPct ?? 0, 100)}%`, backgroundColor: occupancyColor(occupancyPct) },
            ]}
          />
        </View>
        <Text style={styles.occupancyText}>
          {block.occupied} / {block.beds_sanctioned}
        </Text>
      </View>

      <View style={styles.blockStatsRow}>
        <BlockStat label="Vacant" value={block.vacant.toLocaleString()} />
      </View>
    </View>
  );
}

function BlockStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.blockStat}>
      <Text style={styles.blockStatLabel}>{label}</Text>
      <Text style={styles.blockStatValue}>{value}</Text>
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
  statsGrid: { flexDirection: "row", gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 14,
    gap: 4,
  },
  statLabel: { fontSize: 11, fontFamily: fonts.medium, color: "#8A93A3" },
  statValue: { fontSize: 24, fontFamily: fonts.bold, color: "#111827" },
  statSubtitle: { fontSize: 10, fontFamily: fonts.regular, color: "#9AA6B2" },
  sectionTitle: { fontSize: 14, fontFamily: fonts.bold, color: "#111827", marginBottom: 10 },
  blockCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 16,
    marginBottom: 12,
    gap: 10,
  },
  blockName: { fontSize: 14, fontFamily: fonts.bold, color: "#111827" },
  wardenText: { fontSize: 12, fontFamily: fonts.regular, color: "#8A93A3" },
  occupancyRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  occupancyTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: "#F1F3F6", overflow: "hidden" },
  occupancyFill: { height: 8, borderRadius: 4 },
  occupancyText: { fontSize: 12, fontFamily: fonts.semibold, color: "#4B5563" },
  blockStatsRow: { flexDirection: "row", gap: 16 },
  blockStat: { gap: 2 },
  blockStatLabel: { fontSize: 10, fontFamily: fonts.medium, color: "#9AA6B2" },
  blockStatValue: { fontSize: 13, fontFamily: fonts.bold, color: "#111827" },
});
