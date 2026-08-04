import { useCallback, useMemo, useState } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity, Linking, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import {
  libraryInfo,
  mockCatalogue,
  eResources,
  mockBorrowedBooks,
  mockLibraryHistory,
  type BorrowedBook,
} from "./data/mockLibrary";

type Tab = "search" | "e-resources" | "borrowed" | "history";

const TABS: { id: Tab; label: string }[] = [
  { id: "search", label: "Search" },
  { id: "e-resources", label: "E-Resources" },
  { id: "borrowed", label: "Borrowed" },
  { id: "history", label: "History" },
];

// TODO: this is a view-only catalogue/borrowed/history UI over mockLibrary -
// wire to a real library backend endpoint once one exists. Reachable from
// the Employee-section "Library" item on both the Employee/Faculty and HoD
// dashboards.
export function LibraryScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>("search");
  const [search, setSearch] = useState("");
  const [borrowed, setBorrowed] = useState(mockBorrowedBooks);

  // This screen renders its own full header below, so hide the shared
  // CollegeHeader while it's focused - same pattern as the other ERP
  // sub-screens.
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return () => {
        navigation.getParent()?.setOptions({ headerShown: true, header: () => <CollegeHeader /> });
      };
    }, [navigation]),
  );

  const filteredCatalogue = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return mockCatalogue;
    return mockCatalogue.filter(
      (book) =>
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query) ||
        book.category.toLowerCase().includes(query),
    );
  }, [search]);

  function handleOpenResource(url: string, name: string) {
    Linking.openURL(url).catch(() => toast.error(`Couldn't open ${name}`));
  }

  function handleRenew(book: BorrowedBook) {
    setBorrowed((prev) =>
      prev.map((item) => (item.id === book.id ? { ...item, status: "active" } : item)),
    );
    toast.success(`${book.title} renewed for 14 more days`);
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <LinearGradient
        colors={["#2F6FE0", "#1A3D8F"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Library</Text>
          <Text style={styles.headerSubtitle}>
            {libraryInfo.name} · {libraryInfo.accountType}
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.tabRow}>
        {TABS.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.tabButton, tab === item.id && styles.tabButtonActive]}
            onPress={() => setTab(item.id)}
          >
            <Text style={[styles.tabButtonText, tab === item.id && styles.tabButtonTextActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {tab === "search" && (
          <>
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={16} color="#9AA6B2" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by book, author or category"
                placeholderTextColor="#9AA6B2"
                value={search}
                onChangeText={setSearch}
              />
            </View>

            <Text style={styles.sectionTitle}>Catalogue</Text>
            {filteredCatalogue.map((book) => (
              <View key={book.id} style={styles.card}>
                <Text style={styles.bookTitle}>{book.title}</Text>
                <Text style={styles.bookAuthor}>
                  {book.author} · {book.category}
                </Text>
                <Text style={[styles.bookMeta, !book.inStock && styles.bookMetaOutOfStock]}>
                  {book.code} · {book.availability}
                </Text>
              </View>
            ))}

            {filteredCatalogue.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={32} color="#B0B7C3" />
                <Text style={styles.emptyStateText}>No books match "{search}"</Text>
              </View>
            )}
          </>
        )}

        {tab === "e-resources" && (
          <>
            <Text style={styles.sectionTitle}>E-Resources</Text>
            {eResources.map((resource) => (
              <TouchableOpacity
                key={resource.id}
                style={styles.card}
                onPress={() => handleOpenResource(resource.url, resource.name)}
                activeOpacity={0.8}
              >
                <View style={styles.eResourceRow}>
                  <View style={styles.eResourceTextWrap}>
                    <Text style={styles.bookTitle}>{resource.name}</Text>
                    <Text style={styles.bookAuthor}>{resource.description}</Text>
                  </View>
                  <Ionicons name="open-outline" size={18} color="#2F6FE0" />
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        {tab === "borrowed" && (
          <>
            <Text style={styles.sectionTitle}>Borrowed Books</Text>
            {borrowed.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="library-outline" size={32} color="#B0B7C3" />
                <Text style={styles.emptyStateText}>Nothing borrowed right now</Text>
              </View>
            ) : (
              borrowed.map((book) => (
                <View key={book.id} style={styles.card}>
                  <View style={styles.borrowedHeader}>
                    <Text style={styles.bookTitle}>{book.title}</Text>
                    <View style={[styles.statusBadge, book.status === "overdue" && styles.statusBadgeOverdue]}>
                      <Text
                        style={[styles.statusBadgeText, book.status === "overdue" && styles.statusBadgeTextOverdue]}
                      >
                        {book.status === "overdue" ? "Overdue" : "Active"}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.bookAuthor}>{book.author}</Text>
                  <Text style={styles.bookMeta}>
                    Borrowed {book.borrowedOn} · Due {book.dueDate}
                  </Text>
                  <TouchableOpacity
                    style={styles.renewButton}
                    onPress={() => handleRenew(book)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="refresh-outline" size={14} color="#2F6FE0" />
                    <Text style={styles.renewButtonText}>Renew</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </>
        )}

        {tab === "history" && (
          <>
            <Text style={styles.sectionTitle}>Return History</Text>
            {mockLibraryHistory.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-done-outline" size={32} color="#B0B7C3" />
                <Text style={styles.emptyStateText}>No history yet</Text>
              </View>
            ) : (
              mockLibraryHistory.map((entry) => (
                <View key={entry.id} style={styles.card}>
                  <Text style={styles.bookTitle}>{entry.title}</Text>
                  <Text style={styles.bookAuthor}>{entry.author}</Text>
                  <Text style={styles.bookMeta}>
                    Borrowed {entry.borrowedOn} · Returned {entry.returnedOn}
                  </Text>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontFamily: fonts.bold,
  },
  headerSubtitle: {
    color: "#D7E2FA",
    fontSize: 12,
    fontFamily: fonts.medium,
    marginTop: 2,
  },
  tabRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
    backgroundColor: "#F7F8FA",
  },
  tabButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  tabButtonActive: {
    backgroundColor: "#2F6FE0",
  },
  tabButtonText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#6B85B8",
  },
  tabButtonTextActive: {
    color: "#fff",
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    elevation: 1,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#111827",
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#8A93A3",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  bookTitle: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  bookAuthor: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#6B7280",
    marginTop: 3,
  },
  bookMeta: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#2F6FE0",
    marginTop: 6,
  },
  bookMetaOutOfStock: {
    color: "#DC2626",
  },
  eResourceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  eResourceTextWrap: {
    flex: 1,
  },
  borrowedHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  statusBadge: {
    backgroundColor: "#F0FDF4",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeOverdue: {
    backgroundColor: "#FEF2F2",
  },
  statusBadgeText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: "#16A34A",
  },
  statusBadgeTextOverdue: {
    color: "#DC2626",
  },
  renewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#B7CBE6",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginTop: 10,
  },
  renewButtonText: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#2F6FE0",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 8,
  },
  emptyStateText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
  },
});
