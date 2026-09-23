import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/theme";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";
import { SkeletonBlock, SkeletonProductGrid } from "@/components/ui/Skeleton";
import { useRole } from "@/hooks/useRole";
import { getApiErrorMessage } from "@/services/api/client";
import { getWallet } from "@/services/api/wallet.api";
import { listCraveoDishes, listCraveoCategories, type CraveoDish, type CraveoCategory } from "@/services/api/craveo.api";
import { DishCard } from "./DishCard";
import { FloatingCartBar } from "./FloatingCartBar";

// Same role set the Stationery Store/HomeHeader already exclude from the
// wallet feature - no personal campus spend account for these.
function hasWallet(role: string | null): boolean {
  return role !== "parent" && role !== "alumni" && role !== "principal" && role !== "correspondent";
}

// Craveo's own hub - always reached by pushing from the Campus/Amenity
// tab's own "Food Court" tile (see AmenityHomeScreen.tsx).
export function CraveoHomeScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const role = useRole();

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
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [search, setSearch] = useState("");

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
        setError(getApiErrorMessage(err, "Couldn't load Craveo."));
        setStatus("error");
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!hasWallet(role)) return;
    getWallet()
      .then((w) => setWalletBalance(w.balance))
      .catch(() => {});
  }, [role]);

  const isSearching = search.trim().length > 0;
  const searchResults = useMemo(() => {
    if (!isSearching) return [];
    const q = search.trim().toLowerCase();
    return dishes.filter((d) => d.name.toLowerCase().includes(q));
  }, [isSearching, search, dishes]);

  const dishesByCategory = useMemo(() => {
    return categories
      .map((cat) => ({ ...cat, items: dishes.filter((d) => d.category.id === cat.id) }))
      .filter((cat) => cat.items.length > 0);
  }, [categories, dishes]);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <WatermarkBackground />
      <LinearGradient
        colors={["#2D6BE0", "#1E4FBF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <View style={styles.headerTopRow}>
          <View style={styles.headerTitleRow}>
            <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={styles.backButton}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <View>
              <Text style={styles.headerTitle}>Craveo</Text>
              <Text style={styles.headerSubtitle}>Sri Eshwar College · Main Canteen</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.push("/(tabs)/amenity/craveo/orders" as never)}
              hitSlop={8}
            >
              <Ionicons name="receipt-outline" size={16} color="#fff" />
            </TouchableOpacity>
            {walletBalance !== null && (
              <View style={styles.walletChip}>
                <Ionicons name="wallet-outline" size={14} color="#fff" />
                <Text style={styles.walletChipText}>₹{walletBalance}</Text>
              </View>
            )}
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={14} color="#9AA3BD" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search dishes, snacks, drinks…"
            placeholderTextColor="#9AA3BD"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color="#9AA3BD" />
            </TouchableOpacity>
          )}
        </View>

        {status === "loading" && (
          <View style={{ gap: 20 }}>
            {[0, 1].map((row) => (
              <View key={row}>
                <SkeletonBlock width={120} height={14} style={{ marginBottom: 10 }} />
                <SkeletonProductGrid count={3} style={styles.categoryRow} cardStyle={styles.categoryCard} />
              </View>
            ))}
          </View>
        )}
        {status === "error" && (
          <View style={styles.centerState}>
            <Ionicons name="cloud-offline-outline" size={28} color="#B0B7C3" />
            <Text style={styles.centerStateText}>{error}</Text>
            <TouchableOpacity onPress={load}>
              <Text style={styles.retryText}>Tap to retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {status === "success" && !isSearching && (
          <View style={{ gap: 20 }}>
            {dishesByCategory.map((cat) => (
              <View key={cat.id}>
                <View style={styles.categoryHeaderRow}>
                  <Text style={styles.categoryTitle}>{cat.name}</Text>
                  <Text style={styles.categoryCount}>{cat.items.length} items</Text>
                  <TouchableOpacity
                    style={styles.categorySeeAll}
                    onPress={() => router.push(`/(tabs)/amenity/craveo/menu?category=${cat.id}` as never)}
                  >
                    <Text style={styles.categorySeeAllText}>See all</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
                  {cat.items.map((d) => (
                    <DishCard key={d.id} dish={d} style={styles.categoryCard} />
                  ))}
                </ScrollView>
              </View>
            ))}
          </View>
        )}

        {status === "success" && isSearching && (
          <View>
            <Text style={styles.searchResultsLabel}>Results for "{search}"</Text>
            {searchResults.length === 0 ? (
              <View style={styles.centerState}>
                <Text style={styles.centerStateText}>No dish matches that</Text>
              </View>
            ) : (
              <View style={styles.searchGrid}>
                {searchResults.map((d) => (
                  <DishCard key={d.id} dish={d} style={styles.searchCard} />
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <FloatingCartBar basePath="/(tabs)/amenity/craveo" />
    </SafeAreaView>
  );
}

// Sized so a category row shows exactly 2 cards in the viewport - no
// sliver of a 3rd card peeking in to hint "scroll for more" (per explicit
// request). `content`'s own 16+16 horizontal padding and the 12 gap
// between the 2 cards are both subtracted before halving.
const CATEGORY_CARD_WIDTH = (Dimensions.get("window").width - 16 * 2 - 12) / 2;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8FA" },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  backButton: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontFamily: fonts.bold, color: "#fff" },
  headerSubtitle: { fontSize: 11, fontFamily: fonts.regular, color: "rgba(255,255,255,0.75)", marginTop: 1 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  walletChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  walletChipText: { fontSize: 11.5, fontFamily: fonts.bold, color: "#fff" },
  content: { padding: 16, paddingBottom: 100, gap: 16 },
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
  categoryHeaderRow: { flexDirection: "row", alignItems: "baseline", gap: 7, marginBottom: 10 },
  categoryTitle: { fontSize: 14.5, fontFamily: fonts.bold, color: "#12243D" },
  categoryCount: { fontSize: 11.5, fontFamily: fonts.regular, color: "#9AA3BD", flex: 1 },
  categorySeeAll: {},
  categorySeeAllText: { fontSize: 12, fontFamily: fonts.semibold, color: "#2D6BE0" },
  categoryRow: { gap: 12, paddingBottom: 4 },
  categoryCard: { width: CATEGORY_CARD_WIDTH },
  searchResultsLabel: { fontSize: 13, fontFamily: fonts.regular, color: "#5A6284", marginBottom: 12 },
  searchGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  searchCard: { width: "47%" },
});
