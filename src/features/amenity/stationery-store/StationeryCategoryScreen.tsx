import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/theme";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";
import { SkeletonProductGrid } from "@/components/ui/Skeleton";
import { getApiErrorMessage } from "@/services/api/client";
import { listStationeryProducts, type StationeryCategory, type StationeryProduct } from "@/services/api/stationery.api";
import { categoryName } from "./categories";
import { ProductCard } from "./ProductCard";
import { FloatingCartBar } from "./FloatingCartBar";

type SortKey = "popular" | "low-high" | "high-low";
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "popular", label: "Popular" },
  { key: "low-high", label: "Price: Low-High" },
  { key: "high-low", label: "Price: High-Low" },
];

export function StationeryCategoryScreen({ category }: { category: StationeryCategory }) {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return undefined;
    }, [navigation]),
  );

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<StationeryProduct[]>([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("popular");
  const [inStockOnly, setInStockOnly] = useState(false);

  const load = useCallback(() => {
    setStatus("loading");
    setError(null);
    listStationeryProducts({ category })
      .then((rows) => {
        setProducts(rows);
        setStatus("success");
      })
      .catch((err) => {
        setError(getApiErrorMessage(err, "Couldn't load this category."));
        setStatus("error");
      });
  }, [category]);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    let rows = products;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((p) => p.name.toLowerCase().includes(q));
    }
    if (inStockOnly) rows = rows.filter((p) => p.stock_quantity > 0);
    if (sort === "low-high") rows = [...rows].sort((a, b) => a.price - b.price);
    if (sort === "high-low") rows = [...rows].sort((a, b) => b.price - a.price);
    return rows;
  }, [products, search, inStockOnly, sort]);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <WatermarkBackground />
      <LinearGradient
        colors={["#2F6FE0", "#1A3D8F"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={styles.backButton}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>{categoryName(category)}</Text>
            <Text style={styles.headerSubtitle}>
              {visible.length} {visible.length === 1 ? "item" : "items"}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={14} color="#9AA3BD" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search in this category..."
            placeholderTextColor="#9AA3BD"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <View style={styles.pillsRow}>
          {SORT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.pill, sort === opt.key && styles.pillActive]}
              onPress={() => setSort(opt.key)}
            >
              <Text style={[styles.pillText, sort === opt.key && styles.pillTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.pill, inStockOnly && styles.pillActive]}
            onPress={() => setInStockOnly((v) => !v)}
          >
            <Text style={[styles.pillText, inStockOnly && styles.pillTextActive]}>In stock only</Text>
          </TouchableOpacity>
        </View>

        {status === "loading" && <SkeletonProductGrid count={6} cardStyle={styles.gridCard} />}
        {status === "error" && (
          <View style={styles.centerState}>
            <Ionicons name="cloud-offline-outline" size={28} color="#B0B7C3" />
            <Text style={styles.centerStateText}>{error}</Text>
            <TouchableOpacity onPress={load}>
              <Text style={styles.retryText}>Tap to retry</Text>
            </TouchableOpacity>
          </View>
        )}
        {status === "success" && visible.length === 0 && (
          <View style={styles.centerState}>
            <Text style={styles.centerStateText}>No products match your filters</Text>
          </View>
        )}
        {status === "success" && visible.length > 0 && (
          <View style={styles.grid}>
            {visible.map((p) => (
              <ProductCard key={p.id} product={p} style={styles.gridCard} />
            ))}
          </View>
        )}
      </ScrollView>

      <FloatingCartBar basePath="/(tabs)/amenity/stationery-store" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8FA" },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontFamily: fonts.bold, color: "#fff" },
  headerSubtitle: { fontSize: 11.5, fontFamily: fonts.regular, color: "rgba(255,255,255,0.75)", marginTop: 1 },
  content: { padding: 16, paddingBottom: 100, gap: 14 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#fff",
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#E2E5F0",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: { flex: 1, fontSize: 12.5, fontFamily: fonts.regular, color: "#111827", padding: 0 },
  pillsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: "#E2E5F0", backgroundColor: "#fff" },
  pillActive: { backgroundColor: "#3D5CE0", borderColor: "#3D5CE0" },
  pillText: { fontSize: 12, fontFamily: fonts.semibold, color: "#5A6284" },
  pillTextActive: { color: "#fff" },
  centerState: { alignItems: "center", paddingVertical: 40, gap: 8 },
  centerStateText: { fontSize: 13, fontFamily: fonts.medium, color: "#9AA6B2", textAlign: "center", paddingHorizontal: 20 },
  retryText: { fontSize: 13, fontFamily: fonts.bold, color: "#2F6FE0", marginTop: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  gridCard: { width: "47%" },
});
