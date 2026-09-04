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
import {
  getPrincipalLibraryOverview,
  type PrincipalLibraryOverview,
  type PrincipalLibraryCategory,
} from "@/services/api/principal-library.api";

function utilizationColor(pct: number | null): string {
  if (pct === null) return "#D1D5DB";
  if (pct >= 80) return "#DC2626";
  if (pct >= 40) return "#D97706";
  return "#2F6FE0";
}

export function LibraryScreen() {
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

  const [overview, setOverview] = useState<PrincipalLibraryOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getPrincipalLibraryOverview()
      .then(setOverview)
      .catch((err) => setError(getApiErrorMessage(err, "Couldn't load the library overview.")))
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
          <Text style={styles.title}>Library</Text>
          <Text style={styles.subtitle}>
            {overview
              ? `${overview.categories.length} categories · ${overview.total_books.toLocaleString()} books in collection`
              : "Loading…"}
          </Text>
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
              <StatCard label="Total books" value={overview.total_books.toLocaleString()} subtitle="across all categories" />
              <StatCard
                label="Borrowed books"
                value={overview.borrowed_books.toLocaleString()}
                subtitle={overview.overdue_books > 0 ? `${overview.overdue_books} overdue` : "none overdue"}
                subtitleTone={overview.overdue_books > 0 ? "red" : "green"}
              />
            </View>

            <Text style={styles.sectionTitle}>Category-wise collection</Text>

            {overview.categories.length === 0 && (
              <View style={styles.centerState}>
                <Text style={styles.centerStateText}>No books catalogued yet.</Text>
              </View>
            )}

            {overview.categories.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
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
  subtitleTone,
}: {
  label: string;
  value: string;
  subtitle: string;
  subtitleTone?: "green" | "red";
}) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text
        style={[
          styles.statSubtitle,
          subtitleTone === "green" ? { color: "#3FA66B" } : subtitleTone === "red" ? { color: "#DC2626" } : null,
        ]}
      >
        {subtitle}
      </Text>
    </View>
  );
}

function CategoryCard({ category }: { category: PrincipalLibraryCategory }) {
  const utilizationPct = category.total_copies > 0 ? Math.round((category.borrowed / category.total_copies) * 1000) / 10 : null;

  return (
    <View style={styles.categoryCard}>
      <Text style={styles.categoryName}>{category.name}</Text>

      <View style={styles.utilizationRow}>
        <View style={styles.utilizationTrack}>
          <View
            style={[
              styles.utilizationFill,
              { width: `${Math.min(utilizationPct ?? 0, 100)}%`, backgroundColor: utilizationColor(utilizationPct) },
            ]}
          />
        </View>
        <Text style={styles.utilizationText}>
          {category.borrowed} / {category.total_copies}
        </Text>
      </View>

      <View style={styles.categoryStatsRow}>
        <CategoryStat label="Available" value={category.available.toLocaleString()} />
        {category.overdue > 0 && <CategoryStat label="Overdue" value={category.overdue.toLocaleString()} tone="red" />}
      </View>
    </View>
  );
}

function CategoryStat({ label, value, tone }: { label: string; value: string; tone?: "red" }) {
  return (
    <View style={styles.categoryStat}>
      <Text style={styles.categoryStatLabel}>{label}</Text>
      <Text style={[styles.categoryStatValue, tone === "red" ? { color: "#DC2626" } : null]}>{value}</Text>
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
  categoryCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 16,
    marginBottom: 12,
    gap: 10,
  },
  categoryName: { fontSize: 14, fontFamily: fonts.bold, color: "#111827" },
  utilizationRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  utilizationTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: "#F1F3F6", overflow: "hidden" },
  utilizationFill: { height: 8, borderRadius: 4 },
  utilizationText: { fontSize: 12, fontFamily: fonts.semibold, color: "#4B5563" },
  categoryStatsRow: { flexDirection: "row", gap: 16 },
  categoryStat: { gap: 2 },
  categoryStatLabel: { fontSize: 10, fontFamily: fonts.medium, color: "#9AA6B2" },
  categoryStatValue: { fontSize: 13, fontFamily: fonts.bold, color: "#111827" },
});
