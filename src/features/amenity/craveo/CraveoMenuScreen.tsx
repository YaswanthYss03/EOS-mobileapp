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
import { listCraveoDishes, listCraveoCategories, type CraveoDish, type CraveoCategory } from "@/services/api/craveo.api";
import { DishCard } from "./DishCard";
import { FloatingCartBar } from "./FloatingCartBar";

// "All items" - the reference design's Menu screen, reached either from the
// tab bar or via a category's own "See all" on Home (initialCategoryId).
export function CraveoMenuScreen({ initialCategoryId }: { initialCategoryId?: number }) {
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
  const [dishes, setDishes] = useState<CraveoDish[]>([]);
  const [categories, setCategories] = useState<CraveoCategory[]>([]);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<number | "all">(initialCategoryId ?? "all");
  const [vegOnly, setVegOnly] = useState(false);

  const load = useCallback(() => {
    setStatus("loading");
    setError(null);
    Promise.all([listCraveoDishes(), listCraveoCategories()])
      .then(([d, c]) => {
        setDishes(d);
        setCategories(c);
        setStatus("success");
      })
      .catch((err) => {
        setError(getApiErrorMessage(err, "Couldn't load the menu."));
        setStatus("error");
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    let rows = dishes;
    if (categoryId !== "all") rows = rows.filter((d) => d.category.id === categoryId);
    if (vegOnly) rows = rows.filter((d) => d.is_veg);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((d) => d.name.toLowerCase().includes(q));
    }
    return rows;
  }, [dishes, categoryId, vegOnly, search]);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <WatermarkBackground />
      <LinearGradient
        colors={["#2D6BE0", "#1E4FBF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={styles.backButton}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>All items</Text>
            <Text style={styles.headerSubtitle}>
              {visible.length} {visible.length === 1 ? "item" : "items"} available now
            </Text>
          </View>
        </View>
        <View style={styles.pillsRow}>
          <TouchableOpacity
            style={[styles.pill, categoryId === "all" && styles.pillActive]}
            onPress={() => setCategoryId("all")}
          >
            <Text style={[styles.pillText, categoryId === "all" && styles.pillTextActive]}>All</Text>
          </TouchableOpacity>
          {categories.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[styles.pill, categoryId === c.id && styles.pillActive]}
              onPress={() => setCategoryId(c.id)}
            >
              <Text style={[styles.pillText, categoryId === c.id && styles.pillTextActive]}>{c.name}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[styles.pill, vegOnly && styles.pillActive]} onPress={() => setVegOnly((v) => !v)}>
            <Text style={[styles.pillText, vegOnly && styles.pillTextActive]}>Veg only</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={14} color="#9AA3BD" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search in the menu…"
            placeholderTextColor="#9AA3BD"
            value={search}
            onChangeText={setSearch}
          />
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
            <Text style={styles.centerStateText}>No dish matches that</Text>
          </View>
        )}
        {status === "success" && visible.length > 0 && (
          <View style={styles.grid}>
            {visible.map((d) => (
              <DishCard key={d.id} dish={d} style={styles.gridCard} />
            ))}
          </View>
        )}
      </ScrollView>

      <FloatingCartBar basePath="/(tabs)/amenity/craveo" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8FA" },
  header: { paddingHorizontal: 20, paddingBottom: 14, gap: 12 },
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
  pillsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.15)", borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" },
  pillActive: { backgroundColor: "#fff" },
  pillText: { fontSize: 12, fontFamily: fonts.semibold, color: "#fff" },
  pillTextActive: { color: "#1E4FBF" },
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
  centerState: { alignItems: "center", paddingVertical: 40, gap: 8 },
  centerStateText: { fontSize: 13, fontFamily: fonts.medium, color: "#9AA6B2", textAlign: "center", paddingHorizontal: 20 },
  retryText: { fontSize: 13, fontFamily: fonts.bold, color: "#2D6BE0", marginTop: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  gridCard: { width: "47%" },
});
